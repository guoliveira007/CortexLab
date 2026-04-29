import { useState } from 'react';
import logo from './assets/logo_login.png';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';

/* ─── SVG Icons ─────────────────────────────────────────────── */
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ─── CortexLab logo ─────────────────────────────────────────── */
const CortexLogo = () => (
  <img
    src={logo}
    alt="CortexLab"
    style={{ width: '180px', height: 'auto', objectFit: 'contain' }}
  />
);

/* ─── Inline styles ──────────────────────────────────────────── */
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0818 0%, #130f2e 45%, #1a1535 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
    fontFamily: "'Sora', 'Segoe UI', system-ui, sans-serif",
  },
  blobTR: {
    position: 'fixed', top: '-120px', right: '-120px',
    width: '480px', height: '480px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  blobBL: {
    position: 'fixed', bottom: '-120px', left: '-120px',
    width: '520px', height: '520px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: '420px', position: 'relative',
    background: 'rgba(255,255,255,0.045)',
    backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '24px', padding: '48px 40px',
    boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
  },
  header: { textAlign: 'center', marginBottom: '40px' },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: '18px' },
  title: {
    margin: 0, fontSize: '26px', fontWeight: 700,
    background: 'linear-gradient(135deg, #c4b5fd 0%, #818cf8 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', letterSpacing: '-0.4px',
  },
  subtitle: {
    margin: '8px 0 0', fontSize: '13.5px',
    color: 'rgba(255,255,255,0.38)', fontWeight: 400,
  },
  fieldWrap: { marginBottom: '16px' },
  label: {
    display: 'block', marginBottom: '8px', fontSize: '12.5px',
    fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  iconLeft: {
    position: 'absolute', left: '14px',
    color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', padding: '12px 44px', fontSize: '14.5px',
    background: 'rgba(255,255,255,0.06)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', color: 'white', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute', right: '13px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.35)', padding: '4px',
    display: 'flex', alignItems: 'center',
    transition: 'color 0.2s',
  },
  forgotWrap: { textAlign: 'right', marginTop: '8px', marginBottom: '8px' },
  forgotBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(167,139,250,0.75)', fontSize: '12.5px',
    fontFamily: 'inherit', padding: '2px 0',
    transition: 'color 0.2s',
  },
  submitBtn: (loading) => ({
    width: '100%', padding: '14px', fontSize: '14.5px', fontWeight: 700,
    background: loading
      ? 'rgba(99,102,241,0.35)'
      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: loading ? 'rgba(255,255,255,0.5)' : 'white',
    border: 'none', borderRadius: '12px',
    cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: loading ? 'none' : '0 4px 24px rgba(99,102,241,0.4)',
    transition: 'all 0.2s', letterSpacing: '0.4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    marginTop: '8px',
  }),
  toggleWrap: {
    textAlign: 'center', marginTop: '22px',
    fontSize: '13.5px', color: 'rgba(255,255,255,0.35)',
  },
  toggleBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(167,139,250,0.85)', fontSize: '13.5px',
    fontFamily: 'inherit', fontWeight: 600,
    padding: '2px 4px', transition: 'color 0.2s',
  },
  alertError: {
    marginTop: '18px', padding: '12px 16px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '10px', color: '#fca5a5',
    fontSize: '13.5px', lineHeight: '1.5',
  },
  alertSuccess: {
    marginTop: '18px', padding: '12px 16px',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '10px', color: '#6ee7b7',
    fontSize: '13.5px', lineHeight: '1.5',
  },
  divider: {
    margin: '0 0 18px', border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
};

