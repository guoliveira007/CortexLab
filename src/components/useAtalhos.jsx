import { useEffect } from 'react';

/**
 * useAtalhos — Atalhos de teclado globais para o CortexLab.
 *
 * Atalhos disponíveis:
 *   Alt+1  → Dashboard
 *   Alt+2  → Freestyle
 *   Alt+3  → Simulados
 *   Alt+4  → Listas
 *   Alt+5  → Banco de Questões
 *   Alt+6  → Desempenho
 *   Alt+7  → Revisão Espaçada
 *   Alt+8  → Caderno de Erros
 *   Alt+R  → Revisão Espaçada (alternativo)
 *   Alt+F  → Freestyle (alternativo)
 *   Alt+C  → Chat de Dúvidas
 *   Alt+P  → Previsão de Revisões
 *
 * Compatível com Mac (Alt = Option) e Windows/Linux.
 */

export const ATALHOS = [
  { tecla: '1', alt: true, tela: 'dashboard',     desc: 'Dashboard' },
  { tecla: '2', alt: true, tela: 'freestyle',      desc: 'Freestyle' },
  { tecla: '3', alt: true, tela: 'simulado',       desc: 'Simulados' },
  { tecla: '4', alt: true, tela: 'listas',         desc: 'Listas' },
  { tecla: '5', alt: true, tela: 'banco',          desc: 'Banco de Questões' },
  { tecla: '6', alt: true, tela: 'desempenho',     desc: 'Desempenho' },
  { tecla: '7', alt: true, tela: 'revisao',        desc: 'Revisão Espaçada' },
  { tecla: '8', alt: true, tela: 'caderno',        desc: 'Caderno de Erros' },
  { tecla: 'r', alt: true, tela: 'revisao',        desc: 'Revisão Espaçada' },
  { tecla: 'f', alt: true, tela: 'freestyle',      desc: 'Freestyle' },
  { tecla: 'c', alt: true, tela: 'chat',           desc: 'Chat de Dúvidas' },
  { tecla: 'p', alt: true, tela: 'previsao',       desc: 'Previsão de Revisões' },
  { tecla: 'b', alt: true, tela: 'backup',         desc: 'Backup & Restauração' },
  { tecla: 'm', alt: true, tela: 'resumo',         desc: 'Resumo por Matéria' },
];

export const useAtalhos = (onNavegar) => {
  useEffect(() => {
    const handler = (e) => {
      // Não dispara atalhos quando o usuário está digitando em um input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

      const atalho = ATALHOS.find(a =>
        a.tecla === e.key.toLowerCase() &&
        (!a.alt || e.altKey) &&
        !e.ctrlKey && !e.metaKey && !e.shiftKey
      );

      if (atalho) {
        e.preventDefault();
        onNavegar(atalho.tela);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNavegar]);
};

export default useAtalhos;