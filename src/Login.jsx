import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from './firebase';

const Login = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [isRegistering, setIsReg]   = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [loading, setLoading]       = useState(false);

  const msgErro = (code) => ({
    'auth/user-not-found':     'Nenhuma conta encontrada com este e-mail.',
    'auth/wrong-password':     'Senha incorreta. Tente novamente.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/too-many-requests':  'Muitas tentativas. Aguarde alguns minutos.',
    'auth/weak-password':      'Senha muito fraca. Use ao menos 6 caracteres.',
  }[code] || 'Algo deu errado. Tente novamente.');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isRegistering) {
        if (password.length < 8) {
          setError('A senha deve ter pelo menos 8 caracteres.'); setLoading(false); return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        await auth.signOut();
        setSuccess('Conta criada! Verifique seu e-mail para ativar antes de fazer login. Cheque o spam também.');
        setIsReg(false);
        setEmail(''); setPassword('');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          await auth.signOut();
          setError('E-mail ainda não verificado. Cheque sua caixa de entrada (e o spam).');
        }
      }
    } catch (err) {
      setError(msgErro(err.code));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', fontSize: '15px',
    background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', color: 'white', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Círculos decorativos de fundo */}
      <div style={{
        position: 'fixed', top: '-100px', right: '-100px',
        width: '450px', height: '450px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-100px', left: '-100px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card principal */}
      <div style={{
        width: '100%', maxWidth: '420px', position: 'relative',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px', padding: '48px 40px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontSize: '60px', lineHeight: 1, marginBottom: '14px',
            filter: 'drop-shadow(0 4px 20px rgba(139,92,246,0.6))',
          }}>🧠</div>
          <h1 style={{
            margin: 0, fontSize: '30px', fontWeight: 800,
            background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', letterSpacing: '-0.5px',
          }}>
            CortexLab
          </h1>
          <p style={{
            margin: '8px 0 0', fontSize: '14px',
            color: 'rgba(255,255,255,0.4)', fontWeight: 400,
          }}>
            {isRegistering ? 'Crie sua conta para começar' : 'Bem-vindo de volta'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', marginBottom: '8px', fontSize: '13px',
              fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.3px',
            }}>E-mail</label>
            <input
              type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.65)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', marginBottom: '8px', fontSize: '13px',
              fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.3px',
            }}>
              Senha{' '}
              {isRegistering && (
                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
                  (mín. 8 caracteres)
                </span>
              )}
            </label>
            <input
              type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.65)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700,
              background: loading
                ? 'rgba(99,102,241,0.4)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(99,102,241,0.45)',
              transition: 'all 0.2s', letterSpacing: '0.3px',
            }}
          >
            {loading ? '⏳ Aguarde...' : isRegistering ? '✨ Criar conta' : '→ Entrar'}
          </button>
        </form>

        {/* Alternar modo */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => { setIsReg(!isRegistering); setError(''); setSuccess(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(167,139,250,0.9)', fontSize: '14px', fontWeight: 500,
              textDecoration: 'underline', textDecorationColor: 'rgba(167,139,250,0.35)',
              padding: '4px',
            }}
          >
            {isRegistering
              ? 'Já tenho uma conta — Fazer login'
              : 'Não tem conta? Cadastre-se grátis'}
          </button>
        </div>

        {/* Mensagens */}
        {error && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', color: '#fca5a5',
            fontSize: '14px', lineHeight: '1.5',
          }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '10px', color: '#6ee7b7',
            fontSize: '14px', lineHeight: '1.5',
          }}>
            ✅ {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
