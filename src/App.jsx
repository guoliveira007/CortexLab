import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { aplicarTema, getTema } from './components/Configuracoes';

// Aplicar tema salvo ao inicializar
aplicarTema(getTema());

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
import AvatarPerfil from './components/AvatarPerfil';

// ── UX / Visual ──
import TabTransition from './components/TabTransition';
import OfflineBanner from './components/OfflineBanner';

// ── Error Boundary ──
import ErrorBoundary from './components/ErrorBoundary';

import {
  LayoutDashboard, Target, FileText, ClipboardList, Database,
  BarChart2, Medal, Calendar, Trophy, MessageCircle, Brain,
  CalendarClock, Keyboard, Loader2,
} from 'lucide-react';
import logo from './assets/logo_sidebar.png';

const LoadingFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '300px', color: 'var(--gray-400)', fontSize: '14px', gap: '10px',
  }}>
    <Loader2 size={20} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} />
    Carregando…
  </div>
);

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'freestyle',    label: 'Freestyle',       icon: Target },
  { id: 'simulado',     label: 'Simulados',       icon: FileText },
  { id: 'listas',       label: 'Listas',          icon: ClipboardList },
  { id: 'banco',        label: 'Banco',           icon: Database },
  { id: 'desempenho',   label: 'Desempenho',      icon: BarChart2 },
  { id: 'metas',        label: 'Metas',           icon: Medal },
  { id: 'planejamento', label: 'Planejamento',    icon: Calendar },
  { id: 'conquistas',   label: 'Conquistas',      icon: Trophy },
];

const TABS_IA = [
  { id: 'chat',    label: 'Chat de Dúvidas',     icon: MessageCircle },
  { id: 'resumo',  label: 'Resumo por Matéria',  icon: Brain },
];

const TABS_REVISAO = [
  { id: 'previsao',  label: 'Previsão de Revisões', icon: CalendarClock, badge: true },
];

export default function App() {
  const { user } = useAuth();
  const [tab, setTab]                   = useState('dashboard');
  const [materiaFreestyle, setMateriaFreestyle] = useState('');
  const [configAberta, setConfigAberta] = useState(false);
  const [ajudaAberta, setAjudaAberta]   = useState(false);
  const [dbVersion, setDbVersion]       = useState(0);

  const { aberto: tutAberto, abrir: abrirTut, fechar: fecharTut } = useTutorial(tab);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('cortexlab_cache');
    bc.onmessage = () => setDbVersion(v => v + 1);
    return () => bc.close();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.tela) {
        setTab(e.detail.tela);
        if (e.detail.tela === 'freestyle' && e.detail.materia) {
          setMateriaFreestyle(e.detail.materia);
        }
      }
    };
    window.addEventListener('app:navegar', handler);
    return () => window.removeEventListener('app:navegar', handler);
  }, []);

  const navegar = useCallback((tela) => setTab(tela), []);
  useAtalhos(navegar);

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
      case 'freestyle':    return <Freestyle materiaInicial={materiaFreestyle} onMateriaAplicada={() => setMateriaFreestyle('')} />;
      case 'simulado':     return <Simulado />;
      case 'listas':       return <MinhasListas />;
      case 'revisao':      return <RevisaoEspacada onFechar={() => setTab('dashboard')} />;
      case 'caderno':      return <CadernoErros    onFechar={() => setTab('dashboard')} />;
      case 'banco':        return <BancoQuestoes />;
      case 'desempenho':   return <Desempenho />;
      case 'metas':        return <Metas />;
      case 'planejamento': return <Planejamento />;
      case 'conquistas':   return <Conquistas />;
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
      {items.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ position: 'relative' }}
          >
            <Icon size={17} strokeWidth={1.75} className="nav-icon" />
            {t.label}
            {t.badge && <BadgeRevisoes />}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="app-shell">
      <Toaster position="top-right" toastOptions={{ style: { marginTop: '38px' } }} />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="CortexLab" />
        </div>

        <nav className="sidebar-nav">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`nav-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={17} strokeWidth={1.75} className="nav-icon" />
                {t.label}
              </button>
            );
          })}

          <NavGroup titulo="Revisão" items={TABS_REVISAO} />
          <NavGroup titulo="Inteligência Artificial" items={TABS_IA} />

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              className="nav-item"
              onClick={() => setAjudaAberta(true)}
              title="Atalhos de teclado (Alt+?)"
            >
              <Keyboard size={17} strokeWidth={1.75} className="nav-icon" />
              Atalhos
            </button>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div style={{
          position: 'fixed',
          top: '14px',
          right: '20px',
          zIndex: 7000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <BotaoTutorial tabId={tab} onClick={abrirTut} />
          <AvatarPerfil
            userEmail={user?.email}
            onAbrirConfig={() => setConfigAberta(true)}
            onIrParaBackup={() => setTab('backup')}
          />
        </div>

        <OfflineBanner />
        <ErrorBoundary>
          <TabTransition tabKey={tab}>
            {renderPage()}
          </TabTransition>
        </ErrorBoundary>
      </main>

      <ErrorBoundary>
        <Pomodoro />
      </ErrorBoundary>

      {configAberta && <Configuracoes onFechar={() => setConfigAberta(false)} />}
      <AjudaAtalhos visivel={ajudaAberta} onFechar={() => setAjudaAberta(false)} />
      <Tutorial tabId={tab} aberto={tutAberto} onFechar={fecharTut} />
    </div>
  );
}