import React, { useState, useEffect } from 'react';
import { db } from '../database';

/**
 * ResumoMateria — Gera um resumo inteligente de uma matéria
 * analisando as questões que o usuário mais erra.
 * Usa Groq / Llama 3.1 8B com streaming.
 */

const chamarGroqStream = async (prompt, apiKey, onChunk) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
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

const montarPrompt = (materia, questoesErradas, totalQuestoes) => {
  const topicosErrados = [...new Set(questoesErradas.map(q => q.topico).filter(Boolean))];
  const conteudosErrados = [...new Set(questoesErradas.map(q => q.conteudo).filter(Boolean))];

  // Pega até 5 questões erradas como exemplos
  const exemplos = questoesErradas.slice(0, 5).map((q, i) =>
    `Questão ${i + 1} (${q.topico || q.conteudo || 'sem tópico'}):\n"${(q.comando || q.enunciado || '').substring(0, 200)}"`
  ).join('\n\n');

  return `Você é um professor especialista em concursos públicos. 
Um aluno está estudando "${materia}" e precisa de um resumo focado nos pontos que mais erra.

DADOS DO ALUNO:
- Total de questões respondidas nesta matéria: ${totalQuestoes}
- Questões erradas: ${questoesErradas.length} (${Math.round((questoesErradas.length / totalQuestoes) * 100)}% de erro)
- Tópicos com mais erros: ${topicosErrados.slice(0, 5).join(', ') || 'variados'}
- Conteúdos problemáticos: ${conteudosErrados.slice(0, 5).join(', ') || 'variados'}

EXEMPLOS DE QUESTÕES QUE O ALUNO ERROU:
${exemplos}

Crie um resumo de estudo estruturado com:
1. **Os 3 conceitos-chave** que o aluno precisa dominar (com base nos erros)
2. **Resumo teórico** de cada conceito (claro e direto)
3. **Dicas de memorização** e macetes para concurso
4. **Pegadinhas comuns** que as bancas usam nesta matéria
5. **Plano de revisão** em 3 passos para consolidar o conteúdo

Seja específico, didático e focado em concursos públicos. Máximo 600 palavras.`;
};

/* ─── Card de matéria para selecionar ─── */
const CardMateria = ({ materia, total, erros, onClick }) => {
  const taxa = total ? Math.round((erros / total) * 100) : 0;
  const cor  = taxa >= 50 ? '#ef4444' : taxa >= 30 ? '#f59e0b' : '#10b981';

  return (
    <button
      onClick={onClick}
      style={{
        background: 'white', border: '1.5px solid var(--gray-200)',
        borderRadius: 'var(--r-xl)', padding: '20px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--brand-400)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--gray-200)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>
          📚 {materia}
        </span>
        <span style={{
          background: cor + '20', color: cor,
          padding: '3px 10px', borderRadius: 'var(--r-full)',
          fontSize: '12px', fontWeight: 700,
        }}>
          {taxa}% erros
        </span>
      </div>
      <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--r-full)', height: '6px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ height: '100%', width: `${taxa}%`, background: cor, borderRadius: 'var(--r-full)', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--gray-500)' }}>
        <span>📝 {total} questões</span>
        <span style={{ color: '#ef4444' }}>❌ {erros} erros</span>
      </div>
    </button>
  );
};

/* ─── Renderização do resumo ─── */
const TextoResumo = ({ texto, streamando }) => (
  <div style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.8' }}>
    {texto.split('\n').map((linha, i) => {
      if (!linha.trim()) return <div key={i} style={{ height: '6px' }} />;

      // Seções numeradas (ex: "1. **Conceitos-chave**")
      if (/^\d+\.\s\*\*/.test(linha)) {
        const semMd = linha.replace(/\*\*/g, '');
        return (
          <div key={i} style={{
            background: 'linear-gradient(135deg, var(--brand-50), white)',
            border: '1px solid var(--brand-200)',
            borderRadius: 'var(--r-md)', padding: '10px 16px',
            marginBottom: '10px', marginTop: '6px',
          }}>
            <strong style={{ color: 'var(--brand-600)', fontSize: '14px' }}>{semMd}</strong>
          </div>
        );
      }

      // Negrito inline
      const partes = linha.split(/\*\*(.*?)\*\*/g);
      const ultima = i === texto.split('\n').length - 1;

      return (
        <p key={i} style={{ marginBottom: '6px' }}>
          {partes.map((p, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: 'var(--gray-900)' }}>{p}</strong>
              : p
          )}
          {streamando && ultima && (
            <span style={{
              display: 'inline-block', width: '2px', height: '14px',
              background: 'var(--brand-500)', marginLeft: '3px',
              verticalAlign: 'middle', borderRadius: '1px',
              animation: 'piscar 0.9s infinite',
            }} />
          )}
        </p>
      );
    })}
  </div>
);

