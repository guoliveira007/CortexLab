import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await reload(firebaseUser);           // busca o estado real do Firebase
        setUser(auth.currentUser);            // já com emailVerified atualizado
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Chame isso após qualquer reload() externo para sincronizar o estado do React
  const refreshUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