/* ─── Spinner ────────────────────────────────────────────────── */
const spinnerCSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.cl-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
input::placeholder { color: rgba(255,255,255,0.22); }
`;

/* ─── Component ──────────────────────────────────────────────── */
const Login = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [isRegistering, setIsReg]   = useState(false);
  const [isForgot, setIsForgot]     = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);

  const reset = () => { setError(''); setSuccess(''); };

  const msgErro = (code) => ({
    'auth/user-not-found':       'Nenhuma conta encontrada com este e-mail.',
    'auth/wrong-password':       'Senha incorreta. Tente novamente.',
    'auth/invalid-credential':   'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde alguns minutos.',
    'auth/weak-password':        'Senha muito fraca. Use ao menos 6 caracteres.',
  }[code] ?? 'Algo deu errado. Tente novamente.');

  /* ── Forgot password ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('E-mail de redefinição enviado. Verifique sua caixa de entrada e o spam.');
    } catch (err) {
      setError(msgErro(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ── Login / Register ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset(); setLoading(true);
    try {
      if (isRegistering) {
        if (password.length < 8) {
          setError('A senha deve ter pelo menos 8 caracteres.');
          setLoading(false); return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        // Não faz signOut — main.jsx detecta emailVerified: false e exibe EmailVerification
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Se emailVerified: false, main.jsx redireciona para EmailVerification automaticamente
      }
    } catch (err) {
      setError(msgErro(err.code));
    } finally {
      setLoading(false);
    }
  };

  const focusInput  = (e) => { e.target.style.borderColor = 'rgba(139,92,246,0.6)'; e.target.style.background = 'rgba(255,255,255,0.09)'; };
  const blurInput   = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)';  e.target.style.background = 'rgba(255,255,255,0.06)'; };

  /* ── Titles ── */
  const pageTitle = isForgot
    ? 'Recuperar acesso'
    : isRegistering ? 'Criar conta' : 'Entrar';
  const pageSubtitle = isForgot
    ? 'Enviaremos um link para redefinir sua senha'
    : isRegistering ? 'Preencha os dados para começar' : 'Bem-vindo de volta';

  return (
    <div style={s.page}>
      <style>{spinnerCSS}</style>
      <div style={s.blobTR} />
      <div style={s.blobBL} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.logoWrap}><CortexLogo /></div>
          <p style={s.subtitle}>{pageSubtitle}</p>
        </div>

        <hr style={s.divider} />

        {/* ── Forgot password form ── */}
        {isForgot ? (
          <form onSubmit={handleForgot}>
            <div style={s.fieldWrap}>
              <label style={s.label}>E-mail</label>
              <div style={s.inputWrap}>
                <span style={s.iconLeft}><IconMail /></span>
                <input
                  type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={s.input}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={s.submitBtn(loading)}>
              {loading ? <span className="cl-spinner" /> : null}
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <div style={{ ...s.toggleWrap, marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => { setIsForgot(false); reset(); }}
                style={s.toggleBtn}
              >
                ← Voltar ao login
              </button>
            </div>
          </form>
        ) : (
          /* ── Login / Register form ── */
          <form onSubmit={handleSubmit}>
            <div style={s.fieldWrap}>
              <label style={s.label}>E-mail</label>
              <div style={s.inputWrap}>
                <span style={s.iconLeft}><IconMail /></span>
                <input
                  type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={s.input}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>
            </div>

            <div style={{ ...s.fieldWrap, marginBottom: '6px' }}>
              <label style={s.label}>
                Senha{' '}
                {isRegistering && (
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (mín. 8 caracteres)
                  </span>
                )}
              </label>
              <div style={s.inputWrap}>
                <span style={s.iconLeft}><IconLock /></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={s.input}
                  onFocus={focusInput} onBlur={blurInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                  title={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Forgot password link — only on login mode */}
            {!isRegistering && (
              <div style={s.forgotWrap}>
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); reset(); }}
                  style={s.forgotBtn}
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} style={s.submitBtn(loading)}>
              {loading ? <span className="cl-spinner" /> : null}
              {loading
                ? 'Aguarde...'
                : isRegistering ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Toggle login ↔ register */}
        {!isForgot && (
          <div style={s.toggleWrap}>
            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              onClick={() => { setIsReg(!isRegistering); reset(); }}
              style={s.toggleBtn}
            >
              {isRegistering ? 'Fazer login' : 'Cadastre-se'}
            </button>
          </div>
        )}

        {/* Alerts */}
        {error   && <div style={s.alertError}>{error}</div>}
        {success && <div style={s.alertSuccess}>{success}</div>}
      </div>
    </div>
  );
};

export default Login;
