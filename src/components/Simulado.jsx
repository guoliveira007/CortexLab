// src/components/Simulado.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Timer, Flag, RotateCcw, Shuffle, Hand, ClipboardList, Play, Trash2, BookOpen } from 'lucide-react';
import { db } from '../database';
import PainelFiltros from './PainelFiltros';
import ExplicacaoIA from './ExplicacaoIA';
import { useQuestaoFilters } from '../hooks/useQuestaoFilters';
import { useDark } from '../hooks/useDark';

const fmtTempo = (s) => {
  const m  = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
};

/* ─── Simulado ─── */
const Simulado = () => {
  const [aba, setAba]               = useState('lista');
  const [simulados, setSimulados]   = useState([]);
  const [todasQuestoes, setTQ]      = useState([]);

  const [nomeSimulado, setNome]         = useState('');
  const [tempoLimite, setTempo]         = useState(60);
  const [modoSelecao, setModoSel]       = useState('aleatorio');
  const [qtdAleatorio, setQtd]          = useState(10);
  const [selecionadas, setSel]          = useState(new Set());

  const [simAtual, setSimAtual]         = useState(null);
  const [sessaoQ, setSessaoQ]           = useState([]);
  const [respostas, setRespostas]       = useState({});
  const [questaoIdx, setIdx]            = useState(0);
  const [tempoRestante, setTempoR]      = useState(0);
  const [encerrado, setEncerrado]       = useState(false);
  const timerRef    = useRef(null);
  const salvandoRef = useRef(false);
  const restauradoRef = useRef(false);
  const STORAGE_KEY_SIM = 'cortexlab_simulado_sessao';
  const isDark = useDark();

  const { filtros, setFiltro, opcoes, filtradas, resetar } = useQuestaoFilters(todasQuestoes, {
    includeCurriculo: false,
  });

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    if (!todasQuestoes.length || restauradoRef.current) return;
    restauradoRef.current = true;
    const raw = localStorage.getItem(STORAGE_KEY_SIM);
    if (!raw) return;
    try {
      const { simAtual: sim, ids, respostas: resp, questaoIdx: idx, tempoRestante: tempo, savedAt } = JSON.parse(raw);
      const map = Object.fromEntries(todasQuestoes.map(q => [q.id, q]));
      const ordered = ids.map(id => map[id]).filter(Boolean);
      if (!ordered.length) { localStorage.removeItem(STORAGE_KEY_SIM); return; }
      const elapsed = Math.floor((Date.now() - savedAt) / 1000);
      const tempoAjustado = Math.max(0, tempo - elapsed);
      salvandoRef.current = false;
      setSessaoQ(ordered);
      setSimAtual(sim);
      setRespostas(resp || {});
      setIdx(idx || 0);
      setTempoR(tempoAjustado);
      setEncerrado(false);
      setAba('realizando');
      toast('Sessão restaurada! Continuando de onde parou 🔄');
    } catch { localStorage.removeItem(STORAGE_KEY_SIM); }
  }, [todasQuestoes]);

  useEffect(() => {
    if (aba !== 'realizando' || encerrado || !simAtual || !sessaoQ.length) return;
    localStorage.setItem(STORAGE_KEY_SIM, JSON.stringify({
      simAtual,
      ids: sessaoQ.map(q => q.id),
      respostas,
      questaoIdx,
      tempoRestante,
      savedAt: Date.now(),
    }));
  }, [respostas, questaoIdx, tempoRestante]);

  const carregarDados = async () => {
    const [sims, qs] = await Promise.all([db.simulados.toArray(), db.questoes.toArray()]);
    setSimulados(sims.reverse());
    setTQ(qs);
  };

  const criarSimulado = async () => {
    if (!nomeSimulado.trim()) { toast.error('Dê um nome ao simulado!'); return; }
    let ids = [];
    if (modoSelecao === 'aleatorio') {
      const pool = [...filtradas].sort(() => Math.random() - 0.5);
      ids = pool.slice(0, qtdAleatorio).map(q => q.id);
      if (!ids.length) { toast.error('Nenhuma questão encontrada com esses filtros!'); return; }
    } else {
      ids = [...selecionadas];
      if (!ids.length) { toast.error('Selecione ao menos uma questão!'); return; }
    }
    await db.simulados.add({
      nome: nomeSimulado.trim(),
      questoes: ids,
      tempoLimite: Number(tempoLimite),
      criado: new Date().toISOString(),
      total: ids.length,
    });
    toast.success(`Simulado "${nomeSimulado}" criado com ${ids.length} questões!`);
    setNome(''); resetar(); setSel(new Set());
    setAba('lista');
    await carregarDados();
  };

  const iniciarSimulado = async (sim) => {
    const qs = (await db.questoes.getByIds(sim.questoes.map(String))).filter(Boolean);
    if (!qs.length) { toast.error('Nenhuma questão disponível neste simulado.'); return; }
    salvandoRef.current = false;
    setSessaoQ(qs); setSimAtual(sim); setRespostas({});
    setIdx(0); setEncerrado(false);
    setTempoR(sim.tempoLimite * 60);
    setAba('realizando');
  };

  const deletarSimulado = async (id) => {
    await db.simulados.delete(id);
    toast.success('Simulado removido.');
    carregarDados();
  };

  useEffect(() => {
    if (aba !== 'realizando' || encerrado) return;
    timerRef.current = setInterval(() => {
      setTempoR(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [aba, encerrado]);

  const salvarResultados = useCallback(async () => {
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    const agora = new Date().toISOString();
    const registros = sessaoQ.map(q => ({
      questaoId:     q.id,
      data:          agora,
      acertou:       respostas[q.id] ? respostas[q.id] === q.gabarito : false,
      resposta:      respostas[q.id] ?? null,
      tempo:         0,
      modo:          'simulado',
      simuladoNome:  simAtual?.nome,
      materia:       q.materia || null,
    }));
    await db.resultados.bulkAdd(registros);
  }, [sessaoQ, respostas, simAtual]);

  const encerrarSimulado = useCallback(async () => {
    clearInterval(timerRef.current);
    setEncerrado(true);
    localStorage.removeItem(STORAGE_KEY_SIM);
    await salvarResultados();
    setAba('resultado');
  }, [salvarResultados]);

  useEffect(() => {
    if (aba === 'realizando' && !encerrado && tempoRestante === 0 && simAtual) {
      encerrarSimulado();
    }
  }, [tempoRestante, aba, encerrado, simAtual, encerrarSimulado]);

  const responderQuestao = (letra) => {
    const q = sessaoQ[questaoIdx];
    if (!q || respostas[q.id]) return;
    setRespostas(prev => ({ ...prev, [q.id]: letra }));
  };

  /* ── ABA: RESULTADO ── */
  if (aba === 'resultado') {
    const acertos         = sessaoQ.filter(q => respostas[q.id] === q.gabarito).length;
    const taxa            = sessaoQ.length ? Math.round((acertos / sessaoQ.length) * 100) : 0;
    const corT            = taxa >= 70 ? '#10b981' : taxa >= 50 ? '#f59e0b' : '#ef4444';
    const questoesErradas = sessaoQ.filter(q => respostas[q.id] && respostas[q.id] !== q.gabarito);
    const questoesNaoResp = sessaoQ.filter(q => !respostas[q.id]);

    return (
      <div>
        <div className="page-header"><h2 className="page-title">Resultado</h2></div>
        <div className="card" style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '40px', background: isDark ? 'var(--surface-card)' : 'white' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏁</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '6px', color: isDark ? 'var(--gray-900)' : 'inherit' }}>
            {simAtual?.nome}
          </h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: '32px', fontSize: '14px' }}>Simulado concluído</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
            {[
              { label: 'Acertos', valor: acertos,               cor: '#10b981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' },
              { label: 'Erros',   valor: sessaoQ.length - acertos, cor: '#ef4444', bg: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' },
              { label: 'Taxa',    valor: `${taxa}%`,             cor: corT,      bg: isDark ? `${corT}20` : corT + '15' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--r-lg)', padding: '18px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: s.cor }}>{s.valor}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--gray-500)' }}>
              <span>Progresso</span><span>{acertos}/{sessaoQ.length}</span>
            </div>
            <div className="progress-track" style={{ height: '10px' }}>
              <div className="progress-fill" style={{ width: `${taxa}%`, background: corT }} />
            </div>
          </div>

          {questoesNaoResp.length > 0 && (
            <div style={{ marginTop: '32px', textAlign: 'left', borderTop: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-200)', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#92400e' }}>
                ⬜ Não respondidas ({questoesNaoResp.length})
              </h3>
              {questoesNaoResp.map((q, i) => (
                <div key={q.id} style={{
                  marginBottom: '12px', padding: '14px 16px',
                  background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
                  borderRadius: 'var(--r-lg)',
                  border: isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid #fde68a',
                }}>
                  <p style={{ fontWeight: 700, marginBottom: '6px', fontSize: '13px', color: isDark ? '#fcd34d' : '#78350f' }}>
                    Questão {i + 1 + questoesErradas.length}: {q.comando?.substring(0, 100)}{q.comando?.length > 100 ? '…' : ''}
                  </p>
                  <p style={{ fontSize: '12px', color: isDark ? '#fcd34d' : '#92400e' }}>
                    Gabarito: <strong>{q.gabarito}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}

          {questoesErradas.length > 0 && (
            <div style={{ marginTop: '32px', textAlign: 'left', borderTop: questoesNaoResp.length > 0 ? 'none' : isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-200)', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} /> Questões que você errou ({questoesErradas.length})
              </h3>
              {questoesErradas.map((q, i) => {
                const respostaErrada = respostas[q.id];
                return (
                  <div key={q.id} style={{
                    marginBottom: '20px', padding: '16px',
                    background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                    borderRadius: 'var(--r-lg)',
                    border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid #fecaca',
                  }}>
                    <p style={{ fontWeight: 700, marginBottom: '8px', fontSize: '13px', color: isDark ? '#fca5a5' : '#991b1b' }}>
                      Questão {i + 1}: {q.comando?.substring(0, 100)}{q.comando?.length > 100 ? '…' : ''}
                    </p>
                    <p style={{ fontSize: '12px', color: isDark ? '#fca5a5' : '#b91c1c', marginBottom: '10px' }}>
                      Sua resposta: <strong>{respostaErrada}</strong>
                      {' · '}
                      Correto: <strong>{q.gabarito}</strong>
                    </p>
                    <ExplicacaoIA
                      questao={q}
                      respostaUsuario={respostaErrada ? String(respostaErrada).toUpperCase() : null}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              className="btn-secondary"
              style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              onClick={() => setAba('lista')}
            >← Voltar</button>
            <button
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => iniciarSimulado(simAtual)}
            >
              <RotateCcw size={15} /> Refazer
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── ABA: REALIZANDO ── */
  if (aba === 'realizando') {
    const q           = sessaoQ[questaoIdx];
    const respAtual   = q ? respostas[q.id] : null;
    const respondidas = Object.keys(respostas).length;
    const tempoPerc   = simAtual ? (tempoRestante / (simAtual.tempoLimite * 60)) * 100 : 100;
    const corTempo    = tempoPerc > 30 ? 'var(--accent-green)' : tempoPerc > 10 ? '#f59e0b' : '#ef4444';

    return (
      <div>
        {/* Barra de status */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: isDark ? 'var(--surface-card)' : 'white',
          color: isDark ? 'var(--gray-800)' : 'inherit',
          padding: '12px 20px', borderRadius: 'var(--r-xl)',
          marginBottom: '16px', boxShadow: 'var(--shadow-sm)',
          border: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
          flexWrap: 'wrap', gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '18px', fontSize: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: isDark ? 'var(--gray-700)' : 'var(--gray-700)' }}>{simAtual?.nome}</span>
            <span style={{ color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={14} /> <strong>{respondidas}</strong>/{sessaoQ.length} respondidas
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'monospace', fontSize: '20px', fontWeight: 800,
              color: corTempo, background: corTempo + '15',
              padding: '4px 12px', borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Timer size={18} /> {fmtTempo(tempoRestante)}
            </span>
            <button
              onClick={() => { if (window.confirm('Encerrar o simulado agora?')) encerrarSimulado(); }}
              style={{
                padding: '8px 16px',
                background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                border: isDark ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid #fecaca',
                borderRadius: 'var(--r-md)',
                color: '#dc2626', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Flag size={14} /> Encerrar
            </button>
          </div>
        </div>

        {/* Barra de progresso do tempo */}
        <div className="progress-track" style={{ height: '5px', marginBottom: '16px' }}>
          <div className="progress-fill" style={{ width: `${tempoPerc}%`, background: corTempo, transition: 'width 1s linear' }} />
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Painel lateral */}
          <div style={{
            position: 'sticky', top: '16px', width: '176px', flexShrink: 0,
            background: isDark ? 'var(--surface-card)' : 'white',
            color: isDark ? 'var(--gray-800)' : 'inherit',
            borderRadius: 'var(--r-xl)', padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            border: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
            maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
          }}>
            <p style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px',
              color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: '10px',
            }}>
              Questões
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
              {sessaoQ.map((qq, i) => {
                const respondida = !!respostas[qq.id];
                const atual      = i === questaoIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    title={respondida ? 'Respondida' : 'Pendente'}
                    style={{
                      width: '34px', height: '34px', borderRadius: 'var(--r-md)',
                      border: `2px solid ${atual ? 'var(--brand-500)' : respondida ? 'var(--accent-green)' : (isDark ? 'var(--gray-300)' : 'var(--gray-200)')}`,
                      background: atual ? (isDark ? 'rgba(99,102,241,0.15)' : 'var(--brand-50)') : respondida ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : (isDark ? 'var(--gray-100)' : 'white'),
                      color: atual ? 'var(--brand-600)' : respondida ? '#065f46' : (isDark ? 'var(--gray-500)' : 'var(--gray-500)'),
                      fontWeight: atual || respondida ? 700 : 400,
                      fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ borderTop: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5', border: '2px solid var(--accent-green)', display: 'inline-block' }} />
                Respondida ({respondidas})
              </span>
              <span style={{ fontSize: '11px', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: isDark ? 'var(--gray-100)' : 'white', border: isDark ? '2px solid var(--gray-300)' : '2px solid var(--gray-200)', display: 'inline-block' }} />
                Pendente ({sessaoQ.length - respondidas})
              </span>
            </div>
          </div>

          {/* Questão atual */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {q && (
              <div className="questao-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                  <span style={{
                    background: 'var(--gradient-brand)', color: 'white',
                    padding: '3px 12px', borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
                  }}>
                    Q{questaoIdx + 1}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                    {[q.banca, q.ano, q.materia].filter(Boolean).join(' · ')}
                  </span>
                </div>

                {q.enunciado && (
                  <p style={{ marginBottom: '12px', lineHeight: '1.75', color: 'var(--gray-700)', fontSize: '15px' }}>
                    {q.enunciado}
                  </p>
                )}
                {q.imagemEnunciado && (
                  <img src={q.imagemEnunciado} alt=""
                    style={{ maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '12px' }} />
                )}

                <div style={{
                  background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
                  padding: '12px 16px',
                  borderLeft: '3px solid var(--accent-amber)',
                  borderRadius: '0 var(--r-md) var(--r-md) 0',
                  marginBottom: '18px',
                  color: isDark ? '#fcd34d' : '#92400e',
                  fontSize: '14px', fontWeight: 500,
                }}>
                  {q.comando}
                </div>

                {['A', 'B', 'C', 'D', 'E'].map(lt => {
                  const txt = q.alternativas?.[lt];
                  const img = q.imagensAlternativas?.[lt];
                  if (!txt && !img) return null;
                  const marcada = respAtual === lt;
                  return (
                    <div
                      key={lt}
                      data-testid={`alt-${lt}`}
                      className={`alternativa ${marcada ? 'correta' : ''}`}
                      onClick={() => responderQuestao(lt)}
                      style={{
                        cursor: respAtual ? 'default' : 'pointer',
                        background: marcada ? 'rgba(99,102,241,0.07)' : undefined,
                        borderColor: marcada ? 'var(--brand-400)' : undefined,
                      }}
                    >
                      <strong style={{ minWidth: '22px' }}>{lt})</strong>
                      <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.6' }}>{txt}</span>
                      {img && (
                        <img src={img} alt=""
                          style={{ maxWidth: '180px', borderRadius: 'var(--r-sm)', marginTop: '6px' }} />
                      )}
                      {marcada && <span style={{ color: 'var(--brand-500)' }}>✓</span>}
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setIdx(i => Math.max(0, i - 1))}
                    disabled={questaoIdx === 0}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  >← Anterior</button>
                  {questaoIdx < sessaoQ.length - 1 ? (
                    <button
                      className="btn-primary"
                      onClick={() => setIdx(i => i + 1)}
                      style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                    >Próxima →</button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => { if (window.confirm('Finalizar e ver resultados?')) encerrarSimulado(); }}
                      style={{ flex: 1, justifyContent: 'center', padding: '10px', background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Flag size={15} /> Finalizar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── ABA: CRIAR ── */
  if (aba === 'criar') {
    return (
      <div>
        <div className="page-header">
          <div>
            <button className="btn-ghost" onClick={() => setAba('lista')}>← Voltar</button>
            <h2 className="page-title" style={{ marginTop: '4px' }}>Criar Simulado</h2>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px', background: isDark ? 'var(--surface-card)' : 'white' }}>
          <p className="section-title">Informações</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label className="field-label">Nome do simulado</label>
              <input
                className="input-modern"
                value={nomeSimulado}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Simulado CESPE – Direito Administrativo"
              />
            </div>
            <div>
              <label className="field-label">Tempo limite (min)</label>
              <input
                className="input-modern"
                type="number"
                min="1"
                value={tempoLimite}
                onChange={e => setTempo(Number(e.target.value))}
                style={{ width: '100px' }}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px', background: isDark ? 'var(--surface-card)' : 'white' }}>
          <p className="section-title">Modo de seleção</p>
          <div className="tab-group" style={{ marginBottom: '20px' }}>
            <button
              className={`tab-btn ${modoSelecao === 'aleatorio' ? 'active' : ''}`}
              onClick={() => setModoSel('aleatorio')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Shuffle size={14} /> Aleatório
            </button>
            <button
              className={`tab-btn ${modoSelecao === 'manual' ? 'active' : ''}`}
              onClick={() => setModoSel('manual')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Hand size={14} /> Manual
            </button>
          </div>

          <PainelFiltros
            filtros={filtros}
            setFiltro={setFiltro}
            opcoes={opcoes}
            resetar={resetar}
          />

          {modoSelecao === 'aleatorio' && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="field-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                Quantidade de questões:
              </label>
              <input
                className="input-modern"
                type="number"
                min="1"
                max="200"
                value={qtdAleatorio}
                onChange={e => setQtd(Math.max(1, Number(e.target.value)))}
                style={{ width: '90px', margin: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                (selecionadas aleatoriamente dos filtros acima)
              </span>
            </div>
          )}

          {modoSelecao === 'manual' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                  {filtradas.length} questão(ões) encontradas com os filtros atuais
                </span>
                {selecionadas.size > 0 && (
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: 'var(--brand-600)',
                    background: isDark ? 'rgba(99,102,241,0.15)' : 'var(--brand-50)',
                    padding: '4px 12px', borderRadius: 'var(--r-full)',
                    border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--brand-200)',
                  }}>
                    {selecionadas.size} selecionada(s)
                  </span>
                )}
              </div>

              {filtradas.length > 0 && (
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: isDark ? '1px solid var(--gray-300)' : '1px solid var(--gray-200)', borderRadius: 'var(--r-lg)' }}>
                  {filtradas.map((q, i) => {
                    const sel = selecionadas.has(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setSel(prev => {
                            const next = new Set(prev);
                            next.has(q.id) ? next.delete(q.id) : next.add(q.id);
                            return next;
                          });
                        }}
                        style={{
                          display: 'flex', gap: '12px', alignItems: 'flex-start',
                          padding: '12px 16px',
                          background: sel ? (isDark ? 'rgba(99,102,241,0.15)' : 'var(--brand-50)') : (i % 2 === 0 ? (isDark ? 'var(--surface-card)' : 'white') : (isDark ? 'var(--gray-100)' : 'var(--gray-50)')),
                          borderBottom: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                      >
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                          border: `2px solid ${sel ? 'var(--brand-500)' : (isDark ? 'var(--gray-400)' : 'var(--gray-300)')}`,
                          background: sel ? 'var(--brand-500)' : (isDark ? 'var(--gray-100)' : 'white'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {sel && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', color: isDark ? 'var(--gray-700)' : 'var(--gray-700)', marginBottom: '3px', fontWeight: sel ? 600 : 400 }}>
                            {q.comando?.substring(0, 100)}{q.comando?.length > 100 ? '…' : ''}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            {[q.banca, q.ano, q.materia].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {filtradas.length === 0 && (
                <p style={{ color: 'var(--gray-400)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  Nenhuma questão corresponde aos filtros.
                </p>
              )}
            </div>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={criarSimulado}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={16} /> Criar Simulado
        </button>
      </div>
    );
  }

  /* ── ABA: LISTA ── */
  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2 className="page-title">Simulados</h2>
          <button className="btn-primary" onClick={() => setAba('criar')}>+ Novo Simulado</button>
        </div>
      </div>

      {simulados.length === 0 ? (
        <div className="card" style={{ background: isDark ? 'var(--surface-card)' : 'white' }}>
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">Nenhum simulado criado</p>
            <p className="empty-state-desc">Crie seu primeiro simulado para testar seus conhecimentos.</p>
            <button className="btn-primary" onClick={() => setAba('criar')}>+ Criar Simulado</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {simulados.map(sim => (
            <div
              key={sim.id}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: isDark ? 'var(--surface-card)' : 'white' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: '16px',
                  fontWeight: 700, color: isDark ? 'var(--gray-900)' : 'var(--gray-900)', marginBottom: '4px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {sim.nome}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClipboardList size={13} /> {sim.total} questões
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Timer size={13} /> {sim.tempoLimite} min
                  </span>
                  <span>· {new Date(sim.criado).toLocaleDateString('pt-BR')}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  className="btn-primary"
                  onClick={() => iniciarSimulado(sim)}
                  style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Play size={14} /> Iniciar
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Remover "${sim.nome}"?`)) deletarSimulado(sim.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                    border: isDark ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid #fecaca',
                    borderRadius: 'var(--r-md)',
                    color: '#dc2626', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Simulado;