/* ─── ResumoMateria ─── */
const ResumoMateria = () => {
  const [materias, setMaterias]       = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [status, setStatus]           = useState('idle'); // idle | carregando | streamando | pronto | erro
  const [resumo, setResumo]           = useState('');
  const [erro, setErro]               = useState('');

  const apiKey = localStorage.getItem('groq_api_key');

  useEffect(() => { carregarMaterias(); }, []);

  const carregarMaterias = async () => {
    const [resultados, questoesArr] = await Promise.all([
      db.resultados.toArray(),
      db.questoes.toArray(),
    ]);

    const questoesMap = {};
    questoesArr.forEach(q => { questoesMap[q.id] = q; });

    const stats = {};
    resultados.forEach(r => {
      const q = questoesMap[r.questaoId] || questoesMap[r.id_questao];
      if (!q?.materia) return;
      if (!stats[q.materia]) stats[q.materia] = { total: 0, erros: 0, questoes: [] };
      stats[q.materia].total++;
      if (!r.acertou) {
        stats[q.materia].erros++;
        if (!stats[q.materia].questoes.find(x => x.id === q.id)) {
          stats[q.materia].questoes.push(q);
        }
      }
    });

    const lista = Object.entries(stats)
      .map(([materia, s]) => ({ materia, ...s }))
      .filter(m => m.total >= 3) // só mostra matérias com pelo menos 3 questões
      .sort((a, b) => (b.erros / b.total) - (a.erros / a.total));

    setMaterias(lista);
  };

  const gerarResumo = async (item) => {
    setSelecionada(item);
    setResumo('');
    setErro('');

    if (!apiKey) {
      setErro('Configure sua chave Groq em Configurações para usar esta função.');
      setStatus('erro');
      return;
    }

    if (item.erros === 0) {
      setErro('Você não errou nenhuma questão desta matéria ainda! Perfeito! 🎉');
      setStatus('erro');
      return;
    }

    setStatus('carregando');
    try {
      const prompt = montarPrompt(item.materia, item.questoes, item.total);
      await chamarGroqStream(prompt, apiKey, (chunk) => {
        setStatus('streamando');
        setResumo(prev => prev + chunk);
      });
      setStatus('pronto');
    } catch (e) {
      setErro(e.message);
      setStatus('erro');
    }
  };

  const voltar = () => {
    setSelecionada(null);
    setStatus('idle');
    setResumo('');
    setErro('');
  };

  /* ── Tela de resumo ── */
  if (selecionada) {
    return (
      <div>
        <style>{`@keyframes piscar{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        <div className="page-header">
          <div>
            <button className="btn-ghost" onClick={voltar}>← Voltar</button>
            <h2 className="page-title" style={{ marginTop: '4px' }}>
              Resumo: {selecionada.materia}
            </h2>
          </div>
          {status === 'pronto' && (
            <button className="btn-secondary" onClick={() => gerarResumo(selecionada)} style={{ fontSize: '13px' }}>
              🔄 Gerar novamente
            </button>
          )}
        </div>

        {/* Stats da matéria */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px',
        }}>
          {[
            { label: 'Questões', valor: selecionada.total, emoji: '📝', cor: 'var(--brand-600)' },
            { label: 'Erros', valor: selecionada.erros, emoji: '❌', cor: '#ef4444' },
            { label: 'Taxa de erro', valor: `${Math.round((selecionada.erros / selecionada.total) * 100)}%`, emoji: '📊', cor: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'white', borderRadius: 'var(--r-xl)', padding: '18px',
              textAlign: 'center', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: s.cor }}>{s.valor}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          {status === 'carregando' && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>🧠</div>
              <p style={{ color: 'var(--gray-500)', fontWeight: 600 }}>Analisando seus erros...</p>
              <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginTop: '6px' }}>
                A IA está criando um resumo personalizado com base nas suas dificuldades.
              </p>
            </div>
          )}

          {status === 'erro' && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fecaca',
              borderRadius: 'var(--r-lg)', padding: '16px',
            }}>
              <p style={{ color: '#991b1b', fontWeight: 600, marginBottom: '8px' }}>⚠️ {erro}</p>
              {apiKey && (
                <button onClick={() => gerarResumo(selecionada)} style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  borderRadius: 'var(--r-md)', padding: '8px 16px',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}>Tentar novamente</button>
              )}
            </div>
          )}

          {(status === 'streamando' || status === 'pronto') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--r-md)',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>🧠</div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>
                    Resumo personalizado
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                    Baseado em {selecionada.erros} questões que você errou
                  </p>
                </div>
                {status === 'streamando' && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--brand-50)', color: 'var(--brand-600)',
                    padding: '4px 10px', borderRadius: 'var(--r-full)',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    ✍️ Escrevendo...
                  </span>
                )}
              </div>
              <TextoResumo texto={resumo} streamando={status === 'streamando'} />
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Tela de seleção ── */
  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Resumo por Matéria</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            A IA analisa seus erros e cria um resumo focado nos pontos fracos.
          </p>
        </div>
      </div>

      {materias.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">Nenhuma matéria com dados suficientes</p>
            <p className="empty-state-desc">
              Responda pelo menos 3 questões de uma matéria para gerar o resumo.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #f59e0b', borderRadius: 'var(--r-xl)',
            padding: '14px 20px', marginBottom: '20px',
            display: 'flex', gap: '10px', alignItems: 'center',
          }}>
            <span style={{ fontSize: '20px' }}>💡</span>
            <p style={{ fontSize: '13px', color: '#78350f' }}>
              As matérias aparecem ordenadas por maior taxa de erro. Clique em uma para gerar o resumo personalizado.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {materias.map(m => (
              <CardMateria
                key={m.materia}
                materia={m.materia}
                total={m.total}
                erros={m.erros}
                onClick={() => gerarResumo(m)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ResumoMateria;
