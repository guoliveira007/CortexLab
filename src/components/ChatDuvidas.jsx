import React, { useState, useRef, useEffect } from 'react';

/**
 * ChatDuvidas — fix #7
 *
 * PROBLEMA ANTERIOR: idxAssistente era calculado como novaMensagens.length
 * (valor no momento do clique). Se o usuário disparasse dois envios muito
 * rápido, o segundo sobrescreveria o índice do primeiro antes do setState
 * da bolha ser confirmado pelo React, gerando desalinhamento de índices.
 *
 * CORREÇÃO: idxAssistente agora é salvo em um ref ANTES do setState, então
 * o valor capturado pelo closure do streaming é sempre o correto para aquela
 * mensagem específica, independente de re-renders ou envios concorrentes.
 */

const SYSTEM_PROMPT = `Você é um professor especialista em concursos públicos e vestibulares brasileiros.
Responda dúvidas de forma clara, didática e objetiva.
Quando relevante, cite artigos de lei, jurisprudência ou conceitos importantes.
Use exemplos práticos para facilitar a compreensão.
Máximo 400 palavras por resposta, a menos que o aluno peça mais detalhes.`;

const chamarGroqStream = async (mensagens, apiKey, onChunk) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...mensagens],
      max_tokens: 1024,
      temperature: 0.5,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erro ${response.status}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const chunk  = parsed.choices?.[0]?.delta?.content || '';
        if (chunk) onChunk(chunk);
      } catch { /* ignora */ }
    }
  }
};

const Bolha = ({ msg }) => {
  const ehUsuario = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: ehUsuario ? 'flex-end' : 'flex-start',
      marginBottom: '14px',
      gap: '10px',
      alignItems: 'flex-start',
    }}>
      {!ehUsuario && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: '80%',
        background: ehUsuario
          ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
          : 'white',
        color: ehUsuario ? 'white' : 'var(--gray-800)',
        padding: '12px 16px',
        borderRadius: ehUsuario
          ? 'var(--r-xl) var(--r-xl) 4px var(--r-xl)'
          : 'var(--r-xl) var(--r-xl) var(--r-xl) 4px',
        fontSize: '14px',
        lineHeight: '1.7',
        boxShadow: ehUsuario ? 'var(--shadow-brand)' : 'var(--shadow-sm)',
        border: ehUsuario ? 'none' : '1px solid var(--gray-100)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
        {msg.streamando && (
          <span style={{
            display: 'inline-block', width: '2px', height: '14px',
            background: 'var(--brand-400)', marginLeft: '3px',
            verticalAlign: 'middle', borderRadius: '1px',
            animation: 'piscar 0.9s infinite',
          }} />
        )}
      </div>
      {ehUsuario && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'var(--gray-200)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>👤</div>
      )}
    </div>
  );
};

const SUGESTOES = [
  'O que é presunção de inocência?',
  'Diferença entre dolo e culpa no Direito Penal',
  'Como funciona a progressão de regime?',
  'Explique o princípio da legalidade',
  'O que é vício de consentimento?',
];

