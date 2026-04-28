import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import EmailVerification from './EmailVerification';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const Root = () => {
  const { user, emailVerified, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100, fontSize: 18 }}>
        Verificando autenticação…
      </div>
    );
  }

  // Não autenticado
  if (!user) return <Login />;

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
