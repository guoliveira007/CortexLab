import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import ProgressBar from './ProgressBar'; // ✅ Componente reutilizável

// Primitivos de extração de PDF compartilhados com ImportarIA/utils.js
import {
  carregarPDFJS,
  sleep,
  extrairTextoPagina  as extrairTextoPDFJS,
  renderizarCanvas    as renderizarPaginaParaCanvas,
  ocrPagina,
} from '../utils/pdfExtraction';

/**
 * ImportarPDF — Importação de questões via PDF.
 *
 * Fluxo híbrido:
 *   1. PDF.js tenta extrair texto de cada página.
 *   2. Se a página for escaneada (texto < 30 chars), Tesseract.js faz OCR via canvas.
 *   3. O texto (de qualquer origem) é enviado ao GroqCloud para extração estruturada.
 *
 * Dependências (via CDN, carregadas pelo módulo pdfExtraction.js):
 *   - PDF.js  3.11.174
 *   - Tesseract.js  5.x
 */

const PAGINAS_POR_LOTE = 1;
const MAX_CHARS_POR_PAGINA = 3000;

/** Prompt para extrair questões de uma página */
const montarPrompt = (textoLote) => `Você é um extrator especializado de questões de provas (vestibulares, concursos, ENEM).

O texto abaixo foi extraído de uma página de prova. Extraia ABSOLUTAMENTE TODAS as questões de múltipla escolha presentes.

Se não houver nenhuma questão (capa, instruções, gabarito), retorne: {"questoes":[]}

Cada questão deve seguir EXATAMENTE esta estrutura JSON:
{
  "numero": "número da questão como string, ex: '1', '42'",
  "banca": "FUVEST | ENEM | CESPE | FCC | VUNESP | etc, ou vazio",
  "ano": ano como número inteiro ou null,
  "materia": "Matemática | Português | História | Biologia | etc, ou vazio",
  "conteudo": "área temática, ex: Geometria, Interpretação de Texto, ou vazio",
  "topico": "tópico específico ou vazio",
  "enunciado": "texto completo do enunciado e texto-base, SEM incluir o comando/pergunta final",
  "comando": "apenas a instrução ou pergunta final da questão, ex: 'Assinale a alternativa correta.'",
  "alternativas": {
    "A": "texto completo da alternativa A",
    "B": "texto completo da alternativa B",
    "C": "texto completo da alternativa C",
    "D": "texto completo da alternativa D",
    "E": "texto completo da alternativa E, ou vazio se a questão tiver só 4 opções"
  },
  "gabarito": "A | B | C | D | E se o gabarito estiver visível no texto, senão vazio",
  "explicacao": "resolução ou justificativa se estiver no texto, senão vazio"
}

REGRAS CRÍTICAS:
1. Extraia TODAS as questões, sem exceção — não pule nenhuma
2. Questões que cruzam a marcação [PÁGINA X → X+1] devem ser extraídas completas
3. Preserve o texto original das alternativas sem resumir ou parafrasear
4. Retorne SOMENTE o JSON válido, sem markdown (\`\`\`), sem texto antes ou depois
5. Nunca invente conteúdo que não está no texto
6. O texto pode ter imperfeições de OCR — interprete com contexto

FORMATO OBRIGATÓRIO: {"questoes":[...]}

TEXTO DAS PÁGINAS:
${textoLote}`;

const MAX_TENTATIVAS = 4;

