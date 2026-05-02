// src/components/Metas.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import { useDark } from '../hooks/useDark';

const TIPOS_META = [
  { tipo: 'questoes_dia', label: 'Questões por dia',        icone: '📝', unidade: 'questões', sugestoes: [10, 20, 30, 50] },
  { tipo: 'taxa_acerto',  label: 'Taxa de acerto mínima',   icone: '🎯', unidade: '%',        sugestoes: [50, 60, 70, 80] },
  { tipo: 'streak',       label: 'Sequência de dias',       icone: '🔥', unidade: 'dias',     sugestoes: [7, 14, 30, 60] },
  { tipo: 'tempo_dia',    label: 'Tempo de estudo por dia', icone: '⏱️', unidade: 'min',      sugestoes: [15, 30, 60, 90] },
];

const getEmoji = pct => pct >= 100 ? '🏆' : pct >= 75 ? '🔥' : pct >= 50 ? '💪' : pct >= 25 ? '📈' : '🌱';
const getCorBarra = pct => pct >= 100 ? 'var(--gradient-green)' : pct >= 60 ? 'var(--gradient-amber)' : 'var(--gradient-brand)';

const Metas = () => {
  const [progresso, setProgresso] = useState([]);
  const [editando, setEditando]   = useState(null);
  const [valorNovo, setValor]     = useState('');
  const isDark = useDark();

  useEffect(() => { carregar(); }, []);

  const carregar = async () => setProgresso(await db.getProgressoMetas());

  const abrirEditar = (tipo) => {
    const existente = progresso.find(p => p.tipo === tipo.tipo);
    setEditando(tipo); setValor(existente?.valor || '');
  };

  const salvar = async () => {
    if (!valorNovo || Number(valorNovo) <= 0) { toast.error('Digite um valor válido'); return; }
    await db.salvarMeta({ tipo: editando.tipo, valor: Number(valorNovo), label: editando.label });
    toast.success('Meta salva!'); setEditando(null); setValor(''); carregar();
  };

  const deletar = async (tipo) => {
    const existente = progresso.find(p => p.tipo === tipo);
    if (!existente?.id) return;
    await db.metas.delete(existente.id);
    toast.success('Meta removida!'); carregar();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Metas</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            Defina objetivos e acompanhe seu progresso diário.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {TIPOS_META.map(tipo => {
          const p   = progresso.find(x => x.tipo === tipo.tipo);
          const pct = p?.percentual || 0;

          return (
            <div key={tipo.tipo} className="card" style={{ padding: '24px', background: isDark ? 'var(--surface-card)' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '28px' }}>{tipo.icone}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: isDark ? 'var(--gray-900)' : 'var(--gray-900)' }}>
                      {tipo.label}
                    </h3>
                    {p && <p style={{ color: 'var(--gray-400)', fontSize: '12px', marginTop: '2px' }}>Meta: {p.valor} {tipo.unidade}</p>}
                  </div>
                </div>
                {p && <span style={{ fontSize: '24px' }}>{getEmoji(pct)}</span>}
              </div>

              {p ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: isDark ? 'var(--gray-600)' : 'var(--gray-600)' }}>
                      Hoje: <strong>{p.atual} {tipo.unidade}</strong>
                    </span>
                    <span style={{ fontWeight: 700, color: pct >= 100 ? '#10b981' : 'var(--brand-500)' }}>{pct}%</span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: '14px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: getCorBarra(pct) }} />
                  </div>

                  {pct >= 100 && (
                    <div style={{
                      background: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5',
                      border: isDark ? '1px solid rgba(16,185,129,0.3)' : '1px solid #bbf7d0',
                      borderRadius: 'var(--r-md)', padding: '10px', textAlign: 'center', marginBottom: '14px',
                      fontSize: '13px', color: isDark ? '#6ee7b7' : '#065f46', fontWeight: 600,
                    }}>
                      🎉 Meta atingida hoje! Parabéns!
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => abrirEditar(tipo)}
                      style={{
                        flex: 1, padding: '8px',
                        border: isDark ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid var(--brand-200)',
                        borderRadius: 'var(--r-md)',
                        background: isDark ? 'rgba(99,102,241,0.12)' : 'var(--brand-50)',
                        color: isDark ? '#a5b4fc' : 'var(--brand-600)',
                        cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                      }}
                    >✏️ Editar</button>
                    <button
                      onClick={() => deletar(tipo.tipo)}
                      style={{
                        padding: '8px 12px',
                        border: isDark ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid #fecaca',
                        borderRadius: 'var(--r-md)',
                        background: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                        color: 'var(--accent-red)', cursor: 'pointer', fontSize: '13px',
                      }}
                    >🗑️</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
                    Nenhuma meta definida ainda.
                  </p>
                  <button className="btn-primary" onClick={() => abrirEditar(tipo)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                    + Definir Meta
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Dicas */}
      <div className="card" style={{
        background: isDark ? 'rgba(99,102,241,0.06)' : 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(79,70,229,0.07))',
        border: isDark ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(99,102,241,0.15)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--brand-600)', marginBottom: '14px' }}>
          💡 Dicas para alcançar suas metas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
          {[
            'Estude no mesmo horário todos os dias para criar o hábito',
            'Prefira sessões curtas e frequentes a maratonas esporádicas',
            'Revise as questões erradas antes de avançar para novos temas',
            'Use o Freestyle para aquecimento e Simulados para avaliação',
            'Acompanhe seu desempenho para identificar pontos fracos',
          ].map((dica, i) => (
            <div key={i} style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              padding: '10px 12px',
              background: isDark ? 'var(--surface-card)' : 'white',
              borderRadius: 'var(--r-md)',
              border: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
            }}>
              <span style={{ color: 'var(--brand-400)', fontWeight: 700, flexShrink: 0 }}>→</span>
              <span style={{ fontSize: '13px', color: isDark ? 'var(--gray-700)' : 'var(--gray-600)', lineHeight: '1.5' }}>{dica}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {editando && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: isDark ? 'var(--surface-card)' : 'white',
            color: isDark ? 'var(--gray-800)' : 'inherit',
            borderRadius: 'var(--r-2xl)', padding: '36px', width: '420px',
            boxShadow: 'var(--shadow-lg)',
            border: isDark ? '1px solid var(--gray-200)' : '1px solid var(--gray-100)',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px' }}>{editando.icone}</span>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: isDark ? 'var(--gray-900)' : 'var(--gray-900)' }}>{editando.label}</h3>
                <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Defina um valor em {editando.unidade}</p>
              </div>
            </div>

            <label className="field-label">Meta ({editando.unidade})</label>
            <input
              className="input-modern"
              type="number"
              value={valorNovo}
              onChange={e => setValor(e.target.value)}
              placeholder={`Ex: ${editando.sugestoes[1]}`}
              autoFocus
              style={{ marginBottom: '14px' }}
            />

            <p style={{ fontSize: '12px', color: 'var(--gray-400)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sugestões</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {editando.sugestoes.map(s => (
                <button key={s} onClick={() => setValor(String(s))} style={{
                  flex: 1, padding: '8px',
                  border: `1.5px solid ${String(valorNovo) === String(s) ? 'var(--brand-500)' : (isDark ? 'var(--gray-300)' : 'var(--gray-200)')}`,
                  borderRadius: 'var(--r-md)',
                  background: String(valorNovo) === String(s)
                    ? (isDark ? 'rgba(99,102,241,0.15)' : 'var(--brand-50)')
                    : (isDark ? 'var(--gray-100)' : 'white'),
                  color: String(valorNovo) === String(s)
                    ? (isDark ? '#a5b4fc' : 'var(--brand-600)')
                    : (isDark ? 'var(--gray-600)' : 'var(--gray-600)'),
                  cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.15s',
                }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => { setEditando(null); setValor(''); }} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={salvar} style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metas;