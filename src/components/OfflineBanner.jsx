import React from 'react';
import { useOffline } from '../hooks/useOffline';
import styles from './OfflineBanner.module.css';

/**
 * OfflineBanner — faixa animada que aparece quando a conexão cai.
 * Não renderiza nada quando online.
 */
const OfflineBanner = () => {
  const offline = useOffline();
  if (!offline) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      📡 Sem conexão — suas respostas continuam sendo salvas localmente.
    </div>
  );
};

export default OfflineBanner;
