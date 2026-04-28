import { useEffect, useRef, useCallback } from 'react';
import { db } from '../database';

/**
 * useOfflineQueue
 *
 * Fila persistente de sincronizações com o Google Drive.
 *
 * CONTEXTO
 * ─────────
 * O CortexLab salva todos os dados localmente no IndexedDB (Dexie).
 * Respostas, simulados e revisões funcionam 100% offline — nada disso
 * precisa de fila, pois já vai direto para o banco local.
 *
 * O único ponto que depende de rede é o backup automático no Google Drive
 * (useAutoBackup). Quando o usuário está offline durante o intervalo de
 * backup, a sincronização simplesmente não ocorre e os dados ficam apenas
 * no IndexedDB local — sem perda, mas sem redundância na nuvem.
 *
 * Este hook resolve isso: registra no IndexedDB que um backup está pendente
 * e, ao detectar reconexão, chama o callback de sincronização automaticamente.
 *
 * FUNCIONAMENTO
 * ─────────────
 * 1. onOffline()   — chamado por useAutoBackup quando a rede some durante
 *                    uma tentativa de backup. Registra a pendência no IndexedDB.
 * 2. Ao voltar online (evento 'online' do window), drena a fila: chama
 *    syncCallback() uma vez e remove a pendência do banco.
 * 3. A fila é persistida no IndexedDB (tabela offlineQueue) para sobreviver
 *    a fechamentos do app enquanto offline.
 *
 * USO
 * ───
 * const { onOffline } = useOfflineQueue({ syncCallback: triggerBackup });
 *
 * Chame onOffline() sempre que uma tentativa de sync falhar por falta de rede.
 * O hook cuida do resto automaticamente.
 *
 * GARANTIAS
 * ─────────
 * • Idempotente: múltiplas chamadas a onOffline() enquanto offline registram
 *   apenas uma entrada (upsert por chave fixa).
 * • Sem duplicatas: ao voltar online, a fila é drenada uma única vez mesmo
 *   que o evento 'online' dispare mais de uma vez em sequência.
 * • Sobrevive a reinicializações: a pendência fica no IndexedDB, não em memória.
 */

const QUEUE_KEY = 'gdrive_backup_pending';

// Garante que a tabela offlineQueue existe no schema do Dexie.
// Se o database.js já tiver a tabela, esta chamada é um no-op.
// Caso contrário, você precisa adicionar a versão abaixo ao database.js:
//
//   db.version(4).stores({
//     ...todasAsOutrasTabelas,
//     offlineQueue: '&chave, tipo, registradoEm',
//   });
//
// Veja instruções detalhadas no final deste arquivo.

export const useOfflineQueue = ({ syncCallback }) => {
  const drainingRef = useRef(false);
  const syncRef     = useRef(syncCallback);

  // Mantém a ref atualizada sem re-criar os efeitos
  useEffect(() => { syncRef.current = syncCallback; }, [syncCallback]);

  /** Registra que um backup ficou pendente por falta de rede. */
  const onOffline = useCallback(async () => {
    try {
      await db.offlineQueue.put({
        chave:        QUEUE_KEY,
        tipo:         'gdrive_backup',
        registradoEm: new Date().toISOString(),
      });
    } catch (e) {
      // Falha silenciosa — o backup tentará novamente no próximo ciclo
      console.warn('[useOfflineQueue] Erro ao registrar pendência:', e.message);
    }
  }, []);

  /** Drena a fila: executa o sync e remove a pendência. */
  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;

    try {
      const pendente = await db.offlineQueue.get(QUEUE_KEY);
      if (!pendente) return;

      console.info('[useOfflineQueue] Conexão restaurada — executando backup pendente...');
      await syncRef.current?.();
      await db.offlineQueue.delete(QUEUE_KEY);
      console.info('[useOfflineQueue] Backup pendente concluído.');
    } catch (e) {
      console.warn('[useOfflineQueue] Falha ao drenar fila:', e.message);
      // Não remove a pendência — tentará de novo na próxima reconexão
    } finally {
      drainingRef.current = false;
    }
  }, []);

  // Escuta o evento 'online' e drena a fila ao reconectar
  useEffect(() => {
    window.addEventListener('online', drainQueue);

    // Drena imediatamente se o app abriu com rede disponível
    // e havia uma pendência da sessão anterior
    if (navigator.onLine) drainQueue();

    return () => window.removeEventListener('online', drainQueue);
  }, [drainQueue]);

  return { onOffline };
};


// ═══════════════════════════════════════════════════════════════════════════
// INSTRUÇÃO DE MIGRAÇÃO — adicionar ao database.js
// ═══════════════════════════════════════════════════════════════════════════
//
// Para que o hook funcione, adicione a versão 4 ao final do database.js,
// logo após a versão 3:
//
// db.version(4).stores({
//   questoes:        '++id, banca, ano, materia, conteudo, topico',
//   resultados:      '++id, id_questao, data, acertou, modo',
//   listas:          '++id, nome, criada',
//   simulados:       '++id, nome, criado',
//   metas:           '++id, tipo',
//   sessoes:         '++id, data, materia',
//   planejamento:    '++id, diaSemana',
//   conquistas:      '++id, id_conquista',
//   revisaoEspacada: '++id, questaoId, proximaRevisao, ultimaRevisao',
//   offlineQueue:    '&chave, tipo, registradoEm',   // ← única linha nova
// });
//
// O índice único (&chave) garante que put() faça upsert sem duplicatas.
// ═══════════════════════════════════════════════════════════════════════════