const extrairQuestoesDoLote = async (textoLote, apiKey, onRetry) => {
  if (!apiKey) {
    throw new Error('Chave da API GroqCloud não configurada. Obtenha uma chave gratuita em console.groq.com');
  }

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: montarPrompt(textoLote) }],
        max_tokens: 4000,
        temperature: 0.05,
      }),
    });

    if (response.status === 429) {
      if (tentativa === MAX_TENTATIVAS) throw new Error('Limite de requisições atingido. Aguarde e tente novamente.');
      const espera = 8000 * Math.pow(2, tentativa - 1);
      if (onRetry) onRetry(tentativa, Math.round(espera / 1000));
      await sleep(espera);
      continue;
    }

    if (!response.ok) {
      let msg = `Erro HTTP ${response.status}`;
      try { const err = await response.json(); msg = err.error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }

    const data = await response.json();
    const texto_resp = data.choices?.[0]?.message?.content || '';
    const matchJson = texto_resp.match(/\{[\s\S]*\}/);
    if (!matchJson) return [];

    try {
      const parsed = JSON.parse(matchJson[0]);
      return Array.isArray(parsed.questoes) ? parsed.questoes : [];
    } catch (_) {
      try {
        const parsed = JSON.parse(matchJson[0] + ']}');
        return Array.isArray(parsed.questoes) ? parsed.questoes : [];
      } catch (__) { return []; }
    }
  }
  return [];
};

/* ─── Sub-componentes ─── */

const StatusBadge = ({ modo }) => {
  const config = {
    texto:  { bg: '#ecfdf5', color: '#065f46', border: '#bbf7d0', label: '✓ Texto' },
    ocr:    { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: '🔍 OCR' },
    imagem: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: '⚠️ Imagem' },
  };
  const c = config[modo] || config.imagem;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {c.label}
    </span>
  );
};

const GabBadge = ({ gabarito }) => (
  gabarito ? (
    <span style={{
      background: 'var(--brand-50)', color: 'var(--brand-600)',
      fontWeight: 800, padding: '2px 9px',
      borderRadius: 'var(--r-full)', fontSize: '13px',
      border: '1.5px solid var(--brand-200)',
    }}>{gabarito}</span>
  ) : <span style={{ color: 'var(--gray-400)', fontSize: '12px' }}>—</span>
);

const ConfigApiKey = ({ apiKey, onSalvar }) => {
  const [valor, setValor] = useState(apiKey || '');
  const [mostrar, setMostrar] = useState(false);

  const salvar = () => {
    if (!valor.startsWith('gsk_')) {
      toast.error('A chave da GroqCloud deve começar com "gsk_"');
      return;
    }
    localStorage.setItem('groq_api_key', valor);
    onSalvar(valor);
    toast.success('Chave da API salva!');
  };

  return (
    <div style={{
      background: '#f0fdf4', border: '1.5px solid #bbf7d0',
      borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '16px',
    }}>
      <p style={{ fontWeight: 700, color: '#166534', fontSize: '13px', marginBottom: '8px' }}>
        🔑 Configure sua API Key da GroqCloud
      </p>
      <p style={{ fontSize: '12px', color: '#15803d', marginBottom: '12px', lineHeight: '1.5' }}>
        Para importar PDFs com IA, você precisa de uma chave da GroqCloud (gratuita, 14.400 req/dia).{' '}
        <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer"
          style={{ color: '#166534', fontWeight: 600 }}>
          Obtenha grátis em console.groq.com →
        </a>
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type={mostrar ? 'text' : 'password'}
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="gsk_..."
            className="input-modern"
            style={{ paddingRight: '44px', fontFamily: 'monospace', fontSize: '13px' }}
          />
          <button type="button" onClick={() => setMostrar(v => !v)} style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray-400)', fontSize: '16px',
          }}>{mostrar ? '🙈' : '👁'}</button>
        </div>
        <button onClick={salvar} disabled={!valor} style={{
          padding: '8px 16px',
          background: '#16a34a', color: 'white',
          border: 'none', borderRadius: 'var(--r-md)',
          cursor: valor ? 'pointer' : 'not-allowed',
          fontWeight: 700, fontSize: '13px',
          opacity: valor ? 1 : 0.5,
        }}>Salvar</button>
      </div>
      <p style={{ fontSize: '11px', color: '#15803d', marginTop: '8px', opacity: 0.8 }}>
        🔒 A chave é salva apenas no seu navegador (localStorage).
      </p>
    </div>
  );
};

/* ─── Componente principal ─── */

