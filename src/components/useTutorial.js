// src/components/useTutorial.js
import { useState, useEffect, useCallback } from 'react';
import { userStorage } from '../utils/storageUser';

const STORAGE_KEY = 'cortexlab_tutorial_visto';

const getVistos = () => userStorage.getJSON(STORAGE_KEY, {});

const marcarVisto = (tabId) => {
  const vistos = getVistos();
  vistos[tabId] = true;
  userStorage.setJSON(STORAGE_KEY, vistos);
};

export const useTutorial = (tabAtual) => {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const vistos = getVistos();
    if (!vistos[tabAtual]) {
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
    userStorage.removeItem(STORAGE_KEY);
  };

  return { aberto, abrir, fechar, resetarTodos };
};

export default useTutorial;
