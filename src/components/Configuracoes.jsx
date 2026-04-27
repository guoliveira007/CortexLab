import React, { useState, useEffect } from 'react';

// ✅ FIX #6: aviso explícito de que a chave fica salva no localStorage do navegador

const Configuracoes = ({ onFechar }) => {
  const [apiKey, setApiKey] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('groq_api_key') || '';
    setApiKey(saved);
  }, []);

  const salvar = () => {
    localStorage.setItem('groq_api_key', apiKey);
    setFeedback('salvo');
    setTimeout(() => setFeedback(null), 3000);
  };

  const remover = () => {
    localStorage.removeItem('groq_api_key');
    setApiKey('');
    setFeedback('removido');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        padding: '28px', maxWidth: '480px', width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
            🔑 Configurações da IA
          </h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px', lineHeight: '1.6' }}>
          Para usar as explicações com IA quando você errar uma questão, configure sua chave da API GroqCloud (gratuita).
          <br /><br />
          <strong>🔗 Como obter (grátis, 14.400 req/dia):</strong>
          <br />
          1. Acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-500)' }}>console.groq.com</a>
          <br />
          2. Faça login com sua conta Google
          <br />
          3. Vá em "API Keys" e clique em "Create API Key"
          <br />
          4. Copie a chave gerada (começa com gsk_...)
        </p>

        {/* ✅ FIX #6: aviso de segurança — localStorage é local ao navegador */}
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 'var(--r-md)', padding: '10px 14px',
          marginBottom: '18px', fontSize: '12px', color: '#92400e', lineHeight: '1.5',
        }}>
          <span style={{ flexShrink: 0, fontSize: '14px' }}>🔒</span>
          <span>
            Sua chave é salva <strong>apenas no armazenamento local deste navegador</strong> (localStorage) e nunca enviada para servidores externos.
            Ela só é usada diretamente nas chamadas à API Groq. Em computadores compartilhados, prefira remover a chave ao sair.
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: '6px' }}>
            Chave da API GroqCloud
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="gsk_..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--gray-200)', fontSize: '14px',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {feedback === 'salvo' && (
          <div style={{
            background: '#ecfdf5', color: '#065f46',
            padding: '10px', borderRadius: 'var(--r-md)',
            fontSize: '13px', marginBottom: '16px', textAlign: 'center',
          }}>
            ✓ Chave salva com sucesso!
          </div>
        )}
        {feedback === 'removido' && (
          <div style={{
            background: '#fef2f2', color: '#991b1b',
            padding: '10px', borderRadius: 'var(--r-md)',
            fontSize: '13px', marginBottom: '16px', textAlign: 'center',
          }}>
            🗑️ Chave removida.
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {apiKey && (
            <button onClick={remover} style={{
              padding: '10px 20px', background: '#fef2f2',
              border: '1.5px solid #fecaca', borderRadius: 'var(--r-md)',
              color: '#dc2626', fontWeight: 600, cursor: 'pointer',
            }}>
              🗑️ Remover
            </button>
          )}
          <button onClick={onFechar} style={{
            padding: '10px 20px', background: 'var(--gray-100)',
            border: 'none', borderRadius: 'var(--r-md)',
            color: 'var(--gray-600)', fontWeight: 600, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={salvar} style={{
            padding: '10px 24px', background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
            border: 'none', borderRadius: 'var(--r-md)',
            color: 'white', fontWeight: 700, cursor: 'pointer',
          }}>
            💾 Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
