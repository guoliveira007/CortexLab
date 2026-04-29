// src/database.js
import { auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  documentId,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  writeBatch,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { onAuthStateChanged } from 'firebase/auth';

// ──────────────────────────────────────────────
// FIRESTORE COM PERSISTÊNCIA OFFLINE
// Substitui o enableIndexedDbPersistence (depreciado desde Firebase v9.12)
// ──────────────────────────────────────────────
let firestoreDb;
try {
  firestoreDb = initializeFirestore(getApp(), {
    localCache: persistentLocalCache(),
  });
} catch (e) {
  console.warn('[DB] Firestore já inicializado, usando instância existente:', e.message);
  firestoreDb = getFirestore();
}

// ──────────────────────────────────────────────
// AUTENTICAÇÃO (Race Condition Fix)
// ──────────────────────────────────────────────
let currentUser = null;
let authResolved = false;
const authWaiters = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authResolved = true;

  if (user) {
    while (authWaiters.length > 0) authWaiters.shift().resolve(user.uid);
  } else {
    while (authWaiters.length > 0) {
      authWaiters.shift().reject(
        new Error('[DB] Nenhum usuário autenticado. Faça login para continuar.')
      );
    }
  }
});

const getUserId = () => {
  return new Promise((resolve, reject) => {
    if (authResolved) {
      if (currentUser) return resolve(currentUser.uid);
      return reject(new Error('[DB] Nenhum usuário autenticado. Faça login para continuar.'));
    }

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      const idx = authWaiters.findIndex(w => w.resolve === resolve);
      if (idx !== -1) authWaiters.splice(idx, 1);
      reject(new Error('[DB] Tempo de espera esgotado. Verifique sua conexão e tente novamente.'));
    }, 8000);

    authWaiters.push({
      resolve: (uid) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(uid);
      },
      reject: (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(err);
      },
    });
  });
};

// ──────────────────────────────────────────────
// HELPERS DE REFERÊNCIA
// ──────────────────────────────────────────────
const col = async (nome) => {
  const uid = await getUserId();
  return collection(firestoreDb, 'usuarios', uid, nome);
};

const docRef = async (nome, id) => {
  const uid = await getUserId();
  return doc(firestoreDb, 'usuarios', uid, nome, String(id));
};

const fromFirestore = (docSnap) => ({ id: docSnap.id, ...docSnap.data() });

const toFirestore = (obj) => {
  const copy = { ...obj };
  delete copy.id;
  Object.keys(copy).forEach((k) => { if (copy[k] === undefined) delete copy[k]; });
  return copy;
};

