/**
 * Alternativas.jsx
 *
 * Atalhos de teclado:
 *   1 → A, 2 → B, 3 → C, 4 → D, 5 → E  (só antes de responder)
 *   ↑↓ navegam entre alternativas com foco
 *   Enter / Espaço selecionam a alternativa focada
 */
import React, { useRef, useEffect } from 'react';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];
const NUMERO_PARA_LETRA = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };

const Alternativas = ({
  alternativas = {},
  imagensAlternativas = {},
  gabarito,
  resposta,
  onResponder,
  feedbackTexto,
  explicacao,
}) => {
  const respondida = !!resposta;
  const refs = useRef({});

  // Atalhos 1–5 → A–E (só quando ainda não respondeu)
  useEffect(() => {
    if (respondida) return;

    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const letra = NUMERO_PARA_LETRA[e.key];
      if (letra && (alternativas[letra] || imagensAlternativas[letra])) {
        e.preventDefault();
        onResponder(letra);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [respondida, alternativas, imagensAlternativas, onResponder]);

  const handleKeyDown = (e, letra) => {
    if (respondida) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onResponder(letra);
      return;
    }

    const visiveis = LETRAS.filter(l => alternativas[l] || imagensAlternativas[l]);
    const idx = visiveis.indexOf(letra);

    if (e.key === 'ArrowDown' && idx < visiveis.length - 1) {
      e.preventDefault();
      refs.current[visiveis[idx + 1]]?.focus();
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      refs.current[visiveis[idx - 1]]?.focus();
    }
  };

  const letrasVisiveis = LETRAS.filter(l => alternativas[l] || imagensAlternativas[l]);
  const letraParaNumero = Object.fromEntries(letrasVisiveis.map((l, i) => [l, i + 1]));

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Alternativas da questao"
        aria-disabled={respondida}
      >
        {LETRAS.map(letra => {
          const texto = alternativas[letra];
          const img   = imagensAlternativas[letra];
          if (!texto && !img) return null;

          const eGabarito    = letra === gabarito;
          const eSelecionada = letra === resposta;
          const numero       = letraParaNumero[letra];

          let extraClass = '';
          if (respondida) {
            if (eGabarito)         extraClass = 'correta';
            else if (eSelecionada) extraClass = 'errada';
          }

          let ariaLabel = 'Alternativa ' + letra + ': ' + (texto || '');
          if (respondida) {
            if (eGabarito)         ariaLabel += ' - resposta correta';
            else if (eSelecionada) ariaLabel += ' - sua resposta incorreta';
          }

          return (
            <div
              key={letra}
              ref={el => { refs.current[letra] = el; }}
              role="radio"
              aria-checked={eSelecionada}
              aria-label={ariaLabel}
              tabIndex={respondida ? -1 : 0}
              className={'alternativa ' + extraClass}
              onClick={() => !respondida && onResponder(letra)}
              onKeyDown={e => handleKeyDown(e, letra)}
              style={{ cursor: respondida ? 'default' : 'pointer' }}
            >
              <strong className="alt-letra">{letra})</strong>

              <div style={{ flex: 1 }}>
                {texto && <span className="alt-texto">{texto}</span>}
                {img && (
                  <img
                    src={img}
                    alt={'Imagem da alternativa ' + letra}
                    className="alt-img"
                  />
                )}
              </div>

              {!respondida && numero >= 1 && numero <= 5 && (
                <span style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  borderRadius: '5px',
                  background: 'var(--gray-100)',
                  border: '1px solid var(--gray-200)',
                  color: 'var(--gray-400)',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'monospace',
                  marginLeft: '8px',
                }}>
                  {numero}
                </span>
              )}

              {respondida && eGabarito    && <span aria-hidden="true">✅</span>}
              {respondida && eSelecionada && !eGabarito && <span aria-hidden="true">❌</span>}
            </div>
          );
        })}
      </div>

      {respondida && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: resposta === gabarito ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
            borderRadius: 'var(--r-md)',
            borderLeft: '3px solid ' + (resposta === gabarito ? 'var(--accent-green)' : 'var(--accent-red)'),
          }}
        >
          {feedbackTexto && (
            <p style={{
              fontWeight: 700,
              color: resposta === gabarito ? '#065f46' : '#991b1b',
              marginBottom: explicacao ? '6px' : 0,
            }}>
              {feedbackTexto}
            </p>
          )}
          {explicacao && (
            <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: '1.65', marginTop: '4px' }}>
              {explicacao}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Alternativas;
