import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import ExplicacaoIA from './ExplicacaoIA';
import Alternativas from './Alternativas';

const Lista = ({ lista, onVoltar }) => {
  const [questoes, setQuestoes]             = useState([]);
  const [indice, setIndice]                 = useState(0);
  const [resposta, setResposta]             = useState(null);
  const [mostrarFb, setMostrarFb]           = useState(false);
  const [timer, setTimer]                   = useState(0);
  const [stats, setStats]                   = useState({ acertos: 0, erros: 0 });
  const [finalizado, setFinal]              = useState(false);
  const [todasRespostas, setTodasRespostas] = useState({});
  const timerRef = useRef(null);

  const iniciarTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(p => p + 1), 1000);
  }, []);

  const carregarQuestoes = useCallback(async () => {
    const q = await db.getQuestoesDaLista(lista);
    if (!q.length) { toast.error('Lista sem questões!'); onVoltar(); return; }
    setQuestoes(q.sort(() => Math.random() - 0.5));
    iniciarTimer();
  }, [lista, onVoltar, iniciarTimer]);

  useEffect(() => {
    carregarQuestoes();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [carregarQuestoes]);

  const pararTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const questaoAtual = questoes[indice];

  const responder = async (letra) => {
    if (resposta) return;
    pararTimer();
    setResposta(letra);
    setMostrarFb(true);

    const acertou = letra === questaoAtual.gabarito;

    setTodasRespostas(prev => ({ ...prev, [questaoAtual.id]: letra }));

    setStats(prev => ({
      ...prev,
      [acertou ? 'acertos' : 'erros']: prev[acertou ? 'acertos' : 'erros'] + 1,
    }));

    acertou
      ? toast.success('✅ Correto!')
      : toast.error(`❌ Resposta: ${questaoAtual.gabarito}`);

    await db.resultados.add({
      questaoId: questaoAtual.id,
      data: new Date().toISOString(),
      acertou,
      tempo: timer,
      modo: 'lista',
      materia: questaoAtual.materia || null,
    });
  };

  const proxima = () => {
    if (indice + 1 < questoes.length) {
      setIndice(i => i + 1);
      setResposta(null);
      setMostrarFb(false);
      iniciarTimer();
    } else {
      pararTimer();
      setFinal(true);
    }
  };

  if (!questoes.length) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-400)' }}>
      Carregando...
    </div>
  );

  /* ── Tela final ── */
  if (finalizado) {
    const taxa = Math.round((stats.acertos / questoes.length) * 100);
    const corT = taxa >= 70 ? '#10b981' : taxa >= 50 ? '#f59e0b' : '#ef4444';

    const questoesErradas = questoes.filter(q =>
      todasRespostas[q.id] && todasRespostas[q.id] !== q.gabarito
    );

    const reiniciar = () => {
      setQuestoes(prev => [...prev].sort(() => Math.random() - 0.5));
      setTodasRespostas({});
      setIndice(0);
      setStats({ acertos: 0, erros: 0 });
      setFinal(false);
      setResposta(null);
      setMostrarFb(false);
      iniciarTimer();
    };

    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏁</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
          Lista Concluída!
        </h2>
        <p style={{ color: 'var(--gray-400)', marginBottom: '32px', fontSize: '14px' }}>
          {lista.nome}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {[
            { label: 'Acertos', valor: stats.acertos, cor: '#10b981', bg: '#ecfdf5' },
            { label: 'Erros',   valor: stats.erros,   cor: '#ef4444', bg: '#fef2f2' },
            { label: 'Taxa',    valor: `${taxa}%`,    cor: corT,      bg: corT + '15' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--r-lg)', padding: '16px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: s.cor }}>
                {s.valor}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={reiniciar}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >🔄 Refazer</button>
          <button
            className="btn-secondary"
            onClick={onVoltar}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >← Voltar</button>
        </div>

        {questoesErradas.length > 0 && (
          <div style={{
            marginTop: '28px', textAlign: 'left',
            borderTop: '1px solid var(--gray-200)', paddingTop: '24px',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', marginBottom: '14px' }}>
              📓 Questões que você errou ({questoesErradas.length})
            </h3>
            {questoesErradas.map(q => (
              <div key={q.id} style={{
                marginBottom: '14px', padding: '14px',
                background: '#fef2f2', borderRadius: 'var(--r-lg)',
                border: '1px solid #fecaca',
              }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: '#991b1b', marginBottom: '6px' }}>
                  {q.comando?.substring(0, 120)}{q.comando?.length > 120 ? '…' : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '10px' }}>
                  Sua resposta: <strong>{todasRespostas[q.id]}</strong>
                  {' · '}
                  Correto: <strong>{q.gabarito}</strong>
                </p>
                <ExplicacaoIA questao={q} respostaUsuario={todasRespostas[q.id]} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Questão ── */
  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn-ghost" onClick={() => { pararTimer(); onVoltar(); }}>← Voltar</button>
          <h2 className="page-title" style={{ marginTop: '4px' }}>{lista.nome}</h2>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: '20px', alignItems: 'center',
        background: 'white', padding: '13px 20px', borderRadius: 'var(--r-xl)',
        marginBottom: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
          📋 <strong>{indice + 1}</strong>/{questoes.length}
        </span>
        <span style={{ fontSize: '14px', color: 'var(--accent-green)', fontWeight: 700 }}>✅ {stats.acertos}</span>
        <span style={{ fontSize: '14px', color: 'var(--accent-red)',   fontWeight: 700 }}>❌ {stats.erros}</span>
        <span className="timer-badge" style={{ marginLeft: 'auto' }}>⏱ {timer}s</span>
      </div>

      {questaoAtual && (
        <div className={`questao-card ${mostrarFb ? (resposta === questaoAtual.gabarito ? 'acertou' : 'errou') : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{
              background: 'var(--gradient-brand)', color: 'white',
              padding: '3px 12px', borderRadius: 'var(--r-sm)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
            }}>
              Q{indice + 1}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
              {[questaoAtual.banca, questaoAtual.ano, questaoAtual.materia].filter(Boolean).join(' · ')}
            </span>
          </div>

          {questaoAtual.enunciado && (
            <p style={{ marginBottom: '12px', lineHeight: '1.75', color: 'var(--gray-700)', fontSize: '15px' }}>
              {questaoAtual.enunciado}
            </p>
          )}
          {questaoAtual.imagemEnunciado && (
            <img src={questaoAtual.imagemEnunciado} alt=""
              style={{ maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '12px' }} />
          )}

          <div style={{
            background: '#fffbeb', padding: '12px 16px',
            borderLeft: '3px solid var(--accent-amber)',
            borderRadius: '0 var(--r-md) var(--r-md) 0',
            marginBottom: '18px', color: '#92400e', fontSize: '14px', fontWeight: 500,
          }}>
            {questaoAtual.comando}
          </div>

          <Alternativas
            alternativas={questaoAtual.alternativas}
            imagensAlternativas={questaoAtual.imagensAlternativas}
            gabarito={questaoAtual.gabarito}
            resposta={resposta}
            onResponder={responder}
            feedbackTexto={
              resposta
                ? (resposta === questaoAtual.gabarito ? '✅ Acertou!' : `❌ Resposta correta: ${questaoAtual.gabarito}`)
                : null
            }
            explicacao={questaoAtual.explicacao}
          />

          {mostrarFb && (
            <div style={{ marginTop: '16px' }}>
              {resposta !== questaoAtual.gabarito && (
                <div style={{ marginBottom: '14px' }}>
                  <ExplicacaoIA questao={questaoAtual} respostaUsuario={resposta} />
                </div>
              )}

              <button
                className="btn-primary"
                onClick={proxima}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                {indice + 1 < questoes.length ? '▶ Próxima' : '🏁 Finalizar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Lista;