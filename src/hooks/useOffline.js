import { useState, useEffect } from 'react';

/**
 * useOffline — retorna `true` enquanto o navegador não tiver conexão.
 *
 * Usa os eventos nativos 'online' / 'offline' do window.
 * Funciona tanto no browser quanto no Electron.
 */
export const useOffline = () => {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setOffline(false);
    const goOffline = () => setOffline(true);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return offline;
};
