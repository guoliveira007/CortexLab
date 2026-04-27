import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ valor, cor = 'var(--gradient-brand)', altura = 8 }) => (
  <div
    className={styles.track}
    style={{ height: altura }}
  >
    <div
      className={styles.fill}
      style={{
        width: `${Math.min(valor, 100)}%`,
        background: cor,
      }}
    />
  </div>
);

export default ProgressBar;