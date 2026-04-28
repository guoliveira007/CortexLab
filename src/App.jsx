import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';

// ── Componentes leves — importados estaticamente ──
import Dashboard        from './components/Dashboard';
import Freestyle        from './components/Freestyle';
import BancoQuestoes    from './components/BancoQuestoes';
import Desempenho       from './components/Desempenho';
import MinhasListas     from './components/MinhasListas';
import Simulado         from './components/Simulado';
import Metas            from './components/Metas';
import Conquistas       from './components/Conquistas';
import Planejamento     from './components/Planejamento';
import Pomodoro         from './components/Pomodoro';
import RevisaoEspacada  from './components/RevisaoEspacada';
import CadernoErros     from './components/CadernoErros';
import Configuracoes    from './components/Configuracoes';

// ── Componentes pesados — lazy loaded ──
// Esses módulos só são baixados quando o usuário navega até a aba.
// Reduz o bundle inicial em ~30–40% dependendo do tamanho de cada módulo.
const ChatDuvidas      = lazy(() => import('./components/ChatDuvidas'));
const ResumoMateria    = lazy(() => import('./components/ResumoMateria'));
const PrevisaoRevisoes = lazy(() => import('./components/PrevisaoRevisoes'));
const BackupRestaurar  = lazy(() => import('./components/BackupRestaurar'));

import { useAtalhos } from './components/useAtalhos';
import AjudaAtalhos   from './components/AjudaAtalhos';
import BadgeRevisoes  from './components/BadgeRevisoes';

// ── Tutorial ──
import Tutorial, { BotaoTutorial } from './components/Tutorial';
import { useTutorial } from './components/useTutorial';

// ── UX / Visual ──
import TabTransition from './components/TabTransition';
import OfflineBanner from './components/OfflineBanner';

// ── Error Boundary ──
import ErrorBoundary from './components/ErrorBoundary';

import logo from './assets/logo_sidebar.png';

// ── Fallback de carregamento exibido enquanto o chunk lazy é baixado ──
const LoadingFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '300px', color: 'var(--gray-400)', fontSize: '14px', gap: '10px',
  }}>
    <span style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>⏳</span>
    Carregando…
  </div>
);

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: '🏠' },
  { id: 'freestyle',    label: 'Freestyle',       icon: '🎯' },
  { id: 'simulado',     label: 'Simulados',       icon: '📝' },
  { id: 'listas',       label: 'Listas',          icon: '📋' },
  { id: 'banco',        label: 'Banco',           icon: '🗃️' },
  { id: 'desempenho',   label: 'Desempenho',      icon: '📈' },
  { id: 'metas',        label: 'Metas',           icon: '🎖️' },
  { id: 'planejamento', label: 'Planejamento',    icon: '📅' },
  { id: 'conquistas',   label: 'Conquistas',      icon: '🏆' },
];

const TABS_IA = [
  { id: 'chat',    label: 'Chat de Dúvidas',     icon: '💬' },
  { id: 'resumo',  label: 'Resumo por Matéria',  icon: '🧠' },
];

const TABS_REVISAO = [
  { id: 'previsao',  label: 'Previsão de Revisões', icon: '📆', badge: true },
];

const TABS_CONFIG = [
  { id: 'backup', label: 'Backup & Restauração', icon: '💾' },
];

