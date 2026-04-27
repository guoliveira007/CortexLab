import React from 'react';
import ProgressBar from '../ProgressBar'; // ✅ Componente reutilizável

const StepProcessando = ({ progresso, nomeArquivo, onCancelar }) => {
  const { fase, pagina, total, lote, totalLotes } = progresso || {};
  const pct = fase === 'lendo'
    ? Math.round(((pagina || 1) / (total || 1)) * 50)
    : fase === 'extraindo'
      ? 50 + Math.round(((lote || 1) / (totalLotes || 1)) * 50)
      : 0;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 0', textAlign: 'center' }}>
      <div style={{ fontSize: '52px', marginBottom: '20px' }}>{fase === 'lendo' ? '📖' : '🤖'}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
        {fase === 'lendo' ? 'Lendo o PDF...' : 'Extraindo questões com IA...'}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginBottom: '28px' }}>{nomeArquivo}</p>

      {/* Barra de progresso usando componente reutilizável */}
      <div style={{ marginBottom: '12px' }}>
        <ProgressBar valor={pct} altura={10} cor="var(--gradient-brand)" />
      </div>
      <p style={{ fontSize: '14px', color: 'var(--gray-600)', fontWeight: 600, marginBottom: '28px' }}>
        {pct}% —{' '}
        {fase === 'lendo'
          ? `Página ${pagina} de ${total}`
          : `Lote ${lote} de ${totalLotes}`}
      </p>

      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--r-xl)', padding: '16px 20px', textAlign: 'left', marginBottom: '20px' }}>
        {[
          { id: 'lendo',    label: 'Extração de texto (PDF.js + OCR se necessário)', done: fase === 'extraindo' },
          { id: 'extraindo', label: 'Estruturação das questões com Llama 3.3 70B',  done: false },
          { id: 'revisao',  label: 'Revisão e importação manual',                   done: false },
        ].map((e, i) => {
          const atual = e.id === fase;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', opacity: e.done ? 1 : atual ? 1 : 0.35 }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{e.done ? '✅' : atual ? '⏳' : '○'}</span>
              <span style={{
                fontSize: '13px',
                color: e.done ? 'var(--gray-600)' : atual ? 'var(--brand-600)' : 'var(--gray-400)',
                fontWeight: atual ? 700 : 400,
              }}>{e.label}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onCancelar}
        style={{
          background: 'none', border: '1.5px solid var(--gray-200)',
          borderRadius: 'var(--r-lg)', padding: '9px 22px',
          fontSize: '13px', fontWeight: 600, color: 'var(--gray-500)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.target.style.borderColor = '#fca5a5'; e.target.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.target.style.borderColor = 'var(--gray-200)'; e.target.style.color = 'var(--gray-500)'; }}
      >
        ✕ Cancelar processamento
      </button>
    </div>
  );
};

export default StepProcessando;