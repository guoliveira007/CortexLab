import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../database';

/* ─── Constantes ─── */
const MODOS = [
  { id: 'foco',        label: 'Foco',   emoji: '🎯', minutos: 25, cor: '#6366f1', corSec: '#4338ca', glowColor: 'rgba(99,102,241,0.45)' },
  { id: 'pausa',       label: 'Pausa',  emoji: '☕',  minutos: 5,  cor: '#10b981', corSec: '#059669', glowColor: 'rgba(16,185,129,0.45)' },
  { id: 'pausa-longa', label: 'Longa',  emoji: '🌙', minutos: 15, cor: '#8b5cf6', corSec: '#7c3aed', glowColor: 'rgba(139,92,246,0.45)' },
];

const RAIO = 56;
const CIRC = 2 * Math.PI * RAIO;
const fmtTempo = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtMin  = s => s < 60 ? `${s}s` : `${Math.round(s / 60)}min`;

/* ─── Injeção de CSS uma única vez ─── */
const CSS_ID = '__pomodoro-styles__';
if (typeof document !== 'undefined' && !document.getElementById(CSS_ID)) {
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    @keyframes pom-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
      50%       { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
    }
    @keyframes pom-pulse-green {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
      50%       { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
    }
    @keyframes pom-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pom-slide-in {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pom-tick {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.04); }
    }
    @keyframes pom-dot-blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }
    .pom-widget { animation: pom-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1); }
    .pom-timer-active { animation: pom-tick 1s ease-in-out infinite; }
    .pom-suggestion { animation: pom-fade-up 0.4s ease; }

    /* ── Extracted from inline styles ── */
    .pom-mini-stat { display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.08); border-radius:8px; padding:5px 10px; backdrop-filter:blur(6px); }
    .pom-mini-stat__label { font-size:9px; color:rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.06em; line-height:1.2; }
    .pom-stat-grid { display:grid; grid-template-columns:1fr 1px 1fr 1px 1fr; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:10px; overflow:hidden; padding:8px 0; }
    .pom-stat-cell { text-align:center; padding:4px 6px; }
    .pom-stat-sep  { background:rgba(255,255,255,0.08); width:1px; }
    .pom-icon-btn  { background:rgba(255,255,255,0.08); border:none; width:28px; height:28px; border-radius:7px; cursor:pointer; color:rgba(255,255,255,0.5); font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
    .pom-icon-btn:hover { background:rgba(255,255,255,0.15); }
    .pom-reset-btn { width:42px; height:42px; flex-shrink:0; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; cursor:pointer; color:rgba(255,255,255,0.5); font-size:18px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
    .pom-reset-btn:hover { background:rgba(255,255,255,0.12); }
    .pom-glow-orb  { position:absolute; top:-30px; right:-20px; width:100px; height:100px; border-radius:50%; pointer-events:none; }
    .pom-revision-hint { margin-top:10px; padding:8px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all 0.15s; }
    .pom-revision-hint:hover { background:rgba(239,68,68,0.18); }
  `;
  document.head.appendChild(style);
}

/* ─── Mini Badge de revisões ─── */
const RevBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: -4, right: -4,
      background: '#ef4444', color: 'white',
      fontSize: '9px', fontWeight: 800,
      width: 18, height: 18, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid white',
      boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
    }}>{count > 9 ? '9+' : count}</span>
  );
};

/* ─── Mini stat pill ─── */
const MiniStat = ({ icon, value, label, cor }) => (
  <div className="pom-mini-stat">
    <span style={{ fontSize: 13 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: cor, lineHeight: 1 }}>{value}</div>
      <div className="pom-mini-stat__label">{label}</div>
    </div>
  </div>
);

/* ─── Pomodoro ─── */
const Pomodoro = ({ onFocoConcluido }) => {
  const [aberto, setAberto]         = useState(false);
  const [modoIdx, setModoIdx]       = useState(0);
  const [segundos, setSegundos]     = useState(MODOS[0].minutos * 60);
  const [ativo, setAtivo]           = useState(false);
  const [materia, setMateria]       = useState('');
  const [materias, setMaterias]     = useState([]);
  const [ciclos, setCiclos]         = useState(0);
  const [sessoesHoje, setSessHoje]  = useState(0);
  const [tempoHoje, setTempoHoje]   = useState(0);
  const [sugestao, setSugestao]     = useState(null);
  const [statsHoje, setStatsHoje]   = useState({ questoes: 0, taxa: 0 });
  const [revisoesHoje, setRevHoje]  = useState(0);
  const [materiaErros, setMatErros] = useState(null);

  const concluirPendenteRef = useRef(false);
  const modoIdxRef           = useRef(0);
  const materiaRef           = useRef('');
  const ciclosRef            = useRef(0);
  const timerRef             = useRef(null);

  useEffect(() => { modoIdxRef.current = modoIdx; }, [modoIdx]);
  useEffect(() => { materiaRef.current = materia; }, [materia]);

  /* ── Carrega dados da plataforma ── */
  const carregarDados = useCallback(async () => {
    try {
      const [questoesArr, sessoesArr, resultadosArr, estadosSM2] = await Promise.all([
        db.questoes.toArray(),
        db.sessoes.toArray().catch(() => []),
        db.resultados.toArray().catch(() => []),
        db.revisaoEspacada.toArray().catch(() => []),
      ]);

      setMaterias([...new Set(questoesArr.map(q => q.materia).filter(Boolean))].sort());

      const hoje = new Date().toDateString();
      const sesHoje = sessoesArr.filter(s => new Date(s.data).toDateString() === hoje);
      setSessHoje(sesHoje.length);
      setTempoHoje(sesHoje.reduce((acc, s) => acc + (s.duracao || 0), 0));

      const dataISO = new Date().toISOString().split('T')[0];
      const idsExist = new Set(questoesArr.map(q => String(q.id)));
      const pendentes = estadosSM2.filter(e =>
        e.proximaRevisao <= dataISO && idsExist.has(String(e.questaoId))
      ).length;
      setRevHoje(pendentes);

      const hojeRs = resultadosArr.filter(r => new Date(r.data).toDateString() === hoje);
      const totalH = hojeRs.length;
      const acertH = hojeRs.filter(r => r.acertou).length;
      setStatsHoje({ questoes: totalH, taxa: totalH ? Math.round((acertH / totalH) * 100) : 0 });

      // Matéria com mais erros (sugestão inteligente)
      const mapa = {};
      resultadosArr
        .filter(r => r.acertou === false)
        .forEach(r => {
          const q = questoesArr.find(q => q.id === (r.questaoId || r.id_questao));
          if (q?.materia) mapa[q.materia] = (mapa[q.materia] || 0) + 1;
        });
      const entries = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
      setMatErros(entries[0]?.[0] || null);
    } catch { /* ignorado */ }
  }, []);

  useEffect(() => {
    carregarDados();
    const id = setInterval(carregarDados, 30_000);
    return () => clearInterval(id);
  }, [carregarDados]);

  /* ── Som de conclusão ── */
  const tocarSom = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1046, 0.18], [1318, 0.36]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.36);
      });
    } catch { /* ignorado */ }
  }, []);

  /* ── Concluir sessão ── */
  const concluir = useCallback(async () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setAtivo(false);
    tocarSom();

    const modo = MODOS[modoIdxRef.current];

    if (modo.id === 'foco') {
      try {
        await db.sessoes.add({
          data: new Date().toISOString(),
          materia: materiaRef.current || 'Geral',
          duracao: modo.minutos * 60,
        });
        await carregarDados();
      } catch { /* ignorado */ }

      const novosCiclos = ciclosRef.current + 1;
      ciclosRef.current = novosCiclos;
      setCiclos(novosCiclos);

      const mat = materiaRef.current || '';
      window.dispatchEvent(new CustomEvent('pomodoro:foco-concluido', { detail: { materia: mat } }));
      if (onFocoConcluido) onFocoConcluido(mat);
      setSugestao({ materia: mat });

      const proximo = novosCiclos % 4 === 0 ? 2 : 1;
      modoIdxRef.current = proximo;
      setModoIdx(proximo);
      setSegundos(MODOS[proximo].minutos * 60);
    } else {
      modoIdxRef.current = 0;
      setModoIdx(0);
      setSegundos(MODOS[0].minutos * 60);
    }
  }, [tocarSom, carregarDados, onFocoConcluido]);

  /* ── Timer ── */
  useEffect(() => {
    if (!ativo) { clearInterval(timerRef.current); timerRef.current = null; return; }
    timerRef.current = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) { concluirPendenteRef.current = true; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [ativo]);

  useEffect(() => {
    if (segundos === 0 && concluirPendenteRef.current) {
      concluirPendenteRef.current = false;
      concluir();
    }
  }, [segundos, concluir]);

  const mudarModo = idx => {
    setAtivo(false); setModoIdx(idx);
    modoIdxRef.current = idx;
    setSegundos(MODOS[idx].minutos * 60);
    setSugestao(null);
  };

  const resetar = () => { setAtivo(false); setSegundos(MODOS[modoIdx].minutos * 60); };

  const irParaFreestyle = () => {
    window.dispatchEvent(new CustomEvent('app:navegar', { detail: { tela: 'freestyle', materia: sugestao?.materia || '' } }));
    setSugestao(null); setAberto(false);
  };

  const irParaRevisao = () => {
    window.dispatchEvent(new CustomEvent('app:navegar', { detail: { tela: 'revisao' } }));
    setSugestao(null); setAberto(false);
  };

  const modo     = MODOS[modoIdx];
  const progresso = segundos / (modo.minutos * 60);
  const dashOff  = CIRC * progresso;

  /* ═══ BOTÃO FLUTUANTE (fechado) ═══ */
  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        title="Abrir Pomodoro"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: ativo ? 68 : 56, height: ativo ? 68 : 56,
          borderRadius: '50%',
          background: ativo
            ? `linear-gradient(135deg, ${modo.cor}, ${modo.corSec})`
            : 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: ativo ? `2px solid ${modo.cor}` : '2px solid rgba(255,255,255,0.12)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 1,
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: ativo
            ? `0 8px 32px ${modo.glowColor}, 0 4px 12px rgba(0,0,0,0.4)`
            : '0 8px 24px rgba(0,0,0,0.35)',
          animation: ativo ? `${modo.id === 'foco' ? 'pom-pulse' : 'pom-pulse-green'} 2.5s infinite` : 'none',
        }}
      >
        {/* Circular mini-progress when active */}
        {ativo && (
          <svg width="68" height="68" viewBox="0 0 68 68" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="34" cy="34" r="30" fill="none"
              stroke="rgba(255,255,255,0.7)" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - progresso)}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
        )}

        <span style={{ fontSize: ativo ? 20 : 22, zIndex: 1 }}>
          {ativo ? modo.emoji : '🍅'}
        </span>
        {ativo && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
            fontFamily: 'monospace', letterSpacing: '-0.5px', zIndex: 1, lineHeight: 1,
          }}>
            {fmtTempo(segundos)}
          </span>
        )}

        <RevBadge count={revisoesHoje} />

        {/* Dot when there's suggestion */}
        {sugestao && !ativo && (
          <span style={{
            position: 'absolute', top: -2, left: -2,
            width: 12, height: 12, borderRadius: '50%',
            background: '#f59e0b', border: '2px solid white',
            animation: 'pom-dot-blink 1.5s infinite',
          }} />
        )}
      </button>
    );
  }

  /* ═══ WIDGET EXPANDIDO ═══ */
  return (
    <div className="pom-widget" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      width: 310,
      background: '#0f172a',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 4px 0 ${modo.cor}`,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>

      {/* ── Header com gradiente dinâmico ── */}
      <div style={{
        background: `linear-gradient(135deg, ${modo.cor}22, ${modo.corSec}11)`,
        borderBottom: `1px solid ${modo.cor}30`,
        padding: '14px 16px 12px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow orb */}
        <div className="pom-glow-orb" style={{ background: `radial-gradient(circle, ${modo.cor}30, transparent 70%)` }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${modo.cor}, ${modo.corSec})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, boxShadow: `0 4px 12px ${modo.glowColor}`,
            }}>{modo.emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>Pomodoro</div>
              <div style={{ fontSize: 10, color: modo.cor, fontWeight: 600, marginTop: 1 }}>{modo.label} · {modo.minutos}min</div>
            </div>
          </div>
          <button onClick={() => setAberto(false)} className="pom-icon-btn">−</button>
        </div>

        {/* Stats da plataforma hoje */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <MiniStat
            icon="📝" value={statsHoje.questoes}
            label="questões hoje"
            cor={statsHoje.questoes > 0 ? '#818cf8' : 'rgba(255,255,255,0.4)'}
          />
          {statsHoje.questoes > 0 && (
            <MiniStat
              icon="🎯"
              value={`${statsHoje.taxa}%`}
              label="acerto"
              cor={statsHoje.taxa >= 70 ? '#34d399' : statsHoje.taxa >= 50 ? '#fbbf24' : '#f87171'}
            />
          )}
          {revisoesHoje > 0 && (
            <MiniStat icon="🧠" value={revisoesHoje} label="revisões" cor="#f87171" />
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* Sugestão pós-foco */}
        {sugestao && (
          <div className="pom-suggestion" style={{
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 12, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🎉</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Ciclo concluído!</span>
              {revisoesHoje > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'rgba(239,68,68,0.2)',
                  color: '#fca5a5', fontSize: 10, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 99,
                }}>🔴 {revisoesHoje} revisões</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, lineHeight: 1.5 }}>
              {revisoesHoje > 0
                ? `Você tem ${revisoesHoje} revisão${revisoesHoje > 1 ? 'ões' : ''} pendente${revisoesHoje > 1 ? 's' : ''}!`
                : sugestao.materia || materiaErros
                  ? `Que tal praticar ${sugestao.materia || materiaErros}?`
                  : 'Hora de praticar algumas questões!'}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {revisoesHoje > 0 && (
                <button onClick={irParaRevisao} style={{
                  flex: 1, padding: '6px 8px',
                  background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                  border: 'none', borderRadius: 7, color: 'white',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>🧠 Revisar agora</button>
              )}
              <button onClick={irParaFreestyle} style={{
                flex: 1, padding: '6px 8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>📝 Questões</button>
              <button onClick={() => setSugestao(null)} style={{
                padding: '6px 8px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7, color: 'rgba(255,255,255,0.35)',
                fontSize: 11, cursor: 'pointer',
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Tabs de modo */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 10, padding: 4,
        }}>
          {MODOS.map((m, i) => (
            <button key={m.id} onClick={() => mudarModo(i)} style={{
              flex: 1, padding: '6px 0',
              border: 'none', borderRadius: 7, cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: modoIdx === i
                ? `linear-gradient(135deg, ${m.cor}, ${m.corSec})`
                : 'transparent',
              color: modoIdx === i ? 'white' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
              boxShadow: modoIdx === i ? `0 2px 8px ${m.glowColor}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 12 }}>{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer circular */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{
            position: 'relative', width: 148, height: 148,
            filter: ativo ? `drop-shadow(0 0 20px ${modo.glowColor})` : 'none',
            transition: 'filter 0.5s ease',
          }}>

            {/* SVG Ring */}
            <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id={`grad-${modoIdx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={modo.cor} />
                  <stop offset="100%" stopColor={modo.corSec} />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="74" cy="74" r={RAIO} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {/* Progress */}
              <circle cx="74" cy="74" r={RAIO} fill="none"
                stroke={`url(#grad-${modoIdx})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - dashOff}
                style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.4s' }}
              />
            </svg>

            {/* Centro */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: '"SF Mono", "Fira Code", monospace',
                fontSize: 30, fontWeight: 800, color: 'white',
                letterSpacing: '-1px', lineHeight: 1,
                transition: 'color 0.3s',
              }}>
                {fmtTempo(segundos)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, marginTop: 3,
                color: modo.cor, textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}>{modo.label}</span>
              {ativo && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: modo.cor, marginTop: 5,
                  animation: 'pom-dot-blink 1s infinite',
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={resetar} title="Reiniciar" className="pom-reset-btn">↺</button>

          <button onClick={() => setAtivo(a => !a)} style={{
            flex: 1, height: 42,
            background: ativo
              ? 'rgba(255,255,255,0.08)'
              : `linear-gradient(135deg, ${modo.cor}, ${modo.corSec})`,
            border: ativo ? '1px solid rgba(255,255,255,0.12)' : 'none',
            borderRadius: 10, cursor: 'pointer',
            color: 'white', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: ativo ? 'none' : `0 4px 16px ${modo.glowColor}`,
            transition: 'all 0.2s',
          }}>
            {ativo ? (
              <><span style={{ fontSize: 16 }}>⏸</span> Pausar</>
            ) : (
              <><span style={{ fontSize: 16 }}>▶</span> {segundos < modo.minutos * 60 ? 'Continuar' : 'Iniciar'}</>
            )}
          </button>
        </div>

        {/* Seletor de matéria (só no modo foco) */}
        {modo.id === 'foco' && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={materia}
              onChange={e => { setMateria(e.target.value); materiaRef.current = e.target.value; }}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: materia ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                fontSize: 12, cursor: 'pointer', outline: 'none',
                transition: 'all 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = modo.cor}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <option value="" style={{ background: '#1e293b' }}>📚 Matéria estudada (opcional)</option>
              {materias.map(m => (
                <option key={m} value={m} style={{ background: '#1e293b' }}>
                  {m === materiaErros ? `⚠️ ${m} (mais erros)` : m}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats da sessão */}
        <div className="pom-stat-grid">
          {[
            { val: ciclos, label: 'ciclos', icon: '🔥' },
            { val: sessoesHoje, label: 'hoje', icon: '📊' },
            { val: tempoHoje > 0 ? fmtMin(tempoHoje) : '0min', label: 'tempo', icon: '⏱' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="pom-stat-sep" />}
              <div className="pom-stat-cell">
                <div style={{ fontSize: 10, marginBottom: 2 }}>{s.icon}</div>
                <div style={{
                  fontWeight: 800, fontSize: 17, lineHeight: 1,
                  color: s.val && s.val !== '0min' ? modo.cor : 'rgba(255,255,255,0.35)',
                }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Dica de revisões pendentes */}
        {revisoesHoje > 0 && !sugestao && (
          <div onClick={irParaRevisao} className="pom-revision-hint">
            <span style={{ fontSize: 14 }}>🧠</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
              <strong style={{ color: '#fca5a5' }}>{revisoesHoje} revisão{revisoesHoje > 1 ? 'ões' : ''}</strong> espaçada{revisoesHoje > 1 ? 's' : ''} pendente{revisoesHoje > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>→</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pomodoro;