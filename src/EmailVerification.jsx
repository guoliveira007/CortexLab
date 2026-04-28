import { useState, useEffect, useRef } from 'react';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './AuthContext';

/* ─── Spinner & Animations ───────────────────────────────────── */
const spinnerCSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.ev-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ev-card {
  animation: fadeSlideUp 0.35s ease both;
}
@keyframes pulse {
  0%, 100% { transform: scale(1);    opacity: 1;    }
  50%       { transform: scale(1.06); opacity: 0.85; }
}
.ev-icon-wrap {
  animation: pulse 2.8s ease-in-out infinite;
}
@keyframes progressShrink {
  from { width: 100%; }
  to   { width: 0%; }
}
`;

/* ─── SVG Icons ──────────────────────────────────────────────── */
const IconEnvelope = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
    <rect x="4" y="10" width="36" height="24" rx="4" stroke="url(#envGrad)" strokeWidth="1.8" fill="rgba(99,102,241,0.08)"/>
    <polyline points="4,10 22,26 40,10" stroke="url(#envGrad)" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <defs>
      <linearGradient id="envGrad" x1="4" y1="10" x2="40" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <polyline points="2,7 6,11 12,3" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

/* ─── Component ──────────────────────────────────────────────── */
const COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 5000;

const EmailVerification = () => {
  const user = auth.currentUser;
  const { refreshUser } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [checkLoading,  setCheckLoading]  = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown,      setCooldown]      = useState(0); // seconds remaining
  const [error,         setError]         = useState('');

  const pollRef    = useRef(null);
  const cooldownRef = useRef(null);

  /* ── Polling automático a cada 5s ─────────────────────────── */
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        await refreshUser();
      } catch {
        // Silencioso: tenta no próximo ciclo
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, []);

  /* ── Cooldown counter ─────────────────────────────────────── */
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown > 0]); // só inicia quando cooldown sai do zero

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleResend = async () => {
    setError(''); setResendSuccess(false); setResendLoading(true);
    try {
      await sendEmailVerification(user);
      setResendSuccess(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err.code === 'auth/too-many-requests'
          ? 'Aguarde alguns minutos antes de reenviar.'
          : 'Não foi possível reenviar. Tente novamente.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheck = async () => {
    setError(''); setCheckLoading(true);
    try {
      await refreshUser();
      if (!auth.currentUser.emailVerified) {
        setError('E-mail ainda não verificado. Clique no link que enviamos.');
      }
    } catch {
      setError('Não foi possível verificar. Tente novamente.');
    } finally {
      setCheckLoading(false);
    }
  };

  /* ── Rótulo dinâmico do botão reenviar ────────────────────── */
  const resendLabel = () => {
    if (resendLoading) return <><span className="ev-spinner" style={{ borderTopColor: 'rgba(167,139,250,0.8)' }} /> Reenviando...</>;
    if (cooldown > 0)  return `Reenviar em ${cooldown}s`;
    if (resendSuccess) return <><IconCheck /> E-mail reenviado</>;
    return <><IconRefresh /> Reenviar e-mail</>;
  };

  const resendDisabled = resendLoading || cooldown > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0818 0%, #130f2e 45%, #1a1535 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Sora', 'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{spinnerCSS}</style>

      {/* Blobs de fundo */}
      <div style={{ position: 'fixed', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-120px', left: '-120px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="ev-card" style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.045)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '24px', padding: '48px 40px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
        textAlign: 'center',
      }}>

        {/* Ícone */}
        <div className="ev-icon-wrap" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)',
          marginBottom: '24px',
        }}>
          <IconEnvelope />
        </div>

        <h2 style={{
          margin: '0 0 12px', fontSize: '22px', fontWeight: 700,
          background: 'linear-gradient(135deg, #c4b5fd 0%, #818cf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', letterSpacing: '-0.3px',
        }}>
          Verifique seu e-mail
        </h2>

        <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6' }}>
          Enviamos um link de verificação para
        </p>
        <p style={{ margin: '0 0 32px', fontSize: '14.5px', fontWeight: 600, color: 'rgba(167,139,250,0.9)', wordBreak: 'break-all' }}>
          {user?.email}
        </p>

        {/* Passos */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '16px 18px',
          marginBottom: '28px', textAlign: 'left',
        }}>
          {[
            'Abra o e-mail que enviamos',
            'Clique em "Verificar e-mail"',
            'Esta tela redireciona sozinha',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 2 ? '10px' : 0 }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'rgba(167,139,250,0.9)', marginTop: '1px',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Indicador de polling */}
        <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'rgba(255,255,255,0.22)', lineHeight: '1.5' }}>
          Verificando automaticamente a cada 5 segundos…
        </p>

        {/* Botão: já verifiquei */}
        <button
          onClick={handleCheck} disabled={checkLoading}
          style={{
            width: '100%', padding: '13px', fontSize: '14.5px', fontWeight: 700,
            background: checkLoading ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: checkLoading ? 'rgba(255,255,255,0.5)' : 'white',
            border: 'none', borderRadius: '12px',
            cursor: checkLoading ? 'not-allowed' : 'pointer',
            boxShadow: checkLoading ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            marginBottom: '12px', fontFamily: 'inherit',
          }}
        >
          {checkLoading ? <><span className="ev-spinner" /> Verificando...</> : <><IconCheck /> Já verifiquei</>}
        </button>

        {/* Botão: reenviar com cooldown */}
        <button
          onClick={handleResend} disabled={resendDisabled}
          style={{
            width: '100%', padding: '13px', fontSize: '14px', fontWeight: 600,
            background: 'transparent',
            color: resendSuccess && cooldown > 0
              ? 'rgba(110,231,183,0.8)'
              : resendDisabled
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(167,139,250,0.8)',
            border: `1.5px solid ${
              resendSuccess && cooldown > 0
                ? 'rgba(16,185,129,0.25)'
                : resendDisabled
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(167,139,250,0.2)'
            }`,
            borderRadius: '12px',
            cursor: resendDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'inherit',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Barra de progresso do cooldown */}
          {cooldown > 0 && (
            <span style={{
              position: 'absolute', bottom: 0, left: 0,
              height: '2px',
              background: 'rgba(167,139,250,0.35)',
              animation: `progressShrink ${COOLDOWN_SECONDS}s linear both`,
            }} />
          )}
          {resendLabel()}
        </button>

        {error && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', color: '#fca5a5', fontSize: '13.5px', lineHeight: '1.5', textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.22)', lineHeight: '1.5' }}>
          Não recebeu? Verifique a pasta de spam.
        </p>

        <button
          onClick={() => signOut(auth)}
          style={{
            marginTop: '8px', background: 'none', border: 'none',
            cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
            fontSize: '12.5px', fontFamily: 'inherit', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.25)'}
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
};

export default EmailVerification;
