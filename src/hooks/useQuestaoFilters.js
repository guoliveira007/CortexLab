import { useState, useMemo, useEffect } from 'react';
import { MATERIAS, getConteudos, getTopicos } from '../curriculo';
import { filtrarPorTexto } from '../utils/filtros';

const FILTROS_VAZIOS = {
  banca: [], ano: [], materia: [], conteudo: [], topico: [], busca: ''
};

/**
 * Hook de filtragem e paginação de questões, com suporte a:
 * - Filtros múltiplos (banca, ano, matéria, conteúdo, tópico)
 * - Busca textual (via filtrarPorTexto)
 * - Opções em cascata a partir dos dados do banco
 * - Mesclagem opcional com o currículo pré-definido
 * - Paginação
 *
 * @param {Array}   todasQuestoes       - Array completo de questões
 * @param {Object}  options             - Opções de configuração
 * @param {number}  [options.pageSize=10]
 * @param {boolean} [options.includeCurriculo=true]
 * @param {string}  [options.storageKey] - chave para persistir filtros no sessionStorage
 * @returns {Object} estado e funções do hook
 */
export const useQuestaoFilters = (todasQuestoes, {
  pageSize = 10,
  includeCurriculo = true,
  storageKey = null,
} = {}) => {
  // Inicializa filtros (restaura da sessionStorage se necessário)
  const [filtros, setFiltros] = useState(() => {
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : FILTROS_VAZIOS;
      } catch { /* ignorado */ }
    }
    return FILTROS_VAZIOS;
  });

  // Persiste filtros se storageKey foi passada
  useEffect(() => {
    if (storageKey) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(filtros)); } catch { /* ignorado */ }
    }
  }, [filtros, storageKey]);

  // Estado da página
  const [pagina, setPagina] = useState(1);
  // Resetar página ao mudar qualquer filtro (exceto busca)
  useEffect(() => { setPagina(1); }, [filtros]);

  // Helper para valores únicos ordenados
  const uniq = (arr, fn) => [...new Set(arr.map(fn).filter(Boolean))].sort();

  // Questões filtradas (exceto busca textual, que é aplicada depois)
  const filtradas = useMemo(() => {
    return todasQuestoes.filter(q =>
      (!filtros.banca.length    || filtros.banca.includes(q.banca)) &&
      (!filtros.ano.length      || filtros.ano.includes(String(q.ano))) &&
      (!filtros.materia.length  || filtros.materia.includes(q.materia)) &&
      (!filtros.conteudo.length || filtros.conteudo.includes(q.conteudo)) &&
      (!filtros.topico.length   || filtros.topico.includes(q.topico))
    );
  }, [todasQuestoes, filtros]);

  // Aplica busca textual (usando a função externalizada)
  const filtradasComBusca = useMemo(() => {
    return filtrarPorTexto(filtradas, filtros.busca);
  }, [filtradas, filtros.busca]);

  // ✅ Corrigido: conjuntos em cascata agora são memoizados.
  //
  // Antes, porBanca/porAno/porMateria/porConteudo eram variáveis simples
  // recalculadas a cada render, gerando novas referências de array mesmo
  // sem mudança de dados. Como dbOpcoes os listava nas dependências,
  // ele também recalculava em todo render — cascateando re-renders
  // desnecessários em todos os componentes que consomem o hook.
  //
  // Agora cada nível só reconstrói quando a entrada do nível anterior
  // ou o filtro correspondente realmente muda.
  const porBanca = useMemo(
    () => filtros.banca.length
      ? todasQuestoes.filter(q => filtros.banca.includes(q.banca))
      : todasQuestoes,
    [todasQuestoes, filtros.banca]
  );

  const porAno = useMemo(
    () => filtros.ano.length
      ? porBanca.filter(q => filtros.ano.includes(String(q.ano)))
      : porBanca,
    [porBanca, filtros.ano]
  );

  const porMateria = useMemo(
    () => filtros.materia.length
      ? porAno.filter(q => filtros.materia.includes(q.materia))
      : porAno,
    [porAno, filtros.materia]
  );

  const porConteudo = useMemo(
    () => filtros.conteudo.length
      ? porMateria.filter(q => filtros.conteudo.includes(q.conteudo))
      : porMateria,
    [porMateria, filtros.conteudo]
  );

  // Opções vindas do banco (agora só reavalia quando os arrays acima mudam de fato)
  const dbOpcoes = useMemo(() => ({
    bancas:    uniq(todasQuestoes, q => q.banca),
    anos:      uniq(porBanca,      q => String(q.ano)),
    materias:  uniq(porAno,        q => q.materia),
    conteudos: uniq(porMateria,    q => q.conteudo),
    topicos:   uniq(porConteudo,   q => q.topico),
  }), [todasQuestoes, porBanca, porAno, porMateria, porConteudo]);

  // Opções vindas do currículo (se includeCurriculo = true)
  const currMaterias = MATERIAS;
  const currConteudos = useMemo(() => {
    if (!includeCurriculo) return [];
    if (filtros.materia.length > 0) {
      return filtros.materia.flatMap(m => getConteudos(m));
    }
    return MATERIAS.flatMap(m => getConteudos(m));
  }, [includeCurriculo, filtros.materia]);

  const currTopicos = useMemo(() => {
    if (!includeCurriculo) return [];
    if (filtros.materia.length > 0) {
      return filtros.materia.flatMap(m =>
        filtros.conteudo.length > 0
          ? filtros.conteudo.flatMap(c => getTopicos(m, c))
          : getConteudos(m).flatMap(c => getTopicos(m, c))
      );
    }
    return [];
  }, [includeCurriculo, filtros.materia, filtros.conteudo]);

  // Mesclagem final das opções (banco + currículo, se ativo)
  const opcoes = useMemo(() => ({
    bancas:    dbOpcoes.bancas,
    anos:      dbOpcoes.anos,
    materias:  includeCurriculo
      ? [...new Set([...dbOpcoes.materias, ...currMaterias])].sort()
      : dbOpcoes.materias,
    conteudos: includeCurriculo
      ? [...new Set([...dbOpcoes.conteudos, ...currConteudos])].sort()
      : dbOpcoes.conteudos,
    topicos:   includeCurriculo
      ? [...new Set([...dbOpcoes.topicos, ...currTopicos])].sort()
      : dbOpcoes.topicos,
  }), [dbOpcoes, includeCurriculo, currMaterias, currConteudos, currTopicos]);

  // Setters de filtros
  const setFiltro = (campo, valor) => {
    if (campo === 'busca') {
      setFiltros(f => ({ ...f, busca: valor }));
      return;
    }
    if (valor === null) {
      setFiltros(f => ({ ...f, [campo]: [] }));
      return;
    }
    setFiltros(f => {
      const arr = f[campo];
      const novo = arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor];
      return { ...f, [campo]: novo };
    });
  };

  const resetar = () => {
    setFiltros(FILTROS_VAZIOS);
    if (storageKey) {
      try { sessionStorage.removeItem(storageKey); } catch { /* ignorado */ }
    }
  };

  // Paginação
  const total = filtradasComBusca.length;
  const totalPag = Math.ceil(total / pageSize);
  const paginaQ = filtradasComBusca.slice((pagina - 1) * pageSize, pagina * pageSize);

  return {
    filtros,
    setFiltro,
    resetar,
    opcoes,
    filtradas: filtradasComBusca,
    questoesFiltradasCount: total,
    pagina,
    setPagina,
    paginaQ,
    totalPag,
  };
};