import React from 'react';
import styles from './BotaoGrau.module.css';

const BotaoGrau = ({ grau, label, emoji, cor, fundo, borda, onClick }) => (
  <button
    onClick={() => onClick(grau)}
    className={styles.botao}
    style={{
      background: fundo,
      borderColor: borda,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 6px 16px ${borda}44`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <span className={styles.emoji}>{emoji}</span>
    <span className={styles.label} style={{ color: cor }}>{label}</span>
  </button>
);

export default BotaoGrau;