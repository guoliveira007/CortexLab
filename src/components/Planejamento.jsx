import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';

// 0=Seg … 6=Dom
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DIAS_SHORT  = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Mapeia getDay() (0=Dom…6=Sáb) → nosso índice (0=Seg…6=Dom)
const jsToDia = d => (d === 0 ? 6 : d - 1);
const diaHoje = jsToDia(new Date().getDay());

const CORES = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

const BLOCO_VAZIO = { dia: 0, materia: '', conteudo: '', horario: '', cor: CORES[0], concluido: false };

/* ─── Modal de adição/edição ─── */
const Modal = ({ bloco, onSalvar, onFechar, materias }) => {
  const [form, setForm] = useState(bloco);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        padding: '28px', width: '400px', maxWidth: '95vw',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>
            {form.id ? '✏️ Editar Bloco' : '➕ Novo Bloco'}
          </h3>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--gray-400)' }}>×</button>
        </div>

        {/* Dia */}
        <div style={{ marginBottom: '14px' }}>
          <label className="field-label">Dia da semana</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DIAS_SHORT.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setForm(f => ({ ...f, dia: i }))}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--r-md)', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: form.dia === i ? form.cor : 'var(--gray-100)',
                  color: form.dia === i ? 'white' : 'var(--gray-600)',
                  transition: 'all 0.15s',
                }}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* Matéria */}
        <div style={{ marginBottom: '14px' }}>
          <label className="field-label">Matéria *</label>
          <input
            className="input-modern"
            list="dl-materias-plan"
            value={form.materia}
            onChange={e => setForm(f => ({ ...f, materia: e.target.value }))}
            placeholder="Ex: Matemática"
          />
          <datalist id="dl-materias-plan">
            {materias.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        {/* Conteúdo */}
        <div style={{ marginBottom: '14px' }}>
          <label className="field-label">Conteúdo (opcional)</label>
          <input
            className="input-modern"
            value={form.conteudo}
            onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
            placeholder="Ex: Geometria Plana"
          />
        </div>

        {/* Horário */}
        <div style={{ marginBottom: '14px' }}>
          <label className="field-label">Horário (opcional)</label>
          <input
            className="input-modern"
            value={form.horario}
            onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
            placeholder="Ex: 08:00 – 10:00"
          />
        </div>

        {/* Cor */}
        <div style={{ marginBottom: '22px' }}>
          <label className="field-label">Cor</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {CORES.map(cor => (
              <button
                key={cor}
                type="button"
                onClick={() => setForm(f => ({ ...f, cor }))}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                  background: cor, cursor: 'pointer',
                  outline: form.cor === cor ? `3px solid ${cor}` : '3px solid transparent',
                  outlineOffset: '2px', transition: 'outline 0.15s',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onFechar} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!form.materia.trim()) { toast.error('Informe a matéria'); return; }
              onSalvar(form);
            }}
            style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Planejamento ─── */
