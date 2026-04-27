import React from 'react';

const StepSucesso = ({ total, comImagem, onNovo }) => (
  <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', padding: '48px 0' }}>
    <div style={{ fontSize: '72px', marginBottom: '20px' }}>🎉</div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
      Importação concluída!
    </h2>
    <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '28px' }}>
      {total} questões salvas no banco com sucesso.
    </p>
    {comImagem > 0 && (
      <div style={{
        background: '#fffbeb', border: '1.5px solid #fde68a',
        borderRadius: 'var(--r-xl)', padding: '18px 22px', textAlign: 'left', marginBottom: '28px',
      }}>
        <p style={{ fontWeight: 700, color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>
          🖼️ {comImagem} questão(ões) precisam de imagem
        </p>
        <p style={{ fontSize: '13px', color: '#b45309', lineHeight: '1.6' }}>
          Acesse o <strong>Banco de Questões</strong> e adicione as figuras nas questões marcadas com 🖼️.
          Elas já estão no banco e funcionando — só faltam as imagens para ficarem completas.
        </p>
      </div>
    )}
    <button className="btn-primary" onClick={onNovo} style={{ padding: '12px 32px', fontSize: '14px' }}>
      ➕ Importar outra prova
    </button>
  </div>
);

export default StepSucesso;