// ──────────────────────────────────────────────
// BUSCA POR IDs DE DOCUMENTOS
// Usa documentId() em vez de where('id') — o ID não é um campo de dados.
// Chunking automático para listas > 30 itens (limite do Firestore).
// ──────────────────────────────────────────────
const getDocsByIds = async (colRef, ids) => {
  if (!ids || ids.length === 0) return [];
  const stringIds = [...new Set(ids.map(String))];
  const results = [];
  const CHUNK = 30;
  for (let i = 0; i < stringIds.length; i += CHUNK) {
    const chunk = stringIds.slice(i, i + CHUNK);
    const q = query(colRef, where(documentId(), 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push(fromFirestore(d)));
  }
  return results;
};

// ──────────────────────────────────────────────
// FACTORY DE COLEÇÕES
// ──────────────────────────────────────────────
const createCollectionHandler = (nome) => ({
  toArray: async () => {
    const c = await col(nome);
    const snap = await getDocs(c);
    return snap.docs.map(fromFirestore);
  },

  get: async (id) => {
    if (!id) return undefined;
    const dr = await docRef(nome, id);
    const snap = await getDoc(dr);
    return snap.exists() ? fromFirestore(snap) : undefined;
  },

  add: async (item) => {
    const c = await col(nome);
    const ref = await addDoc(c, toFirestore(item));
    return ref.id;
  },

  // ✅ bulkAdd — salva múltiplos itens usando writeBatch (lotes de 500)
  // Usado por ImportarIA (index.jsx) para salvar questões extraídas do PDF.
  bulkAdd: async (itens) => {
    if (!itens || itens.length === 0) return [];
    const uid = await getUserId();
    const ids = [];
    const LOTE = 500; // limite do Firestore por batch
    for (let i = 0; i < itens.length; i += LOTE) {
      const batch = writeBatch(firestoreDb);
      const chunk = itens.slice(i, i + LOTE);
      for (const item of chunk) {
        const ref = doc(collection(firestoreDb, 'usuarios', uid, nome));
        batch.set(ref, toFirestore(item));
        ids.push(ref.id);
      }
      await batch.commit();
    }
    return ids;
  },

  update: async (id, changes) => {
    const dr = await docRef(nome, id);
    await updateDoc(dr, toFirestore(changes));
  },

  delete: async (id) => {
    const dr = await docRef(nome, id);
    await deleteDoc(dr);
  },

  put: async (item) => {
    const { id, ...data } = item;
    if (id) {
      const dr = await docRef(nome, id);
      await setDoc(dr, toFirestore(data), { merge: true });
      return String(id);
    } else {
      const c = await col(nome);
      const ref = await addDoc(c, toFirestore(data));
      return ref.id;
    }
  },

  count: async () => {
    const c = await col(nome);
    const snap = await getDocs(c);
    return snap.size;
  },

  // Filtra por campo de dados (nunca pelo ID do documento)
  where: (campo) => ({
    equals: async (valor) => {
      const c = await col(nome);
      const q = query(c, where(campo, '==', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
    anyOf: async (valores) => {
      if (!valores || valores.length === 0) return [];
      const c = await col(nome);
      const unique = [...new Set(valores)];
      const results = [];
      const CHUNK = 30;
      for (let i = 0; i < unique.length; i += CHUNK) {
        const chunk = unique.slice(i, i + CHUNK);
        const q = query(c, where(campo, 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => results.push(fromFirestore(d)));
      }
      return results;
    },
    belowOrEqual: async (valor) => {
      const c = await col(nome);
      const q = query(c, where(campo, '<=', valor));
      const snap = await getDocs(q);
      return snap.docs.map(fromFirestore);
    },
  }),

  // Busca documentos pelos IDs reais do Firestore (não por campo)
  getByIds: async (ids) => {
    const c = await col(nome);
    return getDocsByIds(c, ids);
  },

  // clear usa writeBatch para evitar timeout em grandes coleções
  clear: async () => {
    const c = await col(nome);
    const snap = await getDocs(c);
    const LOTE = 500;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += LOTE) {
      const batch = writeBatch(firestoreDb);
      docs.slice(i, i + LOTE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  },
});

// ──────────────────────────────────────────────
// INICIALIZAÇÃO DAS COLEÇÕES
// ──────────────────────────────────────────────
const db = {};

db.questoes        = createCollectionHandler('questoes');
db.resultados      = createCollectionHandler('resultados');
db.revisaoEspacada = createCollectionHandler('revisaoEspacada');
db.sessoes         = createCollectionHandler('sessoes');
db.metas           = createCollectionHandler('metas');
db.planejamento    = createCollectionHandler('planejamento');
db.conquistas      = createCollectionHandler('conquistas');
db.listas          = createCollectionHandler('listas');     // ← BackupRestaurar
db.simulados       = createCollectionHandler('simulados');  // ← BackupRestaurar

// ──────────────────────────────────────────────
// REVISÃO ESPAÇADA
// ──────────────────────────────────────────────
db.revisaoEspacada.first = async (questaoId) => {
  const res = await db.revisaoEspacada.where('questaoId').equals(String(questaoId));
  return res.length > 0 ? res[0] : null;
};

db.getQuestoesParaRevisarHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const estados = await db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje);
  if (estados.length === 0) return [];
  const ids = estados.map((e) => e.questaoId);
  const questoes = await db.questoes.getByIds(ids); // ← usa documentId(), correto
  return questoes
    .map((q) => ({
      ...q,
      sm2: estados.find((e) => String(e.questaoId) === String(q.id)),
    }))
    .filter((q) => q.sm2);
};

// ✅ Usado por useRevisoesHoje.jsx — estava faltando no database.js anterior
db.getContagemRevisaoHoje = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const estados = await db.revisaoEspacada.where('proximaRevisao').belowOrEqual(hoje);
  return estados.length;
};

db.getEstadoRevisao    = async (questaoId) => db.revisaoEspacada.first(questaoId);

db.salvarEstadoRevisao = async (estado) => {
  const existente = await db.getEstadoRevisao(estado.questaoId);
  if (existente) await db.revisaoEspacada.update(existente.id, estado);
  else await db.revisaoEspacada.add(estado);
};

// ──────────────────────────────────────────────
// LISTAS DE QUESTÕES
// ✅ Usado por Lista.jsx — estava faltando no database.js anterior
// Uma lista deve ter o campo `questoesIds: string[]` com os IDs das questões.
// ──────────────────────────────────────────────
db.getQuestoesDaLista = async (lista) => {
  if (!lista) return [];

  if (Array.isArray(lista.questoesIds) && lista.questoesIds.length > 0) {
    return db.questoes.getByIds(lista.questoesIds);
  }

  // Fallback para formato legado com campo id_lista nas questões
  if (lista.id) {
    return db.questoes.where('id_lista').equals(String(lista.id));
  }

  return [];
};

// ──────────────────────────────────────────────
// METAS
// ✅ Usado por Metas.jsx — estava faltando no database.js anterior
// ──────────────────────────────────────────────
db.salvarMeta = async ({ tipo, valor, label }) => {
  const existentes = await db.metas.where('tipo').equals(tipo);
  if (existentes.length > 0) {
    await db.metas.update(existentes[0].id, { tipo, valor, label });
  } else {
    await db.metas.add({ tipo, valor, label });
  }
};

db.getProgressoMetas = async () => {
  const [metas, resultados] = await Promise.all([
    db.metas.toArray(),
    db.resultados.toArray(),
  ]);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toDateString();

  const hojeRs = resultados.filter((r) => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString() === hojeStr;
  });

  // Streak de dias consecutivos
  const datas = [...new Set(resultados.map((r) => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString();
  }))];
  let streak = 0;
  let dCheck = new Date(hoje);
  while (datas.includes(dCheck.toDateString())) {
    streak++;
    dCheck.setDate(dCheck.getDate() - 1);
  }

  const totalR   = resultados.length;
  const acertosR = resultados.filter((r) => r.acertou).length;
  const taxaGeral = totalR ? Math.round((acertosR / totalR) * 100) : 0;
  const tempoHojeMin = Math.round(hojeRs.reduce((acc, r) => acc + (r.tempo || 0), 0) / 60);

  // Valores atuais por tipo de meta
  const ATUAIS = {
    questoes_dia: hojeRs.length,
    taxa_acerto:  taxaGeral,
    streak,
    tempo_dia:    tempoHojeMin,
  };

  return metas.map((m) => {
    const atual      = ATUAIS[m.tipo] ?? 0;
    const percentual = m.valor > 0 ? Math.min(Math.round((atual / m.valor) * 100), 150) : 0;
    return { ...m, atual, percentual };
  });
};

// ──────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────
db.getDashboardData = async () => {
  const [questoes, resultados, , , revisoes] = await Promise.all([
    db.questoes.toArray(),
    db.resultados.toArray(),
    db.metas.toArray(),
    db.planejamento.toArray(),
    db.revisaoEspacada.toArray(),
  ]);

  const total   = resultados.length;
  const acertos = resultados.filter((r) => r.acertou).length;
  const taxa    = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeDS  = hoje.toDateString();
  const hojeIso = hoje.toISOString().split('T')[0];

  const hojeRs = resultados.filter((r) => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString() === hojeDS;
  });

  const datasCompletas = [...new Set(resultados.map((r) => {
    const d = r.data ? new Date(r.data) : new Date(0);
    return d.toDateString();
  }))];
  let streak = 0;
  let dCheck = new Date(hoje);
  while (datasCompletas.includes(dCheck.toDateString())) {
    streak++;
    dCheck.setDate(dCheck.getDate() - 1);
  }

  const tempoHojeMin = Math.round(hojeRs.reduce((acc, r) => acc + (r.tempo || 0), 0) / 60);
  const revisoesHoje = revisoes.filter((rev) => rev.proximaRevisao <= hojeIso).length;

  const idsExistentes = new Set(questoes.map((q) => String(q.id)));
  const ultimoPorQuestao = {};
  resultados.forEach((r) => {
    const qid = String(r.questaoId || r.id_questao || '');
    if (!qid || !idsExistentes.has(qid)) return;
    if (!ultimoPorQuestao[qid] || r.data > ultimoPorQuestao[qid].data) {
      ultimoPorQuestao[qid] = r;
    }
  });
  const errosCount = Object.values(ultimoPorQuestao).filter((r) => !r.acertou).length;

  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (6 - i));
    dia.setHours(0, 0, 0, 0);
    const diaIso = dia.toISOString().split('T')[0];
    const rs = resultados.filter((r) => {
      const rd = r.data ? new Date(r.data).toISOString().split('T')[0] : '';
      return rd === diaIso;
    });
    return {
      label:   dia.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      data:    diaIso,
      total:   rs.length,
      acertos: rs.filter((r) => r.acertou).length,
      isHoje:  dia.toDateString() === hojeDS,
    };
  });

  return {
    total, acertos, taxa,
    tempoHojeMin,
    questoesHoje:       hojeRs.length,
    streak,
    revisoesHoje,
    errosCount,
    ultimos7,
    totalQuestoesBanco: questoes.length,
  };
};

