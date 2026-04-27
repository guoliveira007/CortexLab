import React from 'react';
import styles from './TabTransition.module.css';

/**
 * TabTransition — anima a troca de aba com fade + leve slide para cima.
 *
 * O truque: ao mudar `tabKey`, o React desmonta e remonta o div,
 * disparando a animação CSS novamente.
 *
 * Props:
 *   tabKey   identificador único da aba atual (muda → reinicia animação)
 *   children conteúdo da aba
 */
const TabTransition = ({ children, tabKey }) => (
  <div key={tabKey} className={styles.wrapper}>
    {children}
  </div>
);

export default TabTransition;
