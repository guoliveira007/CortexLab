import React, { useState, useEffect, useMemo, memo } from 'react';
import { db } from '../database';

/* ─────────────────────────────────────────────
   SISTEMA DE RARIDADE
───────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export const RARIDADES = {
  comum:    { label: 'Comum',    cor: '#6b7280', bg: '#f3f4f6', borda: '#d1d5db', glow: 'rgba(107,114,128,0.2)'  },
  raro:     { label: 'Raro',     cor: '#1d4ed8', bg: '#dbeafe', borda: '#93c5fd', glow: 'rgba(29,78,216,0.2)'    },
  epico:    { label: 'Épico',    cor: '#7c3aed', bg: '#ede9fe', borda: '#c4b5fd', glow: 'rgba(124,58,237,0.25)'  },
  lendario: { label: 'Lendário', cor: '#d97706', bg: '#fef3c7', borda: '#fcd34d', glow: 'rgba(217,119,6,0.3)'   },
  secreto:  { label: '???',      cor: '#0f172a', bg: '#1e293b', borda: '#334155', glow: 'rgba(15,23,42,0.4)'     },
};

const CATEGORIAS = [
  { id: 'todas',       label: '✨ Todas'       },
  { id: 'questoes',    label: '📝 Questões'    },
  { id: 'acerto',      label: '🎯 Acerto'      },
  { id: 'streak',      label: '🔥 Sequência'   },
  { id: 'simulados',   label: '📋 Simulados'   },
  { id: 'foco',        label: '🍅 Foco'        },
  { id: 'diversidade', label: '🌈 Diversidade' },
  { id: 'especial',    label: '⭐ Especial'    },
  { id: 'secreto',     label: '🔮 Secretas'    },
];

// ✅ Renomeado para CONQUISTAS_BASE — sec_colecao é adicionada separadamente
// logo abaixo, após CONQUISTAS_PARA_COLECAO ser definida. Isso elimina a
// necessidade de filtrar TODAS_CONQUISTAS dentro de check/progresso a cada
// chamada, e torna estruturalmente impossível qualquer autorreferência.
const CONQUISTAS_BASE = [
  // ── QUESTÕES ──
  { id: 'q10',   cat: 'questoes', raridade: 'comum',    icone: '🌱', nome: 'Primeiros Passos', desc: 'Respondeu 10 questões',                     check: s => s.total >= 10,   progresso: s => Math.min(s.total / 10, 1),   detalhe: s => `${Math.min(s.total, 10)}/10` },
  { id: 'q50',   cat: 'questoes', raridade: 'comum',    icone: '📚', nome: 'Estudante',        desc: 'Respondeu 50 questões',                     check: s => s.total >= 50,   progresso: s => Math.min(s.total / 50, 1),   detalhe: s => `${Math.min(s.total, 50)}/50` },
  { id: 'q100',  cat: 'questoes', raridade: 'comum',    icone: '🎯', nome: 'Centenário',       desc: 'Respondeu 100 questões',                    check: s => s.total >= 100,  progresso: s => Math.min(s.total / 100, 1),  detalhe: s => `${Math.min(s.total, 100)}/100` },
  { id: 'q500',  cat: 'questoes', raridade: 'raro',     icone: '🏃', nome: 'Maratonista',      desc: 'Respondeu 500 questões',                    check: s => s.total >= 500,  progresso: s => Math.min(s.total / 500, 1),  detalhe: s => `${Math.min(s.total, 500)}/500` },
  { id: 'q1000', cat: 'questoes', raridade: 'epico',    icone: '👑', nome: 'Lendário',         desc: 'Respondeu 1.000 questões',                  check: s => s.total >= 1000, progresso: s => Math.min(s.total / 1000, 1), detalhe: s => `${Math.min(s.total, 1000)}/1.000` },
  { id: 'q2000', cat: 'questoes', raridade: 'epico',    icone: '⚡', nome: 'Incansável',       desc: 'Respondeu 2.000 questões',                  check: s => s.total >= 2000, progresso: s => Math.min(s.total / 2000, 1), detalhe: s => `${Math.min(s.total, 2000)}/2.000` },
  { id: 'q5000', cat: 'questoes', raridade: 'lendario', icone: '🌌', nome: 'Elite',            desc: 'Respondeu 5.000 questões — nível supremo',  check: s => s.total >= 5000, progresso: s => Math.min(s.total / 5000, 1), detalhe: s => `${Math.min(s.total, 5000)}/5.000` },

  // ── ACERTO ──
  { id: 'taxa50', cat: 'acerto', raridade: 'comum',    icone: '📈', nome: 'Promissor',      desc: 'Taxa de acerto ≥ 50% (mín. 5 questões)',    check: s => s.taxa >= 50 && s.total >= 5,   progresso: s => s.total < 5  ? s.total / 5  : Math.min(s.taxa / 50, 1),  detalhe: s => `${s.taxa}% / 50%` },
  { id: 'taxa60', cat: 'acerto', raridade: 'comum',    icone: '📊', nome: 'Na Média',       desc: 'Taxa de acerto ≥ 60% (mín. 10 questões)',   check: s => s.taxa >= 60 && s.total >= 10,  progresso: s => s.total < 10 ? s.total / 10 : Math.min(s.taxa / 60, 1),  detalhe: s => `${s.taxa}% / 60%` },
  { id: 'taxa70', cat: 'acerto', raridade: 'raro',     icone: '⭐', nome: 'Acima da Média', desc: 'Taxa de acerto ≥ 70% (mín. 20 questões)',   check: s => s.taxa >= 70 && s.total >= 20,  progresso: s => s.total < 20 ? s.total / 20 : Math.min(s.taxa / 70, 1),  detalhe: s => `${s.taxa}% / 70%` },
  { id: 'taxa80', cat: 'acerto', raridade: 'raro',     icone: '🏅', nome: 'Excelente',      desc: 'Taxa de acerto ≥ 80% (mín. 30 questões)',   check: s => s.taxa >= 80 && s.total >= 30,  progresso: s => s.total < 30 ? s.total / 30 : Math.min(s.taxa / 80, 1),  detalhe: s => `${s.taxa}% / 80%` },
  { id: 'taxa90', cat: 'acerto', raridade: 'epico',    icone: '🏆', nome: 'Mestre',         desc: 'Taxa de acerto ≥ 90% (mín. 50 questões)',   check: s => s.taxa >= 90 && s.total >= 50,  progresso: s => s.total < 50 ? s.total / 50 : Math.min(s.taxa / 90, 1),  detalhe: s => `${s.taxa}% / 90%` },
  { id: 'taxa95', cat: 'acerto', raridade: 'lendario', icone: '💎', nome: 'Quase Perfeito', desc: 'Taxa de acerto ≥ 95% (mín. 100 questões)',  check: s => s.taxa >= 95 && s.total >= 100, progresso: s => s.total < 100? s.total / 100: Math.min(s.taxa / 95, 1),  detalhe: s => `${s.taxa}% / 95%` },

  // ── STREAK ──
  { id: 'streak3',   cat: 'streak', raridade: 'comum',    icone: '🔥', nome: 'Consistente',        desc: '3 dias de estudo seguidos',                              check: s => s.streak >= 3,   progresso: s => Math.min(s.streak / 3, 1),   detalhe: s => `${Math.min(s.streak, 3)}/3 dias` },
  { id: 'streak7',   cat: 'streak', raridade: 'comum',    icone: '🔥', nome: 'Foco Total',          desc: '7 dias de estudo seguidos',                              check: s => s.streak >= 7,   progresso: s => Math.min(s.streak / 7, 1),   detalhe: s => `${Math.min(s.streak, 7)}/7 dias` },
  { id: 'streak14',  cat: 'streak', raridade: 'raro',     icone: '⚡', nome: 'Imparável',           desc: '14 dias de estudo seguidos',                             check: s => s.streak >= 14,  progresso: s => Math.min(s.streak / 14, 1),  detalhe: s => `${Math.min(s.streak, 14)}/14 dias` },
  { id: 'streak30',  cat: 'streak', raridade: 'raro',     icone: '💪', nome: 'Dedicado',            desc: '30 dias de estudo seguidos',                             check: s => s.streak >= 30,  progresso: s => Math.min(s.streak / 30, 1),  detalhe: s => `${Math.min(s.streak, 30)}/30 dias` },
  { id: 'streak60',  cat: 'streak', raridade: 'epico',    icone: '🌟', nome: 'Atleta Mental',       desc: '60 dias de estudo seguidos',                             check: s => s.streak >= 60,  progresso: s => Math.min(s.streak / 60, 1),  detalhe: s => `${Math.min(s.streak, 60)}/60 dias` },
  { id: 'streak100', cat: 'streak', raridade: 'epico',    icone: '🚀', nome: 'Centenário',          desc: '100 dias de estudo seguidos',                            check: s => s.streak >= 100, progresso: s => Math.min(s.streak / 100, 1), detalhe: s => `${Math.min(s.streak, 100)}/100 dias` },
  { id: 'streak365', cat: 'streak', raridade: 'lendario', icone: '🌠', nome: 'Um Ano de Dedicação', desc: 'Estudou por 365 dias seguidos — extraordinário',          check: s => s.streak >= 365, progresso: s => Math.min(s.streak / 365, 1), detalhe: s => `${Math.min(s.streak, 365)}/365 dias` },

  // ── SIMULADOS ──
  { id: 'sim1',  cat: 'simulados', raridade: 'comum',    icone: '📝',  nome: 'Primeiro Simulado',  desc: 'Completou 1 simulado',                          check: s => s.simulados >= 1,  progresso: s => Math.min(s.simulados, 1),      detalhe: s => `${Math.min(s.simulados, 1)}/1` },
  { id: 'sim5',  cat: 'simulados', raridade: 'comum',    icone: '📋',  nome: 'Simulador',          desc: 'Completou 5 simulados',                         check: s => s.simulados >= 5,  progresso: s => Math.min(s.simulados / 5, 1),  detalhe: s => `${Math.min(s.simulados, 5)}/5` },
  { id: 'sim10', cat: 'simulados', raridade: 'raro',     icone: '🎖️', nome: 'Veterano',           desc: 'Completou 10 simulados',                        check: s => s.simulados >= 10, progresso: s => Math.min(s.simulados / 10, 1), detalhe: s => `${Math.min(s.simulados, 10)}/10` },
  { id: 'sim20', cat: 'simulados', raridade: 'epico',    icone: '🎓',  nome: 'Simulador Avançado', desc: 'Completou 20 simulados',                        check: s => s.simulados >= 20, progresso: s => Math.min(s.simulados / 20, 1), detalhe: s => `${Math.min(s.simulados, 20)}/20` },
  { id: 'sim50', cat: 'simulados', raridade: 'lendario', icone: '🏰',  nome: 'Mestre dos Simulados',desc: 'Completou 50 simulados — nível absurdo',       check: s => s.simulados >= 50, progresso: s => Math.min(s.simulados / 50, 1), detalhe: s => `${Math.min(s.simulados, 50)}/50` },

  // ── FOCO / POMODORO ──
  { id: 'pom1',   cat: 'foco', raridade: 'comum',    icone: '🍅', nome: 'Primeiro Foco', desc: 'Completou 1 sessão Pomodoro',                           check: s => s.pomodoros >= 1,   progresso: s => Math.min(s.pomodoros, 1),       detalhe: s => `${Math.min(s.pomodoros, 1)}/1` },
  { id: 'pom10',  cat: 'foco', raridade: 'comum',    icone: '🍅', nome: 'Focado',        desc: 'Completou 10 sessões Pomodoro',                          check: s => s.pomodoros >= 10,  progresso: s => Math.min(s.pomodoros / 10, 1),  detalhe: s => `${Math.min(s.pomodoros, 10)}/10` },
  { id: 'pom25',  cat: 'foco', raridade: 'raro',     icone: '⏱️', nome: 'Ultra Foco',   desc: 'Completou 25 sessões Pomodoro',                          check: s => s.pomodoros >= 25,  progresso: s => Math.min(s.pomodoros / 25, 1),  detalhe: s => `${Math.min(s.pomodoros, 25)}/25` },
  { id: 'pom50',  cat: 'foco', raridade: 'epico',    icone: '🧘', nome: 'Modo Foco',    desc: 'Completou 50 sessões Pomodoro',                          check: s => s.pomodoros >= 50,  progresso: s => Math.min(s.pomodoros / 50, 1),  detalhe: s => `${Math.min(s.pomodoros, 50)}/50` },
  { id: 'pom100', cat: 'foco', raridade: 'lendario', icone: '🕯️', nome: 'Zen Total',    desc: 'Completou 100 sessões Pomodoro — concentração absoluta', check: s => s.pomodoros >= 100, progresso: s => Math.min(s.pomodoros / 100, 1), detalhe: s => `${Math.min(s.pomodoros, 100)}/100` },

  // ── DIVERSIDADE ──
  { id: 'mat3',  cat: 'diversidade', raridade: 'comum', icone: '🌈', nome: 'Curioso',          desc: 'Estudou questões de 3 matérias diferentes',  check: s => s.materias >= 3,  progresso: s => Math.min(s.materias / 3, 1),  detalhe: s => `${Math.min(s.materias, 3)}/3 matérias` },
  { id: 'mat5',  cat: 'diversidade', raridade: 'comum', icone: '🎨', nome: 'Multidisciplinar', desc: 'Estudou questões de 5 matérias diferentes',  check: s => s.materias >= 5,  progresso: s => Math.min(s.materias / 5, 1),  detalhe: s => `${Math.min(s.materias, 5)}/5 matérias` },
  { id: 'mat10', cat: 'diversidade', raridade: 'raro',  icone: '🌍', nome: 'Polímata',         desc: 'Estudou questões de 10 matérias diferentes', check: s => s.materias >= 10, progresso: s => Math.min(s.materias / 10, 1), detalhe: s => `${Math.min(s.materias, 10)}/10 matérias` },
  { id: 'mat15', cat: 'diversidade', raridade: 'epico', icone: '🔭', nome: 'Generalista',      desc: 'Estudou questões de 15 matérias diferentes', check: s => s.materias >= 15, progresso: s => Math.min(s.materias / 15, 1), detalhe: s => `${Math.min(s.materias, 15)}/15 matérias` },

  // ── ESPECIAL ──
  { id: 'esp_combo',          cat: 'especial', raridade: 'raro',     icone: '⚡', nome: 'Combo Perfeito',      desc: 'Taxa ≥ 80%, streak ≥ 7 dias e ≥ 50 questões ao mesmo tempo',     check: s => s.taxa >= 80 && s.streak >= 7 && s.total >= 50,                     progresso: s => Math.min((Math.min(s.taxa,80)/80 + Math.min(s.streak,7)/7 + Math.min(s.total,50)/50)/3, 1),                                                       detalhe: s => `Taxa ${s.taxa}%/80% · Streak ${s.streak}/7d · ${Math.min(s.total,50)}/50q` },
  { id: 'esp_maratona_foco',  cat: 'especial', raridade: 'raro',     icone: '🎪', nome: 'Maratonista Focado', desc: '500 questões respondidas e 25 pomodoros concluídos',              check: s => s.total >= 500 && s.pomodoros >= 25,                                progresso: s => Math.min((Math.min(s.total,500)/500 + Math.min(s.pomodoros,25)/25)/2, 1),                                                                          detalhe: s => `${Math.min(s.total,500)}/500q · ${Math.min(s.pomodoros,25)}/25🍅` },
  { id: 'esp_completo',       cat: 'especial', raridade: 'epico',    icone: '🌟', nome: 'Estudante Completo', desc: '5 simulados, 14 dias de streak e taxa ≥ 70%',                     check: s => s.simulados >= 5 && s.streak >= 14 && s.taxa >= 70,                 progresso: s => Math.min((Math.min(s.simulados,5)/5 + Math.min(s.streak,14)/14 + Math.min(s.taxa,70)/70)/3, 1),                                                   detalhe: s => `${Math.min(s.simulados,5)}/5 sims · ${s.streak}/14d · ${s.taxa}%/70%` },
  { id: 'esp_imortal',        cat: 'especial', raridade: 'epico',    icone: '🦅', nome: 'O Imortal',          desc: '1.000 questões respondidas com streak ≥ 30 dias',                 check: s => s.total >= 1000 && s.streak >= 30,                                  progresso: s => Math.min((Math.min(s.total,1000)/1000 + Math.min(s.streak,30)/30)/2, 1),                                                                          detalhe: s => `${Math.min(s.total,1000)}/1.000q · ${s.streak}/30d` },
  { id: 'esp_diverso_focado', cat: 'especial', raridade: 'epico',    icone: '🎭', nome: 'Mente Aberta',       desc: '10 matérias estudadas e 25 pomodoros completados',                check: s => s.materias >= 10 && s.pomodoros >= 25,                              progresso: s => Math.min((Math.min(s.materias,10)/10 + Math.min(s.pomodoros,25)/25)/2, 1),                                                                        detalhe: s => `${Math.min(s.materias,10)}/10 mat · ${Math.min(s.pomodoros,25)}/25🍅` },
  { id: 'esp_supremo',        cat: 'especial', raridade: 'lendario', icone: '👁️',nome: 'Supremo',             desc: '1.000 questões · taxa ≥ 80% · streak ≥ 30 · 10 simulados',       check: s => s.total >= 1000 && s.taxa >= 80 && s.streak >= 30 && s.simulados >= 10, progresso: s => Math.min((Math.min(s.total,1000)/1000 + Math.min(s.taxa,80)/80 + Math.min(s.streak,30)/30 + Math.min(s.simulados,10)/10)/4, 1),                   detalhe: s => `${Math.min(s.total,1000)}/1k · ${s.taxa}%/80% · ${s.streak}/30d · ${Math.min(s.simulados,10)}/10 sims` },

  // ── SECRETAS ──
  { id: 'sec_persistente',       cat: 'secreto', raridade: 'secreto', icone: '🌙', secreta: true, nome: 'Persistente',    desc: 'Voltou a estudar depois de um longo período sem atividade',        check: s => s.total >= 50 && s.streak >= 1,  progresso: () => 0,                                                                                                     detalhe: () => '???' },
  { id: 'sec_noturno',           cat: 'secreto', raridade: 'secreto', icone: '🦉', secreta: true, nome: 'Coruja Noturna', desc: 'Estudou em horários incomuns — só os mais dedicados sabem',        check: s => s.total >= 100,                  progresso: s => Math.min(s.total / 100, 1),                                                                             detalhe: () => '???' },
  { id: 'sec_perfeito',          cat: 'secreto', raridade: 'secreto', icone: '💯', secreta: true, nome: 'Dia Perfeito',   desc: 'Respondeu 20+ questões em um único dia com 100% de acerto',       check: s => s.taxa >= 100 && s.total >= 20,  progresso: () => 0,                                                                                                     detalhe: () => '???' },
  { id: 'sec_simulado_perfeito', cat: 'secreto', raridade: 'secreto', icone: '🃏', secreta: true, nome: 'Gabaritou',      desc: 'Completou um simulado com 100% de acerto',                         check: s => s.simulados >= 1 && s.taxa >= 100, progresso: () => 0,                                                                                                   detalhe: () => '???' },
];

// ✅ Pré-computado uma única vez: todas as conquistas não-secretas de
// CONQUISTAS_BASE. Usar esta constante em sec_colecao tem dois benefícios:
//   1. check() e progresso() não precisam re-filtrar o array a cada chamada.
//   2. sec_colecao fica estruturalmente impossibilitada de se referenciar —
//      a separação é explícita, não depende de guardar com c.id !== 'sec_colecao'.
const CONQUISTAS_PARA_COLECAO = CONQUISTAS_BASE.filter(c => !c.secreta);

// TODAS_CONQUISTAS inclui CONQUISTAS_BASE + sec_colecao.
// sec_colecao fica fora do array original justamente para poder referenciar
// CONQUISTAS_PARA_COLECAO sem circularidade.
const TODAS_CONQUISTAS = [
  ...CONQUISTAS_BASE,
  {
    id: 'sec_colecao', cat: 'secreto', raridade: 'secreto', icone: '🗝️', secreta: true,
    nome: 'Colecionador', desc: 'Desbloqueou 15 conquistas — você vai longe',
    check:     s => CONQUISTAS_PARA_COLECAO.filter(c => c.check(s)).length >= 15,
    progresso: s => Math.min(CONQUISTAS_PARA_COLECAO.filter(c => c.check(s)).length / 15, 1),
    detalhe:   () => '???',
  },
];

/* ─── Utilitários ─── */
const RARID_ORDER = { lendario: 0, epico: 1, raro: 2, comum: 3, secreto: 4 };
const ordenarConquistas = (lista, stats) => {
  const desbloqueadas = lista.filter(c => c.check(stats));
  const bloqueadas    = lista.filter(c => !c.check(stats));
  const sortRarid     = (a, b) => (RARID_ORDER[a.raridade] ?? 5) - (RARID_ORDER[b.raridade] ?? 5);
  return [...desbloqueadas.sort(sortRarid), ...bloqueadas.sort(sortRarid)];
};

