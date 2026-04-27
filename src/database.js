import Dexie from 'dexie';

export const db = new Dexie('CortexLab');

// Versão 1 — tabelas originais
db.version(1).stores({
  questoes:   '++id, banca, ano, materia, conteudo, topico',
  resultados: '++id, id_questao, data, acertou, modo',
  listas:     '++id, nome, criada',
  simulados:  '++id, nome, criado',
  metas:      '++id, tipo',
});

// Versão 2 — adiciona 3 novas tabelas
db.version(2).stores({
  questoes:    '++id, banca, ano, materia, conteudo, topico',
  resultados:  '++id, id_questao, data, acertou, modo',
  listas:      '++id, nome, criada',
  simulados:   '++id, nome, criado',
  metas:       '++id, tipo',
  sessoes:     '++id, data, materia',
  planejamento:'++id, diaSemana',
  conquistas:  '++id, id_conquista',
});

// Versão 3 — Adiciona tabela de Revisão Espaçada (SM-2)
db.version(3).stores({
  questoes:        '++id, banca, ano, materia, conteudo, topico',
  resultados:      '++id, id_questao, data, acertou, modo',
  listas:          '++id, nome, criada',
  simulados:       '++id, nome, criado',
  metas:           '++id, tipo',
  sessoes:         '++id, data, materia',
  planejamento:    '++id, diaSemana',
  conquistas:      '++id, id_conquista',
  revisaoEspacada: '++id, questaoId, proximaRevisao, ultimaRevisao',
}).upgrade(() => {});


// ═══════════════════════════════════════════════════════════════════════════
// MIGRAÇÃO AUTOMÁTICA — LexisStudy → CortexLab
//
// Roda uma única vez, na primeira abertura do app após a renomeação.
// Se o banco antigo existir e o novo estiver vazio, copia tudo e apaga
// o antigo. Transparente para o usuário — nenhuma ação necessária.
// ═══════════════════════════════════════════════════════════════════════════
const TABELAS = [
  'questoes', 'resultados', 'listas', 'simulados', 'metas',
  'sessoes', 'planejamento', 'conquistas', 'revisaoEspacada',
];

const migrarDeLexisStudy = async () => {
  try {
    const existe = await Dexie.exists('LexisStudy');
    if (!existe) return; // nada a fazer

    // Se o CortexLab já tem resultados, apenas limpa o banco antigo
    const jaTemDados = await db.resultados.count().catch(() => 0);
    if (jaTemDados > 0) {
      await Dexie.delete('LexisStudy');
      return;
    }

    // Abre o banco antigo com o mesmo schema (versão 3)
    const antigo = new Dexie('LexisStudy');
    antigo.version(3).stores({
      questoes:        '++id, banca, ano, materia, conteudo, topico',
      resultados:      '++id, id_questao, data, acertou, modo',
      listas:          '++id, nome, criada',
      simulados:       '++id, nome, criado',
      metas:           '++id, tipo',
      sessoes:         '++id, data, materia',
      planejamento:    '++id, diaSemana',
      conquistas:      '++id, id_conquista',
      revisaoEspacada: '++id, questaoId, proximaRevisao, ultimaRevisao',
    });

    // Copia cada tabela preservando os IDs originais
    for (const tabela of TABELAS) {
      try {
        const dados = await antigo[tabela].toArray();
        if (dados.length > 0) await db[tabela].bulkAdd(dados);
      } catch (e) {
        console.warn(`[migração] Erro ao copiar ${tabela}:`, e.message);
      }
    }

    antigo.close();
    await Dexie.delete('LexisStudy');
    console.info('[CortexLab] Migração concluída: dados transferidos de LexisStudy.');
  } catch (e) {
    console.error('[CortexLab] Falha na migração:', e.message);
  }
};

// Dispara após o banco abrir com sucesso
db.on('ready', migrarDeLexisStudy);


// ═══════════════════════════════════════════════════════════════════════════
// CACHE SIMPLES — evita queries repetidas no mesmo segundo
// ═══════════════════════════════════════════════════════════════════════════
const _cache = {};
const _cacheTs = {};
const CACHE_TTL = 5000; // 5s

const cached = async (key, fn) => {
  const now = Date.now();
  if (_cache[key] && (now - _cacheTs[key]) < CACHE_TTL) return _cache[key];
  const result = await fn();
  _cache[key] = result;
  _cacheTs[key] = now;
  return result;
};

export const invalidateCache = (key) => {
  if (key) { delete _cache[key]; delete _cacheTs[key]; }
  else { Object.keys(_cache).forEach(k => delete _cache[k]); }
};


// ═══════════════════════════════════════════════════════════════════════════
// QUERY CENTRAL — carrega tudo de uma vez para o Dashboard
// ═══════════════════════════════════════════════════════════════════════════

