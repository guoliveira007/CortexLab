import { useState, useEffect, useRef } from 'react';

/**
 * useListaAltura
 *
 * Retorna a altura disponível para uma lista virtualizada,
 * descontando o offset superior do container até o final da janela.
 *
 * @param {number} minAltura - Altura mínima garantida (default: 400px)
 * @param {number} paddingBottom - Espaço reservado embaixo (default: 32px)
 * @returns {{ ref, altura }}
 */
export const useListaAltura = (minAltura = 400, paddingBottom = 32) => {
  const ref = useRef(null);
  const [altura, setAltura] = useState(minAltura);

  useEffect(() => {
    const calcular = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const disponivel = window.innerHeight - rect.top - paddingBottom;
      setAltura(Math.max(minAltura, disponivel));
    };

    calcular();

    const observer = new ResizeObserver(calcular);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener('resize', calcular);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calcular);
    };
  }, [minAltura, paddingBottom]);

  return { ref, altura };
};
