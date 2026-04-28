import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../database';

/**
 * useRevisoesHoje — versão corrigida (fix #5 + compatibilidade Firestore)
 *
 * Alteração para Firestore:
 * - Substituída a chamada encadeada .where().belowOrEqual().count()
 *   pela função centralizada db.getContagemRevisaoHoje(), que já retorna
 *   o número correto de revisões pendentes.
 */

const CACHE_TTL = 30_000; // 30 segundos

export const useRevisoesHoje = () => {
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ FIX #5: cache como refs internas — sem estado global compartilhado
  const cachedCount     = useRef(null);
  const cacheTimestamp  = useRef(0);
  const debounceTimer   = useRef(null);
  const isMounted       = useRef(true);
  const isVisible       = useRef(true);
  const visibilityTimer = useRef(null);

  // Visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
      if (isVisible.current) {
        if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
        visibilityTimer.current = setTimeout(() => {
          if (isVisible.current) verificar();
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verificar = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedCount.current !== null && (now - cacheTimestamp.current) < CACHE_TTL) {
      if (isMounted.current) {
        setCount(cachedCount.current);
        setLoading(false);
      }
      return cachedCount.current;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    return new Promise((resolve) => {
      debounceTimer.current = setTimeout(async () => {
        try {
          if (!isMounted.current) return resolve(0);
          setLoading(true);

          // 🔁 ALTERADO: usa a função compatível do database.js
          const total = await db.getContagemRevisaoHoje();

          cachedCount.current    = total;
          cacheTimestamp.current = Date.now();

          if (isMounted.current) {
            setCount(total);
            setLoading(false);
          }
          resolve(total);
        } catch (error) {
          console.error('Erro ao verificar revisões:', error);
          if (isMounted.current) {
            setCount(0);
            setLoading(false);
          }
          resolve(0);
        }
      }, 100);
    });
  }, []);

  const refetch = useCallback(() => verificar(true), [verificar]);

  // Ciclo de vida principal
  useEffect(() => {
    isMounted.current = true;
    verificar();

    const interval = setInterval(() => {
      if (isVisible.current) verificar();
    }, 2 * 60_000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (debounceTimer.current)  clearTimeout(debounceTimer.current);
    };
  }, [verificar]);

  // Atualiza ao concluir revisão
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('revisao:concluida', handler);
    return () => window.removeEventListener('revisao:concluida', handler);
  }, [refetch]);

  // Notificação Web (uma vez por dia)
  useEffect(() => {
    if (count === 0 || !('Notification' in window)) return;
    const hoje = new Date().toDateString();
    if (localStorage.getItem('ultima_notif_revisao') === hoje) return;

    const mostrar = () => {
      if (Notification.permission !== 'granted') return;
      try {
        new Notification('📚 Hora de revisar!', {
          body: `Você tem ${count} questão(ões) para revisão espaçada hoje.`,
          icon: '/favicon.ico',
          tag: 'revisao-pendente',
        });
        localStorage.setItem('ultima_notif_revisao', hoje);
      } catch { /* ignorado */ }
    };

    if (Notification.permission === 'granted') {
      setTimeout(mostrar, 2000);
    } else if (Notification.permission === 'default') {
      const pedir = () => {
        Notification.requestPermission().then(p => { if (p === 'granted') mostrar(); });
        window.removeEventListener('click', pedir);
      };
      window.addEventListener('click', pedir, { once: true });
    }
  }, [count]);

  return { count, loading, refetch };
};

export default useRevisoesHoje;