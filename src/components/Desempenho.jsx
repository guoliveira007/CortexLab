import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { db } from '../database';

const periodos = [
  { id: 'hoje',   label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes',    label: '30 dias' },
  { id: 'ano',    label: '365 dias' },
  { id: 'total',  label: 'Tudo' },
];

const modos = [
  { id: 'todos',     label: 'Todos os modos' },
  { id: 'freestyle', label: 'Freestyle' },
  { id: 'lista',     label: 'Listas' },
  { id: 'simulado',  label: 'Simulados' },
];

const filtrarPorPeriodo = (resultados, periodo) => {
  const agora = new Date();
  return resultados.filter(r => {
    const data = new Date(r.data);
    if (periodo === 'hoje') {
      return data.toDateString() === agora.toDateString();
    }
    if (periodo === 'semana') {
      const ini = new Date(agora); ini.setDate(ini.getDate() - 6); ini.setHours(0, 0, 0, 0);
      return data >= ini;
    }
    if (periodo === 'mes') {
      const ini = new Date(agora); ini.setDate(ini.getDate() - 29); ini.setHours(0, 0, 0, 0);
      return data >= ini;
    }
    if (periodo === 'ano') {
      const ini = new Date(agora); ini.setDate(ini.getDate() - 364); ini.setHours(0, 0, 0, 0);
      return data >= ini;
    }
    return true;
  });
};

const corTaxa = t => t >= 70 ? '#10b981' : t >= 50 ? '#f59e0b' : '#ef4444';
const corTaxaBg = t => t >= 70 ? 'rgba(16,185,129,0.12)' : t >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';

/* ─── Animated Number ─── */
const AnimatedNumber = memo(({ value, suffix = '', duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    const startTime = performance.now();
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(+(start + (end - start) * ease).toFixed(1));
      if (p < 1) requestAnimationFrame(tick);
      else { prev.current = end; setDisplay(end); }
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <>{display}{suffix}</>;
});
AnimatedNumber.displayName = 'AnimatedNumber';

/* ─── Stat Card ─── */
const StatCard = memo(({ emoji, label, valor, sub, cor, bg }) => (
  <div style={{
    background: bg || 'white',
    borderRadius: '16px',
    padding: '20px 22px',
    border: `1px solid ${cor}30`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${cor}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
  >
    <div style={{
      position: 'absolute', top: '-16px', right: '-16px',
      width: '80px', height: '80px', borderRadius: '50%',
      background: `${cor}15`,
    }} />
    <div style={{ fontSize: '22px', marginBottom: '10px' }}>{emoji}</div>
    <div style={{ fontSize: '11px', fontWeight: 700, color: cor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: cor, letterSpacing: '-0.03em', lineHeight: 1 }}>
      <AnimatedNumber value={parseFloat(String(valor).replace('%', '').replace('d', '')) || 0}
        suffix={String(valor).includes('%') ? '%' : String(valor).includes('d') ? 'd' : ''} />
    </div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>{sub}</div>}
  </div>
));
StatCard.displayName = 'StatCard';

/* ─── Beautiful Bar Chart ─── */
const BarChart = memo(({ dados, titulo, cor1 = '#6366f1', cor2 = '#ef4444' }) => {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...dados.map(d => d.total), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</p>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: cor1, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: cor1, display: 'inline-block' }} /> Acertos
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: cor2, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: cor2, display: 'inline-block' }} /> Erros
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', position: 'relative' }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <div key={f} style={{
            position: 'absolute', left: 0, right: 0,
            bottom: `${f * 100}%`,
            borderTop: '1px dashed var(--gray-100)',
            pointerEvents: 'none',
          }} />
        ))}

        {dados.map((d, i) => {
          const acertoH = d.total ? Math.round((d.acertos / max) * 110) : 0;
          const erroH = d.total ? Math.round(((d.total - d.acertos) / max) * 110) : 0;
          const isHov = hovered === i;
          const taxa = d.total ? Math.round((d.acertos / d.total) * 100) : 0;

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: d.total ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && d.total > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(15,23,42,0.92)', color: 'white',
                  borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
                  whiteSpace: 'nowrap', zIndex: 10, marginBottom: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px', color: '#f1f5f9' }}>{d.label}</div>
                  <div style={{ color: cor1 }}>✓ {d.acertos} acertos</div>
                  <div style={{ color: cor2 }}>✗ {d.total - d.acertos} erros</div>
                  <div style={{ color: '#94a3b8', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px' }}>{taxa}% aproveitamento</div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                    borderTop: '5px solid rgba(15,23,42,0.92)',
                  }} />
                </div>
              )}

              <div style={{ width: '100%', borderRadius: '6px 6px 0 0', overflow: 'hidden', minHeight: d.total ? '4px' : '0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{
                  height: `${acertoH}px`,
                  background: isHov
                    ? `linear-gradient(180deg, ${cor1}ee, ${cor1}aa)`
                    : `linear-gradient(180deg, ${cor1}cc, ${cor1}88)`,
                  transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.15s',
                  borderRadius: '4px 4px 0 0',
                }} />
                <div style={{
                  height: `${erroH}px`,
                  background: isHov
                    ? `linear-gradient(180deg, ${cor2}ee, ${cor2}aa)`
                    : `linear-gradient(180deg, ${cor2}cc, ${cor2}88)`,
                  transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s, background 0.15s',
                }} />
              </div>

              <span style={{
                fontSize: '9px', color: isHov ? 'var(--gray-700)' : 'var(--gray-400)',
                marginTop: '6px', fontWeight: isHov ? 700 : 400, transition: 'all 0.15s',
                textAlign: 'center',
              }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
BarChart.displayName = 'BarChart';

/* ─── Donut Chart ─── */
const DonutChart = memo(({ acertos, total, cor }) => {
  const taxa = total ? (acertos / total) * 100 : 0;
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ - (taxa / 100) * circ;

  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--gray-100)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={cor} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: cor, lineHeight: 1 }}>
          {Math.round(taxa)}%
        </span>
        <span style={{ fontSize: '9px', color: 'var(--gray-400)', fontWeight: 600, marginTop: '1px' }}>acerto</span>
      </div>
    </div>
  );
});
DonutChart.displayName = 'DonutChart';

