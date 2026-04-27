import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestaoCard } from '../src/components/Freestyle';

// Mock do ExplicacaoIA (mesmo caminho usado no Freestyle)
vi.mock('../src/components/ExplicacaoIA', () => ({
  __esModule: true,
  default: () => <button>💡 Entender com IA</button>,
}));

const questaoBase = {
  id: 1,
  banca: 'CESPE',
  ano: 2024,
  materia: 'Português',
  conteudo: 'Interpretação',
  topico: 'Coesão',
  enunciado: 'Leia o texto abaixo...',
  comando: 'Assinale a alternativa correta.',
  alternativas: {
    A: 'Alternativa A',
    B: 'Alternativa B',
    C: 'Alternativa C',
    D: 'Alternativa D',
    E: 'Alternativa E',
  },
  gabarito: 'B',
  explicacao: 'Explicação da questão.',
};

describe('QuestaoCard', () => {
  it('renderiza os metadados da questão', () => {
    render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta={null} onResponder={vi.fn()} />
    );

    // Título "Q1" (pode aparecer duplicado pelo StrictMode)
    const titulos = screen.getAllByText('Q1');
    expect(titulos.length).toBeGreaterThan(0);

    expect(screen.getByText(/CESPE › 2024 › Português › Interpretação › Coesão/)).toBeInTheDocument();
    expect(screen.getByText('Leia o texto abaixo...')).toBeInTheDocument();
    expect(screen.getByText('Assinale a alternativa correta.')).toBeInTheDocument();
  });

  it('exibe as alternativas', () => {
    render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta={null} onResponder={vi.fn()} />
    );

    ['A', 'B', 'C', 'D', 'E'].forEach(letra => {
      const elementos = screen.getAllByText(new RegExp(`${letra}\\)`));
      expect(elementos.length).toBeGreaterThan(0);
    });
  });

  it('chama onResponder ao clicar em uma alternativa não respondida', async () => {
    const onResponder = vi.fn();
    const { container } = render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta={null} onResponder={onResponder} />
    );

    // Seleciona a primeira div com a classe "alternativa" que contém o texto "Alternativa A"
    const alternativaA = container.querySelector('.alternativa');
    if (alternativaA) await userEvent.click(alternativaA);

    expect(onResponder).toHaveBeenCalledWith(1, 'A');
  });

  it('não chama onResponder se a questão já foi respondida', async () => {
    const onResponder = vi.fn();
    const { container } = render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta="B" onResponder={onResponder} />
    );

    const alternativaA = container.querySelector('.alternativa');
    if (alternativaA) await userEvent.click(alternativaA);

    expect(onResponder).not.toHaveBeenCalled();
  });

  it('exibe feedback de acerto', () => {
    render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta="B" onResponder={vi.fn()} />
    );

    // Pode haver múltiplas mensagens devido ao StrictMode
    const acertos = screen.getAllByText('✅ Acertou!');
    expect(acertos.length).toBeGreaterThan(0);
  });

  it('exibe feedback de erro e mostra IA', () => {
    render(
      <QuestaoCard questao={questaoBase} numero="Q1" resposta="A" onResponder={vi.fn()} />
    );

    const erros = screen.getAllByText('❌ Resposta correta: B');
    expect(erros.length).toBeGreaterThan(0);

    // O mock do ExplicacaoIA renderiza um botão com esse texto
    const iaBotoes = screen.getAllByText('💡 Entender com IA');
    expect(iaBotoes.length).toBeGreaterThan(0);
  });
});