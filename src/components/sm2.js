/**
 * sm2.js — Algoritmo de Revisão Espaçada SM-2
 * Baseado no algoritmo original de Piotr Wozniak (SuperMemo 2).
 *
 * Intervalos iniciais configurados para: 1 → 3 → 7 → 14 dias,
 * depois multiplicador EF do SM-2 para longo prazo.
 */

export const SM2_GRAUS = {
  ERROU: 0,   // Errei completamente
  DIFICIL: 3, // Acertei com dificuldade
  FACIL: 5,   // Acertei facilmente
};

/** Intervalos fixos para as primeiras repetições (dias) */
const INTERVALOS_INICIAIS = [1, 3, 7, 14];

/** Retorna a data de hoje no formato YYYY-MM-DD */
export const hoje = () => new Date().toISOString().split('T')[0];

/** Adiciona N dias a uma data YYYY-MM-DD */
export const adicionarDias = (dataStr, dias) => {
  const d = new Date(dataStr + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
};

/** Estado inicial de uma questão no SM-2 */
export const estadoInicial = (questaoId) => ({
  questaoId,
  intervalo: 1,
  repeticoes: 0,
  fatorFacilidade: 2.5,
  proximaRevisao: hoje(),
  ultimaRevisao: null,
  totalRevisoes: 0,
  totalErros: 0,
});

/**
 * Aplica SM-2 e retorna o novo estado.
 * @param {Object} estado  - Estado atual da questão
 * @param {number} grau    - 0 (errou), 3 (difícil), 5 (fácil)
 */
export const aplicarSM2 = (estado, grau) => {
  let { intervalo, repeticoes, fatorFacilidade, totalRevisoes = 0, totalErros = 0 } = estado;

  totalRevisoes += 1;
  if (grau < 3) totalErros += 1;

  if (grau < 3) {
    // Errou: volta ao início
    repeticoes = 0;
    intervalo = 1;
  } else {
    // Acertou: usa intervalos fixos nas primeiras repetições, depois EF
    if (repeticoes < INTERVALOS_INICIAIS.length) {
      intervalo = INTERVALOS_INICIAIS[repeticoes];
    } else {
      intervalo = Math.round(intervalo * fatorFacilidade);
    }
    repeticoes += 1;
  }

  // Atualiza fator de facilidade (EF), mínimo 1.3
  fatorFacilidade = fatorFacilidade + (0.1 - (5 - grau) * (0.08 + (5 - grau) * 0.02));
  fatorFacilidade = Math.max(1.3, Math.round(fatorFacilidade * 100) / 100);

  const dataHoje = hoje();
  return {
    ...estado,
    intervalo,
    repeticoes,
    fatorFacilidade,
    proximaRevisao: adicionarDias(dataHoje, intervalo),
    ultimaRevisao: dataHoje,
    totalRevisoes,
    totalErros,
  };
};

/** Verifica se uma questão está disponível para revisão hoje */
export const deveRevisarHoje = (estado) => {
  if (!estado?.proximaRevisao) return true;
  return estado.proximaRevisao <= hoje();
};

/** Descrição legível do intervalo */
export const descricaoIntervalo = (intervalo) => {
  if (intervalo === 1) return 'Amanhã';
  if (intervalo < 7)  return `Em ${intervalo} dias`;
  if (intervalo === 7) return 'Em 1 semana';
  if (intervalo === 14) return 'Em 2 semanas';
  if (intervalo < 30) return `Em ${intervalo} dias`;
  if (intervalo < 60) return 'Em ~1 mês';
  return `Em ${Math.round(intervalo / 30)} meses`;
};

/** Taxa de acerto de uma questão */
export const taxaAcerto = (estado) => {
  if (!estado?.totalRevisoes) return null;
  return Math.round(((estado.totalRevisoes - estado.totalErros) / estado.totalRevisoes) * 100);
};
