import { describe, it, expect } from 'vitest';
import { agruparEmLotes, montarPrompt } from '../src/components/ImportarIA/utils';

describe('agruparEmLotes', () => {
  it('agrupa corretamente com base no limite de 4000 caracteres', () => {
    const paginas = [
      { pagina: 1, texto: 'A'.repeat(2500) },
      { pagina: 2, texto: 'B'.repeat(1000) },
      { pagina: 3, texto: 'C'.repeat(3000) },
      { pagina: 4, texto: 'D'.repeat(500) },
      { pagina: 5, texto: '' },
    ];
    const lotes = agruparEmLotes(paginas);
    // Lote 1: págs 1 e 2 (2500 + 1000 = 3500 <= 4000)
    expect(lotes[0]).toEqual([paginas[0], paginas[1]]);
    // Lote 2: págs 3, 4 e 5 (3000 + 500 + 0 = 3500 <= 4000)
    expect(lotes[1]).toEqual([paginas[2], paginas[3], paginas[4]]);
    expect(lotes).toHaveLength(2);
  });

  it('retorna array vazio se entrada for vazia', () => {
    expect(agruparEmLotes([])).toEqual([]);
  });

  it('cada lote inicia uma nova página se a anterior exceder o limite', () => {
    const paginas = [
      { pagina: 1, texto: 'X'.repeat(5000) },
      { pagina: 2, texto: 'Y'.repeat(100) },
    ];
    const lotes = agruparEmLotes(paginas);
    // Página 1 sozinha (>4000), página 2 sozinha
    expect(lotes).toHaveLength(2);
    expect(lotes[0]).toEqual([paginas[0]]);
    expect(lotes[1]).toEqual([paginas[1]]);
  });
});

describe('montarPrompt', () => {
  it('gera um prompt contendo o texto fornecido', () => {
    const prompt = montarPrompt('Texto de exemplo para extração.');
    expect(prompt).toContain('Texto de exemplo para extração.');
    expect(prompt).toContain('Você é um especialista em extrair questões');
    expect(prompt).toContain('FORMATO: {"questoes":[...]}');
  });

  it('o prompt termina com o texto fornecido', () => {
    const prompt = montarPrompt('ABC');
    expect(prompt.endsWith('ABC')).toBe(true);
  });
});