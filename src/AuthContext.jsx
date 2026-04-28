import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await reload(firebaseUser);
        setUser(auth.currentUser);
        setEmailVerified(auth.currentUser.emailVerified);
      } else {
        setUser(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Chame após verificar o e-mail — atualiza emailVerified como estado próprio
  // garantindo que o React detecte a mudança mesmo que o objeto do usuário seja o mesmo
  const refreshUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setUser(auth.currentUser);
      setEmailVerified(auth.currentUser.emailVerified); // estado separado = re-render garantido
    }
  };

  return (
    <AuthContext.Provider value={{ user, emailVerified, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
