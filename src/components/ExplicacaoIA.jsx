// src/components/ExplicacaoIA.jsx
import React, { useState, useCallback } from 'react';
import { useDark } from '../hooks/useDark';

/**
 * ExplicacaoIA — Botão "💡 Entender com IA" + Modal de explicação com streaming.
 * Usa GroqCloud (gratuito, 14.400 req/dia com Llama 3.1 8B).
 */

// FIX: style movido para fora do componente — era reinjetado no DOM a cada
// re-render de TextoExplicacao durante o streaming (a cada chunk recebido).
const CURSOR_STYLE = `@keyframes piscar { 0%,100%{opacity:1} 50%{opacity:0} }`;
if (typeof document !== 'undefined') {
  const existing = document.getElementById('__ia-piscar-style');
  if (!existing) {
    const tag = document.createElement('style');
    tag.id = '__ia-piscar-style';
    tag.textContent = CURSOR_STYLE;
    document.head.appendChild(tag);
  }
}

const montarPrompt = (questao, respostaUsuario) => {
  const gabarito = questao.gabarito?.toUpperCase() || '?';
  const respostaTexto = questao.alternativas?.[respostaUsuario] || respostaUsuario;
  const gabaritoTexto = questao.alternativas?.[gabarito] || gabarito;

  const alternativasFormatadas = Object.entries(questao.alternativas || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}) ${v}`)
    .join('\n');

  return `Você é um professor especializado em concursos públicos e vestibulares. Um aluno errou uma questão e precisa entender por quê.

QUESTÃO:
${questao.enunciado || ''}
${questao.comando ? `\n${questao.comando}` : ''}

ALTERNATIVAS:
${alternativasFormatadas}

RESPOSTA DO ALUNO: ${respostaUsuario}) ${respostaTexto}
GABARITO CORRETO: ${gabarito}) ${gabaritoTexto}
${questao.materia ? `MATÉRIA: ${questao.materia}` : ''}
${questao.topico ? `TÓPICO: ${questao.topico}` : ''}

Explique de forma clara e didática:
1. Por que a alternativa ${respostaUsuario} está ERRADA (aponte o erro de raciocínio)
2. Por que a alternativa ${gabarito} é a CORRETA (explique o conceito)
3. Um resumo do conceito chave que o aluno precisa fixar

