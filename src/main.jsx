import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import EmailVerification from './EmailVerification';
import VerificationSuccess from './VerificationSuccess';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const Root = () => {
  const { user, emailVerified, loading } = useAuth();
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Quando emailVerified virar true durante a sessão, mostra tela de sucesso
  const prevVerified = React.useRef(false);
  React.useEffect(() => {
    if (emailVerified && !prevVerified.current && user) {
      setShowSuccess(true);
    }
    prevVerified.current = emailVerified;
  }, [emailVerified]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100, fontSize: 18 }}>
        Verificando autenticação…
      </div>
    );
  }

  // Não autenticado
  if (!user) return <Login />;

  // Conta recém-verificada → tela de sucesso de 8s
  if (showSuccess) return <VerificationSuccess onDone={() => setShowSuccess(false)} />;

  // Autenticado mas e-mail não verificado
  if (!emailVerified) return <EmailVerification />;

  // Autenticado e verificado
  return (
    <>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}>
        <span style={{ marginRight: 10 }}>{user.email}</span>
        <button onClick={() => { signOut(auth); window.location.reload(); }}>Sair</button>
      </div>
      <App />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
