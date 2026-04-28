// src/database.js
import { db as firestoreDb, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

// Objeto que será exportado
const db = {};

// ──────────────────────────────────────────────
// Referência ao usuário logado
// ──────────────────────────────────────────────
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return user.uid;
};

// ──────────────────────────────────────────────
// Helpers: caminhos das coleções do usuário
// ──────────────────────────────────────────────
const col = (nome) => {
  const uid = getUserId();
  return collection(firestoreDb, 'usuarios', uid, nome);
};

const docRef = (nome, id) => {
  const uid = getUserId();
  return doc(firestoreDb, 'usuarios', uid, nome, id);
};

// Conversão Firestore → objeto plano (id + dados)
const fromFirestore = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
});

const toFirestore = (obj) => {
  const copy = { ...obj };
  delete copy.id;
  return copy;
};

// ──────────────────────────────────────────────
// FUNÇÕES PRINCIPAIS (mesma assinatura do Dexie)
// ──────────────────────────────────────────────

// -- Questões --
db.questoes = {
  toArray: async () => {
    const snap = await getDocs(col('questoes'));
    return snap.docs.map(fromFirestore);
  },
  get: async (id) => {
    const snap = await getDoc(docRef('questoes', String(id)));
    return snap.exists() ? fromFirestore(snap) : undefined;
  },
  add: async (questao) => {
    const ref = await addDoc(col('questoes'), toFirestore(questao));
    return ref.id;
  },
  update: async (id, changes) => {
    await updateDoc(docRef('questoes', String(id)), toFirestore(changes));
  },
  delete: async (id) => {
    await deleteDoc(docRef('questoes', String(id)));
  },
  where: (campo) => ({
    equals: async (valor) => {
      const q = query(col('questoes'), where(campo, '==', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
    anyOf: async (valores) => {
      const q = query(col('questoes'), where(campo, 'in', valores));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
  }),
  count: async () => {
    const snap = await getDocs(col('questoes'));
    return snap.size;
  },
};

// -- Resultados --
db.resultados = {
  toArray: async () => {
    const snap = await getDocs(col('resultados'));
    return snap.docs.map(fromFirestore);
  },
  add: async (resultado) => {
    const ref = await addDoc(col('resultados'), toFirestore(resultado));
    return ref.id;
  },
  update: async (id, changes) => {
    await updateDoc(docRef('resultados', String(id)), toFirestore(changes));
  },
  where: (campo) => ({
    equals: async (valor) => {
      const q = query(col('resultados'), where(campo, '==', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
  }),
  count: async () => {
    const snap = await getDocs(col('resultados'));
    return snap.size;
  },
};

// -- Revisão Espaçada --
db.revisaoEspacada = {
  where: (campo) => ({
    belowOrEqual: async (valor) => {
      const q = query(col('revisaoEspacada'), where(campo, '<=', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
    equals: async (valor) => {
      const q = query(col('revisaoEspacada'), where(campo, '==', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
  }),
  toArray: async () => {
    const snap = await getDocs(col('revisaoEspacada'));
    return snap.docs.map(fromFirestore);
  },
  add: async (estado) => {
    const ref = await addDoc(col('revisaoEspacada'), toFirestore(estado));
    return ref.id;
  },
  update: async (id, changes) => {
    await updateDoc(docRef('revisaoEspacada', String(id)), toFirestore(changes));
  },
  delete: async (id) => {
    await deleteDoc(docRef('revisaoEspacada', String(id)));
  },
  first: async (questaoId) => {
    const q = query(col('revisaoEspacada'), where('questaoId', '==', String(questaoId)));
    const snap = await getDocs(q);
    return snap.empty ? null : fromFirestore(snap.docs[0]);
  },
};

// -- Sessões --
db.sessoes = {
  toArray: async () => {
    const snap = await getDocs(col('sessoes'));
    return snap.docs.map(fromFirestore);
  },
};

// -- Metas --
db.metas = {
  toArray: async () => {
    const snap = await getDocs(col('metas'));
    return snap.docs.map(fromFirestore);
  },
  where: (campo) => ({
    equals: async (valor) => {
      const q = query(col('metas'), where(campo, '==', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
  }),
  add: async (meta) => {
    const ref = await addDoc(col('metas'), toFirestore(meta));
    return ref.id;
  },
  update: async (id, changes) => {
    await updateDoc(docRef('metas', String(id)), toFirestore(changes));
  },
};

// -- Planejamento --
db.planejamento = {
  toArray: async () => {
    const snap = await getDocs(col('planejamento'));
    return snap.docs.map(fromFirestore);
  },
};

// -- Conquistas --
db.conquistas = {
  toArray: async () => {
    const snap = await getDocs(col('conquistas'));
    return snap.docs.map(fromFirestore);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES COMPOSTAS (Dashboard e auxiliares)
// ═══════════════════════════════════════════════════════════════════════════

db.getDashboardData = async () => {
  const [resultados, questoes, sessoes, estadosSM2, metas, planejamento] = await Promise.all([
    db.resultados.toArray(),
    db.questoes.toArray(),
    db.sessoes.toArray(),
    db.revisaoEspacada.toArray(),
    db.metas.toArray(),
    db.planejamento.toArray(),
  ]);

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const hojeDS = hoje.toDateString();

  const questoesMap = {};
  questoes.forEach(q => { questoesMap[q.id] = q; });
  const idsExistentes = new Set(questoes.map(q => String(q.id)));

  const hojeRs = resultados.filter(r => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString() === hojeDS;
  });
  const sessoesHoje = sessoes.filter(s => {
    const d = s.data ? new Date(s.data) : new Date(0);
    return d.toDateString() === hojeDS;
  });
  const tempoHojeMin = Math.round(sessoesHoje.reduce((a, s) => a + (s.duracao || 0), 0) / 60);

  const total = resultados.length;
  const acertos = resultados.filter(r => r.acertou).length;
  const taxa = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

  const datasUnicas = [...new Set(resultados.map(r => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString();
  }))];
  let streak = 0;
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    if (datasUnicas.includes(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  const revisoesHoje = estadosSM2.filter(
    e => e.proximaRevisao <= hojeStr && idsExistentes.has(String(e.questaoId))
  ).length;

  const ultimoPorQuestao = {};
  resultados.forEach(r => {
    const id = String(r.id_questao || '');
    if (!id || !idsExistentes.has(id)) return;
    const data = r.data || '';
    if (!ultimoPorQuestao[id] || data > ultimoPorQuestao[id].data) {
      ultimoPorQuestao[id] = r;
    }
  });
  const errosCount = Object.values(ultimoPorQuestao).filter(r => r.acertou === false || r.acertou === 0).length;

  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (6 - i));
    dia.setHours(0,0,0,0);
    const fim = new Date(dia); fim.setHours(23,59,59);
    const rs = resultados.filter(r => {
      const rd = r.data ? new Date(r.data) : new Date(0);
      return rd >= dia && rd <= fim;
    });
    return {
      label: dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      data: dia.toISOString().split('T')[0],
      total: rs.length,
      acertos: rs.filter(r => r.acertou).length,
      isHoje: dia.toDateString() === hojeDS,
    };
  });

  const errosPorMateria = {};
  resultados.filter(r => !r.acertou).forEach(r => {
    const q = questoesMap[r.id_questao];
    if (!q?.materia) return;
    errosPorMateria[q.materia] = (errosPorMateria[q.materia] || 0) + 1;
  });
  const topErros = Object.entries(errosPorMateria)
    .sort((a,b) => b[1] - a[1])
    .slice(0,3)
    .map(([materia, count]) => ({ materia, count }));

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

  const diaSemanaHoje = (() => {
    const js = new Date().getDay();
    return js === 0 ? 6 : js - 1;
  })();
  const blocosHoje = planejamento.filter(b => b.dia === diaSemanaHoje);
  const blocosConcluidos = blocosHoje.filter(b => b.concluido).length;

  const insights = [];
  if (revisoesHoje > 0) {
    insights.push({
      tipo: 'urgente', icone: '🧠',
      titulo: `${revisoesHoje} revisão${revisoesHoje > 1 ? 'ões' : ''} pendente${revisoesHoje > 1 ? 's' : ''}`,
      desc: 'Revise agora para maximizar a retenção de longo prazo.',
      acao: 'revisao', cor: '#6366f1',
    });
  }
  if (errosCount > 5) {
    insights.push({
      tipo: 'atencao', icone: '📓',
      titulo: `${errosCount} questões no caderno de erros`,
      desc: topErros[0] ? `${topErros[0].materia} é sua maior dificuldade.` : 'Revise os erros para evoluir.',
      acao: 'caderno', cor: '#ef4444',
    });
  }
  if (streak >= 3 && hojeRs.length === 0) {
    insights.push({
      tipo: 'alerta', icone: '🔥',
      titulo: `Sequência de ${streak} dias em risco!`,
      desc: 'Responda ao menos uma questão para manter sua streak.',
      acao: 'freestyle', cor: '#f59e0b',
    });
  }
  if (hojeRs.length >= 10) {
    const taxaHoje = hojeRs.length ? Math.round((hojeRs.filter(r => r.acertou).length / hojeRs.length) * 100) : 0;
    insights.push({
      tipo: 'conquista', icone: taxaHoje >= 70 ? '🏆' : '💪',
      titulo: taxaHoje >= 70 ? `${taxaHoje}% de acerto hoje!` : `${hojeRs.length} questões respondidas`,
      desc: taxaHoje >= 70 ? 'Excelente desempenho! Continue assim.' : 'Bom ritmo, foque na qualidade.',
      acao: null, cor: '#10b981',
    });
  }

  return {
    total, acertos, taxa,
    tempoHojeMin,
    questoesHoje: hojeRs.length,
    streak,
    revisoesHoje,
    errosCount,
    ultimos7,
    progressoMetas,
    blocosHoje,
    blocosConcluidos,
    totalBlocosHoje: blocosHoje.length,
    insights,
    topErros,
    totalQuestoesBanco: questoes.length,
  };
};

db.getQuestoesParaRevisarHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const estados = await db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje);
  if (estados.length === 0) return [];
  const ids = estados.map(e => e.questaoId);
  const questoes = await db.questoes.where('id').anyOf(ids);
  return questoes.map(q => ({
    ...q,
    sm2: estados.find(e => String(e.questaoId) === String(q.id))
  })).filter(q => q.sm2);
};

db.getContagemRevisaoHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const estados = await db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje);
  return estados.length;
};

db.getEstadoRevisao = async (questaoId) => {
  return db.revisaoEspacada.first(questaoId);
};

db.salvarEstadoRevisao = async (estado) => {
  const existente = await db.getEstadoRevisao(estado.questaoId);
  if (existente) await db.revisaoEspacada.update(existente.id, estado);
  else await db.revisaoEspacada.add(estado);
};

db.removerDaRevisao = async (questaoId) => {
  const estado = await db.getEstadoRevisao(questaoId);
  if (estado) await db.revisaoEspacada.delete(estado.id);
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
  const existentes = await db.metas.where('tipo').equals(tipo);
  if (existentes.length > 0) {
    await db.metas.update(existentes[0].id, { valor, label });
  } else {
    await db.metas.add({ tipo, valor, label });
  }
};

db.getStatsConquistas = async () => {
  const [resultados, sessoes, questoes] = await Promise.all([
    db.resultados.toArray(),
    db.sessoes.toArray(),
    db.questoes.toArray(),
  ]);
  const total = resultados.length;
  const acertos = resultados.filter(r => r.acertou).length;
  const taxa = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

  const datas = [...new Set(resultados.map(r => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString();
  }))];
  let streak = 0;
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    if (datas.includes(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  const simsUnicos = new Set(resultados.filter(r => r.modo === 'simulado').map(r => r.simuladoNome).filter(Boolean)).size;
  const questoesMap = {};
  questoes.forEach(q => { questoesMap[q.id] = q; });
  const materiasUnicas = new Set(resultados.map(r => questoesMap[r.id_questao]?.materia).filter(Boolean)).size;

  return { total, taxa, streak, simulados: simsUnicos, pomodoros: sessoes.length, materias: materiasUnicas };
};

// ═══════════════════════════════════════════════════════════════════════════
// Compatibilidade com código antigo
// ═══════════════════════════════════════════════════════════════════════════
export const invalidateCache = () => {};

export { db };