Seja direto, didático e use exemplos quando ajudar. Máximo 300 palavras.`;
};

const chamarGroqStream = async (prompt, apiKey, onChunk) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.4,
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
      } catch {
        // ignora linhas malformadas do SSE
      }
    }
  }
};

/* ─── Renderização do texto formatado ─── */
const TextoExplicacao = ({ texto, streamando, isDark }) => (
  <div>
    {texto.split('\n').map((linha, i) => {
      if (!linha.trim()) return <div key={i} style={{ height: '8px' }} />;

      const ehTitulo = /^[1-3]\.\s/.test(linha);
      if (ehTitulo) {
        const num  = linha[0];
        const cores = { '1': '#ef4444', '2': '#10b981', '3': '#6366f1' };
        const bgsClaro = { '1': '#fef2f2', '2': '#f0fdf4', '3': '#eef2ff' };
        const bgsEscuro = { '1': 'rgba(239,68,68,0.12)', '2': 'rgba(16,185,129,0.12)', '3': 'rgba(99,102,241,0.12)' };
        return (
          <div key={i} style={{
            background: isDark ? bgsEscuro[num] : bgsClaro[num],
            borderRadius: 'var(--r-md)',
            padding: '10px 14px', marginBottom: '8px',
            borderLeft: `3px solid ${cores[num]}`,
          }}>
            <p style={{ fontWeight: 700, color: isDark ? (num === '1' ? '#fca5a5' : num === '2' ? '#6ee7b7' : '#a5b4fc') : cores[num], fontSize: '13px' }}>{linha}</p>
          </div>
        );
      }

      const linhas = texto.split('\n');
      const ehUltima = i === linhas.length - 1;

      return (
        <p key={i} style={{
          fontSize: '14px', color: isDark ? 'var(--gray-700)' : 'var(--gray-700)',
          lineHeight: '1.7', marginBottom: '4px',
        }}>
          {linha}
          {streamando && ehUltima && (
            <span style={{
              display: 'inline-block',
              width: '2px', height: '14px',
              background: 'var(--brand-500)',
              marginLeft: '3px',
              verticalAlign: 'middle',
              borderRadius: '1px',
              animation: 'piscar 0.9s infinite',
            }} />
          )}
        </p>
      );
    })}
  </div>
);

/* ─── Modal de Explicação ─── */
const ModalExplicacao = ({ questao, respostaUsuario, apiKey, onFechar }) => {
  const [status, setStatus]         = useState('idle');
  const [explicacao, setExplicacao] = useState('');
  const [erro, setErro]             = useState('');
  const isDark = useDark();

  const gabarito = questao.gabarito?.toUpperCase() || '?';

  const buscarExplicacao = useCallback(async () => {
    if (!apiKey) {
      setErro('Chave da API não configurada. Salve-a em Configurações.');
      setStatus('erro');
      return;
    }
    if (!navigator.onLine) {
      setErro('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      setStatus('erro');
      return;
    }
    setStatus('carregando');
    setExplicacao('');
    setErro('');
    try {
      const prompt = montarPrompt(questao, respostaUsuario);
      await chamarGroqStream(prompt, apiKey, (chunk) => {
        setStatus('streamando');
        setExplicacao(prev => prev + chunk);
      });
      setStatus('pronto');
    } catch (e) {
      const msgRede = e instanceof TypeError && e.message.includes('fetch')
        ? 'Sem acesso à internet. Verifique sua conexão e tente novamente.'
        : e.message;
      setErro(msgRede);
      setStatus('erro');
    }
  }, [apiKey, questao, respostaUsuario]);

  React.useEffect(() => { buscarExplicacao(); }, [buscarExplicacao]);

  const mostraTexto = status === 'streamando' || status === 'pronto';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onFechar}
    >
      <div
        style={{
          background: isDark ? 'var(--surface-card)' : 'white',
          color: isDark ? 'var(--gray-800)' : 'inherit',
          borderRadius: 'var(--r-2xl)',
          width: '100%', maxWidth: '640px', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: isDark ? 'linear-gradient(135deg, rgba(245,158,11,0.08), var(--surface-card))' : 'linear-gradient(135deg, #fefce8, white)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
            }}>💡</div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: isDark ? 'var(--gray-900)' : 'var(--gray-900)' }}>
                Entender com IA
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                {questao.materia || 'Explicação'}{questao.topico ? ` · ${questao.topico}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--gray-400)' }}
          >×</button>
        </div>

        {/* Resumo da resposta */}
        <div style={{
          padding: '12px 24px',
          borderBottom: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
          display: 'flex', gap: '12px', flexShrink: 0,
          background: isDark ? 'var(--gray-100)' : 'var(--gray-50)',
        }}>
          <div style={{
            flex: 1,
            background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
            border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca',
            borderRadius: 'var(--r-md)', padding: '8px 12px',
          }}>
            <div style={{ fontSize: '10px', color: isDark ? '#fca5a5' : '#991b1b', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>
              Sua resposta
            </div>
            <div style={{ fontSize: '13px', color: isDark ? '#fca5a5' : '#b91c1c', fontWeight: 600 }}>
              {respostaUsuario}) {questao.alternativas?.[respostaUsuario] || ''}
            </div>
          </div>
          <div style={{
            flex: 1,
            background: isDark ? 'rgba(16,185,129,0.12)' : '#f0fdf4',
            border: isDark ? '1px solid rgba(16,185,129,0.3)' : '1px solid #bbf7d0',
            borderRadius: 'var(--r-md)', padding: '8px 12px',
          }}>
            <div style={{ fontSize: '10px', color: isDark ? '#6ee7b7' : '#166534', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>
              Gabarito
            </div>
            <div style={{ fontSize: '13px', color: isDark ? '#6ee7b7' : '#15803d', fontWeight: 600 }}>
              {gabarito}) {questao.alternativas?.[gabarito] || ''}
            </div>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

          {status === 'carregando' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Conectando à IA...</p>
              <p style={{ color: 'var(--gray-400)', fontSize: '12px', marginTop: '6px' }}>
                Preparando a explicação
              </p>
            </div>
          )}

          {status === 'erro' && (
            <div style={{
              background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
              border: isDark ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid #fecaca',
              borderRadius: 'var(--r-lg)', padding: '16px',
            }}>
              <p style={{ color: isDark ? '#fca5a5' : '#991b1b', fontWeight: 600, marginBottom: '8px' }}>⚠️ Não foi possível gerar a explicação</p>
              <p style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontSize: '13px', marginBottom: '12px' }}>{erro}</p>
              <button
                onClick={buscarExplicacao}
                style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  borderRadius: 'var(--r-md)', padding: '8px 16px',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >Tentar novamente</button>
            </div>
          )}

          {mostraTexto && (
            <TextoExplicacao texto={explicacao} streamando={status === 'streamando'} isDark={isDark} />
          )}
        </div>

        {/* Footer */}
        {status === 'pronto' && (
          <div style={{
            padding: '12px 24px',
            borderTop: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
            display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
            background: isDark ? 'var(--gray-100)' : 'var(--gray-50)',
          }}>
            <button
              onClick={onFechar}
              style={{
                background: 'var(--gradient-brand)', color: 'white',
                border: 'none', borderRadius: 'var(--r-md)',
                padding: '8px 20px', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer',
              }}
            >Entendido ✓</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Botão principal ─── */
const ExplicacaoIA = ({ questao, respostaUsuario, apiKey, style = {} }) => {
  const [aberto, setAberto] = useState(false);

  const gabarito = questao?.gabarito?.toUpperCase();
  const resp     = respostaUsuario ? String(respostaUsuario).toUpperCase() : null;
  const errou    = gabarito && resp !== gabarito;

  if (!errou) return null;

  const chave = apiKey || localStorage.getItem('groq_api_key');

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1.5px solid #f59e0b',
          borderRadius: 'var(--r-md)', padding: '8px 16px',
          fontSize: '13px', fontWeight: 700, color: '#92400e',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
          transition: 'all 0.15s',
          ...style,
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        💡 Entender com IA
      </button>

      {aberto && (
        <ModalExplicacao
          questao={questao}
          respostaUsuario={resp || ''}
          apiKey={chave}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
};

export default ExplicacaoIA;