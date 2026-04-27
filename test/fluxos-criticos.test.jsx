/**
 * fluxos-criticos.test.jsx
 *
 * Testes de integração para os três fluxos mais importantes da plataforma.
 * O banco Dexie roda de verdade via fake-indexeddb (configurado em test/setup.js).
 *
 * Fluxo 1 — responder questão → getDashboardData reflete a mudança
 * Fluxo 2 — simulado encerrado com questões em branco → taxa de acerto correta
 * Fluxo 3 — erro salvo → aparece no CadernoErros (incluindo paginação)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, invalidateCache } from '../../src/database';
import CadernoErros from '../../src/components/CadernoErros';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Cria um objeto de questão com defaults razoáveis. */
const questao = (overrides = {}) => ({
  banca: 'CESPE',
  ano: 2024,
  materia: 'Direito Constitucional',
  conteudo: 'Princípios Fundamentais',
  topico: 'Direitos e Garantias',
  enunciado: 'Considere o seguinte excerto...',
  comando: 'Assinale a alternativa correta.',
  alternativas: { A: 'Sim', B: 'Não', C: 'Talvez', D: 'Nunca', E: '' },
  gabarito: 'A',
  ...overrides,
});

/** Cria um resultado registrado agora. */
const resultado = (id_questao, acertou, overrides = {}) => ({
  id_questao,
  data: new Date().toISOString(),
  acertou,
  modo: 'freestyle',
  resposta: acertou ? 'A' : null,
  ...overrides,
});

/** Limpa todas as tabelas relevantes e invalida o cache antes de cada teste. */
const limparBanco = async () => {
  await Promise.all([
    db.questoes.clear(),
    db.resultados.clear(),
    db.sessoes.clear(),
    db.revisaoEspacada.clear(),
    db.metas.clear(),
    db.planejamento.clear(),
  ]);
  invalidateCache();
};

// ─── Fluxo 1 — responder questão → Dashboard ────────────────────────────────

describe('Fluxo 1 — responder questão → Dashboard', () => {
  beforeEach(limparBanco);

  it('acerto único: total=1, acertos=1, taxa=100, questoesHoje=1, errosCount=0', async () => {
    const qId = await db.questoes.add(questao());
    await db.resultados.add(resultado(qId, true));

    const data = await db.getDashboardData();

    expect(data.total).toBe(1);
    expect(data.acertos).toBe(1);
    expect(data.taxa).toBe(100);
    expect(data.questoesHoje).toBe(1);
    expect(data.errosCount).toBe(0);
  });

  it('erro único: total=1, acertos=0, taxa=0, errosCount=1', async () => {
    const qId = await db.questoes.add(questao());
    await db.resultados.add(resultado(qId, false));

    const data = await db.getDashboardData();

    expect(data.total).toBe(1);
    expect(data.acertos).toBe(0);
    expect(data.taxa).toBe(0);
    expect(data.errosCount).toBe(1);
  });

  it('misto 2 acertos + 1 erro: taxa=66.7', async () => {
    const ids = await Promise.all([
      db.questoes.add(questao({ enunciado: 'Q1' })),
      db.questoes.add(questao({ enunciado: 'Q2' })),
      db.questoes.add(questao({ enunciado: 'Q3' })),
    ]);
    await db.resultados.bulkAdd([
      resultado(ids[0], true),
      resultado(ids[1], true),
      resultado(ids[2], false),
    ]);

    const data = await db.getDashboardData();

    expect(data.total).toBe(3);
    expect(data.acertos).toBe(2);
    expect(data.taxa).toBe(66.7);
    expect(data.errosCount).toBe(1);
  });

  it('questão errada e depois acertada sai do caderno de erros', async () => {
    const qId = await db.questoes.add(questao());

    await db.resultados.add(resultado(qId, false, {
      data: new Date(Date.now() - 120_000).toISOString(),
    }));
    await db.resultados.add(resultado(qId, true));

    invalidateCache();

    const data = await db.getDashboardData();

    expect(data.errosCount).toBe(0);
    expect(data.total).toBe(2);
    expect(data.acertos).toBe(1);
    expect(data.taxa).toBe(50);
  });

  it('resultado de ontem não conta em questoesHoje', async () => {
    const qId = await db.questoes.add(questao());

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    await db.resultados.add(resultado(qId, true, { data: ontem.toISOString() }));

    const data = await db.getDashboardData();

    expect(data.total).toBe(1);
    expect(data.questoesHoje).toBe(0);
  });
});

// ─── Fluxo 2 — simulado com questões em branco → taxa correta ───────────────

