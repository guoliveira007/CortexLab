import React from 'react';

/**
 * ErrorBoundary — captura erros em runtime de qualquer filho e exibe
 * um fallback amigável em vez de travar a tela inteira.
 *
 * Uso básico:
 *   <ErrorBoundary>
 *     <ComponenteQuePoderiaLançarErro />
 *   </ErrorBoundary>
 *
 * Com fallback customizado:
 *   <ErrorBoundary fallback={<p>Algo deu errado neste bloco.</p>}>
 *     ...
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null, info: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    this.setState({ info });
    // Em produção, substitua por um serviço de monitoramento (ex: Sentry)
    console.error('[ErrorBoundary]', erro, info?.componentStack);
  }

  resetar = () => this.setState({ erro: null, info: null });

  render() {
    const { erro } = this.state;
    const { fallback, children } = this.props;

    if (!erro) return children;

    if (fallback) return fallback;

    return (
      <div style={{
        margin: '24px auto',
        maxWidth: '540px',
        background: '#fef2f2',
        border: '1.5px solid #fecaca',
        borderRadius: 'var(--r-xl, 16px)',
        padding: '28px 32px',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(239,68,68,0.1)',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '17px',
          fontWeight: 700,
          color: '#991b1b',
          marginBottom: '8px',
        }}>
          Algo deu errado
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#b91c1c',
          lineHeight: '1.6',
          marginBottom: '20px',
        }}>
          Um erro inesperado ocorreu neste componente.
          {erro?.message && (
            <span style={{
              display: 'block',
              marginTop: '6px',
              fontFamily: 'monospace',
              fontSize: '12px',
              opacity: 0.8,
            }}>
              {erro.message}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={this.resetar}
            style={{
              padding: '9px 22px',
              background: '#ef4444',
              border: 'none',
              borderRadius: 'var(--r-md, 8px)',
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🔄 Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 22px',
              background: 'white',
              border: '1.5px solid #fecaca',
              borderRadius: 'var(--r-md, 8px)',
              color: '#991b1b',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↺ Recarregar página
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