const ImportarPDF = ({ onFechar, onImportar }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '');

  const [fase, setFase]                 = useState('upload');
  const [paginasTotal, setPaginasTotal] = useState(0);
  const [paginaAtual, setPaginaAtual]   = useState(0);
  const [statusOCR, setStatusOCR]       = useState(''); // mensagem de progresso do OCR
  const [questoesExtraidas, setQuestoes]   = useState([]);
  const [questoesSelecionadas, setSelec]   = useState(new Set());
  const [arrastar, setArrastar]         = useState(false);
  const [progresso, setProgresso]       = useState(0);
  const [erroGlobal, setErroGlobal]     = useState(null);
  const [paginasComErro, setPagErros]   = useState([]);
  const [paginasSemTexto, setPagSemTexto] = useState([]);  // páginas que falharam até o OCR
  const [paginasOCR, setPaginasOCR]     = useState([]);    // páginas processadas via OCR
  const [errosDetalhe, setErrosDetalhe] = useState({});
  const [preview, setPreview]           = useState(null);
  const inputRef = useRef(null);

  const todasSelecionadas = questoesSelecionadas.size === questoesExtraidas.length && questoesExtraidas.length > 0;
  const toggleTodas = () => {
    if (todasSelecionadas) setSelec(new Set());
    else setSelec(new Set(questoesExtraidas.map((_, i) => i)));
  };
  const toggleQ = (i) => setSelec(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  /* ── Processamento principal do PDF ── */
  const processarPDF = async (arquivo) => {
    if (!arquivo) return;
    if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione um arquivo PDF'); return;
    }
    if (arquivo.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 50MB.'); return;
    }
    if (!apiKey) {
      setErroGlobal('Configure sua API Key da GroqCloud antes de processar o PDF.');
      return;
    }

    setFase('processando');
    setErroGlobal(null);
    setPagErros([]);
    setPagSemTexto([]);
    setPaginasOCR([]);
    setErrosDetalhe({});
    setQuestoes([]);
    setSelec(new Set());
    setStatusOCR('');

    try {
      const pdfjsLib = await carregarPDFJS();
      const arrayBuffer = await arquivo.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const total = pdfDoc.numPages;
      setPaginasTotal(total);

      const todasQuestoes = [];
      const erros = [];
      const semTexto = [];
      const viaOCR = [];
      const detalheErros = {};

      // ── 1. Extrai texto de todas as páginas (PDF.js primeiro) ──────────────
      const textosPorPagina = [];
      for (let p = 1; p <= total; p++) {
        setPaginaAtual(p);
        setStatusOCR(`Lendo página ${p} de ${total}...`);

        let texto = await extrairTextoPDFJS(pdfDoc, p);
        let modoExtracao = 'texto';

        // ── 2. Se a página não tem texto → OCR com Tesseract ─────────────────
        if (!texto || texto.length < 30) {
          try {
            setStatusOCR(`🔍 OCR na página ${p}... (pode levar alguns segundos)`);
            const canvas = await renderizarPaginaParaCanvas(pdfDoc, p, 2.0);
            texto = await ocrPagina(canvas, (pct) => {
              setStatusOCR(`🔍 OCR pág. ${p}: ${pct}%`);
            });
            modoExtracao = texto && texto.length >= 30 ? 'ocr' : 'imagem';
            if (modoExtracao === 'ocr') viaOCR.push(p);
          } catch (ocrErr) {
            console.warn(`OCR falhou na página ${p}:`, ocrErr);
            modoExtracao = 'imagem';
          }
        }

        textosPorPagina.push({ pagina: p, texto, modoExtracao });
      }

      setPaginasOCR(viaOCR);
      setStatusOCR('');

      // ── 3. Agrupa em lotes e envia ao Groq ───────────────────────────────
      const lotes = [];
      for (let i = 0; i < textosPorPagina.length; i += PAGINAS_POR_LOTE) {
        lotes.push(textosPorPagina.slice(i, i + PAGINAS_POR_LOTE));
      }

      for (let li = 0; li < lotes.length; li++) {
        const lote = lotes[li];
        const paginasDoLote = lote.map(l => l.pagina);
        const paginaInicio  = paginasDoLote[0];
        const paginaFim     = paginasDoLote[paginasDoLote.length - 1];

        setPaginaAtual(paginaFim);
        setProgresso(Math.round((li / lotes.length) * 100));

        if (li > 0) await sleep(1200);

        const paginasComTexto   = lote.filter(l => l.texto && l.texto.length >= 30);
        const paginasSemTextoNoLote = lote.filter(l => !l.texto || l.texto.length < 30);
        paginasSemTextoNoLote.forEach(l => semTexto.push(l.pagina));

        if (paginasComTexto.length === 0) continue;

        const textoLote = paginasComTexto
          .map(l => `[PÁGINA ${l.pagina}${l.modoExtracao === 'ocr' ? ' - via OCR' : ''}]\n${l.texto.slice(0, MAX_CHARS_POR_PAGINA)}`)
          .join('\n\n---\n\n');

        try {
          const onRetry = (tentativa, esperaSeg) => {
            toast(`⏳ Págs. ${paginaInicio}–${paginaFim}: limite atingido. Tentativa ${tentativa + 1} em ${esperaSeg}s...`, {
              id: `retry-lote-${li}`, duration: esperaSeg * 1000,
            });
          };

          const questoes = await extrairQuestoesDoLote(textoLote, apiKey, onRetry);

          const idsJaAdicionados = new Set(todasQuestoes.map(q => q.numero));
          const questoesNovas = questoes.filter(q => !q.numero || !idsJaAdicionados.has(q.numero));

          const comPagina = questoesNovas.map((q, idx) => ({
            ...q,
            _pagina: paginaInicio,
            _modoExtracao: lote[0]?.modoExtracao || 'texto',
            _id: `lote${li}_${q.numero || (todasQuestoes.length + idx)}`,
          }));
          todasQuestoes.push(...comPagina);

        } catch (err) {
          console.error(`Erro no lote págs. ${paginaInicio}–${paginaFim}:`, err);
          paginasDoLote.forEach(p => erros.push(p));
          detalheErros[paginaInicio] = err.message;

          if (err.message.includes('401') || err.message.includes('403') || err.message.includes('inválida')) {
            setPagErros([...erros]);
            setErrosDetalhe({ ...detalheErros });
            setErroGlobal(`❌ Erro de autenticação: ${err.message}\n\nVerifique sua API Key da GroqCloud.`);
            setFase('upload');
            return;
          }
        }
      }

      setProgresso(100);
      setQuestoes(todasQuestoes);
      setSelec(new Set(todasQuestoes.map((_, i) => i)));
      setPagErros(erros);
      setPagSemTexto(semTexto);
      setErrosDetalhe(detalheErros);

      if (todasQuestoes.length === 0) {
        if (semTexto.length > 0 && erros.length === 0) {
          setErroGlobal(
            `Nenhuma questão encontrada. ${semTexto.length} página(s) não tiveram texto extraível nem pelo OCR.\n\n` +
            'Verifique se o PDF contém imagens de boa qualidade (resolução mínima recomendada: 150 DPI).'
          );
        } else {
          const detalhes = Object.entries(detalheErros).slice(0, 2)
            .map(([pag, msg]) => `Pág. ${pag}: ${msg}`).join('\n');
          setErroGlobal(
            erros.length > 0
              ? `Nenhuma questão encontrada. ${erros.length} página(s) retornaram erro:\n${detalhes}`
              : 'Nenhuma questão encontrada no PDF. Verifique se é uma prova/apostila de questões.'
          );
        }
        setFase('upload');
      } else {
        setFase('previa');
        const msgs = [];
        if (viaOCR.length > 0)  msgs.push(`🔍 ${viaOCR.length} página(s) via OCR`);
        if (erros.length > 0)   msgs.push(`⚠️ ${erros.length} página(s) com erro`);
        if (semTexto.length > 0) msgs.push(`🖼️ ${semTexto.length} página(s) sem texto`);
        if (msgs.length > 0) {
          toast(msgs.join(' · '), { duration: 5000 });
        } else {
          toast.success(`✅ ${todasQuestoes.length} questão(ões) encontrada(s)!`);
        }
      }

    } catch (err) {
      console.error('Erro geral:', err);
      setErroGlobal(`Erro ao processar o PDF: ${err.message}`);
      setFase('upload');
    }
  };

  /* ── Importação final ── */
  const confirmar = async () => {
    const selecionadas = questoesExtraidas.filter((_, i) => questoesSelecionadas.has(i));
    if (!selecionadas.length) { toast.error('Selecione ao menos uma questão.'); return; }

    setFase('importando');
    let ok = 0;

    for (let i = 0; i < selecionadas.length; i++) {
      const q = selecionadas[i];
      const gabarito = (q.gabarito || '').toUpperCase();

      await db.questoes.add({
        banca:     q.banca    || '',
        ano:       q.ano      || null,
        materia:   q.materia  || '',
        conteudo:  q.conteudo || '',
        topico:    q.topico   || '',
        assunto:   '',
        enunciado: q.enunciado || '',
        imagemEnunciado: '',
        comando:   q.comando  || '',
        alternativas: {
          A: q.alternativas?.A || '',
          B: q.alternativas?.B || '',
          C: q.alternativas?.C || '',
          D: q.alternativas?.D || '',
          E: q.alternativas?.E || '',
        },
        imagensAlternativas: { A: '', B: '', C: '', D: '', E: '' },
        gabarito: ['A','B','C','D','E'].includes(gabarito) ? gabarito : 'A',
        explicacao: q.explicacao || '',
      });

      ok++;
      setProgresso(Math.round((ok / selecionadas.length) * 100));
    }

    toast.success(`${ok} questão(ões) importada(s) com sucesso!`);
    onImportar?.();
    onFechar();
  };

  /* ── Drag & Drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault(); setArrastar(false);
    processarPDF(e.dataTransfer.files[0]);
  }, [apiKey]);

  /* ─── Render ─── */
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(6px)',
      padding: '16px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--r-2xl)',
        width: '100%',
        maxWidth: fase === 'previa' ? '920px' : '580px',
        maxHeight: '92vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        border: '1px solid var(--gray-100)',
        transition: 'max-width 0.3s ease',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #f0fdf4 0%, white 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              borderRadius: 'var(--r-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
            }}>📄</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Importar PDF com IA
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '1px' }}>
                PDF.js + Tesseract OCR + GroqCloud — texto <strong>e</strong> escaneados
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            disabled={fase === 'processando' || fase === 'importando'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--gray-400)', fontSize: '22px', lineHeight: 1,
              opacity: (fase === 'processando' || fase === 'importando') ? 0.3 : 1,
            }}
          >×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {/* ── UPLOAD ── */}
          {fase === 'upload' && (
            <>
              {/* Como funciona */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px',
                marginBottom: '20px',
              }}>
                {[
                  { icon: '📄', titulo: 'Envie o PDF',      desc: 'Prova, simulado ou apostila' },
                  { icon: '🔍', titulo: 'OCR automático',   desc: 'Tesseract lê páginas escaneadas' },
                  { icon: '🤖', titulo: 'IA estrutura',     desc: 'GroqCloud extrai cada questão' },
                ].map((s, idx) => (
                  <div key={idx} style={{
                    background: 'var(--gray-50)', borderRadius: 'var(--r-lg)',
                    padding: '14px 12px', textAlign: 'center',
                    border: '1px solid var(--gray-100)',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--gray-800)', marginBottom: '3px' }}>{s.titulo}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', lineHeight: '1.4' }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {!apiKey && <ConfigApiKey apiKey={apiKey} onSalvar={setApiKey} />}

              {apiKey && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 'var(--r-md)', padding: '10px 14px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                    ✅ API Key GroqCloud configurada ({apiKey.substring(0, 16)}...)
                  </span>
                  <button onClick={() => { localStorage.removeItem('groq_api_key'); setApiKey(''); }}
                    style={{
                      background: 'none', border: '1px solid #86efac',
                      borderRadius: 'var(--r-sm)', padding: '2px 8px',
                      fontSize: '11px', color: '#15803d', cursor: 'pointer',
                    }}>Trocar</button>
                </div>
              )}

              {erroGlobal && (
                <div style={{
                  background: '#fef2f2', border: '1.5px solid #fecaca',
                  borderRadius: 'var(--r-lg)', padding: '12px 16px',
                  marginBottom: '16px',
                }}>
                  <p style={{ color: '#991b1b', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                    ⚠️ Erro no processamento
                  </p>
                  <p style={{ color: '#b91c1c', fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {erroGlobal}
                  </p>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setArrastar(true); }}
                onDragLeave={() => setArrastar(false)}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${arrastar ? '#16a34a' : 'var(--gray-200)'}`,
                  borderRadius: 'var(--r-xl)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: arrastar ? '#f0fdf4' : 'var(--gray-50)',
                  transition: 'all 0.2s',
                  marginBottom: '16px',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => processarPDF(e.target.files[0])}
                />
                <div style={{ fontSize: '44px', marginBottom: '12px' }}>📄</div>
                <p style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: '6px', fontSize: '15px' }}>
                  Arraste ou clique para selecionar o PDF
                </p>
                <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '14px' }}>
                  Texto selecionável <strong>e</strong> PDFs escaneados — máximo 50MB
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['✅ Enunciados', '✅ Alternativas', '✅ Páginas escaneadas (OCR)', '✅ Gabarito automático'].map(t => (
                    <span key={t} style={{
                      background: 'white', border: '1px solid var(--gray-200)',
                      borderRadius: '99px', padding: '3px 10px',
                      fontSize: '11px', color: 'var(--gray-600)', fontWeight: 500,
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Info OCR */}
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 'var(--r-md)', padding: '12px 14px',
                display: 'flex', gap: '10px',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>🔍</span>
                <div>
                  <p style={{ fontSize: '12px', color: '#1e40af', lineHeight: '1.55', marginBottom: '4px' }}>
                    <strong>OCR automático com Tesseract.js.</strong> Páginas sem texto extraível são processadas
                    automaticamente via reconhecimento óptico de caracteres em português.
                  </p>
                  <p style={{ fontSize: '11px', color: '#1d4ed8', lineHeight: '1.55' }}>
                    💡 PDFs com imagens de baixa resolução (&lt;150 DPI) podem ter OCR menos preciso.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── PROCESSANDO ── */}
          {fase === 'processando' && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>
                {statusOCR.startsWith('🔍') ? '🔍' : '🤖'}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                {statusOCR.startsWith('🔍') ? 'Reconhecendo texto (OCR)...' : 'Analisando o PDF...'}
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '6px' }}>
                Página <strong>{paginaAtual}</strong> de <strong>{paginasTotal}</strong>
              </p>
              {statusOCR && (
                <p style={{
                  color: statusOCR.startsWith('🔍') ? '#1d4ed8' : 'var(--gray-400)',
                  fontSize: '12px', marginBottom: '16px',
                  fontWeight: statusOCR.startsWith('🔍') ? 600 : 400,
                }}>
                  {statusOCR}
                </p>
              )}
              {!statusOCR && (
                <p style={{ color: 'var(--gray-400)', fontSize: '12px', marginBottom: '16px' }}>
                  Usando llama-3.3-70b — maior precisão na extração
                </p>
              )}
              <div style={{ maxWidth: '380px', margin: '0 auto 16px' }}>
                <ProgressBar valor={progresso} altura={10} cor="linear-gradient(90deg, #16a34a, #15803d)" />
              </div>
              <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>
                {progresso}% concluído
              </p>
              {paginasOCR.length > 0 && (
                <p style={{ color: '#1d4ed8', fontSize: '11px', marginTop: '8px' }}>
                  🔍 {paginasOCR.length} página(s) processada(s) via OCR
                </p>
              )}
            </div>
          )}

          {/* ── PRÉVIA ── */}
          {fase === 'previa' && questoesExtraidas.length > 0 && (
            <>
              <div style={{
                display: 'flex', gap: '12px', alignItems: 'center',
                marginBottom: '16px', flexWrap: 'wrap',
              }}>
                <div style={{
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                  borderRadius: 'var(--r-lg)', padding: '10px 18px', flex: 1, minWidth: '140px',
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>
                    {questoesExtraidas.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>questões extraídas</div>
                </div>
                <div style={{
                  background: 'var(--brand-50)', border: '1.5px solid var(--brand-200)',
                  borderRadius: 'var(--r-lg)', padding: '10px 18px', flex: 1, minWidth: '140px',
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--brand-600)' }}>
                    {questoesSelecionadas.size}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--brand-400)', fontWeight: 600 }}>selecionadas</div>
                </div>
                {paginasOCR.length > 0 && (
                  <div style={{
                    background: '#eff6ff', border: '1.5px solid #bfdbfe',
                    borderRadius: 'var(--r-lg)', padding: '10px 18px', flex: 1, minWidth: '140px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: '#1d4ed8' }}>
                      {paginasOCR.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>pág. via OCR</div>
                  </div>
                )}
                {(paginasComErro.length > 0 || paginasSemTexto.length > 0) && (
                  <div style={{
                    background: '#fef3c7', border: '1.5px solid #fde68a',
                    borderRadius: 'var(--r-lg)', padding: '10px 18px', flex: 1, minWidth: '140px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: '#d97706' }}>
                      {paginasComErro.length + paginasSemTexto.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>páginas ignoradas</div>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '10px',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)' }}>
                  <input type="checkbox" checked={todasSelecionadas} onChange={toggleTodas}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Selecionar todas
                </label>
                <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                  Clique em 👁 para visualizar
                </span>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 'var(--r-lg)', border: '1px solid var(--gray-100)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                      {['', 'Nº', 'Pág.', 'Matéria', 'Banca/Ano', 'Modo', 'Gabarito', ''].map((h, i) => (
                        <th key={i} style={{
                          padding: '10px 12px', textAlign: 'left',
                          fontWeight: 700, color: 'var(--gray-500)',
                          fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {questoesExtraidas.map((q, i) => {
                      const sel = questoesSelecionadas.has(i);
                      return (
                        <tr key={q._id} onClick={() => toggleQ(i)} style={{
                          borderBottom: '1px solid var(--gray-50)',
                          background: sel ? 'rgba(22,163,74,0.04)' : 'white',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}>
                          <td style={{ padding: '9px 12px' }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleQ(i)}
                              onClick={e => e.stopPropagation()}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--gray-800)' }}>
                            {q.numero || `#${i + 1}`}
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--gray-400)' }}>{q._pagina}</td>
                          <td style={{ padding: '9px 12px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.materia || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                            {[q.banca, q.ano].filter(Boolean).join(' / ') || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <StatusBadge modo={q._modoExtracao} />
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <GabBadge gabarito={q.gabarito} />
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <button onClick={e => { e.stopPropagation(); setPreview(q); }}
                              style={{
                                background: 'none', border: '1px solid var(--gray-200)',
                                borderRadius: 'var(--r-sm)', cursor: 'pointer',
                                padding: '3px 8px', fontSize: '13px', color: 'var(--gray-500)',
                              }} title="Visualizar questão">👁</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(paginasComErro.length > 0 || paginasSemTexto.length > 0) && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {paginasComErro.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#ef4444' }}>
                      ⚠️ Páginas {paginasComErro.join(', ')} tiveram erro no processamento.
                    </p>
                  )}
                  {paginasSemTexto.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#d97706' }}>
                      🖼️ Páginas {paginasSemTexto.join(', ')} não tiveram texto extraível (nem pelo OCR).
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── IMPORTANDO ── */}
          {fase === 'importando' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Salvando questões...
              </h3>
              <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '24px' }}>
                {progresso}% concluído
              </p>
              <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                <ProgressBar valor={progresso} altura={10} cor="linear-gradient(90deg, #16a34a, #15803d)" />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {fase === 'previa' && (
          <div style={{
            padding: '14px 28px',
            borderTop: '1px solid var(--gray-100)',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            flexShrink: 0, background: 'var(--gray-50)',
          }}>
            <button className="btn-secondary"
              onClick={() => { setFase('upload'); setQuestoes([]); setSelec(new Set()); }}
              style={{ padding: '10px 20px' }}>
              ← Novo PDF
            </button>
            <button className="btn-primary"
              onClick={confirmar}
              disabled={questoesSelecionadas.size === 0}
              style={{
                padding: '10px 24px',
                opacity: questoesSelecionadas.size === 0 ? 0.5 : 1,
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: questoesSelecionadas.size > 0 ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
              }}>
              ✅ Importar {questoesSelecionadas.size} questão(ões)
            </button>
          </div>
        )}
      </div>

      {/* ── Modal de Preview ── */}
      {preview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(15,23,42,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setPreview(null)}>
          <div style={{
            background: 'white', borderRadius: 'var(--r-2xl)',
            width: '100%', maxWidth: '680px', maxHeight: '85vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--gray-900)' }}>
                Prévia — Questão {preview.numero || '?'} (pág. {preview._pagina})
                {preview._modoExtracao === 'ocr' && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                    🔍 via OCR
                  </span>
                )}
              </h4>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[preview.banca, preview.ano, preview.materia, preview.conteudo, preview.topico].filter(Boolean).map((v, i) => (
                  <span key={i} style={{
                    background: 'var(--brand-50)', color: 'var(--brand-600)',
                    borderRadius: '99px', padding: '2px 10px',
                    fontSize: '11px', fontWeight: 600, border: '1px solid var(--brand-200)',
                  }}>{v}</span>
                ))}
              </div>
              {preview.enunciado && (
                <div style={{ marginBottom: '12px', lineHeight: '1.7', color: 'var(--gray-700)', fontSize: '14px' }}>
                  {preview.enunciado}
                </div>
              )}
              {preview.comando && (
                <div style={{
                  background: '#fffbeb', padding: '10px 14px',
                  borderLeft: '3px solid var(--accent-amber)',
                  borderRadius: '0 var(--r-md) var(--r-md) 0',
                  marginBottom: '16px', color: '#92400e',
                  fontSize: '13px', fontWeight: 500,
                }}>
                  {preview.comando}
                </div>
              )}
              {['A','B','C','D','E'].map(lt => {
                const txt = preview.alternativas?.[lt];
                if (!txt) return null;
                const correta = lt === (preview.gabarito || '').toUpperCase();
                return (
                  <div key={lt} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    padding: '9px 12px', borderRadius: 'var(--r-md)',
                    marginBottom: '6px', fontSize: '13px',
                    background: correta ? 'rgba(16,185,129,0.08)' : 'var(--gray-50)',
                    border: `1.5px solid ${correta ? '#6ee7b7' : 'var(--gray-100)'}`,
                  }}>
                    <strong style={{ color: correta ? '#065f46' : 'var(--gray-600)', flexShrink: 0 }}>{lt})</strong>
                    <span style={{ color: 'var(--gray-700)', flex: 1, lineHeight: '1.6' }}>{txt}</span>
                    {correta && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>✓</span>}
                  </div>
                );
              })}
              {preview.explicacao && (
                <div style={{
                  marginTop: '12px', background: 'var(--gray-50)',
                  borderRadius: 'var(--r-md)', padding: '12px 14px',
                  fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6',
                  borderLeft: '3px solid var(--brand-300)',
                }}>
                  <strong style={{ color: 'var(--brand-600)', display: 'block', marginBottom: '4px' }}>💡 Explicação</strong>
                  {preview.explicacao}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarPDF;