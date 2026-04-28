import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cortexlab_tutorial_visto';

const getVistos = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

const marcarVisto = (tabId) => {
  const vistos = getVistos();
  vistos[tabId] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vistos));
};

export const useTutorial = (tabAtual) => {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const vistos = getVistos();
    if (!vistos[tabAtual]) {
      // Pequeno delay para o conteúdo renderizar primeiro
      const t = setTimeout(() => setAberto(true), 600);
      return () => clearTimeout(t);
    }
  }, [tabAtual]);

  const abrir = useCallback(() => setAberto(true), []);

  const fechar = useCallback(() => {
    setAberto(false);
    marcarVisto(tabAtual);
  }, [tabAtual]);

  const resetarTodos = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { aberto, abrir, fechar, resetarTodos };
};

export default useTutorial;
