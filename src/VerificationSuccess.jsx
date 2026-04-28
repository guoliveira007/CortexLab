import { useEffect, useState } from 'react';

const DURATION = 8; // segundos

const spinnerCSS = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.vs-card {
  animation: fadeSlideUp 0.4s ease both;
}
@keyframes checkPop {
  0%   { transform: scale(0);   opacity: 0; }
  70%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
.vs-check {
  animation: checkPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both;
}
@keyframes ringPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  50%       { box-shadow: 0 0 0 16px rgba(16,185,129,0); }
}
.vs-ring {
  animation: ringPulse 2s ease-in-out infinite;
}
`;

const IconCheckLarge = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <polyline
      points="6,19 15,28 32,10"
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VerificationSuccess = ({ onDone }) => {
  const [count, setCount] = useState(DURATION);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = ((DURATION - count) / DURATION) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0818 0%, #130f2e 45%, #1a1535 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Sora', 'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{spinnerCSS}</style>

      {/* Blobs */}
      <div style={{ position: 'fixed', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-120px', left: '-120px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,150,105,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="vs-card" style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.045)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '24px', padding: '52px 40px 40px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
        textAlign: 'center',
      }}>

        {/* Ícone de sucesso */}
        <div className="vs-check vs-ring" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '88px', height: '88px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          marginBottom: '28px',
        }}>
          <IconCheckLarge />
        </div>

        <h2 style={{
          margin: '0 0 12px', fontSize: '24px', fontWeight: 700,
          background: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', letterSpacing: '-0.3px',
        }}>
          E-mail verificado!
        </h2>

        <p style={{
          margin: '0 0 36px', fontSize: '14.5px',
          color: 'rgba(255,255,255,0.45)', lineHeight: '1.7',
        }}>
          Sua conta está ativa. Bem-vindo ao CortexLab.
        </p>

        {/* Barra de progresso */}
        <div style={{
          width: '100%', height: '4px',
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '99px', overflow: 'hidden',
          marginBottom: '14px',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981, #6ee7b7)',
            borderRadius: '99px',
            transition: 'width 1s linear',
          }} />
        </div>

        <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.22)' }}>
          Entrando em {count}s…
        </p>

        {/* Botão para entrar imediatamente */}
        <button
          onClick={onDone}
          style={{
            marginTop: '24px',
            width: '100%', padding: '13px',
            fontSize: '14.5px', fontWeight: 700,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', border: 'none', borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(16,185,129,0.35)',
            fontFamily: 'inherit', transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.target.style.opacity = '0.85'}
          onMouseLeave={e => e.target.style.opacity = '1'}
        >
          Entrar agora
        </button>
      </div>
    </div>
  );
};

export default VerificationSuccess;
