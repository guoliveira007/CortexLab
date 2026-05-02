// src/components/AjudaAtalhos.jsx
import { useDark } from '../hooks/useDark';
import { ATALHOS } from './useAtalhos';

const AjudaAtalhos = ({ visivel, onFechar }) => {
  const isDark = useDark();

  if (!visivel) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: isDark ? 'var(--surface-card)' : 'white',
          color: isDark ? 'var(--gray-800)' : 'inherit',
          borderRadius: 'var(--r-2xl)',
          padding: '28px', maxWidth: '480px', width: '90%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>
            ⌨️ Atalhos de Teclado
          </h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {ATALHOS.filter((a, i, arr) => arr.findIndex(b => b.tela === a.tela) === i).map(a => (
            <div key={a.tela} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px',
              background: isDark ? 'var(--gray-100)' : 'var(--gray-50)',
              borderRadius: 'var(--r-md)',
              border: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
            }}>
              <span style={{ fontSize: '13px', color: isDark ? 'var(--gray-800)' : 'var(--gray-700)' }}>{a.desc}</span>
              <kbd style={{
                background: isDark ? 'var(--gray-700)' : 'var(--gray-800)',
                color: 'white',
                padding: '2px 7px', borderRadius: '5px',
                fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
                boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
              }}>
                Alt+{a.tecla.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '16px', textAlign: 'center' }}>
          Atalhos não funcionam quando um campo de texto está em foco. · Pressione Esc para fechar.
        </p>
      </div>
    </div>
  );
};

export default AjudaAtalhos;