const Planejamento = () => {
  const [blocos, setBlocos]     = useState([]);
  const [materias, setMaterias] = useState([]);
  const [modal, setModal]       = useState(null); // null | { bloco }

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const [bs, qs] = await Promise.all([
      db.planejamento.toArray(),
      db.questoes.toArray(),
    ]);
    setBlocos(bs);
    setMaterias([...new Set(qs.map(q => q.materia).filter(Boolean))].sort());
  };

  const salvar = async (form) => {
    if (form.id) {
      await db.planejamento.update(form.id, {
        dia: form.dia, materia: form.materia, conteudo: form.conteudo,
        horario: form.horario, cor: form.cor, concluido: form.concluido,
      });
    } else {
      await db.planejamento.add({
        dia: form.dia, materia: form.materia, conteudo: form.conteudo,
        horario: form.horario, cor: form.cor, concluido: false,
      });
    }
    toast.success(form.id ? 'Bloco atualizado!' : 'Bloco adicionado!');
    setModal(null);
    await carregar();
  };

  const excluir = async (id) => {
    await db.planejamento.delete(id);
    toast.success('Bloco removido!');
    await carregar();
  };

  const toggleConcluido = async (bloco) => {
    await db.planejamento.update(bloco.id, { concluido: !bloco.concluido });
    setBlocos(prev => prev.map(b => b.id === bloco.id ? { ...b, concluido: !b.concluido } : b));
  };

  const resetarSemana = async () => {
    if (!window.confirm('Desmarcar todos os blocos concluídos?')) return;
    const ids = blocos.filter(b => b.concluido).map(b => b.id);
    await Promise.all(ids.map(id => db.planejamento.update(id, { concluido: false })));
    await carregar();
    toast.success('Semana reiniciada!');
  };

  const totalConcluidos = blocos.filter(b => b.concluido).length;
  const totalBlocos = blocos.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Planejamento Semanal</h2>
          {totalBlocos > 0 && (
            <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
              {totalConcluidos}/{totalBlocos} concluídos esta semana
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {totalConcluidos > 0 && (
            <button className="btn-secondary" onClick={resetarSemana} style={{ fontSize: '13px' }}>
              🔄 Resetar semana
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => setModal({ bloco: { ...BLOCO_VAZIO, dia: diaHoje } })}
          >
            + Novo Bloco
          </button>
        </div>
      </div>

      {/* Barra de progresso semanal */}
      {totalBlocos > 0 && (
        <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Progresso da semana</span>
            <span style={{ color: 'var(--brand-600)', fontWeight: 700 }}>
              {Math.round((totalConcluidos / totalBlocos) * 100)}%
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(totalConcluidos / totalBlocos) * 100}%`,
                background: 'var(--gradient-green)',
              }}
            />
          </div>
        </div>
      )}

      {/* Grade semanal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '10px',
        overflowX: 'auto',
        minWidth: 0,
      }}>
        {DIAS_SEMANA.map((dia, diaIdx) => {
          const blocosDia = blocos
            .filter(b => b.dia === diaIdx)
            .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
          const isHoje = diaIdx === diaHoje;

          return (
            <div
              key={diaIdx}
              style={{
                background: isHoje ? 'rgba(99,102,241,0.04)' : 'white',
                borderRadius: 'var(--r-xl)',
                border: isHoje ? '2px solid var(--brand-300)' : '1.5px solid var(--gray-100)',
                padding: '14px 12px',
                minHeight: '180px',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}
            >
              {/* Header do dia */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '4px',
              }}>
                <div>
                  <p style={{
                    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: isHoje ? 'var(--brand-600)' : 'var(--gray-500)',
                  }}>
                    {DIAS_SHORT[diaIdx]}
                  </p>
                  {isHoje && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: 'white',
                      background: 'var(--brand-500)', padding: '1px 6px',
                      borderRadius: 'var(--r-full)', display: 'inline-block', marginTop: '2px',
                    }}>HOJE</span>
                  )}
                </div>
                <button
                  onClick={() => setModal({ bloco: { ...BLOCO_VAZIO, dia: diaIdx } })}
                  title="Adicionar bloco"
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: '1.5px dashed var(--gray-300)',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--gray-400)', fontSize: '16px', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}
                >+</button>
              </div>

              {/* Blocos do dia */}
              {blocosDia.map(bloco => (
                <div
                  key={bloco.id}
                  style={{
                    background: bloco.concluido ? 'var(--gray-50)' : `${bloco.cor}12`,
                    border: `1.5px solid ${bloco.concluido ? 'var(--gray-200)' : `${bloco.cor}44`}`,
                    borderLeft: `3px solid ${bloco.concluido ? 'var(--gray-300)' : bloco.cor}`,
                    borderRadius: 'var(--r-md)',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    opacity: bloco.concluido ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setModal({ bloco })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '12px', fontWeight: 700,
                        color: bloco.concluido ? 'var(--gray-400)' : 'var(--gray-800)',
                        textDecoration: bloco.concluido ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {bloco.materia}
                      </p>
                      {bloco.conteudo && (
                        <p style={{
                          fontSize: '11px', color: 'var(--gray-500)', marginTop: '1px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {bloco.conteudo}
                        </p>
                      )}
                      {bloco.horario && (
                        <p style={{ fontSize: '10px', color: bloco.cor, fontWeight: 600, marginTop: '3px' }}>
                          ⏰ {bloco.horario}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); toggleConcluido(bloco); }}
                        title={bloco.concluido ? 'Desmarcar' : 'Marcar como feito'}
                        style={{
                          width: '20px', height: '20px', borderRadius: '4px', border: 'none',
                          background: bloco.concluido ? '#10b981' : 'var(--gray-200)',
                          cursor: 'pointer', fontSize: '11px', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                      >✓</button>
                      <button
                        onClick={e => { e.stopPropagation(); excluir(bloco.id); }}
                        title="Excluir"
                        style={{
                          width: '20px', height: '20px', borderRadius: '4px', border: 'none',
                          background: '#fecaca', cursor: 'pointer', fontSize: '11px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                      >×</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Placeholder vazio */}
              {blocosDia.length === 0 && (
                <div
                  onClick={() => setModal({ bloco: { ...BLOCO_VAZIO, dia: diaIdx } })}
                  style={{
                    flex: 1, border: '1.5px dashed var(--gray-200)',
                    borderRadius: 'var(--r-md)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--gray-300)', fontSize: '12px',
                    padding: '12px', textAlign: 'center', minHeight: '60px',
                  }}
                >
                  Nenhum bloco
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state geral */}
      {blocos.length === 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p className="empty-state-title">Planejamento vazio</p>
            <p className="empty-state-desc">
              Adicione blocos de estudo para organizar sua semana.
            </p>
            <button
              className="btn-primary"
              onClick={() => setModal({ bloco: { ...BLOCO_VAZIO, dia: diaHoje } })}
            >
              + Adicionar primeiro bloco
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          bloco={modal.bloco}
          materias={materias}
          onSalvar={salvar}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default Planejamento;
