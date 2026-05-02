// src/components/Dashboard.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { db } from '../database';
import CadernoErros from './CadernoErros';
import RevisaoEspacada from './RevisaoEspacada';
import {
  Calendar, BookOpen, Target, Timer, FileText, Flame,
  BookMarked, Brain, ClipboardList, CalendarDays, Trophy,
  Lightbulb, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useDark } from '../hooks/useDark';

/* ─── Heatmap ──────────────────────────────────────────────── */
const TAMANHO = 11;
const GAP     = 2;
const PASSO   = TAMANHO + GAP;

const getCor = (count, isDark) => {
  if (!count) return isDark ? '#2d3d50' : '#ebedf0'; // Célula vazia visível no dark
  if (count <= 3)  return '#c7d2fe';
  if (count <= 8)  return '#818cf8';
  if (count <= 15) return '#4f46e5';
  return '#3730a3';
};

const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIAS_PT  = ['Dom','','Ter','','Qui','','Sáb'];

const Heatmap = memo(() => {
  const [dados, setDados]     = useState({});
  const [tooltip, setTooltip] = useState(null);
  const [isDark, setIsDark]   = useState(() => document.body.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.body.classList.contains('dark'))
    );
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    db.resultados.toArray().then(rs => {
      const mapa = {};
      rs.forEach(r => {
        const d = new Date(r.data).toDateString();
        mapa[d] = (mapa[d] || 0) + 1;
      });
      setDados(mapa);
    });
  }, []);

  const { semanas, mesLabels, totalQuestoes, diasAtivos } = useMemo(() => {
    const hoje  = new Date(); hoje.setHours(23, 59, 59, 999);
    const hojeD = new Date(); hojeD.setHours(0, 0, 0, 0);

    const inicio = new Date(hojeD);
    inicio.setDate(inicio.getDate() - 52 * 7);
    while (inicio.getDay() !== 0) inicio.setDate(inicio.getDate() - 1);

    const sems = [];
    const cur = new Date(inicio);
    while (cur <= hoje) {
      const semana = [];
      for (let d = 0; d < 7; d++) {
        semana.push({ date: new Date(cur), count: dados[cur.toDateString()] || 0, futuro: cur > hojeD });
        cur.setDate(cur.getDate() + 1);
      }
      sems.push(semana);
    }

    const meses = [];
    sems.forEach((s, i) => {
      const mes = s[0].date.getMonth();
      if (i === 0 || mes !== sems[i - 1][0].date.getMonth()) {
        meses.push({ idx: i, label: MESES_PT[mes] });
      }
    });

    return {
      semanas: sems,
      mesLabels: meses,
      totalQuestoes: Object.values(dados).reduce((a, b) => a + b, 0),
      diasAtivos: Object.keys(dados).length,
    };
  }, [dados]);

  return (
    <div>
      <div className="heatmap-header">
        <p className="section-title" style={{ margin: 0 }}>Histórico de Estudos</p>
        <div className="heatmap-stats">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} strokeWidth={1.75} />
            <strong>{diasAtivos}</strong> dias ativos
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={13} strokeWidth={1.75} />
            <strong>{totalQuestoes}</strong> questões
          </span>
        </div>
      </div>

      <div className="overflow-x-auto" style={{ paddingBottom: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>

          {/* Labels dos meses */}
          <div style={{ display: 'flex', marginLeft: 22, marginBottom: 4, position: 'relative', height: 14 }}>
            {mesLabels.map(({ idx, label }) => (
              <div
                key={idx}
                className="heatmap-month-label"
                style={{ left: `${idx * PASSO}px` }}
              >{label}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Labels dos dias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: GAP + 2, flexShrink: 0 }}>
              {DIAS_PT.map((d, i) => (
                <div
                  key={i}
                  className="heatmap-day-label"
                  style={{ height: TAMANHO, lineHeight: `${TAMANHO}px` }}
                >{d}</div>
              ))}
            </div>

            {/* Colunas de semanas */}
            <div style={{ display: 'flex', gap: GAP }}>
              {semanas.map((semana, si) => (
                <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {semana.map((dia, di) => (
                    <div
                      key={di}
                      title={`${dia.date.toLocaleDateString('pt-BR')}: ${dia.count} questão(ões)`}
                      onMouseEnter={e => {
                        if (dia.count > 0) {
                          setTooltip({
                            x: e.clientX, y: e.clientY,
                            text: `${dia.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}: ${dia.count} questão(ões)`,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      className={`heatmap-cell${dia.count > 0 ? ' heatmap-cell--active' : ''}`}
                      style={{
                        width: TAMANHO,
                        height: TAMANHO,
                        background: dia.futuro ? 'transparent' : getCor(dia.count, isDark),
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div className="heatmap-legend">
            <span>Menos</span>
            {[0, 3, 8, 15, 16].map((n, i) => (
              <div key={i} style={{ width: TAMANHO, height: TAMANHO, borderRadius: 2, background: getCor(n, isDark) }} />
            ))}
            <span>Mais</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ top: tooltip.y - 36, left: tooltip.x - 60 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
});
Heatmap.displayName = 'Heatmap';

/* ─── Dashboard ──────────────────────────────────────────────── */
const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalQuestoes: 0, acertos: 0, taxa: 0, tempoHoje: 0, questoesHoje: 0,
  });
  const [streak, setStreak]             = useState(0);
  const [abrirCaderno, setAbrirCaderno] = useState(false);
  const [abrirRevisao, setAbrirRevisao] = useState(false);
  const [revisoesHoje, setRevisoesHoje] = useState(0);
  const [errosCount, setErrosCount]     = useState(0);
  const lastFetchRef = React.useRef(0);
  const isDark = useDark();

  useEffect(() => {
    loadStats();
    const THROTTLE_MS = 30_000;
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current >= THROTTLE_MS) loadStats();
    };
    const onRevisaoConcluida = () => loadStats();
    window.addEventListener('focus', onFocus);
    window.addEventListener('revisao:concluida', onRevisaoConcluida);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('revisao:concluida', onRevisaoConcluida);
    };
  }, []);

  const loadStats = async () => {
    try {
      lastFetchRef.current = Date.now();
      const data = await db.getDashboardData();

      setStats({
        totalQuestoes: data.total,
        acertos:       data.acertos,
        taxa:          data.taxa,
        tempoHoje:     data.tempoHojeMin,
        questoesHoje:  data.questoesHoje,
      });
      setStreak(data.streak);
      setRevisoesHoje(data.revisoesHoje);
      setErrosCount(data.errosCount);
    } catch (err) {
      console.error('[Dashboard] loadStats falhou:', err);
    }
  };

  /* ── Stat cards superiores ── */
  const statCards = [
    {
      label: 'Taxa de Acerto',
      value: `${stats.taxa}%`,
      sub: `${stats.acertos} de ${stats.totalQuestoes} questões`,
      Icon: Target,
      style: { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' },
    },
    {
      label: 'Tempo Hoje',
      value: `${stats.tempoHoje}min`,
      sub: 'Foco total',
      Icon: Timer,
      style: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' },
    },
    {
      label: 'Questões Hoje',
      value: stats.questoesHoje,
      sub: 'Continue assim!',
      Icon: FileText,
      style: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 20px rgba(245,158,11,0.25)' },
    },
    {
      label: 'Sequência',
      value: `${streak}d`,
      sub: 'Dias seguidos',
      Icon: Flame,
      style: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 20px rgba(239,68,68,0.25)' },
    },
  ];

  /* ── Mode cards ── */
  const modeCards = [
    { Icon: Target,       label: 'Freestyle',     desc: 'Questões aleatórias com filtros avançados',  tab: 'freestyle',    accent: '#6366f1', tag: 'Popular' },
    { Icon: FileText,     label: 'Simulado',      desc: 'Prova cronometrada com gabarito completo',   tab: 'simulado',     accent: '#10b981', tag: 'Recomendado' },
    { Icon: ClipboardList,label: 'Minhas Listas', desc: 'Estude com listas personalizadas',           tab: 'listas',       accent: '#f59e0b', tag: null },
    { Icon: CalendarDays, label: 'Planejamento',  desc: 'Organize sua semana de estudos',             tab: 'planejamento', accent: '#8b5cf6', tag: null },
    { Icon: Trophy,       label: 'Conquistas',    desc: 'Veja suas medalhas e progresso',             tab: 'conquistas',   accent: '#f59e0b', tag: null },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Visão Geral</h2>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* ── KPI Cards: Caderno de Erros + Revisão Espaçada ── */}
      <div className="dashboard-kpi-grid">

        {/* Caderno de Erros */}
        <div
          onClick={() => setAbrirCaderno(true)}
          className={`kpi-card${errosCount > 0 ? ' kpi-card--errors' : ''}`}
        >
          <div className={`kpi-card__icon${errosCount > 0 ? ' kpi-card__icon--errors' : ' kpi-card__icon--empty'}`}>
            <BookMarked size={22} strokeWidth={1.75} />
          </div>
          <div className="kpi-card__body">
            <div className={`kpi-card__number${errosCount > 0 ? ' kpi-card__number--errors' : ' kpi-card__number--empty'}`}>
              {errosCount}
            </div>
            <div className={`kpi-card__label${errosCount > 0 ? ' kpi-card__label--errors' : ' kpi-card__label--empty'}`}>
              {errosCount === 1 ? 'questão no caderno' : 'questões no caderno'}
            </div>
            <p className="kpi-card__hint">Clique para revisar seus erros</p>
          </div>
          {errosCount > 0 && (
            <span className="kpi-card__cta kpi-card__cta--errors">Revisar →</span>
          )}
        </div>

        {/* Revisão Espaçada */}
        <div
          onClick={() => setAbrirRevisao(true)}
          className={`kpi-card${revisoesHoje > 0 ? ' kpi-card--revision' : ''}`}
        >
          <div className={`kpi-card__icon${revisoesHoje > 0 ? ' kpi-card__icon--revision' : ' kpi-card__icon--empty'}`}>
            <Brain size={22} strokeWidth={1.75} />
          </div>
          <div className="kpi-card__body">
            <div className={`kpi-card__number${revisoesHoje > 0 ? ' kpi-card__number--revision' : ' kpi-card__number--empty'}`}>
              {revisoesHoje}
            </div>
            <div className={`kpi-card__label${revisoesHoje > 0 ? ' kpi-card__label--revision' : ' kpi-card__label--empty'}`}>
              {revisoesHoje === 1 ? 'revisão pendente' : 'revisões pendentes'}
            </div>
            <p className="kpi-card__hint">Revisão espaçada (SM-2)</p>
          </div>
          {revisoesHoje > 0 && (
            <span className="kpi-card__cta kpi-card__cta--revision">Iniciar →</span>
          )}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid mb-28">
        {statCards.map((s, i) => (
          <div key={i} className="dashboard-stat-card" style={s.style}>
            <div className="dashboard-stat-card__header">
              <div>
                <p className="dashboard-stat-card__label">{s.label}</p>
                <p className="dashboard-stat-card__value">{s.value}</p>
                <p className="dashboard-stat-card__sub">{s.sub}</p>
              </div>
              <span className="dashboard-stat-card__icon">
                <s.Icon size={28} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Mode Cards ── */}
      <div className="mb-8">
        <p className="section-title">Modos de Estudo</p>
      </div>
      <div className="dashboard-mode-grid">
        {modeCards.map(m => (
          <div
            key={m.tab}
            className="mode-card"
            onClick={() => onNavigate(m.tab)}
            style={{ borderTopColor: m.accent }}
          >
            {m.tag && (
              <span
                className="mode-card__tag"
                style={{ background: m.accent + '20', color: m.accent }}
              >{m.tag}</span>
            )}
            <div className="mode-card__icon">
              <m.Icon size={26} strokeWidth={1.5} color={m.accent} />
            </div>
            <h3 className="mode-card__title">{m.label}</h3>
            <p className="mode-card__desc">{m.desc}</p>
            <div className="mode-card__cta" style={{ color: m.accent, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Acessar <ArrowRight size={14} strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Heatmap ── */}
      <div className="card mb-20" style={{ background: isDark ? 'var(--surface-card)' : 'white' }}>
        <Heatmap />
      </div>

      {/* ── Empty state ── */}
      {stats.totalQuestoes === 0 && (
        <div className="card dashboard-empty" style={{ background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb' }}>
          <div className="dashboard-empty__inner">
            <span className="dashboard-empty__icon">
              <Lightbulb size={32} strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="dashboard-empty__title">Comece agora</h3>
              <p className="dashboard-empty__text">
                Nenhuma questão encontrada ainda. Vá até <strong>Banco de Questões</strong> para
                cadastrar suas questões, ou abra o <strong>Freestyle</strong> para importar as questões de exemplo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modais ── */}
      {abrirCaderno && (
        <CadernoErros onFechar={() => { setAbrirCaderno(false); loadStats(); }} />
      )}
      {abrirRevisao && (
        <RevisaoEspacada onFechar={() => { setAbrirRevisao(false); loadStats(); }} />
      )}
    </div>
  );
};

export default Dashboard;