describe('Fluxo 2 — simulado com questões em branco → taxa de acerto', () => {
  beforeEach(limparBanco);

  it('3 acertos + 2 em branco (acertou:false, resposta:null) → taxa=60%', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        db.questoes.add(questao({ enunciado: `Questão ${i + 1}` }))
      )
    );

    const registros = ids.map((id, i) => ({
      id_questao: id,
      data: new Date().toISOString(),
      acertou: i < 3,
      resposta: i < 3 ? 'A' : null,
      modo: 'simulado',
      simuladoNome: 'Simulado de Teste',
    }));
    await db.resultados.bulkAdd(registros);

    const data = await db.getDashboardData();

    expect(data.total).toBe(5);
    expect(data.acertos).toBe(3);
    expect(data.taxa).toBe(60);
    expect(data.errosCount).toBe(2);
  });

  it('simulado 100% em branco → taxa=0%, todas no caderno', async () => {
    const ids = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        db.questoes.add(questao({ enunciado: `Questão ${i + 1}` }))
      )
    );

    await db.resultados.bulkAdd(
      ids.map(id => ({
        id_questao: id,
        data: new Date().toISOString(),
        acertou: false,
        resposta: null,
        modo: 'simulado',
      }))
    );

    const data = await db.getDashboardData();

    expect(data.total).toBe(4);
    expect(data.acertos).toBe(0);
    expect(data.taxa).toBe(0);
    expect(data.errosCount).toBe(4);
  });

  it('simulado 100% correto → errosCount=0', async () => {
    const ids = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        db.questoes.add(questao({ enunciado: `Questão ${i + 1}` }))
      )
    );

    await db.resultados.bulkAdd(
      ids.map(id => ({
        id_questao: id,
        data: new Date().toISOString(),
        acertou: true,
        resposta: 'A',
        modo: 'simulado',
      }))
    );

    const data = await db.getDashboardData();

    expect(data.total).toBe(10);
    expect(data.acertos).toBe(10);
    expect(data.taxa).toBe(100);
    expect(data.errosCount).toBe(0);
  });

  it('resultado único de banco vazio → taxa=0 sem divisão por zero', async () => {
    const data = await db.getDashboardData();

    expect(data.total).toBe(0);
    expect(data.taxa).toBe(0);
    expect(data.errosCount).toBe(0);
  });
});

// ─── Fluxo 3 — erro salvo → aparece no CadernoErros ────────────────────────

describe('Fluxo 3 — erro salvo → aparece no CadernoErros', () => {
  const onFechar = vi.fn();
  beforeEach(async () => {
    await limparBanco();
    onFechar.mockReset();
  });

  it('questão errada aparece na lista do caderno', async () => {
    const qId = await db.questoes.add(
      questao({ enunciado: 'Sobre o princípio da legalidade...' })
    );
    await db.resultados.add(resultado(qId, false));

    render(<CadernoErros onFechar={onFechar} />);

    expect(
      await screen.findByText(/Sobre o princípio da legalidade/)
    ).toBeInTheDocument();
  });

  it('questão acertada depois NÃO aparece no caderno', async () => {
    const qId = await db.questoes.add(
      questao({ enunciado: 'Questão que o aluno corrigiu depois' })
    );
    await db.resultados.add(resultado(qId, false, {
      data: new Date(Date.now() - 60_000).toISOString(),
    }));
    await db.resultados.add(resultado(qId, true));

    render(<CadernoErros onFechar={onFechar} />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando erros/)).not.toBeInTheDocument();
    });

    expect(
      screen.queryByText(/Questão que o aluno corrigiu depois/)
    ).not.toBeInTheDocument();
  });

  it('banco vazio exibe estado vazio (sem questões)', async () => {
    render(<CadernoErros onFechar={onFechar} />);

    expect(
      await screen.findByText(/Nenhum erro registrado ainda/)
    ).toBeInTheDocument();
  });

  it('com >15 erros exibe controles de paginação e navega para a página 2', async () => {
    const ids = await Promise.all(
      Array.from({ length: 16 }, (_, i) =>
        db.questoes.add(questao({ enunciado: `Questão de erro ${i + 1}` }))
      )
    );
    await db.resultados.bulkAdd(
      ids.map(id => resultado(id, false, { modo: 'freestyle' }))
    );

    render(<CadernoErros onFechar={onFechar} />);

    // Aguarda a lista carregar
    await screen.findByText(/Questão de erro 1/);

    // Botões de paginação existem
    expect(screen.getByRole('button', { name: /Próxima/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeInTheDocument();

    // Página 1: item 16 ainda não aparece
    expect(screen.queryByText(/Questão de erro 16/)).not.toBeInTheDocument();

    // Navega para a página 2
    await userEvent.click(screen.getByRole('button', { name: /Próxima/ }));

    // Página 2: item 16 aparece, item 1 desaparece
    expect(await screen.findByText(/Questão de erro 16/)).toBeInTheDocument();
    expect(screen.queryByText(/Questão de erro 1/)).not.toBeInTheDocument();
  });

  it('com ≤15 erros NÃO exibe controles de paginação', async () => {
    const ids = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        db.questoes.add(questao({ enunciado: `Questão única ${i + 1}` }))
      )
    );
    await db.resultados.bulkAdd(
      ids.map(id => resultado(id, false))
    );

    render(<CadernoErros onFechar={onFechar} />);

    await screen.findByText(/Questão única 1/);

    expect(screen.queryByRole('button', { name: /Próxima/ })).not.toBeInTheDocument();
  });

  it('botão × chama onFechar', async () => {
    render(<CadernoErros onFechar={onFechar} />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando erros/)).not.toBeInTheDocument();
    });

    screen.getByRole('button', { name: '×' }).click();
    expect(onFechar).toHaveBeenCalledOnce();
  });
});