db.getDashboardData = async () => {
  return cached('dashboard', async () => {
    const [resultados, questoes, sessoes, estadosSM2, metas, planejamento] = await Promise.all([
      db.resultados.toArray(),
      db.questoes.toArray(),
      db.sessoes.toArray().catch(() => []),
      db.revisaoEspacada.toArray().catch(() => []),
      db.metas.toArray().catch(() => []),
      db.planejamento.toArray().catch(() => []),
    ]);

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const hojeDS = hoje.toDateString();

    // --- Mapa de questões ---
    const questoesMap = {};
    questoes.forEach(q => { questoesMap[q.id] = q; });
    const idsExistentes = new Set(questoes.map(q => String(q.id)));

    // --- Resultados de hoje ---
    const hojeRs = resultados.filter(r => new Date(r.data).toDateString() === hojeDS);
    const sessoesHoje = sessoes.filter(s => new Date(s.data).toDateString() === hojeDS);
    const tempoHojeMin = Math.round(sessoesHoje.reduce((a, s) => a + (s.duracao || 0), 0) / 60);

    // --- Stats gerais ---
    const total = resultados.length;
    const acertos = resultados.filter(r => r.acertou).length;
    const taxa = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

    // --- Streak ---
    const datasUnicas = [...new Set(resultados.map(r => new Date(r.data).toDateString()))];
    let streak = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      if (datasUnicas.includes(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }

    // --- Revisões pendentes (filtrando questões deletadas) ---
    const revisoesHoje = estadosSM2.filter(
      e => e.proximaRevisao <= hojeStr && idsExistentes.has(String(e.questaoId))
    ).length;

    // --- Caderno de erros (último resultado = errado) ---
    const ultimoPorQuestao = {};
    resultados.forEach(r => {
      const id = String(r.id_questao || '');
      if (!id || !idsExistentes.has(id)) return;
      const data = r.data || '';
      if (!ultimoPorQuestao[id] || data > ultimoPorQuestao[id].data) {
        ultimoPorQuestao[id] = r;
      }
    });
    const errosCount = Object.values(ultimoPorQuestao)
      .filter(r => r.acertou === false || r.acertou === 0).length;

    // --- Desempenho últimos 7 dias ---
    const ultimos7 = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date();
      dia.setDate(dia.getDate() - (6 - i));
      dia.setHours(0, 0, 0, 0);
      const fim = new Date(dia); fim.setHours(23, 59, 59);
      const rs = resultados.filter(r => {
        const rd = new Date(r.data); return rd >= dia && rd <= fim;
      });
      return {
        label: dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        data: dia.toISOString().split('T')[0],
        total: rs.length,
        acertos: rs.filter(r => r.acertou).length,
        isHoje: dia.toDateString() === hojeDS,
      };
    });

    // --- Top matérias com mais erros ---
    const errosPorMateria = {};
    resultados.filter(r => !r.acertou).forEach(r => {
      const q = questoesMap[r.id_questao];
      if (!q?.materia) return;
      errosPorMateria[q.materia] = (errosPorMateria[q.materia] || 0) + 1;
    });
    const topErros = Object.entries(errosPorMateria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([materia, count]) => ({ materia, count }));

    // --- Progresso de metas ---
    const progressoMetas = metas.map(meta => {
      let atual = 0;
      if (meta.tipo === 'questoes_dia') atual = hojeRs.length;
      if (meta.tipo === 'taxa_acerto') {
        const tHoje = hojeRs.length;
        const aHoje = hojeRs.filter(r => r.acertou).length;
        atual = tHoje ? Number(((aHoje / tHoje) * 100).toFixed(1)) : 0;
      }
      if (meta.tipo === 'streak') atual = streak;
      if (meta.tipo === 'tempo_dia') atual = tempoHojeMin;
      return { ...meta, atual, percentual: meta.valor ? Math.min(Math.round((atual / meta.valor) * 100), 100) : 0 };
    });

    // --- Planejamento de hoje ---
    const diaSemanaHoje = (() => {
      const js = new Date().getDay();
      return js === 0 ? 6 : js - 1;
    })();
    const blocosHoje = planejamento.filter(b => b.dia === diaSemanaHoje);
    const blocosConcluidos = blocosHoje.filter(b => b.concluido).length;

    // --- Insights inteligentes ---
    const insights = [];

    if (revisoesHoje > 0) {
      insights.push({
        tipo: 'urgente',
        icone: '🧠',
        titulo: `${revisoesHoje} revisão${revisoesHoje > 1 ? 'ões' : ''} pendente${revisoesHoje > 1 ? 's' : ''}`,
        desc: 'Revise agora para maximizar a retenção de longo prazo.',
        acao: 'revisao',
        cor: '#6366f1',
      });
    }

    if (errosCount > 5) {
      insights.push({
        tipo: 'atencao',
        icone: '📓',
        titulo: `${errosCount} questões no caderno de erros`,
        desc: topErros[0] ? `${topErros[0].materia} é sua maior dificuldade.` : 'Revise os erros para evoluir.',
        acao: 'caderno',
        cor: '#ef4444',
      });
    }

    if (streak >= 3 && hojeRs.length === 0) {
      insights.push({
        tipo: 'alerta',
        icone: '🔥',
        titulo: `Sequência de ${streak} dias em risco!`,
        desc: 'Responda ao menos uma questão para manter sua streak.',
        acao: 'freestyle',
        cor: '#f59e0b',
      });
    }

    if (hojeRs.length >= 10) {
      const taxaHoje = hojeRs.length ? Math.round((hojeRs.filter(r => r.acertou).length / hojeRs.length) * 100) : 0;
      insights.push({
        tipo: 'conquista',
        icone: taxaHoje >= 70 ? '🏆' : '💪',
        titulo: taxaHoje >= 70 ? `${taxaHoje}% de acerto hoje!` : `${hojeRs.length} questões respondidas`,
        desc: taxaHoje >= 70 ? 'Excelente desempenho! Continue assim.' : 'Bom ritmo, foque na qualidade.',
        acao: null,
        cor: '#10b981',
      });
    }

    return {
      // stats principais
      total, acertos, taxa,
      tempoHojeMin,
      questoesHoje: hojeRs.length,
      streak,
      // widgets
      revisoesHoje,
      errosCount,
      // gráfico
      ultimos7,
      // metas
      progressoMetas,
      // planejamento
      blocosHoje,
      blocosConcluidos,
      totalBlocosHoje: blocosHoje.length,
      // insights
      insights,
      topErros,
      // meta info
      totalQuestoesBanco: questoes.length,
    };
  });
};


// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS EXISTENTES (mantidos com invalidação de cache)
// ═══════════════════════════════════════════════════════════════════════════

db.getQuestoesParaRevisarHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const estados = await db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje).toArray();
  if (estados.length === 0) return [];
  const ids = estados.map(e => e.questaoId);
  const questoes = await db.questoes.where('id').anyOf(ids).toArray();
  return questoes.map(q => ({
    ...q,
    sm2: estados.find(e => String(e.questaoId) === String(q.id))
  })).filter(q => q.sm2);
};

db.getContagemRevisaoHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  return db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje).count();
};

db.getEstadoRevisao = async (questaoId) => {
  return db.revisaoEspacada.where('questaoId').equals(String(questaoId)).first();
};

db.salvarEstadoRevisao = async (estado) => {
  const existente = await db.getEstadoRevisao(estado.questaoId);
  if (existente) await db.revisaoEspacada.update(existente.id, estado);
  else await db.revisaoEspacada.add(estado);
  invalidateCache('dashboard');
};

db.removerDaRevisao = async (questaoId) => {
  const estado = await db.getEstadoRevisao(questaoId);
  if (estado) await db.revisaoEspacada.delete(estado.id);
  invalidateCache('dashboard');
};

db.getEstatisticasGerais = async () => {
  const data = await db.getDashboardData();
  return {
    totalQuestoes: data.total,
    acertos: data.acertos,
    taxa: data.taxa,
    tempoHoje: data.tempoHojeMin,
    questoesHoje: data.questoesHoje,
  };
};

db.getStreak = async () => {
  const data = await db.getDashboardData();
  return data.streak;
};

db.getQuestoesDaLista = async (lista) => {
  const qs = await Promise.all(lista.questoes.map(id => db.questoes.get(id)));
  return qs.filter(Boolean);
};

db.getProgressoMetas = async () => {
  const data = await db.getDashboardData();
  return data.progressoMetas;
};

db.salvarMeta = async ({ tipo, valor, label }) => {
  const existente = await db.metas.where('tipo').equals(tipo).first();
  if (existente) await db.metas.update(existente.id, { valor, label });
  else await db.metas.add({ tipo, valor, label });
  invalidateCache('dashboard');
};

db.getStatsConquistas = async () => {
  const [resultados, sessoes, simuladosFeitos, questoes] = await Promise.all([
    db.resultados.toArray(),
    db.sessoes.toArray().catch(() => []),
    db.resultados.where('modo').equals('simulado').toArray().catch(() => []),
    db.questoes.toArray(),
  ]);
  const total = resultados.length;
  const acertos = resultados.filter(r => r.acertou).length;
  const taxa = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

  const datas = [...new Set(resultados.map(r => new Date(r.data).toDateString()))];
  let streak = 0;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    if (datas.includes(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  const simsUnicos = new Set(simuladosFeitos.map(r => r.simuladoNome).filter(Boolean)).size;

  const questoesMap = {};
  questoes.forEach(q => { questoesMap[q.id] = q; });
  const materiasUnicas = new Set(
    resultados.map(r => questoesMap[r.id_questao]?.materia).filter(Boolean)
  ).size;

  return { total, taxa, streak, simulados: simsUnicos, pomodoros: sessoes.length, materias: materiasUnicas };
};
