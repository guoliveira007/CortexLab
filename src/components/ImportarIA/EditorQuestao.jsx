import React, { useState, useEffect } from 'react';

const EditorQuestao = ({ questao, onChange, onFechar }) => {
  const [local, setLocal] = useState({ ...questao });
  const set    = (campo, valor) => setLocal(q => ({ ...q, [campo]: valor }));
  const setAlt = (lt, valor)   => setLocal(q => ({ ...q, alternativas: { ...q.alternativas, [lt]: valor } }));

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onFechar]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onFechar}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        width: '100%', maxWidth: '680px', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--gray-50)', flexShrink: 0,
        }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>
            ✏️ Editar Questão {local.numero}
          </h4>
          <button onClick={onFechar} title="Fechar (Esc)" style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {/* Metadados */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {[{ label: 'Matéria', campo: 'materia' }, { label: 'Conteúdo', campo: 'conteudo' }, { label: 'Tópico', campo: 'topico' }].map(({ label, campo }) => (
              <div key={campo}>
                <label className="field-label">{label}</label>
                <input className="input-modern" value={local[campo] || ''} style={{ marginBottom: 0 }}
                  onChange={e => set(campo, e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="field-label">Banca</label>
              <input className="input-modern" value={local.banca || ''} style={{ marginBottom: 0 }}
                onChange={e => set('banca', e.target.value)} placeholder="Ex: FUVEST" />
            </div>
            <div>
              <label className="field-label">Ano</label>
              <input className="input-modern" value={local.ano || ''} style={{ marginBottom: 0 }}
                onChange={e => set('ano', e.target.value)} type="number" placeholder="Ex: 2026" />
            </div>
          </div>

          {/* Toggle imagem */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
            background: local.tem_imagem ? '#fffbeb' : 'var(--gray-50)',
            borderRadius: 'var(--r-md)',
            border: `1px solid ${local.tem_imagem ? '#fde68a' : 'var(--gray-200)'}`,
            marginBottom: '12px',
          }}>
            <input type="checkbox" id="temImg" checked={local.tem_imagem || false}
              onChange={e => set('tem_imagem', e.target.checked)} />
            <label htmlFor="temImg" style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
              🖼️ Esta questão possui imagem / gráfico / tabela que precisa ser adicionada manualmente
            </label>
          </div>
          {local.tem_imagem && (
            <>
              <label className="field-label">Descrição da imagem</label>
              <input className="input-modern" value={local.descricao_imagem || ''}
                onChange={e => set('descricao_imagem', e.target.value)}
                placeholder="Ex: Gráfico de barras comparando o PIB de 5 países em 2023"
                style={{ marginBottom: '12px' }} />
            </>
          )}

          {/* Enunciado */}
          <label className="field-label">Enunciado (texto de contexto)</label>
          <textarea className="input-modern" rows={3} style={{ resize: 'vertical', marginBottom: '12px' }}
            value={local.enunciado || ''} onChange={e => set('enunciado', e.target.value)} />

          {/* Comando */}
          <label className="field-label">Comando (pergunta principal)</label>
          <textarea className="input-modern" rows={2} style={{ resize: 'vertical', marginBottom: '12px' }}
            value={local.comando || ''} onChange={e => set('comando', e.target.value)} />

          {/* Alternativas */}
          <label className="field-label">
            Alternativas
            <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: '6px' }}>
              · clique na letra para definir o gabarito {local.gabarito && <span style={{ color: '#10b981', fontWeight: 600 }}>({local.gabarito})</span>}
            </span>
          </label>
          {['A', 'B', 'C', 'D', 'E'].map(lt => (
            <div key={lt} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span onClick={() => set('gabarito', lt)} title="Definir como gabarito" style={{
                width: '30px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: local.gabarito === lt ? '#10b981' : 'var(--gray-100)',
                color: local.gabarito === lt ? 'white' : 'var(--gray-500)',
                borderRadius: 'var(--r-sm)', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
              }}>{lt}</span>
              <input className="input-modern" style={{ marginBottom: 0, flex: 1 }}
                value={local.alternativas?.[lt] || ''}
                onChange={e => setAlt(lt, e.target.value)}
                placeholder={`Alternativa ${lt}`} />
            </div>
          ))}

          {/* Explicação */}
          <label className="field-label" style={{ marginTop: '8px' }}>Explicação (opcional)</label>
          <textarea className="input-modern" rows={2} style={{ resize: 'vertical' }}
            value={local.explicacao || ''} onChange={e => set('explicacao', e.target.value)}
            placeholder="Resolução ou comentário, se disponível..." />
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          background: 'var(--gray-50)', flexShrink: 0,
        }}>
          <button className="btn-secondary" onClick={onFechar} style={{ padding: '9px 18px' }}>Cancelar</button>
          <button className="btn-primary" onClick={() => { onChange(local); onFechar(); }} style={{ padding: '9px 22px' }}>
            💾 Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorQuestao;