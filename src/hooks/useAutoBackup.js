import { useEffect, useRef, useCallback } from 'react';
import { db } from '../database';

const BACKUP_KEY        = 'cortexlab_autobackup';
const ULTIMO_BACKUP_KEY = 'cortexlab_ultimo_autobackup';

const DEBOUNCE_MS  = 5_000;   // aguarda a rajada de alterações cair
const THROTTLE_MS  = 30_000;  // no máximo 1 backup completo a cada 30s

const TODAS_TABELAS = [
  'questoes', 'resultados', 'listas', 'simulados',
  'metas', 'sessoes', 'planejamento', 'conquistas', 'revisaoEspacada',
];

export const useAutoBackup = (enabled) => {
  const timerRef        = useRef(null);
  const enabledRef      = useRef(enabled);
  const ultimoBackupRef = useRef(0);           // timestamp do último backup concluído
  const dirtyRef        = useRef(new Set());   // tabelas alteradas desde o último backup

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const exportarTabelas = useCallback(async (tabelas) => {
    if (!enabledRef.current) return;
    try {
      // Carrega o JSON atual do localStorage para fazer merge parcial
      let dados = {};
      try {
        const raw = localStorage.getItem(BACKUP_KEY);
        if (raw) dados = JSON.parse(raw);
      } catch { /* JSON corrompido — reconstrói tudo */ }

      // Só re-serializa as tabelas marcadas como sujas
      for (const tabela of tabelas) {
        if (db[tabela]) {
          dados[tabela] = await db[tabela].toArray();
        }
      }

      dados._exportadoEm = new Date().toISOString();
      dados._versao      = 3;

      localStorage.setItem(BACKUP_KEY, JSON.stringify(dados));
      localStorage.setItem(ULTIMO_BACKUP_KEY, new Date().toLocaleString('pt-BR'));

      ultimoBackupRef.current = Date.now();
      dirtyRef.current.clear();

      console.log(`[AutoBackup] Backup salvo (tabelas: ${[...tabelas].join(', ')})`);
    } catch (e) {
      console.error('[AutoBackup] Erro ao salvar:', e);
    }
  }, []);

  const scheduleBackup = useCallback(() => {
    if (!enabledRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const elapsed   = Date.now() - ultimoBackupRef.current;
    const remaining = THROTTLE_MS - elapsed;

    // Se já passou o intervalo de throttle, aguarda só o debounce normal.
    // Se não, aguarda o tempo restante até completar o throttle.
    const delay = remaining > DEBOUNCE_MS ? remaining : DEBOUNCE_MS;

    timerRef.current = setTimeout(() => {
      const tabelas = dirtyRef.current.size > 0
        ? new Set(dirtyRef.current)   // cópia para evitar race condition
        : new Set(TODAS_TABELAS);     // fallback: serializa tudo
      exportarTabelas(tabelas);
    }, delay);
  }, [exportarTabelas]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = db.on('changes', (changes) => {
      // Acumula apenas as tabelas que realmente mudaram
      changes.forEach(c => { if (c.table) dirtyRef.current.add(c.table); });
      scheduleBackup();
    });

    // Backup inicial completo ao ativar
    exportarTabelas(new Set(TODAS_TABELAS));

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, scheduleBackup, exportarTabelas]);

  // Limpeza final (desmonta)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
};
