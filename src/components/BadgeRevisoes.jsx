import { useState, useEffect } from 'react';
import { useRevisoesHoje } from './useRevisoesHoje';

/**
 * BadgeRevisoes — badge com contagem de revisões pendentes.
 */
const BadgeRevisoes = ({ ignorarSeVisitado = false }) => {
  const { count, loading } = useRevisoesHoje();

  const [visitadoHoje, setVisitadoHoje] = useState(() => {
    if (!ignorarSeVisitado) return false;
    return localStorage.getItem('previsao_badge_visto') === new Date().toDateString();
  });

  useEffect(() => {
    if (!ignorarSeVisitado) return;
    const handler = () => setVisitadoHoje(true);
    window.addEventListener('previsao:visitada', handler);
    return () => window.removeEventListener('previsao:visitada', handler);
  }, [ignorarSeVisitado]);

  if (loading || count === 0 || visitadoHoje) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '18px', height: '18px', padding: '0 5px',
      background: '#ef4444', color: 'white',
      borderRadius: '99px', fontSize: '10px', fontWeight: 800, lineHeight: 1,
      boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
      animation: 'pulsar 2s infinite',
    }}>
      {count > 99 ? '99+' : count}
      <style>{`
        @keyframes pulsar {
          0%, 100% { box-shadow: 0 2px 6px rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 2px 12px rgba(239,68,68,0.7); }
        }
      `}</style>
    </span>
  );
};

export default BadgeRevisoes;