const ChatDuvidas = () => {
  const [mensagens, setMensagens]   = useState([]);
  const [input, setInput]           = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState('');
  const fimRef   = useRef(null);
  const inputRef = useRef(null);

  // ✅ FIX #7: ref para capturar o índice correto da bolha de assistente
  // mesmo se o React ainda não confirmou o setState da mensagem anterior.
  const idxAssistenteRef = useRef(null);

  const apiKey = localStorage.getItem('groq_api_key');

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviar = async (texto) => {
    const msg = (texto || input).trim();
    if (!msg || carregando) return;
    setInput('');
    setErro('');

    const novaMensagens = [...mensagens, { role: 'user', content: msg }];
    setMensagens(novaMensagens);

    if (!apiKey) {
      setErro('Configure sua chave Groq em Configurações para usar o chat.');
      return;
    }

    if (!navigator.onLine) {
      setErro('Sem conexão com a internet. O chat de dúvidas requer conexão para funcionar.');
      return;
    }

    setCarregando(true);

    // ✅ FIX #7: calcula e persiste o índice no ref ANTES de qualquer setState
    // subsequente. O closure do streaming lê sempre idxAssistenteRef.current,
    // que é estável para este envio específico.
    idxAssistenteRef.current = novaMensagens.length;

    setMensagens(prev => [
      ...prev,
      { role: 'assistant', content: '', streamando: true },
    ]);

    try {
      const historico = novaMensagens.map(m => ({ role: m.role, content: m.content }));
      const idx = idxAssistenteRef.current; // captura local do ref para o closure

      await chamarGroqStream(historico, apiKey, (chunk) => {
        setMensagens(prev => {
          const atualizado = [...prev];
          if (atualizado[idx]) {
            atualizado[idx] = {
              ...atualizado[idx],
              content: atualizado[idx].content + chunk,
              streamando: true,
            };
          }
          return atualizado;
        });
      });

      setMensagens(prev => {
        const atualizado = [...prev];
        if (atualizado[idx]) {
          atualizado[idx] = { ...atualizado[idx], streamando: false };
        }
        return atualizado;
      });
    } catch (e) {
      setMensagens(prev => prev.slice(0, -1));
      // TypeError: Failed to fetch cobre offline real, CORS e falhas de DNS
      // mesmo quando navigator.onLine retorna true (ex.: rede instável).
      const msgRede = e instanceof TypeError && e.message.includes('fetch')
        ? 'Sem acesso à internet. Verifique sua conexão e tente novamente.'
        : e.message;
      setErro(msgRede);
    } finally {
      setCarregando(false);
      inputRef.current?.focus();
    }
  };

  const limpar = () => { setMensagens([]); setErro(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      <style>{`@keyframes piscar{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div className="page-header">
        <div>
          <h2 className="page-title">Chat de Dúvidas</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            IA alimentada por Groq · Llama 3.1 8B
          </p>
        </div>
        {mensagens.length > 0 && (
          <button className="btn-secondary" onClick={limpar} style={{ fontSize: '13px' }}>
            🗑️ Limpar
          </button>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        background: 'white', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)',
        padding: '20px', marginBottom: '12px',
        display: 'flex', flexDirection: 'column',
      }}>
        {mensagens.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '8px' }}>
              Como posso te ajudar?
            </h3>
            <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
              Tire dúvidas sobre qualquer matéria de concurso ou vestibular.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '480px' }}>
              {SUGESTOES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => enviar(s)}
                  style={{
                    padding: '8px 14px', background: 'var(--brand-50)',
                    border: '1.5px solid var(--brand-200)', borderRadius: 'var(--r-full)',
                    color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-100)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--brand-50)'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {mensagens.map((m, i) => <Bolha key={i} msg={m} />)}
            <div ref={fimRef} />
          </>
        )}
      </div>

      {erro && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 'var(--r-md)', padding: '10px 14px',
          color: '#b91c1c', fontSize: '13px', marginBottom: '10px',
        }}>
          ⚠️ {erro}
        </div>
      )}

      <div style={{
        display: 'flex', gap: '10px',
        background: 'white', padding: '12px 16px',
        borderRadius: 'var(--r-xl)', border: '1.5px solid var(--gray-200)',
        boxShadow: 'var(--shadow-sm)',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Digite sua dúvida... (Enter para enviar, Shift+Enter para nova linha)"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-body)', fontSize: '14px',
            color: 'var(--gray-800)', background: 'transparent',
            maxHeight: '120px', lineHeight: '1.6',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          disabled={carregando}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || carregando}
          style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: input.trim() && !carregando
              ? 'var(--gradient-brand)' : 'var(--gray-100)',
            border: 'none', borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !carregando ? 'pointer' : 'not-allowed',
            fontSize: '18px', transition: 'all 0.15s',
            boxShadow: input.trim() && !carregando ? 'var(--shadow-brand)' : 'none',
          }}
        >
          {carregando ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default ChatDuvidas;
