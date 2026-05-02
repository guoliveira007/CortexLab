import React, { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════
   TUTORIAL STEPS — Conteúdo por aba
   ═══════════════════════════════════════════════════════════ */
const TUTORIAL_STEPS = {
  dashboard: {
    titulo: 'Dashboard',
    icone: '🏠',
    cor: '#6366f1',
    bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    passos: [
      {
        titulo: 'Seu painel de controle',
        descricao: 'O Dashboard reúne tudo em um só lugar: estatísticas de desempenho, streak de estudos, metas do dia e acesso rápido às principais funcionalidades.',
        icone: '📊',
        dica: 'Acesse o Dashboard a qualquer momento com o atalho Alt+1.',
      },
      {
        titulo: 'Heatmap de atividades',
        descricao: 'O calendário colorido mostra sua frequência de estudos nos últimos 12 meses — igual ao GitHub. Quadrados mais escuros = mais questões respondidas naquele dia.',
        icone: '🗓️',
        dica: 'Passe o mouse sobre os quadrados para ver quantas questões você respondeu naquele dia.',
      },
      {
        titulo: 'Streak & Metas diárias',
        descricao: 'Acompanhe sua sequência de dias estudados (streak 🔥) e o progresso das metas que você definiu. O Dashboard atualiza em tempo real conforme você responde questões.',
        icone: '🎯',
        dica: 'Configure suas metas na aba "Metas" para ver o progresso aqui.',
      },
      {
        titulo: 'Acesso rápido',
        descricao: 'Os botões de ação rápida levam direto para Revisão Espaçada, Caderno de Erros, Freestyle e Simulados — as funcionalidades que você mais usa.',
        icone: '⚡',
        dica: 'O badge vermelho em "Revisão Espaçada" indica quantas questões estão pendentes para hoje.',
      },
    ],
  },

  freestyle: {
    titulo: 'Freestyle',
    icone: '🎯',
    cor: '#4f46e5',
    bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    passos: [
      {
        titulo: 'Pratique do seu jeito',
        descricao: 'O Freestyle deixa você escolher exatamente quais questões praticar. Filtre por banca, ano, matéria, conteúdo e tópico — e responda quantas quiser, sem pressão de tempo.',
        icone: '🎯',
        dica: 'Atalho rápido: Alt+2 ou Alt+F abre o Freestyle de qualquer lugar.',
      },
      {
        titulo: 'Filtros em cascata',
        descricao: 'Os filtros são inteligentes: ao selecionar uma Banca, as opções de Ano, Matéria e Tópico se ajustam automaticamente mostrando só o que existe naquela combinação.',
        icone: '🔍',
        dica: 'Você pode selecionar múltiplas bancas, matérias ou tópicos ao mesmo tempo.',
      },
      {
        titulo: 'Feedback imediato',
        descricao: 'Ao responder, o gabarito aparece instantaneamente com a explicação da questão. Se você errar, o botão "💡 Entender com IA" gera uma explicação didática personalizada.',
        icone: '💡',
        dica: 'Configure sua chave Groq em Configurações para usar as explicações com IA.',
      },
      {
        titulo: 'Sessão persistente',
        descricao: 'Seus filtros são salvos durante a sessão. Se navegar para outra aba e voltar, os filtros estarão exatamente como você deixou — sem precisar configurar tudo de novo.',
        icone: '💾',
        dica: 'Clique em "← Novo filtro" para reiniciar a sessão com novos filtros.',
      },
    ],
  },

  simulado: {
    titulo: 'Simulados',
    icone: '📝',
    cor: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
    passos: [
      {
        titulo: 'Simule a prova de verdade',
        descricao: 'Crie simulados cronometrados com questões do seu banco. Escolha o número de questões, o tempo limite e embaralhe as alternativas para uma experiência idêntica ao exame real.',
        icone: '📝',
        dica: 'Atalho: Alt+3 abre os Simulados de qualquer tela.',
      },
      {
        titulo: 'Cronômetro e pressão',
        descricao: 'O timer conta o tempo por questão e o tempo total do simulado. Quando o tempo acabar, o simulado é encerrado automaticamente — pratique a gestão de tempo.',
        icone: '⏱️',
        dica: 'O timer fica vermelho e pisca quando o tempo está acabando.',
      },
      {
        titulo: 'Resultado detalhado',
        descricao: 'Ao finalizar, você vê sua taxa de acerto, questões por questão com gabarito, e pode usar o "💡 Entender com IA" em cada erro para entender onde foi.',
        icone: '📊',
        dica: 'Os resultados dos simulados aparecem na aba Desempenho → Simulados.',
      },
    ],
  },

  listas: {
    titulo: 'Minhas Listas',
    icone: '📋',
    cor: '#0891b2',
    bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
    passos: [
      {
        titulo: 'Organize suas questões',
        descricao: 'Crie listas temáticas de questões — por exemplo, "Direito Administrativo - Semana 1" ou "Revisão para TRF". Adicione questões do banco e pratique no modo Lista.',
        icone: '📋',
        dica: 'Atalho: Alt+4 abre as Listas.',
      },
      {
        titulo: 'Modo Lista guiado',
        descricao: 'Ao praticar uma lista, as questões aparecem uma por vez com timer individual. Você avança manualmente — ótimo para estudar com atenção e sem se dispersar.',
        icone: '▶️',
        dica: 'As questões da lista são embaralhadas automaticamente a cada sessão.',
      },
      {
        titulo: 'Revisão pós-lista',
        descricao: 'Ao terminar, você vê um resumo com acertos, erros e taxa. As questões que errou ficam listadas com o botão de explicação IA para revisão imediata.',
        icone: '🏁',
        dica: 'Clique em "🔄 Refazer" para repetir a lista com as questões embaralhadas novamente.',
      },
    ],
  },

  banco: {
    titulo: 'Banco de Questões',
    icone: '🗃️',
    cor: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    passos: [
      {
        titulo: 'Seu acervo de questões',
        descricao: 'O Banco centraliza todas as questões que você importou. Visualize, edite, filtre e gerencie seu acervo completo. Quanto mais questões, mais rico fica seu estudo.',
        icone: '🗃️',
        dica: 'Atalho: Alt+5 abre o Banco de Questões.',
      },
      {
        titulo: 'Importar via CSV',
        descricao: 'Importe questões em massa usando uma planilha CSV. O modelo aceita enunciado, comando, alternativas A-E, gabarito, banca, ano, matéria, conteúdo e tópico.',
        icone: '📊',
        dica: 'Baixe o modelo CSV na aba de importação para ver o formato correto.',
      },
      {
        titulo: 'Importar via IA',
        descricao: 'Cole o texto de qualquer questão (de PDF, site ou digitado) e a IA extrai automaticamente: enunciado, alternativas, gabarito e metadados. Rápido e preciso.',
        icone: '🤖',
        dica: 'A importação via IA funciona melhor com questões de múltipla escolha bem formatadas.',
      },
      {
        titulo: 'Importar via PDF',
        descricao: 'Faça upload de PDFs de provas antigas. O sistema processa o documento e extrai as questões automaticamente, pronto para revisar e confirmar.',
        icone: '📄',
        dica: 'PDFs com texto selecionável funcionam melhor do que PDFs escaneados.',
      },
    ],
  },

  desempenho: {
    titulo: 'Desempenho',
    icone: '📈',
    cor: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    passos: [
      {
        titulo: 'Analise sua evolução',
        descricao: 'Veja gráficos de acertos e erros dos últimos 7 dias e 12 meses, taxa de acerto geral, streak atual e estatísticas separadas por modo (Freestyle, Listas, Simulados).',
        icone: '📈',
        dica: 'Atalho: Alt+6 abre o Desempenho.',
      },
      {
        titulo: 'Filtros de período e modo',
        descricao: 'Filtre por Hoje, Semana, Mês, Ano ou Todo o período. Combine com filtro de modo para ver seu desempenho específico em simulados ou freestyle.',
        icone: '⚙️',
        dica: 'Use o filtro "Hoje" para verificar rapidamente sua performance diária.',
      },
      {
        titulo: 'Desempenho por matéria',
        descricao: 'A aba "Por Matéria" mostra sua taxa de acerto em cada disciplina com barras de progresso coloridas: verde (≥70%), amarelo (50-70%) ou vermelho (<50%).',
        icone: '📚',
        dica: 'Matérias em vermelho são suas prioridades de estudo — foque nelas!',
      },
      {
        titulo: 'Análise de simulados',
        descricao: 'A aba "Simulados" compara seu desempenho entre diferentes simulados realizados e mostra o comparativo entre os três modos de estudo.',
        icone: '🏆',
        dica: 'Acompanhe sua evolução ao longo das semanas para ver o progresso real.',
      },
    ],
  },

  metas: {
    titulo: 'Metas',
    icone: '🎖️',
    cor: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    passos: [
      {
        titulo: 'Defina seus objetivos',
        descricao: 'Configure metas diárias de estudo: questões por dia, taxa de acerto mínima, sequência de dias (streak) e tempo de estudo. O app acompanha o progresso em tempo real.',
        icone: '🎯',
        dica: 'Comece com metas alcançáveis e vá aumentando gradualmente.',
      },
      {
        titulo: '4 tipos de meta',
        descricao: '📝 Questões por dia · 🎯 Taxa de acerto · 🔥 Streak de dias · ⏱️ Tempo de estudo. Cada meta tem sugestões pré-definidas para facilitar a configuração.',
        icone: '🏅',
        dica: 'As metas aparecem no Dashboard para você acompanhar diariamente.',
      },
      {
        titulo: 'Progresso visual',
        descricao: 'Cada meta mostra uma barra de progresso com percentual atingido hoje. Ao bater 100%, um banner de parabéns aparece — comemorar os marcos mantém a motivação!',
        icone: '🎉',
        dica: 'O progresso reseta a meia-noite todos os dias — fresh start!',
      },
    ],
  },

  planejamento: {
    titulo: 'Planejamento',
    icone: '📅',
    cor: '#0284c7',
    bg: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
    passos: [
      {
        titulo: 'Organize sua semana',
        descricao: 'Monte seu cronograma semanal de estudos: defina quais matérias estudar em cada dia da semana, com horários e duração. Mantenha a consistência com uma rotina planejada.',
        icone: '📅',
        dica: 'Um planejamento semanal fixo reduz a procrastinação e melhora o aproveitamento.',
      },
      {
        titulo: 'Distribuição por matéria',
        descricao: 'Aloque tempo proporcional às matérias mais cobradas no seu concurso. Visualize a distribuição semanal e ajuste conforme sua evolução no Desempenho.',
        icone: '⚖️',
        dica: 'Reserve pelo menos 30 minutos diários para revisão espaçada.',
      },
    ],
  },

  conquistas: {
    titulo: 'Conquistas',
    icone: '🏆',
    cor: '#b45309',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    passos: [
      {
        titulo: 'Desbloqueie conquistas',
        descricao: 'Ganhe troféus e medalhas conforme você estuda. Conquistas motivam a consistência — há badges para primeiros passos, sequências longas, taxa de acerto alta e muito mais.',
        icone: '🏆',
        dica: 'Atalho: Alt+9... navegue pelo sidebar para ver suas conquistas.',
      },
      {
        titulo: 'Progressão gamificada',
        descricao: 'As conquistas são desbloqueadas automaticamente conforme você atinge marcos: 1ª questão respondida, 7 dias de streak, 100 questões, 70% de acerto, e por aí vai.',
        icone: '⭐',
        dica: 'Conquistas bloqueadas mostram o que você precisa fazer para desbloqueá-las.',
      },
      {
        titulo: 'Histórico completo',
        descricao: 'Veja a data em que cada conquista foi desbloqueada. É uma forma de acompanhar sua jornada de evolução ao longo do tempo.',
        icone: '📜',
        dica: 'Compartilhe suas conquistas para motivar colegas que também estudam para concursos!',
      },
    ],
  },

  previsao: {
    titulo: 'Previsão de Revisões',
    icone: '📆',
    cor: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
    passos: [
      {
        titulo: 'Algoritmo SM-2',
        descricao: 'A Revisão Espaçada usa o algoritmo SM-2 (base do Anki) para calcular o momento ideal de revisar cada questão. Revise na hora certa = memória de longo prazo.',
        icone: '🧠',
        dica: 'Atalho: Alt+P abre a Previsão de Revisões.',
      },
      {
        titulo: 'Calendário de revisões',
        descricao: 'Veja exatamente quando cada questão voltará para revisão. O calendário mostra os próximos 30 dias com a quantidade de questões agendadas por dia.',
        icone: '📆',
        dica: 'Questões fáceis voltam mais tarde; questões difíceis voltam mais cedo.',
      },
      {
        titulo: 'Badge de pendências',
        descricao: 'O número vermelho na sidebar indica quantas questões estão pendentes para revisão hoje. Zere esse número diariamente para maximizar a retenção.',
        icone: '🔴',
        dica: 'Revise antes de praticar questões novas — consolidar é mais importante que avançar.',
      },
    ],
  },

  chat: {
    titulo: 'Chat de Dúvidas',
    icone: '💬',
    cor: '#6366f1',
    bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    passos: [
      {
        titulo: 'Seu professor de IA',
        descricao: 'Tire qualquer dúvida sobre matérias de concurso com um assistente de IA especializado. Ele explica conceitos, cita artigos de lei, jurisprudência e dá exemplos práticos.',
        icone: '🤖',
        dica: 'Atalho: Alt+C abre o Chat de Dúvidas.',
      },
      {
        titulo: 'Powered by Groq + Llama 3.1',
        descricao: 'As respostas são geradas pelo modelo Llama 3.1 8B via Groq Cloud (gratuito). A IA responde em streaming, como uma conversa real, com até 400 palavras por resposta.',
        icone: '⚡',
        dica: 'Configure sua chave Groq gratuita em ⚙️ Configurações (14.400 requisições/dia).',
      },
      {
        titulo: 'Perguntas sugeridas',
        descricao: 'Ao abrir o chat pela primeira vez, sugestões de perguntas frequentes aparecem para você começar. Clique em qualquer uma para enviar instantaneamente.',
        icone: '💡',
        dica: 'Use Shift+Enter para quebrar linha na mensagem; Enter sozinho envia.',
      },
      {
        titulo: 'Histórico da sessão',
        descricao: 'O chat mantém o histórico da conversa durante a sessão — você pode continuar de onde parou. Clique em "🗑️ Limpar" para começar uma nova conversa do zero.',
        icone: '📜',
        dica: 'Para perguntas complexas, dê contexto: "Sou candidato ao INSS. Explique LOAS..."',
      },
    ],
  },

  resumo: {
    titulo: 'Resumo por Matéria',
    icone: '🧠',
    cor: '#0d9488',
    bg: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
    passos: [
      {
        titulo: 'IA analisa seus erros',
        descricao: 'A IA analisa as questões que você mais erra em cada matéria e gera um resumo focado nos seus pontos fracos — não um resumo genérico, mas personalizado para você.',
        icone: '🧠',
        dica: 'Atalho: Alt+M abre o Resumo por Matéria.',
      },
      {
        titulo: 'Pré-requisito: 3 questões',
        descricao: 'Para gerar um resumo, você precisa ter respondido pelo menos 3 questões de uma matéria. Quanto mais questões respondidas, mais preciso e completo o resumo.',
        icone: '📋',
        dica: 'Responda questões no Freestyle ou em Listas para alimentar o sistema.',
      },
      {
        titulo: 'Gerado sob demanda',
        descricao: 'Cada resumo é gerado na hora pela IA quando você clica em "Gerar Resumo". Selecione a matéria e aguarde alguns segundos — o texto aparece em streaming.',
        icone: '⚡',
        dica: 'Você pode gerar o resumo quantas vezes quiser — ele se atualiza com novos dados.',
      },
    ],
  },

  backup: {
    titulo: 'Backup & Restauração',
    icone: '💾',
    cor: '#475569',
    bg: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
    passos: [
      {
        titulo: 'Proteja seus dados',
        descricao: 'Todos os seus dados (questões, resultados, listas, metas) ficam no seu navegador (IndexedDB). Faça backup regularmente para não perder nada se limpar o cache.',
        icone: '💾',
        dica: 'Atalho: Alt+B abre o Backup & Restauração.',
      },
      {
        titulo: 'Exportar backup',
        descricao: 'Clique em "Exportar" para baixar um arquivo JSON com todos os seus dados. Guarde em um local seguro — Google Drive, Dropbox ou pen drive.',
        icone: '📤',
        dica: 'Recomendamos fazer backup semanal, especialmente após importar muitas questões.',
      },
      {
        titulo: 'Restaurar backup',
        descricao: 'Para restaurar, selecione o arquivo JSON exportado anteriormente. Os dados serão importados sem apagar o que já existe — é uma operação segura de mesclagem.',
        icone: '📥',
        dica: 'Você pode usar o backup para migrar seus dados para outro computador ou navegador.',
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE — Botão que abre o tutorial (canto superior direito)
   ═══════════════════════════════════════════════════════════ */
export const BotaoTutorial = ({ tabId, onClick }) => {
  // Só aparece se a aba atual tem tutorial definido
  if (!TUTORIAL_STEPS[tabId]) return null;

  return (
    <button
      onClick={onClick}
      title="Ver tutorial desta aba"
      style={{
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        border: '1.5px solid var(--gray-200)',
        background: 'var(--surface-card)',
        color: 'var(--gray-500)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--brand-50)';
        e.currentTarget.style.borderColor = 'var(--brand-400)';
        e.currentTarget.style.color = 'var(--brand-600)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface-card)';
        e.currentTarget.style.borderColor = 'var(--gray-200)';
        e.currentTarget.style.color = 'var(--gray-500)';
      }}
    >
      ?
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE — Tutorial Modal
   ═══════════════════════════════════════════════════════════ */
const Tutorial = ({ tabId, aberto, onFechar }) => {
  const [passo, setPasso] = useState(0);

  // Detecta dark mode reativo
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains('dark'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const dados = TUTORIAL_STEPS[tabId];

  useEffect(() => {
    if (aberto) setPasso(0);
  }, [aberto, tabId]);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aberto, onFechar]);

  if (!aberto || !dados) return null;

  const passoAtual = dados.passos[passo];
  const total = dados.passos.length;
  const ehUltimo = passo === total - 1;

  const avancar = () => { if (ehUltimo) onFechar(); else setPasso(p => p + 1); };
  const voltar  = () => setPasso(p => p - 1);

  // Cores adaptadas ao tema
  const headerBg     = isDark ? 'var(--surface-elevated)' : dados.bg;
  const headerBorder = isDark ? '1px solid var(--gray-200)' : '1px solid rgba(0,0,0,0.06)';
  const closeBtnBg   = isDark ? 'var(--gray-200)'           : 'rgba(0,0,0,0.08)';
  const closeBtnHover= isDark ? 'var(--gray-300)'           : 'rgba(0,0,0,0.15)';
  const dotInactive  = isDark ? 'var(--gray-300)'           : 'rgba(0,0,0,0.15)';
  const iconBg       = isDark ? 'var(--gray-100)'           : dados.bg;

  return (
    <>
      <style>{`
        @keyframes tut-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tut-slide-up {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tut-passo-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onFechar}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(10, 15, 30, 0.72)',
          backdropFilter: 'blur(6px)',
          animation: 'tut-fade-in 0.25s ease',
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div style={{
          background: 'var(--surface-card)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: isDark
            ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08)',
          overflow: 'hidden',
          animation: 'tut-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'all',
        }}>

          {/* Header */}
          <div style={{
            background: headerBg,
            padding: '24px 28px 20px',
            borderBottom: headerBorder,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px',
                background: dados.cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
                boxShadow: `0 6px 20px ${dados.cor}44`,
                flexShrink: 0,
              }}>
                {dados.icone}
              </div>
              <div>
                <p style={{
                  fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: dados.cor, marginBottom: '2px',
                }}>
                  Tutorial
                </p>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px', fontWeight: 800,
                  color: 'var(--gray-900)', letterSpacing: '-0.02em',
                }}>
                  {dados.titulo}
                </h3>
              </div>
            </div>

            {/* Botão fechar */}
            <button
              onClick={onFechar}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '32px', height: '32px',
                background: closeBtnBg, border: 'none',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', color: 'var(--gray-500)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = closeBtnHover}
              onMouseLeave={e => e.currentTarget.style.background = closeBtnBg}
            >×</button>

            {/* Indicadores de passo */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
              {dados.passos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPasso(i)}
                  style={{
                    height: '4px',
                    width: i === passo ? '28px' : '14px',
                    borderRadius: '99px',
                    background: i === passo ? dados.cor : dotInactive,
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
              <span style={{
                marginLeft: 'auto',
                fontSize: '12px', color: 'var(--gray-400)', fontWeight: 600,
                alignSelf: 'center',
              }}>
                {passo + 1}/{total}
              </span>
            </div>
          </div>

          {/* Conteúdo do passo */}
          <div
            key={passo}
            style={{
              padding: '28px',
              animation: 'tut-passo-in 0.25s ease',
            }}
          >
            {/* Ícone + Título */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', flexShrink: 0,
                border: `1.5px solid ${dados.cor}22`,
              }}>
                {passoAtual.icone}
              </div>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <h4 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '17px', fontWeight: 700,
                  color: 'var(--gray-900)', marginBottom: '10px',
                  letterSpacing: '-0.01em',
                }}>
                  {passoAtual.titulo}
                </h4>
                <p style={{
                  fontSize: '14px', lineHeight: '1.75',
                  color: 'var(--gray-600)',
                }}>
                  {passoAtual.descricao}
                </p>
              </div>
            </div>

            {/* Dica */}
            <div style={{
              background: isDark ? `${dados.cor}18` : `${dados.cor}0d`,
              border: `1.5px solid ${dados.cor}30`,
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: dados.cor }}>Dica: </strong>
                {passoAtual.dica}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px',
            borderTop: '1px solid var(--gray-100)',
            background: 'var(--surface-card)',
          }}>
            <button
              onClick={voltar}
              disabled={passo === 0}
              style={{
                background: 'none', border: 'none',
                color: passo === 0 ? 'var(--gray-300)' : 'var(--gray-500)',
                cursor: passo === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, padding: '8px 12px',
                borderRadius: '8px', transition: 'all 0.15s',
                fontFamily: 'var(--font-body)',
              }}
            >← Anterior</button>

            <button
              onClick={avancar}
              style={{
                background: dados.cor,
                color: 'white', border: 'none',
                borderRadius: '10px', padding: '10px 24px',
                fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: `0 4px 14px ${dados.cor}44`,
                fontFamily: 'var(--font-body)',
              }}
            >{ehUltimo ? 'Concluir ✓' : 'Próximo →'}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