export default function App() {
  const [tab, setTab]                   = useState('dashboard');
  const [configAberta, setConfigAberta] = useState(false);
  const [ajudaAberta, setAjudaAberta]   = useState(false);
  // Incrementado quando outra aba invalida o cache via BroadcastChannel.
  // Passado como key ao Dashboard para forçar re-fetch dos dados.
  const [dbVersion, setDbVersion]       = useState(0);

  // ── Tutorial ──
  const { aberto: tutAberto, abrir: abrirTut, fechar: fecharTut } = useTutorial(tab);

  // ── BroadcastChannel — reage a invalidações de cache de outras abas ──
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('cortexlab_cache');
    bc.onmessage = () => setDbVersion(v => v + 1);
    return () => bc.close();
  }, []);

  // Navegar via eventos customizados (ex: Pomodoro → Freestyle)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.tela) setTab(e.detail.tela);
    };
    window.addEventListener('app:navegar', handler);
    return () => window.removeEventListener('app:navegar', handler);
  }, []);

  // Atalhos de teclado
  const navegar = useCallback((tela) => setTab(tela), []);
  useAtalhos(navegar);

  // Alt+? abre painel de atalhos
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key === '?') {
        e.preventDefault();
        setAjudaAberta(a => !a);
      }
      if (e.key === 'Escape') setAjudaAberta(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const renderPage = () => {
    switch (tab) {
      case 'dashboard':    return <Dashboard key={dbVersion} onNavigate={setTab} />;
      case 'freestyle':    return <Freestyle />;
      case 'simulado':     return <Simulado />;
      case 'listas':       return <MinhasListas />;
      case 'revisao':      return <RevisaoEspacada onFechar={() => setTab('dashboard')} />;
      case 'caderno':      return <CadernoErros    onFechar={() => setTab('dashboard')} />;
      case 'banco':        return <BancoQuestoes />;
      case 'desempenho':   return <Desempenho />;
      case 'metas':        return <Metas />;
      case 'planejamento': return <Planejamento />;
      case 'conquistas':   return <Conquistas />;
      // ── Componentes lazy: envolvidos em Suspense individualmente ──
      case 'chat':    return <Suspense fallback={<LoadingFallback />}><ChatDuvidas /></Suspense>;
      case 'resumo':  return <Suspense fallback={<LoadingFallback />}><ResumoMateria /></Suspense>;
      case 'previsao':return <Suspense fallback={<LoadingFallback />}><PrevisaoRevisoes /></Suspense>;
      case 'backup':  return <Suspense fallback={<LoadingFallback />}><BackupRestaurar /></Suspense>;
      default:        return <Dashboard onNavigate={setTab} />;
    }
  };

  const NavGroup = ({ titulo, items }) => (
    <>
      <p className="nav-label">{titulo}</p>
      {items.map(t => (
        <button
          key={t.id}
          className={`nav-item ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
          style={{ position: 'relative' }}
        >
          <span className="nav-icon">{t.icon}</span>
          {t.label}
          {t.badge && <BadgeRevisoes />}
        </button>
      ))}
    </>
  );

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { marginTop: '38px' } }} />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="CortexLab" style={{ height: '56px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        </div>

        <nav className="sidebar-nav">
          {/* Principal */}
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}

          {/* Revisão */}
          <NavGroup titulo="Revisão" items={TABS_REVISAO} />

          {/* IA */}
          <NavGroup titulo="Inteligência Artificial" items={TABS_IA} />

          {/* Sistema */}
          <NavGroup titulo="Sistema" items={TABS_CONFIG} />

          {/* Separador + botões de config */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              className="nav-item"
              onClick={abrirTut}
              title="Ver tutorial desta aba"
            >
              <span className="nav-icon">❓</span>
              Tutorial
            </button>
            <button
              className="nav-item"
              onClick={() => setAjudaAberta(true)}
              title="Atalhos de teclado (Alt+?)"
            >
              <span className="nav-icon">⌨️</span>
              Atalhos
            </button>
            <button
              className="nav-item"
              onClick={() => setConfigAberta(true)}
            >
              <span className="nav-icon">⚙️</span>
              Configurações
            </button>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <OfflineBanner />
        <ErrorBoundary>
          <TabTransition tabKey={tab}>
            {renderPage()}
          </TabTransition>
        </ErrorBoundary>
      </main>

      {/* Widget Pomodoro flutuante */}
      <ErrorBoundary>
        <Pomodoro />
      </ErrorBoundary>

      {/* Modal de Configurações (API Key Groq) */}
      {configAberta && <Configuracoes onFechar={() => setConfigAberta(false)} />}

      {/* Painel de Atalhos */}
      <AjudaAtalhos visivel={ajudaAberta} onFechar={() => setAjudaAberta(false)} />

      {/* Tutorial */}
      <Tutorial tabId={tab} aberto={tutAberto} onFechar={fecharTut} />
    </div>
  );
}