/* ─── Progress Row ─── */
const ProgressRow = memo(({ label, acertos, total, emoji, rank }) => {
  const taxa = total ? ((acertos / total) * 100).toFixed(1) : 0;
  const cor  = corTaxa(Number(taxa));
  const bg   = corTaxaBg(Number(taxa));

  return (
    <div style={{
      background: 'var(--gray-50)',
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '10px',
      border: '1px solid var(--gray-100)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {rank && (
            <span style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : '#fef2f2',
              color: rank === 1 ? '#d97706' : rank === 2 ? '#64748b' : '#ef4444',
              fontSize: '10px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>#{rank}</span>
          )}
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)' }}>
            {emoji} {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{acertos}/{total}</span>
          <span style={{
            background: bg, color: cor,
            padding: '2px 10px', borderRadius: '99px',
            fontSize: '12px', fontWeight: 700,
          }}>
            {total > 0 ? `${taxa}%` : '—'}
          </span>
        </div>
      </div>
      <div style={{ background: 'var(--gray-200)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${taxa}%`,
          background: `linear-gradient(90deg, ${cor}aa, ${cor})`,
          borderRadius: '99px',
          transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>
    </div>
  );
});
ProgressRow.displayName = 'ProgressRow';

/* ─── Comparativo de Modos ─── */
const ModoCard = memo(({ label, emoji, acertos, total, cor, bg }) => {
  // ✅ removida a declaração de taxa não utilizada nesta versão
  return (
    <div style={{
      background: bg, borderRadius: '16px', padding: '18px',
      border: `1px solid ${cor}20`, textAlign: 'center',
      flex: 1,
    }}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{emoji}</div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: cor, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</div>
      <DonutChart acertos={acertos} total={total} cor={cor} />
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--gray-500)' }}>
        {total} questões
      </div>
    </div>
  );
});
ModoCard.displayName = 'ModoCard';

/* ─── Timeline Activity ─── */
const ActivityTimeline = memo(({ resultados }) => {
  const hoje = new Date();
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    const fim = new Date(d); fim.setHours(23, 59, 59);
    const rs = resultados.filter(r => { const rd = new Date(r.data); return rd >= d && rd <= fim; });
    return { date: d, total: rs.length, acertos: rs.filter(r => r.acertou).length };
  });
  const maxT = Math.max(...dias.map(d => d.total), 1);

  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
        Atividade — últimos 14 dias
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
        {dias.map((d, i) => {
          const isHoje = d.date.toDateString() === hoje.toDateString();
          const taxa = d.total ? Math.round((d.acertos / d.total) * 100) : 0;
          const cor = d.total === 0 ? 'var(--gray-100)' : corTaxa(taxa);
          const h = d.total ? Math.max(4, Math.round((d.total / maxT) * 54)) : 3;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
              title={`${d.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: ${d.total} questões, ${taxa}% acerto`}
            >
              <div style={{
                width: '100%', height: `${h}px`,
                background: d.total ? `linear-gradient(180deg, ${cor}cc, ${cor}88)` : 'var(--gray-100)',
                borderRadius: '4px 4px 0 0',
                border: isHoje ? `2px solid ${cor}` : 'none',
                boxSizing: 'border-box',
                transition: 'height 0.6s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: 'var(--gray-400)' }}>
        <span>{dias[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        <span style={{ fontWeight: 700, color: 'var(--brand-500)' }}>Hoje</span>
      </div>
    </div>
  );
});
ActivityTimeline.displayName = 'ActivityTimeline';

/* ─── Desempenho ─── */
const Desempenho = () => {
  const [periodo, setPeriodo] = useState('mes');
  const [modo,    setModo]    = useState('todos');
  const [secao,   setSecao]   = useState('geral');
  const [resultados, setResultados] = useState([]);
  const [questoesMap, setQuestoesMap] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    carregarDados();
    const onFocus = () => carregarDados();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [periodo, modo, secao]);

  const carregarDados = async () => {
    const [rs, qs] = await Promise.all([db.resultados.toArray(), db.questoes.toArray()]);
    setResultados(rs);
    const mapa = {};
    qs.forEach(q => { mapa[q.id] = q; });
    setQuestoesMap(mapa);
    setMounted(true);
  };

  const resultadosFiltrados = useMemo(() => {
    let rs = filtrarPorPeriodo(resultados, periodo);
    if (modo !== 'todos') rs = rs.filter(r => r.modo === modo);
    return rs;
  }, [resultados, periodo, modo]);

  const total   = resultadosFiltrados.length;
  const acertos = resultadosFiltrados.filter(r => r.acertou).length;
  const erros   = total - acertos;
  const taxa    = total ? ((acertos / total) * 100).toFixed(1) : 0;

  const streak = useMemo(() => {
    const datas = [...new Set(resultados.map(r => new Date(r.data).toDateString()))];
    let s = 0;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (!datas.includes(d.toDateString())) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      if (datas.includes(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }, [resultados]);

  const ultimos7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const fim = new Date(d); fim.setHours(23, 59, 59);
    const rs = resultados.filter(r => {
      const rd = new Date(r.data);
      return rd >= d && rd <= fim && (modo === 'todos' || r.modo === modo);
    });
    return { label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), total: rs.length, acertos: rs.filter(r => r.acertou).length };
  }), [resultados, modo]);

  const ultimos12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const mes = d.getMonth(); const ano = d.getFullYear();
    const rs = resultados.filter(r => {
      const rd = new Date(r.data);
      return rd.getMonth() === mes && rd.getFullYear() === ano && (modo === 'todos' || r.modo === modo);
    });
    return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), total: rs.length, acertos: rs.filter(r => r.acertou).length };
  }), [resultados, modo]);

  const porMateria = useMemo(() => {
    const map = {};
    resultadosFiltrados.forEach(r => {
      const qid = r.questaoId || r.id_questao;
      const questao = questoesMap[qid];
      // Ignora resultados de questões excluídas do banco
      if (!questao) return;
      const materia = questao.materia || r.materia || 'Sem matéria';
      if (!map[materia]) map[materia] = { total: 0, acertos: 0 };
      map[materia].total++;
      if (r.acertou) map[materia].acertos++;
    });
    return Object.entries(map)
      .map(([materia, v]) => ({ materia, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [resultadosFiltrados, questoesMap]);

  const statCards = useMemo(() => [
    { emoji: '📝', label: 'Questões', valor: total, sub: 'respondidas', cor: '#6366f1', bg: '#eef2ff' },
    { emoji: '✅', label: 'Acertos', valor: acertos, sub: 'corretas', cor: '#10b981', bg: '#ecfdf5' },
    { emoji: '❌', label: 'Erros', valor: erros, sub: 'incorretas', cor: '#ef4444', bg: '#fef2f2' },
    { emoji: '🎯', label: 'Taxa', valor: `${taxa}%`, sub: 'aproveitamento', cor: corTaxa(Number(taxa)), bg: corTaxaBg(Number(taxa)) },
    { emoji: '🔥', label: 'Streak', valor: `${streak}d`, sub: 'dias seguidos', cor: '#f59e0b', bg: '#fffbeb' },
  ], [total, acertos, erros, taxa, streak]);

  const modoCards = [
    { label: 'Freestyle', emoji: '🎯', modo: 'freestyle', cor: '#6366f1', bg: '#eef2ff' },
    { label: 'Listas', emoji: '📋', modo: 'lista', cor: '#10b981', bg: '#ecfdf5' },
    { label: 'Simulados', emoji: '📝', modo: 'simulado', cor: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-enter { animation: slideUp 0.4s ease forwards; }
      `}</style>

      <div className="page-header">
        <div>
          <h2 className="page-title">Desempenho</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            Análise completa do seu progresso
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid var(--gray-100)', display: 'flex', gap: '2px' }}>
          {periodos.map(p => (
            <button key={p.id}
              onClick={() => setPeriodo(p.id)}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: '9px',
                cursor: 'pointer', fontSize: '13px', fontWeight: periodo === p.id ? 700 : 500,
                background: periodo === p.id ? 'var(--gradient-brand)' : 'transparent',
                color: periodo === p.id ? 'white' : 'var(--gray-500)',
                transition: 'all 0.2s',
                boxShadow: periodo === p.id ? 'var(--shadow-brand)' : 'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid var(--gray-100)', display: 'flex', gap: '2px' }}>
          {modos.map(m => (
            <button key={m.id}
              onClick={() => setModo(m.id)}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: '9px',
                cursor: 'pointer', fontSize: '13px', fontWeight: modo === m.id ? 700 : 500,
                background: modo === m.id ? 'var(--gray-800)' : 'transparent',
                color: modo === m.id ? 'white' : 'var(--gray-500)',
                transition: 'all 0.2s',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-enter" style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* Seção Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'white', borderRadius: '14px', padding: '5px',
        border: '1px solid var(--gray-100)', width: 'fit-content',
        boxShadow: 'var(--shadow-xs)',
      }}>
        {[
          { id: 'geral', label: '📊 Visão Geral' },
          { id: 'materias', label: '📚 Por Matéria' },
          { id: 'simulados', label: '📝 Simulados' },
        ].map(s => (
          <button key={s.id}
            onClick={() => setSecao(s.id)}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: '10px',
              cursor: 'pointer', fontSize: '13px', fontWeight: secao === s.id ? 700 : 500,
              background: secao === s.id ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'transparent',
              color: secao === s.id ? 'white' : 'var(--gray-500)',
              transition: 'all 0.2s',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── GERAL ── */}
      {secao === 'geral' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '22px' }}>
              <BarChart dados={ultimos7} titulo="Últimos 7 dias" />
            </div>
            <div className="card" style={{ padding: '22px' }}>
              <BarChart dados={ultimos12} titulo="Últimos 12 meses" cor1="#10b981" cor2="#f97316" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Taxa Geral */}
            <div className="card" style={{ padding: '22px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '18px' }}>
                Taxa de Acerto Geral
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <DonutChart acertos={acertos} total={total} cor={corTaxa(Number(taxa))} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Acertos</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{acertos}</span>
                  </div>
                  <div style={{ background: 'var(--gray-100)', height: '6px', borderRadius: '99px', marginBottom: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${taxa}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Erros</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>{erros}</span>
                  </div>
                  <div style={{ background: 'var(--gray-100)', height: '6px', borderRadius: '99px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${100 - Number(taxa)}%`, background: 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="card" style={{ padding: '22px' }}>
              <ActivityTimeline resultados={resultados} />
            </div>
          </div>

          {/* Comparativo por modo */}
          <div className="card" style={{ padding: '22px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
              Comparativo por Modo de Estudo
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {modoCards.map(m => {
                const rs = filtrarPorPeriodo(resultados, periodo).filter(r => r.modo === m.modo);
                return (
                  <ModoCard key={m.modo} label={m.label} emoji={m.emoji}
                    acertos={rs.filter(r => r.acertou).length}
                    total={rs.length} cor={m.cor} bg={m.bg}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MATÉRIAS ── */}
      {secao === 'materias' && (
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Desempenho por Matéria
            </p>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
              {porMateria.length} matéria(s)
            </span>
          </div>

          {porMateria.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <p className="empty-state-title">Sem dados no período</p>
              <p className="empty-state-desc">Responda questões para ver o desempenho por matéria.</p>
            </div>
          ) : (
            porMateria.map(({ materia, acertos: a, total: t }, i) => (
              <ProgressRow key={materia} label={materia} acertos={a} total={t} emoji="📖" rank={i + 1} />
            ))
          )}
        </div>
      )}

      {/* ── SIMULADOS ── */}
      {secao === 'simulados' && (() => {
        const rsS = filtrarPorPeriodo(resultados, periodo).filter(r => r.modo === 'simulado');
        const totalS = rsS.length;
        const acertosS = rsS.filter(r => r.acertou).length;
        const taxaS = totalS ? ((acertosS / totalS) * 100).toFixed(1) : 0;

        const porSim = {};
        rsS.forEach(r => {
          const nome = r.simuladoNome || 'Simulado';
          if (!porSim[nome]) porSim[nome] = { nome, total: 0, acertos: 0 };
          porSim[nome].total++;
          if (r.acertou) porSim[nome].acertos++;
        });
        const simList = Object.values(porSim).sort((a, b) => b.total - a.total);

        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <StatCard emoji="📝" label="Questões" valor={totalS} sub="em simulados" cor="#6366f1" bg="#eef2ff" />
              <StatCard emoji="✅" label="Acertos" valor={acertosS} sub="corretas" cor="#10b981" bg="#ecfdf5" />
              <StatCard emoji="🎯" label="Taxa" valor={`${taxaS}%`} sub="aproveitamento" cor={corTaxa(Number(taxaS))} bg={corTaxaBg(Number(taxaS))} />
            </div>

            {simList.length > 0 ? (
              <div className="card" style={{ padding: '22px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                  Por Simulado
                </p>
                {simList.map((s, i) => (
                  <ProgressRow key={s.nome} label={s.nome} acertos={s.acertos} total={s.total} emoji="📝" rank={i + 1} />
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <p className="empty-state-title">Nenhum simulado realizado</p>
                  <p className="empty-state-desc">Complete um simulado para ver os dados aqui.</p>
                </div>
              </div>
            )}

            {/* Simulados vs outros modos */}
            <div className="card" style={{ padding: '22px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                Comparativo de Modos
              </p>
              {modoCards.map(m => {
                const rs = filtrarPorPeriodo(resultados, periodo).filter(r => r.modo === m.modo);
                return <ProgressRow key={m.modo} label={m.label} acertos={rs.filter(r => r.acertou).length} total={rs.length} emoji={m.emoji} />;
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Desempenho;