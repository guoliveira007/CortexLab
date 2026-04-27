import React from 'react';
import styles from './SkeletonLoader.module.css';

/**
 * SkeletonLoader — placeholder animado para carregamento.
 *
 * Props:
 *   variant  'text' | 'rect' | 'circle'  (default: 'text')
 *   width    largura (ex: '100%', '200px')
 *   height   altura  (default: 14px para text, obrigatório para rect/circle)
 *   count    número de linhas — só para variant='text'  (default: 1)
 *   style    estilos extras
 */
const SkeletonLoader = ({ variant = 'text', width = '100%', height, count = 1, style }) => {
  if (variant === 'text' && count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${styles.text}`}
            style={{
              width: i === count - 1 ? '72%' : width,
              height: height || 14,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant] || styles.text}`}
      style={{
        width,
        height: height || (variant === 'circle' ? width : 14),
        ...style,
      }}
    />
  );
};

export default SkeletonLoader;
