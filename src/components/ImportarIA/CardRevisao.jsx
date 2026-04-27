import React from 'react';

const CardRevisao = ({ questao, selecionada, duplicata, onToggle, onEditar, onRemover }) => (
  <div style={{
    background: 'white',
    border: `2px solid ${duplicata ? '#fca5a5' : selecionada ? 'var(--brand-300)' : 'var(--gray-150, #e8eaf0)'}`,
    borderRadius: 'var(--r-xl)', padding: '14px 18px', marginBottom: '10px',
    boxShadow: selecionada ? '0 0 0 3px rgba(99,102,241,0.08)' : 'var(--shadow-sm)',
    transition: 'border-color 0.15s',
  }}>
    {duplicata && (
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 'var(--r-md)', padding: '6px 10px',
        fontSize: '12px', color: '#991b1b', fontWeight: 600, marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        ⚠️ Provável duplicata — questão com enunciado similar já existe no banco.
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <input type="checkbox" checked={selecionada} onChange={onToggle}
        style={{ width: '16px', height: '16px', marginTop: '3px', cursor: 'pointer', flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Cabeçalho com tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{
            background: 'var(--gradient-brand)', color: 'white',
            borderRadius: 'var(--r-sm)', padding: '2px 10px',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px',
          }}>Q{questao.numero}</span>

          {questao.materia && (
            <span style={{
              background: 'var(--brand-50)', color: 'var(--brand-600)',
              border: '1px solid var(--brand-100)', borderRadius: 'var(--r-full)',
              fontSize: '11px', fontWeight: 600, padding: '2px 8px',
            }}>{questao.materia}</span>
          )}

          {questao._modoExtracao === 'ocr' && (
            <span style={{
              background: '#eff6ff', color: '#1d4ed8',
              border: '1px solid #bfdbfe', borderRadius: 'var(--r-full)',
              fontSize: '11px', fontWeight: 600, padding: '2px 8px',
            }}>🔍 OCR</span>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexShrink: 0 }}>
            {questao.tem_imagem && (
              <span style={{
                background: '#fffbeb', color: '#92400e',
                border: '1px solid #fde68a', borderRadius: 'var(--r-full)',
                fontSize: '11px', fontWeight: 700, padding: '2px 8px',
              }}>🖼️ imagem</span>
            )}
            {!questao.gabarito ? (
              <span style={{
                background: '#fef2f2', color: '#991b1b',
                border: '1px solid #fecaca', borderRadius: 'var(--r-full)',
                fontSize: '11px', fontWeight: 700, padding: '2px 8px',
              }}>⚠️ sem gabarito</span>
            ) : (
              <span style={{
                background: '#f0fdf4', color: '#166534',
                border: '1px solid #bbf7d0', borderRadius: 'var(--r-full)',
                fontSize: '11px', fontWeight: 700, padding: '2px 8px',
              }}>✓ {questao.gabarito}</span>
            )}
          </div>
        </div>

        {/* Texto da questão */}
        {questao.enunciado && (
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', lineHeight: '1.6', marginBottom: '4px' }}>
            {questao.enunciado.length > 100 ? questao.enunciado.slice(0, 100) + '…' : questao.enunciado}
          </p>
        )}
        <p style={{ fontSize: '13px', color: 'var(--gray-700)', fontWeight: 500, lineHeight: '1.6', marginBottom: '8px' }}>
          {questao.comando?.length > 140 ? questao.comando.slice(0, 140) + '…' : questao.comando}
        </p>

        {/* Descrição da imagem */}
        {questao.tem_imagem && questao.descricao_imagem && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 'var(--r-sm)', padding: '4px 10px',
            fontSize: '11px', color: '#92400e', marginBottom: '8px',
          }}>
            📌 {questao.descricao_imagem}
          </div>
        )}

        {/* Alternativas resumidas */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['A', 'B', 'C', 'D', 'E'].map(lt => {
            const txt = questao.alternativas?.[lt];
            if (!txt) return null;
            const isGab = questao.gabarito === lt;
            return (
              <span key={lt} style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--r-sm)',
                background: isGab ? '#f0fdf4' : 'var(--gray-50)',
                color: isGab ? '#166534' : 'var(--gray-500)',
                border: `1px solid ${isGab ? '#bbf7d0' : 'var(--gray-200)'}`,
                fontWeight: isGab ? 700 : 400,
              }}>
                {lt}) {txt.slice(0, 28)}{txt.length > 28 ? '…' : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>

    {/* Botões de ação */}
    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--gray-100)' }}>
      <button onClick={onEditar} style={{
        background: 'var(--brand-50)', border: '1px solid var(--brand-100)',
        borderRadius: 'var(--r-md)', padding: '5px 12px',
        fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)', cursor: 'pointer',
      }}>✏️ Editar</button>
      <button onClick={onRemover} style={{
        background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 'var(--r-md)', padding: '5px 12px',
        fontSize: '12px', fontWeight: 600, color: '#991b1b', cursor: 'pointer',
      }}>🗑️ Remover</button>
    </div>
  </div>
);

export default CardRevisao;