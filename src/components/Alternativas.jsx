/**
 * Alternativas.jsx — fix #1: Acessibilidade
 *
 * Componente extraído para reutilização em Freestyle, Lista e RevisaoEspacada.
 *
 * MELHORIAS:
 * - role="radiogroup" / role="radio" para leitores de tela
 * - aria-checked para estado selecionado
 * - aria-disabled quando já respondida
 * - Navegação por teclado: setas ↑↓ movem entre alternativas, Enter/Espaço seleciona
 * - aria-label descritivo em cada opção
 * - aria-live="polite" no feedback para anunciar resultado
 */
import React, { useRef } from 'react';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/**
 * @param {Object}   props
 * @param {Object}   props.alternativas         - { A: '...', B: '...', ... }
 * @param {Object}   [props.imagensAlternativas] - { A: url, ... }
 * @param {string}   props.gabarito             - 'A' | 'B' | ...
 * @param {string}   [props.resposta]           - letra respondida pelo usuário (null = não respondida)
 * @param {Function} props.onResponder          - (letra: string) => void
 * @param {string}   [props.feedbackTexto]      - texto de acerto/erro opcional
 * @param {string}   [props.explicacao]         - explicação após responder
 */
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

  const handleKeyDown = (e, letra) => {
    if (respondida) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onResponder(letra);
      return;
    }

    // Navegação entre alternativas com setas
    const visíveis = LETRAS.filter(l => alternativas[l]);
    const idx = visíveis.indexOf(letra);

    if (e.key === 'ArrowDown' && idx < visíveis.length - 1) {
      e.preventDefault();
      refs.current[visíveis[idx + 1]]?.focus();
    }
    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      refs.current[visíveis[idx - 1]]?.focus();
    }
  };

  return (
    <div>
      {/* Alternativas */}
      <div
        role="radiogroup"
        aria-label="Alternativas da questão"
        aria-disabled={respondida}
      >
        {LETRAS.map(letra => {
          const texto = alternativas[letra];
          const img   = imagensAlternativas[letra];
          if (!texto && !img) return null;

          const eGabarito   = letra === gabarito;
          const eSelecionada = letra === resposta;

          // Classes e estilos visuais
          let extraClass = '';
          if (respondida) {
            if (eGabarito)        extraClass = 'correta';
            else if (eSelecionada) extraClass = 'errada';
          }

          // Aria-label descritivo
          let ariaLabel = `Alternativa ${letra}: ${texto || ''}`;
          if (respondida) {
            if (eGabarito)        ariaLabel += ' — resposta correta';
            else if (eSelecionada) ariaLabel += ' — sua resposta incorreta';
          }

          return (
            <div
              key={letra}
              ref={el => { refs.current[letra] = el; }}
              role="radio"
              aria-checked={eSelecionada}
              aria-label={ariaLabel}
              tabIndex={respondida ? -1 : 0}
              className={`alternativa ${extraClass}`}
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
                    alt={`Imagem da alternativa ${letra}`}
                    className="alt-img"
                  />
                )}
              </div>
              {respondida && eGabarito   && <span aria-hidden="true">✅</span>}
              {respondida && eSelecionada && !eGabarito && <span aria-hidden="true">❌</span>}
            </div>
          );
        })}
      </div>

      {/* Feedback — aria-live anuncia o resultado para leitores de tela */}
      {respondida && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '16px', padding: '14px 18px',
            background: resposta === gabarito ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
            borderRadius: 'var(--r-md)',
            borderLeft: `3px solid ${resposta === gabarito ? 'var(--accent-green)' : 'var(--accent-red)'}`,
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
