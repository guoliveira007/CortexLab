import { toast } from 'react-hot-toast';
import { db } from '../../database';

// Primitivos de extração de PDF compartilhados com ImportarPDF.jsx
export {
  carregarPDFJS,
  carregarTesseract,
  sleep,
  extrairTextoPagina,
  renderizarCanvas,
  ocrPagina,
} from '../../utils/pdfExtraction';

/* ── Agrupamento adaptativo de páginas em lotes ── */
const CHARS_POR_LOTE = 4000;

export const agruparEmLotes = (textosPorPagina) => {
  const lotes = [];
  let loteAtual = [];
  let charsAtual = 0;

  for (const p of textosPorPagina) {
    const chars = p.texto.length;
    if (loteAtual.length > 0 && charsAtual + chars > CHARS_POR_LOTE) {
      lotes.push(loteAtual);
      loteAtual = [];
      charsAtual = 0;
    }
    loteAtual.push(p);
    charsAtual += chars;
  }
  if (loteAtual.length) lotes.push(loteAtual);
  return lotes;
};

/* ── Prompt para Groq ── */
export const montarPrompt = (texto) => `Você é um especialista em extrair questões de provas (vestibulares, concursos, ENEM).

Analise o texto abaixo e extraia TODAS as questões de múltipla escolha encontradas.

ATENÇÃO ESPECIAL — Imagens: Identifique quando uma questão depende de figura, gráfico, tabela, mapa ou esquema que NÃO foi reproduzido em texto (ex: referência a "a figura abaixo", "o gráfico indica", "observe o mapa"). Nesse caso marque tem_imagem: true e descreva brevemente em descricao_imagem o que seria essa figura.

Se não houver questões no trecho (capa, instruções, gabarito), retorne: {"questoes":[]}

Estrutura obrigatória de cada questão:
{
  "numero": "número como string",
  "banca": "nome da banca ou vazio",
  "ano": ano como número inteiro ou null,
  "materia": "Matemática | Português | História | Biologia | Física | Química | Geografia | etc.",
  "conteudo": "área temática ou vazio",
  "topico": "tópico específico ou vazio",
  "enunciado": "texto de contexto antes do comando (pode ser vazio)",
  "comando": "apenas a pergunta ou instrução final",
  "alternativas": {
    "A": "texto completo",
    "B": "texto completo",
    "C": "texto completo",
    "D": "texto completo",
    "E": "texto completo ou vazio se só 4 opções"
  },
  "gabarito": "A|B|C|D|E se visível no texto, senão vazio",
  "explicacao": "resolução se disponível, senão vazio",
  "tem_imagem": true ou false,
  "descricao_imagem": "descrição breve do que seria a imagem, ou vazio"
}

REGRAS:
1. Extraia TODAS as questões, sem pular nenhuma
2. Preserve o texto original das alternativas sem resumir
3. Retorne SOMENTE JSON válido, sem markdown, sem texto extra
4. Nunca invente conteúdo ausente no texto
5. Interprete imperfeições de OCR com contexto

FORMATO: {"questoes":[...]}

TEXTO:
${texto}`;

/* ── Chamada Groq com retry + abort signal ── */
export const chamarGroq = async (texto, apiKey, signal) => {
  for (let t = 1; t <= 4; t++) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: montarPrompt(texto) }],
        max_tokens: 6000,
        temperature: 0.05,
      }),
    });

    if (res.status === 429) {
      if (t === 4) throw new Error('Limite de requisições Groq atingido. Aguarde e tente novamente.');
      await sleep(8000 * t);
      // ✅ FIX #4: verifica cancelamento imediatamente após o sleep
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
      continue;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ${res.status}`);
    }

    const data = await res.json();
    const resposta = data.choices?.[0]?.message?.content || '';
    const match = resposta.match(/\{[\s\S]*\}/);
    if (!match) return { questoes: [] };
    try { return JSON.parse(match[0]); } catch { return { questoes: [] }; }
  }
  return { questoes: [] };
};

/* ── Pipeline completo de extração ── */
export const extrairPDF = async (base64, apiKey, onProgresso, signal) => {
  const pdfjs = await carregarPDFJS();
  const pdfDoc = await pdfjs.getDocument({ data: atob(base64) }).promise;
  const totalPaginas = pdfDoc.numPages;
  const textosPorPagina = [];
  const paginasOCR = [];

  // Fase 1: leitura de texto
  for (let p = 1; p <= totalPaginas; p++) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    onProgresso({ fase: 'lendo', pagina: p, total: totalPaginas });
    try {
      let texto = await extrairTextoPagina(pdfDoc, p);
      let modo = 'pdfjs';
      if (texto.length < 30) {
        const canvas = await renderizarCanvas(pdfDoc, p);
        texto = await ocrPagina(canvas);
        modo = 'ocr';
        paginasOCR.push(p);
      }
      textosPorPagina.push({ pagina: p, texto, modo });
    } catch {
      textosPorPagina.push({ pagina: p, texto: '', modo: 'erro' });
    }
  }

  // Fase 2: lotes adaptativos
  const lotes = agruparEmLotes(textosPorPagina);
  const todasQuestoes = [];
  const lotesComErro = [];

  for (let i = 0; i < lotes.length; i++) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

    const lote = lotes[i];
    const loteIdx = i + 1;
    onProgresso({ fase: 'extraindo', lote: loteIdx, totalLotes: lotes.length });

    const textoLote = lote
      .filter(p => p.texto.length > 20)
      .map(p => `[PÁGINA ${p.pagina}]\n${p.texto}`)
      .join('\n\n');

    if (!textoLote.trim()) continue;

    try {
      const resultado = await chamarGroq(textoLote, apiKey, signal);
      const questoesLote = (resultado.questoes || []).map(q => ({
        ...q,
        _pagina: lote[0].pagina,
        _modoExtracao: lote.some(p => p.modo === 'ocr') ? 'ocr' : 'pdfjs',
        _id: `${Date.now()}_${Math.random()}`,
        _sel: true,
      }));
      todasQuestoes.push(...questoesLote);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      const paginasLote = lote.map(p => p.pagina).join(', ');
      lotesComErro.push({ lote: loteIdx, paginas: paginasLote, erro: e.message });
    }

    if (i + 1 < lotes.length) await sleep(1200);
  }

  return { questoes: todasQuestoes, paginasOCR, lotesComErro };
};

/* ── Detecção de duplicatas ── */
export const detectarDuplicatas = async (questoesSelecionadas) => {
  try {
    const existentes = await db.questoes.toArray();
    const duplicatas = [];
    for (const q of questoesSelecionadas) {
      const chave = (q.comando || '').trim().slice(0, 80).toLowerCase();
      if (!chave) continue;
      const achou = existentes.find(e =>
        (e.comando || '').trim().slice(0, 80).toLowerCase() === chave
      );
      if (achou) duplicatas.push(q._id);
    }
    return duplicatas;
  } catch {
    return [];
  }
};