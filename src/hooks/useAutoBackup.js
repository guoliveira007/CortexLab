import { useEffect, useRef, useCallback } from 'react';
import { db } from '../database';

const BACKUP_KEY = 'cortexlab_autobackup';
const ULTIMO_BACKUP_KEY = 'cortexlab_ultimo_autobackup';
const DEBOUNCE_MS = 5000;

export const useAutoBackup = (enabled) => {
  const timerRef = useRef(null);
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const exportarParaLocalStorage = useCallback(async () => {
    if (!enabledRef.current) return; // segurança extra
    try {
      const tabelas = [
        'questoes', 'resultados', 'listas', 'simulados',
        'metas', 'sessoes', 'planejamento', 'conquistas', 'revisaoEspacada',
      ];
      const dados = {};
      for (const tabela of tabelas) {
        dados[tabela] = await db[tabela].toArray();
      }
      dados._exportadoEm = new Date().toISOString();
      dados._versao = 3;
      localStorage.setItem(BACKUP_KEY, JSON.stringify(dados));
      localStorage.setItem(ULTIMO_BACKUP_KEY, new Date().toLocaleString('pt-BR'));
      console.log('[AutoBackup] Backup salvo no localStorage');
    } catch (e) {
      console.error('[AutoBackup] Erro ao salvar:', e);
    }
  }, []);

  const scheduleBackup = useCallback(() => {
    if (!enabledRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(exportarParaLocalStorage, DEBOUNCE_MS);
  }, [exportarParaLocalStorage]);

  useEffect(() => {
    if (!enabled) return;

    // Escuta alterações em QUALQUER tabela
    const unsubscribe = db.on('changes', () => {
      scheduleBackup();
    });

    // Executa um backup inicial ao ativar
    exportarParaLocalStorage();

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, scheduleBackup, exportarParaLocalStorage]);

  // Limpeza final
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
};