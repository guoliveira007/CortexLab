import logo from './assets/logo.png';

const loadingCSS = `
@keyframes spin { to { transform: rotate(360deg); } }
.ls-spinner {
  width: 64px; height: 64px;
  border: 3px solid rgba(99,102,241,0.15);
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ls-content {
  animation: fadeIn 0.4s ease both;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1;   }
}
.ls-dot { animation: pulse 1.4s ease-in-out infinite; }
.ls-dot:nth-child(2) { animation-delay: 0.2s; }
.ls-dot:nth-child(3) { animation-delay: 0.4s; }
`;

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0818 0%, #130f2e 45%, #1a1535 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Sora', 'Segoe UI', system-ui, sans-serif",
  }}>
    <style>{loadingCSS}</style>

    {/* Blobs */}
    <div style={{ position: 'fixed', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'fixed', bottom: '-120px', left: '-120px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

    <div className="ls-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>

      {/* Logo + spinner sobrepostos */}
      <div style={{ position: 'relative', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ls-spinner" style={{ position: 'absolute' }} />
        <img
          src={logo}
          alt="CortexLab"
          style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'contain' }}
        />
      </div>

      {/* Nome */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: '0 0 10px', fontSize: '16px', fontWeight: 600,
          background: 'linear-gradient(135deg, #c4b5fd 0%, #818cf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', letterSpacing: '-0.2px',
        }}>
          CortexLab
        </p>

        {/* Pontinhos animados */}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="ls-dot" style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'rgba(129,140,248,0.6)',
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default LoadingScreen;
