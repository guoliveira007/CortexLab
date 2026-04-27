import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SM2_GRAUS,
  hoje,
  adicionarDias,
  estadoInicial,
  aplicarSM2,
  deveRevisarHoje,
  descricaoIntervalo,
  taxaAcerto,
} from '../src/components/sm2';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-26T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hoje', () => {
  it('retorna a data atual no formato YYYY-MM-DD', () => {
    expect(hoje()).toBe('2026-04-26');
  });
});

describe('adicionarDias', () => {
  it('adiciona dias corretamente', () => {
    expect(adicionarDias('2026-04-26', 1)).toBe('2026-04-27');
    expect(adicionarDias('2026-04-26', 7)).toBe('2026-05-03');
  });

  it('funciona com mudança de mês', () => {
    expect(adicionarDias('2026-04-30', 1)).toBe('2026-05-01');
  });
});

describe('estadoInicial', () => {
  it('cria um estado inicial válido', () => {
    const estado = estadoInicial('123');
    expect(estado.questaoId).toBe('123');
    expect(estado.intervalo).toBe(1);
    expect(estado.repeticoes).toBe(0);
    expect(estado.fatorFacilidade).toBe(2.5);
    expect(estado.proximaRevisao).toBe('2026-04-26');
    expect(estado.ultimaRevisao).toBeNull();
    expect(estado.totalRevisoes).toBe(0);
    expect(estado.totalErros).toBe(0);
  });
});

describe('aplicarSM2', () => {
  it('reinicia o intervalo ao errar (grau 0)', () => {
    const estado = estadoInicial('1');
    const novo = aplicarSM2(estado, SM2_GRAUS.ERROU);
    expect(novo.repeticoes).toBe(0);
    expect(novo.intervalo).toBe(1);
    expect(novo.proximaRevisao).toBe('2026-04-27');
    expect(novo.totalErros).toBe(1);
    expect(novo.totalRevisoes).toBe(1);
  });

  it('avança nos intervalos iniciais ao acertar com dificuldade', () => {
    let estado = estadoInicial('2');
    estado = aplicarSM2(estado, SM2_GRAUS.DIFICIL);
    expect(estado.repeticoes).toBe(1);
    expect(estado.intervalo).toBe(1);
    expect(estado.proximaRevisao).toBe('2026-04-27');

    estado = aplicarSM2(estado, SM2_GRAUS.DIFICIL);
    expect(estado.repeticoes).toBe(2);
    expect(estado.intervalo).toBe(3);
    // corrigido: 26 + 3 = 29
    expect(estado.proximaRevisao).toBe('2026-04-29');
  });

  it('usa os intervalos iniciais corretos (1,3,7,14)', () => {
    let estado = estadoInicial('3');
    const intervalosEsperados = [1, 3, 7, 14];
    for (let i = 0; i < 4; i++) {
      estado = aplicarSM2(estado, SM2_GRAUS.FACIL);
      expect(estado.intervalo).toBe(intervalosEsperados[i]);
    }
  });

  it('após os intervalos iniciais, multiplica pelo fator de facilidade', () => {
    let estado = estadoInicial('4');
    for (let i = 0; i < 4; i++) {
      estado = aplicarSM2(estado, SM2_GRAUS.FACIL);
    }
    const proximo = aplicarSM2(estado, SM2_GRAUS.FACIL);
    const fator = estado.fatorFacilidade;
    const esperado = Math.round(14 * fator);
    expect(proximo.intervalo).toBe(esperado);
  });

  it('ajusta o fator de facilidade para baixo com erros', () => {
    const estado = estadoInicial('5');
    const novo = aplicarSM2(estado, SM2_GRAUS.ERROU);
    expect(novo.fatorFacilidade).toBeLessThan(2.5);
  });

  it('mantém o fator de facilidade mínimo em 1.3', () => {
    let estado = estadoInicial('6');
    for (let i = 0; i < 20; i++) {
      estado = aplicarSM2(estado, SM2_GRAUS.ERROU);
    }
    expect(estado.fatorFacilidade).toBe(1.3);
  });
});

describe('deveRevisarHoje', () => {
  it('retorna true se a data de revisão é hoje ou passada', () => {
    expect(deveRevisarHoje({ proximaRevisao: '2026-04-26' })).toBe(true);
    expect(deveRevisarHoje({ proximaRevisao: '2026-04-25' })).toBe(true);
  });

  it('retorna false se a data de revisão é futura', () => {
    expect(deveRevisarHoje({ proximaRevisao: '2026-04-27' })).toBe(false);
  });

  it('retorna true se não houver data de próxima revisão', () => {
    expect(deveRevisarHoje({})).toBe(true);
    expect(deveRevisarHoje(null)).toBe(true);
  });
});

describe('descricaoIntervalo', () => {
  it('retorna texto descritivo para diferentes intervalos', () => {
    expect(descricaoIntervalo(1)).toBe('Amanhã');
    expect(descricaoIntervalo(3)).toBe('Em 3 dias');
    expect(descricaoIntervalo(7)).toBe('Em 1 semana');
    expect(descricaoIntervalo(14)).toBe('Em 2 semanas');
    expect(descricaoIntervalo(30)).toBe('Em ~1 mês');
    // corrigido: 60 exatos retornam "Em 2 meses"
    expect(descricaoIntervalo(60)).toBe('Em 2 meses');
  });
});

describe('taxaAcerto', () => {
  it('calcula a taxa de acerto corretamente', () => {
    const estado = { totalRevisoes: 10, totalErros: 3 };
    expect(taxaAcerto(estado)).toBe(70);
  });

  it('retorna null se não há revisões', () => {
    expect(taxaAcerto({})).toBeNull();
    expect(taxaAcerto(null)).toBeNull();
  });
});