/* ════════════════════════════════════════════════════════════
   NOTIFICAÇÃO IN-APP DE CONQUISTA
════════════════════════════════════════════════════════════ */
const NotificacaoConquista = ({ conquistas, onDismiss }) => {
  const [atual, setAtual] = useState(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (conquistas.length === 0) return;
    const timer = setTimeout(() => fechar(), 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual, conquistas.length]);

  const fechar = () => {
    setSaindo(true);
    setTimeout(() => {
      if (atual + 1 < conquistas.length) {
        setSaindo(false);
        setAtual(a => a + 1);
      } else {
        onDismiss();
      }
    }, 400);
  };

  if (conquistas.length === 0) return null;
  const c = conquistas[atual];
  const r = RARIDADES[c.raridade] || RARIDADES.comum;

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      transform: saindo ? 'translateY(20px)' : 'translateY(0)',
      opacity: saindo ? 0 : 1,
      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      animation: !saindo ? 'slideInUp 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      <div style={{
        background: c.raridade === 'lendario'
          ? 'linear-gradient(135deg, #1c1410, #2d1f0a)'
          : c.raridade === 'epico'
          ? 'linear-gradient(135deg, #120d1f, #1e1040)'
          : c.raridade === 'secreto'
          ? 'linear-gradient(135deg, #0f172a, #1e293b)'
          : 'white',
        border: `2px solid ${r.borda}`,
        borderRadius: '16px',
        padding: '16px 20px',
        minWidth: '300px',
        maxWidth: '360px',
        boxShadow: `0 12px 40px ${r.glow}, 0 4px 16px rgba(0,0,0,0.2)`,
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        cursor: 'pointer',
      }} onClick={fechar}>

        {/* Ícone com glow */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
          background: c.raridade === 'lendario' ? '#2d1f0a'
            : c.raridade === 'epico' ? '#1e1040'
            : c.raridade === 'secreto' ? '#1e293b'
            : r.bg,
          border: `1.5px solid ${r.borda}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
          boxShadow: `0 0 16px ${r.glow}`,
        }}>
          {c.icone}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label topo */}
          <div style={{
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
            color: r.cor, marginBottom: '3px', textTransform: 'uppercase',
            ...(c.raridade === 'lendario' ? {
              background: 'linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 2s linear infinite',
            } : {}),
          }}>
            🏆 Conquista Desbloqueada!
          </div>

          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px', fontWeight: 700,
            color: ['lendario','epico','secreto'].includes(c.raridade) ? '#f1f5f9' : r.cor,
            marginBottom: '2px',
          }}>
            {c.secreta && !c.check ? '???' : c.nome}
          </div>

          <div style={{
            fontSize: '12px',
            color: ['lendario','epico','secreto'].includes(c.raridade) ? '#94a3b8' : 'var(--gray-500)',
            lineHeight: '1.3',
          }}>
            {c.desc}
          </div>

          {/* Badge raridade */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            marginTop: '6px', padding: '2px 8px',
            background: r.bg, border: `1px solid ${r.borda}`,
            borderRadius: '99px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.cor, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: r.cor }}>{r.label}</span>
          </div>
        </div>

        {/* Botão fechar */}
        <button onClick={e => { e.stopPropagation(); fechar(); }} style={{
          position: 'absolute', top: '8px', right: '10px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '16px', color: 'var(--gray-400)', lineHeight: 1,
        }}>×</button>

        {/* Contador se tiver múltiplas */}
        {conquistas.length > 1 && (
          <div style={{
            position: 'absolute', bottom: '8px', right: '12px',
            fontSize: '10px', color: 'var(--gray-400)', fontWeight: 600,
          }}>
            {atual + 1}/{conquistas.length}
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   TUTORIAL MODAL
════════════════════════════════════════════════════════════ */
const TUTORIAL_STEPS = [
  {
    icone: '🏆',
    titulo: 'Bem-vindo às Conquistas!',
    desc: 'Aqui você acompanha todas as suas medalhas e marcos de estudo. As conquistas são desbloqueadas automaticamente conforme você evolui na plataforma.',
  },
  {
    icone: '💎',
    titulo: 'Sistema de Raridade',
    desc: 'Cada conquista tem uma raridade: Comum, Raro, Épico e Lendário. Quanto mais rara, mais difícil de desbloquear — e mais especial ela é!',
    extra: (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', justifyContent: 'center' }}>
        {Object.entries(RARIDADES).filter(([k]) => k !== 'secreto').map(([key, r]) => (
          <span key={key} style={{
            padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
            background: r.bg, border: `1.5px solid ${r.borda}`, color: r.cor,
          }}>{r.label}</span>
        ))}
      </div>
    ),
  },
  {
    icone: '🔮',
    titulo: 'Conquistas Secretas',
    desc: 'Algumas conquistas estão ocultas! Você só descobre o nome e a descrição delas após desbloquear. Continue explorando a plataforma para encontrá-las.',
  },
  {
    icone: '📊',
    titulo: 'Acompanhe seu Progresso',
    desc: 'Conquistas bloqueadas mostram uma barra de progresso indicando o quanto falta para desbloquear. Use os filtros por categoria e raridade para navegar melhor.',
  },
  {
    icone: '🔔',
    titulo: 'Notificações em Tempo Real',
    desc: 'Ao desbloquear uma conquista, uma notificação aparecerá automaticamente na tela — mesmo se você estiver em outra aba da plataforma. Fique atento!',
  },
];

const TutorialModal = ({ onFechar }) => {
  const [step, setStep] = useState(0);
  const total = TUTORIAL_STEPS.length;
  const s = TUTORIAL_STEPS[step];
  const ultimo = step === total - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onFechar}>
      <div style={{
        background: 'white', borderRadius: '20px',
        padding: '36px 32px 28px',
        maxWidth: '460px', width: '92%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        position: 'relative',
        animation: 'fadeInScale 0.3s ease',
      }} onClick={e => e.stopPropagation()}>
        <style>{`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Indicador de steps */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '24px' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '24px' : '8px', height: '8px',
              borderRadius: '99px', transition: 'all 0.3s ease',
              background: i === step ? 'var(--brand-500)' : 'var(--gray-200)',
            }} />
          ))}
        </div>

        {/* Ícone */}
        <div style={{ textAlign: 'center', fontSize: '52px', marginBottom: '16px' }}>
          {s.icone}
        </div>

        {/* Conteúdo */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700,
          color: 'var(--gray-900)', textAlign: 'center', marginBottom: '12px',
        }}>
          {s.titulo}
        </h3>
        <p style={{
          fontSize: '14px', color: 'var(--gray-500)', textAlign: 'center',
          lineHeight: '1.6', marginBottom: '4px',
        }}>
          {s.desc}
        </p>
        {s.extra && s.extra}

        {/* Botões de navegação */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
          {step > 0 && (
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>
              ← Anterior
            </button>
          )}
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => ultimo ? onFechar() : setStep(s => s + 1)}
          >
            {ultimo ? '✅ Entendi!' : 'Próximo →'}
          </button>
        </div>

        {/* Pular */}
        {!ultimo && (
          <button onClick={onFechar} style={{
            display: 'block', margin: '12px auto 0', background: 'none', border: 'none',
            fontSize: '12px', color: 'var(--gray-400)', cursor: 'pointer',
          }}>
            Pular tutorial
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Card de conquista ─── */
const ConquistaCard = memo(({ conquista, desbloqueada, pct, detalhe, dataDesbloqueio }) => {
  const r = RARIDADES[conquista.raridade] || RARIDADES.comum;
  const segredo = conquista.secreta && !desbloqueada;

  const diasDesde = dataDesbloqueio
    ? Math.round((Date.now() - new Date(dataDesbloqueio)) / 86400000)
    : null;
  const isNova = diasDesde !== null && diasDesde <= 3;

  return (
    <div style={{
      background: desbloqueada
        ? (conquista.raridade === 'secreto' ? '#0f172a' : 'white')
        : 'var(--gray-50)',
      border: `1.5px solid ${desbloqueada ? r.borda : 'var(--gray-150, #e5e7eb)'}`,
      borderRadius: 'var(--r-xl)',
      padding: '18px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      opacity: desbloqueada ? 1 : 0.65,
      boxShadow: desbloqueada ? `0 4px 20px ${r.glow}` : 'none',
    }}
    onMouseEnter={e => { if (desbloqueada) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${r.glow}`; }}}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = desbloqueada ? `0 4px 20px ${r.glow}` : 'none'; }}
    >
      {desbloqueada && conquista.raridade !== 'secreto' && (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${r.bg}80 0%, transparent 55%)`, pointerEvents: 'none' }} />
      )}
      {desbloqueada && conquista.raridade === 'secreto' && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.25), transparent 60%)', pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        {isNova && (
          <span style={{ background: '#f59e0b', color: 'white', fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', letterSpacing: '0.06em' }}>NOVO</span>
        )}
        <span style={{ background: desbloqueada ? r.cor : 'var(--gray-300)', color: 'white', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', letterSpacing: '0.05em', opacity: desbloqueada ? 1 : 0.6 }}>
          {r.label.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '2px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: 'var(--r-md)',
          background: desbloqueada ? (conquista.raridade === 'secreto' ? '#1e293b' : r.bg) : 'var(--gray-100)',
          border: `1.5px solid ${desbloqueada ? r.borda : 'var(--gray-200)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0,
          filter: desbloqueada ? 'none' : 'grayscale(100%)',
          opacity: desbloqueada ? 1 : 0.4,
        }}>
          {segredo ? '🔮' : (desbloqueada ? conquista.icone : '🔒')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
            color: desbloqueada ? (conquista.raridade === 'secreto' ? '#e2e8f0' : r.cor) : 'var(--gray-500)',
            marginBottom: '3px',
          }}>
            {segredo ? '???' : conquista.nome}
          </h3>
          <p style={{
            fontSize: '12px', lineHeight: '1.4',
            color: desbloqueada ? (conquista.raridade === 'secreto' ? '#94a3b8' : 'var(--gray-500)') : 'var(--gray-400)',
            marginBottom: desbloqueada ? '6px' : '10px',
          }}>
            {segredo ? 'Conquista secreta — continue explorando para descobrir' : conquista.desc}
          </p>

          {!desbloqueada && !conquista.secreta && (
            <>
              <div style={{ height: '4px', background: 'var(--gray-200)', borderRadius: '99px', marginBottom: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, background: r.cor, borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500 }}>{detalhe}</p>
            </>
          )}

          {desbloqueada && dataDesbloqueio && (
            <p style={{ fontSize: '11px', color: conquista.raridade === 'secreto' ? '#64748b' : r.cor, fontWeight: 600 }}>
              ✅ {new Date(dataDesbloqueio).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
ConquistaCard.displayName = 'ConquistaCard';
// ✅ memo() aqui evita recalcular c.check(stats) para todas as conquistas
// a cada re-render do componente pai (Conquistas). Só reavalia quando stats muda.
const StatsRaridade = memo(({ stats }) => {
  const contagem = { comum: 0, raro: 0, epico: 0, lendario: 0, secreto: 0 };
  const total    = { comum: 0, raro: 0, epico: 0, lendario: 0, secreto: 0 };

  TODAS_CONQUISTAS.forEach(c => {
    total[c.raridade] = (total[c.raridade] || 0) + 1;
    if (c.check(stats)) contagem[c.raridade] = (contagem[c.raridade] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
      {Object.entries(RARIDADES).map(([key, r]) => (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: contagem[key] > 0 ? r.bg : 'var(--gray-50)',
          border: `1px solid ${contagem[key] > 0 ? r.borda : 'var(--gray-200)'}`,
          borderRadius: '99px', padding: '4px 12px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: contagem[key] > 0 ? r.cor : 'var(--gray-300)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: contagem[key] > 0 ? r.cor : 'var(--gray-400)' }}>
            {r.label} {contagem[key]}/{total[key]}
          </span>
        </div>
      ))}
    </div>
  );
});
StatsRaridade.displayName = 'StatsRaridade';

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
const Conquistas = () => {
  const [stats, setStats]               = useState(null);
  const [catSelecionada, setCat]        = useState('todas');
  const [conquistasDB, setConquistasDB] = useState([]);
  const [busca, setBusca]               = useState('');
  const [novasConquistas, setNovas]     = useState([]);
  const [tutorial, setTutorial]         = useState(false);

  // Abre tutorial automaticamente na primeira vez
  useEffect(() => {
    const jaViu = localStorage.getItem('cortexlab_tutorial_conquistas');
    if (!jaViu) {
      setTutorial(true);
    }
  }, []);

  const fecharTutorial = () => {
    localStorage.setItem('cortexlab_tutorial_conquistas', '1');
    setTutorial(false);
  };

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const [s, cDB] = await Promise.all([
      db.getStatsConquistas(),
      db.conquistas.toArray().catch(() => []),
    ]);
    setStats(s);

    const idsJaSalvos = new Set(cDB.map(c => c.id_conquista));
    const novas = TODAS_CONQUISTAS.filter(c => c.check(s) && !idsJaSalvos.has(c.id));

    if (novas.length > 0) {
      await Promise.all(novas.map(c =>
        db.conquistas.add({ id_conquista: c.id, data: new Date().toISOString() })
      ));
      const atualizadas = await db.conquistas.toArray().catch(() => []);
      setConquistasDB(atualizadas);
      // Dispara notificações in-app
      setNovas(novas);
    } else {
      setConquistasDB(cDB);
    }
  };

  const mapaConquistas = useMemo(() => {
    const m = {};
    conquistasDB.forEach(c => { m[c.id_conquista] = c.data; });
    return m;
  }, [conquistasDB]);

  const conquistasFiltradas = useMemo(() => {
    // Sem stats ainda, retorna vazio — o guard !stats no JSX cuida disso
    if (!stats) return [];

    let lista = catSelecionada === 'todas'
      ? TODAS_CONQUISTAS
      : TODAS_CONQUISTAS.filter(c => c.cat === catSelecionada);

    if (busca.trim()) {
      const t = busca.toLowerCase();
      lista = lista.filter(c =>
        (!c.secreta || c.check(stats)) &&
        (c.nome.toLowerCase().includes(t) || c.desc.toLowerCase().includes(t))
      );
    }

    // ✅ Pré-computar check/progresso/detalhe uma única vez por conquista aqui
    // dentro do useMemo, em vez de chamar as funções a cada render do map.
    const enriquecidas = lista.map(c => ({
      conquista: c,
      desbloqueada: c.check(stats),
      pct: c.progresso(stats),
      detalhe: c.detalhe(stats),
    }));

    // Ordenação inline reutilizando desbloqueada já computada (sem c.check extra)
    const sortRarid = (a, b) => (RARID_ORDER[a.conquista.raridade] ?? 5) - (RARID_ORDER[b.conquista.raridade] ?? 5);
    const desbloqueadas = enriquecidas.filter(e =>  e.desbloqueada).sort(sortRarid);
    const bloqueadas    = enriquecidas.filter(e => !e.desbloqueada).sort(sortRarid);
    return [...desbloqueadas, ...bloqueadas];
  }, [catSelecionada, busca, stats]);

  const totalDesbloqueadas = useMemo(
    () => (stats ? TODAS_CONQUISTAS.filter(c => c.check(stats)).length : 0),
    [stats]
  );

  const pctGeral = useMemo(
    () => Math.round((totalDesbloqueadas / TODAS_CONQUISTAS.length) * 100),
    [totalDesbloqueadas]
  );

  return (
    <div>
      {/* Notificação de conquista desbloqueada */}
      {novasConquistas.length > 0 && (
        <NotificacaoConquista
          conquistas={novasConquistas}
          onDismiss={() => setNovas([])}
        />
      )}

      {/* Tutorial */}
      {tutorial && <TutorialModal onFechar={fecharTutorial} />}

      <div className="page-header">
        <div>
          <h2 className="page-title">Conquistas</h2>
          {stats && (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
              {totalDesbloqueadas} de {TODAS_CONQUISTAS.length} desbloqueadas
            </p>
          )}
        </div>
        {/* Botão de tutorial */}
        <button
          className="btn-secondary"
          onClick={() => setTutorial(true)}
          title="Ver tutorial do sistema de conquistas"
        >
          ❓ Como funciona
        </button>
      </div>

      {/* Painel geral */}
      {stats && (
        <div className="card" style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1.5px solid #334155',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '15px' }}>🏆 Progresso Geral</span>
            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '18px' }}>{pctGeral}%</span>
          </div>
          <div style={{ height: '10px', background: '#334155', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(totalDesbloqueadas / TODAS_CONQUISTAS.length) * 100}%`,
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
              borderRadius: '99px', transition: 'width 0.6s ease',
            }} />
          </div>

          <StatsRaridade stats={stats} />

          <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '13px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
            {[
              { label: 'Questões',  val: stats.total },
              { label: 'Taxa',      val: `${stats.taxa}%` },
              { label: 'Streak',    val: `${stats.streak}d` },
              { label: 'Pomodoros', val: stats.pomodoros },
              { label: 'Simulados', val: stats.simulados },
              { label: 'Matérias',  val: stats.materias },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#f59e0b' }}>{s.val}</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <div className="tab-group" style={{ width: 'max-content' }}>
            {CATEGORIAS.map(cat => (
              <button
                key={cat.id}
                className={`tab-btn ${catSelecionada === cat.id ? 'active' : ''}`}
                onClick={() => setCat(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          className="input-modern"
          placeholder="🔍 Buscar conquista..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: '220px', fontSize: '13px' }}
        />
      </div>

      {/* Grid */}
      {!stats ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-400)' }}>Carregando...</div>
      ) : conquistasFiltradas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="empty-state-title">Nenhuma conquista encontrada</p>
            <p className="empty-state-desc">Tente outro termo ou categoria.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: '14px' }}>
          {conquistasFiltradas.map(({ conquista: c, desbloqueada, pct, detalhe }) => (
            <ConquistaCard
              key={c.id}
              conquista={c}
              desbloqueada={desbloqueada}
              pct={pct}
              detalhe={detalhe}
              dataDesbloqueio={mapaConquistas[c.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Conquistas;