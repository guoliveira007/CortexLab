import { describe, it, expect } from 'vitest';
import { filtrarPorTexto } from '../src/utils/filtros';

const questoesMock = [
  {
    enunciado: 'Qual é a capital do Brasil?',
    comando: 'Assinale a alternativa correta.',
    alternativas: { A: 'São Paulo', B: 'Rio de Janeiro', C: 'Brasília', D: 'Salvador' },
    explicacao: 'Brasília é a capital federal.',
  },
  {
    enunciado: 'Quem descobriu o Brasil?',
    comando: 'Marque a opção correta.',
    alternativas: { A: 'Pedro Álvares Cabral', B: 'Cristóvão Colombo' },
    explicacao: 'Cabral chegou em 1500.',
  },
  {
    enunciado: '',
    comando: 'Qual é a fórmula da água?',
    alternativas: { A: 'H2O', B: 'CO2' },
    explicacao: '',
  },
];

describe('filtrarPorTexto', () => {
  it('retorna todas as questões quando a busca está vazia', () => {
    expect(filtrarPorTexto(questoesMock, '')).toHaveLength(3);
    expect(filtrarPorTexto(questoesMock, null)).toHaveLength(3);
  });

  it('encontra questões pelo enunciado', () => {
    const resultado = filtrarPorTexto(questoesMock, 'capital');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].comando).toContain('Assinale');
  });

  it('encontra questões pelo comando', () => {
    const resultado = filtrarPorTexto(questoesMock, 'marque');
    expect(resultado).toHaveLength(1);
  });

  it('encontra questões pelas alternativas', () => {
    const resultado = filtrarPorTexto(questoesMock, 'h2o');
    expect(resultado).toHaveLength(1);
  });

  it('encontra questões pela explicação', () => {
    const resultado = filtrarPorTexto(questoesMock, '1500');
    expect(resultado).toHaveLength(1);
  });

  it('é case insensitive', () => {
    const resultado = filtrarPorTexto(questoesMock, 'BRASÍLIA');
    expect(resultado).toHaveLength(1);
  });

  it('retorna array vazio se nenhum termo der match', () => {
    expect(filtrarPorTexto(questoesMock, 'inexistente')).toHaveLength(0);
  });
});