// ──────────────────────────────────────────────
// BULK DELETE DE RESULTADOS
// Usado por BancoQuestoes ao excluir uma questão.
// Remove múltiplos documentos por ID usando writeBatch.
// ──────────────────────────────────────────────
db.resultados.bulkDelete = async (ids) => {
  if (!ids || ids.length === 0) return;
  const uid = await getUserId();
  const LOTE = 500;
  for (let i = 0; i < ids.length; i += LOTE) {
    const batch = writeBatch(firestoreDb);
    ids.slice(i, i + LOTE).forEach((id) => {
      batch.delete(doc(firestoreDb, 'usuarios', uid, 'resultados', String(id)));
    });
    await batch.commit();
  }
};

// ──────────────────────────────────────────────
// REMOVER DA REVISÃO ESPAÇADA
// Usado por BancoQuestoes ao excluir uma questão.
// Remove todos os estados SM-2 associados à questão.
// ──────────────────────────────────────────────
db.removerDaRevisao = async (questaoId) => {
  const estados = await db.revisaoEspacada.where('questaoId').equals(String(questaoId));
  for (const e of estados) {
    await db.revisaoEspacada.delete(e.id);
  }
};

// ──────────────────────────────────────────────
// STATS PARA CONQUISTAS
// Retorna os campos que Conquistas.jsx usa para
// verificar e calcular progresso de cada medalha.
// ──────────────────────────────────────────────
db.getStatsConquistas = async () => {
  const [resultados, sessoes] = await Promise.all([
    db.resultados.toArray(),
    db.sessoes.toArray().catch(() => []),
  ]);

  const total   = resultados.length;
  const acertos = resultados.filter(r => r.acertou).length;
  const taxa    = total ? Number(((acertos / total) * 100).toFixed(1)) : 0;

  // streak — dias consecutivos com pelo menos 1 resultado
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const datasCompletas = new Set(resultados.map(r => {
    const d = r.data ? new Date(r.data) : new Date(0);
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  }));
  let streak = 0;
  const dCheck = new Date(hoje);
  while (datasCompletas.has(dCheck.toDateString())) {
    streak++;
    dCheck.setDate(dCheck.getDate() - 1);
  }

  // simulados — conjuntos únicos de resultados com modo 'simulado'
  // cada simulado salva todos os resultados com o mesmo timestamp (mesma chamada bulkAdd)
  // agrupamos por simuladoNome + data (dia) para contar sessões únicas
  const simSet = new Set(
    resultados
      .filter(r => r.modo === 'simulado' && r.simuladoNome)
      .map(r => `${r.simuladoNome}__${r.data ? r.data.split('T')[0] : ''}`)
  );
  const simulados = simSet.size;

  // pomodoros — sessões de foco concluídas
  const pomodoros = sessoes.length;

  // materias — disciplinas únicas com pelo menos 1 resultado
  const materias = new Set(resultados.map(r => r.materia).filter(Boolean)).size;

  return { total, acertos, taxa, streak, simulados, pomodoros, materias };
};

export { db };
