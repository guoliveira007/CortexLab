/**
 * pdfExtraction.js — Primitivos compartilhados de extração de PDF.
 *
 * Usado por:
 *   - src/components/ImportarPDF.jsx
 *   - src/components/ImportarIA/utils.js
 *
 * Contém apenas as funções de nível baixo (carregamento de libs,
 * extração de texto, renderização e OCR). A lógica de alto nível
 * (agrupamento em lotes, prompts, chamadas Groq) permanece em
 * cada módulo, pois os dois fluxos têm estratégias distintas.
 */

/* ── Carregamento dinâmico de bibliotecas ─────────────────────── */

/**
 * Carrega PDF.js via CDN (singleton — carrega só uma vez por sessão).
 * @returns {Promise<pdfjsLib>}
 */
export const carregarPDFJS = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Carrega Tesseract.js via CDN (singleton).
 * @returns {Promise<Tesseract>}
 */
export const carregarTesseract = async () => {
  if (window.Tesseract) return window.Tesseract;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/* ── Utilitário ────────────────────────────────────────────────── */

/** Aguarda N milissegundos. */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ── Extração de texto ─────────────────────────────────────────── */

/**
 * Extrai texto de uma página do PDF usando PDF.js.
 * Reconstrói linhas com base na coordenada Y de cada item de texto.
 *
 * @param {PDFDocumentProxy} pdfDoc  Documento PDF aberto pelo PDF.js
 * @param {number}           num     Número da página (1-based)
 * @returns {Promise<string>}        Texto da página, sem espaços extras
 */
export const extrairTextoPagina = async (pdfDoc, num) => {
  const pagina   = await pdfDoc.getPage(num);
  const conteudo = await pagina.getTextContent();

  let ultimoY = null;
  const linhas = [];
  let linhaAtual = [];

  for (const item of conteudo.items) {
    const y = item.transform?.[5];
    if (ultimoY !== null && Math.abs(y - ultimoY) > 4) {
      linhas.push(linhaAtual.join(''));
      linhaAtual = [];
    }
    linhaAtual.push(item.str);
    ultimoY = y;
  }
  if (linhaAtual.length) linhas.push(linhaAtual.join(''));
  return linhas.join('\n').trim();
};

/* ── Renderização de canvas (para OCR) ────────────────────────── */

/**
 * Renderiza uma página do PDF num HTMLCanvasElement.
 * Retorna o canvas diretamente — Tesseract aceita HTMLCanvasElement.
 *
 * @param {PDFDocumentProxy} pdfDoc
 * @param {number}           num    Número da página (1-based)
 * @param {number}           escala Escala de renderização (default 2.0 = 2× a resolução original)
 * @returns {Promise<HTMLCanvasElement>}
 */
export const renderizarCanvas = async (pdfDoc, num, escala = 2.0) => {
  const pagina   = await pdfDoc.getPage(num);
  const viewport = pagina.getViewport({ scale: escala });

  const canvas  = document.createElement('canvas');
  canvas.width  = viewport.width;
  canvas.height = viewport.height;

  await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas;
};

/* ── OCR ──────────────────────────────────────────────────────── */

/**
 * Executa OCR com Tesseract.js (português) sobre um canvas.
 *
 * @param {HTMLCanvasElement} canvas      Canvas renderizado por renderizarCanvas
 * @param {Function}          [onProgresso]  Callback opcional: (pct: number) => void
 *                                           Recebe 0–100 durante o reconhecimento.
 * @returns {Promise<string>}             Texto extraído, sem espaços extras
 */
export const ocrPagina = async (canvas, onProgresso) => {
  const Tesseract = await carregarTesseract();

  const logger = onProgresso
    ? (m) => {
        if (m.status === 'recognizing text') {
          onProgresso(Math.round(m.progress * 100));
        }
      }
    : undefined;

  const { data } = await Tesseract.recognize(canvas, 'por', logger ? { logger } : {});
  return data.text?.trim() || '';
};
