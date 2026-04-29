import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import EmailVerification from './EmailVerification';
import VerificationSuccess from './VerificationSuccess';
import LoadingScreen from './LoadingScreen';

const Root = () => {
  const { user, emailVerified, loading } = useAuth();
  const [showSuccess, setShowSuccess] = React.useState(false);

  if (loading) return <LoadingScreen />;

  if (!user) return <Login />;

  if (showSuccess) return <VerificationSuccess onDone={() => setShowSuccess(false)} />;

  if (!emailVerified) return <EmailVerification onVerified={() => setShowSuccess(true)} />;

  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
