import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import { estadoInicial } from './sm2';
import ProgressBar from './ProgressBar'; // ✅ Componente reutilizável

/**
 * CadernoErros — Tela dedicada de erros + widget para Dashboard.
 *
 * Filtra db.resultados onde acertou === false e cruza com db.questoes.
 *
 * FIX: Agora exibe apenas questões cujo RESULTADO MAIS RECENTE foi errado,
 * evitando que questões já acertadas posteriormente permaneçam no caderno.
 * Também inclui botão "Remover do caderno" para remoção manual.
 *
 * Exports:
 *   default        — Tela completa do caderno de erros
 */

/* ─── Helpers ─── */
const formatarData = (dataStr) => {
  if (!dataStr) return '—';
  try {
    return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
};

/* ─── Tela principal ─── */
const CadernoErros = ({ onFechar }) => {
  const [questoesErradas, setQuestoesErradas] = useState([]);
  const [carregando, setCarregando]           = useState(true);
  const [filtroMateria, setFiltroMateria]     = useState('');
  const [filtroModo, setFiltroModo]           = useState('');
  const [materiasDisponiveis, setMaterias]    = useState([]);
  const [preview, setPreview]                 = useState(null);
  const [adicionandoSM2, setAdicionandoSM2]   = useState(new Set());
  const [removendo, setRemovendo]             = useState(new Set());
  const [pagina, setPagina]                   = useState(1);
  const POR_PAGINA = 15;

  useEffect(() => {
    carregarErros();
  }, []);

  const carregarErros = async () => {
    setCarregando(true);
    try {
      const todosResultados = await db.resultados.toArray();

      // FIX: determina o resultado mais recente de CADA questão (acertou ou não)
      const ultimoPorQuestao = {};
      todosResultados.forEach(r => {
        const id  = String(r.id_questao || r.questaoId || r.questao_id);
        if (!id) return;
        const data = r.data || r.criadoEm || r.created_at || '';
        if (!ultimoPorQuestao[id] || data > ultimoPorQuestao[id].data) {
          ultimoPorQuestao[id] = { ...r, data };
        }
      });

      // Agrupa apenas os resultados errados de questões cujo último resultado
      // também foi errado (se o aluno acertou depois, sai do caderno).
      const agrupado = {};
      todosResultados
        .filter(r => r.acertou === false || r.acertou === 0)
        .forEach(r => {
          const id = String(r.id_questao || r.questaoId || r.questao_id);
          if (!id) return;

          // FIX: ignora questões em que o resultado mais recente foi correto
          const ultimo = ultimoPorQuestao[id];
          if (ultimo && (ultimo.acertou === true || ultimo.acertou === 1)) return;

          if (!agrupado[id]) {
            agrupado[id] = {
              questaoId: id,
              totalErros: 0,
              ultimoErro: null,
              modos: new Set(),
              respostasErradas: [],
            };
          }
          agrupado[id].totalErros += 1;
          const data = r.data || r.criadoEm || r.created_at;
          if (!agrupado[id].ultimoErro || data > agrupado[id].ultimoErro) {
            agrupado[id].ultimoErro = data;
          }
          if (r.modo) agrupado[id].modos.add(r.modo);
          if (r.respostaUsuario || r.resposta_usuario) {
            agrupado[id].respostasErradas.push(r.respostaUsuario || r.resposta_usuario);
          }
        });

      // Busca os dados das questões
      const ids = Object.keys(agrupado).map(id => isNaN(id) ? id : Number(id));
      const questoes = await db.questoes.where('id').anyOf(ids).toArray();

      // Busca estados SM-2 existentes
      const sm2Estados = await db.revisaoEspacada
        .where('questaoId').anyOf(Object.keys(agrupado))
        .toArray();
      const sm2PorId = {};
      sm2Estados.forEach(e => { sm2PorId[e.questaoId] = e; });

      // Mescla tudo
      const resultado = questoes.map(q => {
        const idStr = String(q.id);
        const meta  = agrupado[idStr] || agrupado[q.id] || {};
        return {
          ...q,
          meta: {
            ...meta,
            modos: meta.modos ? [...meta.modos] : [],
          },
          emRevisao: !!sm2PorId[idStr],
        };
      }).sort((a, b) => {
        const da = a.meta.ultimoErro || '';
        const db_ = b.meta.ultimoErro || '';
        return db_ > da ? 1 : -1;
      });

      const materias = [...new Set(resultado.map(q => q.materia).filter(Boolean))].sort();
      setMaterias(materias);
      setQuestoesErradas(resultado);
    } catch (err) {
      console.error('Erro ao carregar caderno:', err);
      toast.error('Erro ao carregar caderno de erros.');
    } finally {
      setCarregando(false);
    }
  };

  /* ── Adiciona questão à revisão espaçada ── */
  const adicionarRevisao = async (questao) => {
    const idStr = String(questao.id);
    setAdicionandoSM2(prev => new Set([...prev, idStr]));
    try {
      const estado = estadoInicial(idStr);
      await db.revisaoEspacada.put(estado);
      toast.success('Adicionada à Revisão Espaçada! 🧠');
      setQuestoesErradas(prev => prev.map(q =>
        String(q.id) === idStr ? { ...q, emRevisao: true } : q
      ));
    } catch {
      toast.error('Erro ao adicionar à revisão.');
    } finally {
      setAdicionandoSM2(prev => { const next = new Set(prev); next.delete(idStr); return next; });
    }
  };

  /* ── FIX: Remove questão do caderno apagando seus resultados errados ── */
  const removerDoCaderno = async (questaoId) => {
    const idStr = String(questaoId);
    setRemovendo(prev => new Set([...prev, idStr]));
    try {
      const todos = await db.resultados.toArray();
      const idsParaDeletar = todos
        .filter(r => {
          const id = String(r.id_questao || r.questaoId || r.questao_id);
          return id === idStr && (r.acertou === false || r.acertou === 0);
        })
        .map(r => r.id)
        .filter(Boolean);

      await Promise.all(idsParaDeletar.map(id => db.resultados.delete(id)));
      setQuestoesErradas(prev => prev.filter(q => String(q.id) !== idStr));
      toast.success('Removida do caderno de erros.');
    } catch {
      toast.error('Erro ao remover do caderno.');
    } finally {
      setRemovendo(prev => { const next = new Set(prev); next.delete(idStr); return next; });
    }
  };

  /* ── Filtragem ── */
  const questoesFiltradas = useMemo(() =>
    questoesErradas.filter(q => {
      if (filtroMateria && q.materia !== filtroMateria) return false;
      if (filtroModo && !q.meta.modos?.includes(filtroModo)) return false;
      return true;
    }),
  [questoesErradas, filtroMateria, filtroModo]);

  // Reset explícito de página quando filtros mudam — mantido fora do useMemo
  // para evitar efeito colateral dentro de função pura.
  useEffect(() => { setPagina(1); }, [filtroMateria, filtroModo]);

  const totalPaginas     = Math.ceil(questoesFiltradas.length / POR_PAGINA);
  const questoesPaginadas = questoesFiltradas.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  /* ─── Render ─── */
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        width: '100%', maxWidth: '900px', maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        border: '1px solid var(--gray-100)',
      }}>

        {/* Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #fef2f2 0%, white 50%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--r-lg)',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
            }}>📓</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Caderno de Erros
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '1px' }}>
                {questoesFiltradas.length} questão(ões)
                {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
                {' '}— clique em 🧠 para adicionar à revisão espaçada
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--gray-400)' }}
          >×</button>
        </div>

        {/* Filtros */}
        <div style={{
          padding: '12px 28px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', gap: '10px', flexShrink: 0, background: 'var(--gray-50)',
          flexWrap: 'wrap',
        }}>
          <select
            value={filtroMateria}
            onChange={e => setFiltroMateria(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--gray-200)', background: 'white',
              fontSize: '13px', color: 'var(--gray-700)', cursor: 'pointer',
            }}
          >
            <option value="">Todas as matérias</option>
            {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filtroModo}
            onChange={e => setFiltroModo(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--gray-200)', background: 'white',
              fontSize: '13px', color: 'var(--gray-700)', cursor: 'pointer',
            }}
          >
            <option value="">Todos os modos</option>
            <option value="freestyle">Freestyle</option>
            <option value="lista">Lista</option>
            <option value="simulado">Simulado</option>
          </select>

          {(filtroMateria || filtroModo) && (
            <button
              onClick={() => { setFiltroMateria(''); setFiltroModo(''); }}
              style={{
                padding: '6px 12px', background: 'white',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--r-md)',
                fontSize: '12px', color: 'var(--gray-500)', cursor: 'pointer',
              }}
            >✕ Limpar filtros</button>
          )}
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 28px' }}>

          {carregando && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: 'var(--gray-400)' }}>Carregando erros...</p>
            </div>
          )}

          {!carregando && questoesFiltradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 32px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--gray-700)', marginBottom: '8px' }}>
                {questoesErradas.length === 0 ? 'Nenhum erro registrado ainda!' : 'Nenhuma questão com esse filtro'}
              </h3>
              <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>
                {questoesErradas.length === 0
                  ? 'Seus erros de Freestyle, Lista e Simulado aparecerão aqui.'
                  : 'Tente ajustar os filtros acima.'}
              </p>
            </div>
          )}

          {!carregando && questoesFiltradas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questoesPaginadas.map(q => {
                const idStr     = String(q.id);
                const taxaErro  = q.meta.totalErros;
                const adicionando = adicionandoSM2.has(idStr);
                const removendoQ  = removendo.has(idStr);

                return (
                  <div
                    key={q.id}
                    style={{
                      background: 'white', border: '1.5px solid var(--gray-100)',
                      borderRadius: 'var(--r-lg)', padding: '16px',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {/* Indicador de erros */}
                      <div style={{
                        flexShrink: 0, width: '44px', height: '44px',
                        background: '#fef2f2', border: '2px solid #fecaca',
                        borderRadius: 'var(--r-md)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: '#dc2626', lineHeight: 1 }}>
                          {taxaErro}
                        </span>
                        <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>erro{taxaErro !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Conteúdo */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          {[q.banca, q.ano, q.materia, q.topico].filter(Boolean).map((v, i) => (
                            <span key={i} style={{
                              background: 'var(--brand-50)', color: 'var(--brand-600)',
                              borderRadius: '99px', padding: '1px 8px',
                              fontSize: '10px', fontWeight: 600, border: '1px solid var(--brand-200)',
                            }}>{v}</span>
                          ))}
                          {q.meta.modos?.map(m => (
                            <span key={m} style={{
                              background: 'var(--gray-100)', color: 'var(--gray-500)',
                              borderRadius: '99px', padding: '1px 8px',
                              fontSize: '10px', fontWeight: 600,
                            }}>{m}</span>
                          ))}
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--gray-400)' }}>
                            Último erro: {formatarData(q.meta.ultimoErro)}
                          </span>
                        </div>

                        {/* Enunciado resumido */}
                        <p style={{
                          fontSize: '13px', color: 'var(--gray-700)',
                          lineHeight: '1.5', marginBottom: '10px',
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {q.enunciado || q.comando || 'Questão sem enunciado'}
                        </p>

                        {/* Barra de frequência de erros (substituída por ProgressBar) */}
                        <div style={{ marginBottom: '10px' }}>
                          <ProgressBar valor={Math.min(taxaErro * 20, 100)} cor='#ef4444' />
                        </div>

                        {/* Ações */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setPreview(q)}
                            style={{
                              padding: '5px 12px', background: 'var(--gray-50)',
                              border: '1px solid var(--gray-200)', borderRadius: 'var(--r-md)',
                              fontSize: '12px', color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500,
                            }}
                          >👁 Ver questão</button>

                          {!q.emRevisao ? (
                            <button
                              onClick={() => adicionarRevisao(q)}
                              disabled={adicionando}
                              style={{
                                padding: '5px 12px',
                                background: 'linear-gradient(135deg, var(--brand-50), #eef2ff)',
                                border: '1px solid var(--brand-200)', borderRadius: 'var(--r-md)',
                                fontSize: '12px', color: 'var(--brand-600)',
                                cursor: adicionando ? 'wait' : 'pointer', fontWeight: 600,
                              }}
                            >{adicionando ? '...' : '🧠 Adicionar à Revisão Espaçada'}</button>
                          ) : (
                            <span style={{
                              padding: '5px 12px', background: '#f0fdf4',
                              border: '1px solid #bbf7d0', borderRadius: 'var(--r-md)',
                              fontSize: '12px', color: '#059669', fontWeight: 600,
                            }}>✓ Na Revisão Espaçada</span>
                          )}

                          {/* FIX: botão para remover do caderno manualmente */}
                          <button
                            onClick={() => removerDoCaderno(q.id)}
                            disabled={removendoQ}
                            title="Remove esta questão do caderno de erros"
                            style={{
                              padding: '5px 12px', background: '#fef2f2',
                              border: '1px solid #fecaca', borderRadius: 'var(--r-md)',
                              fontSize: '12px', color: '#dc2626',
                              cursor: removendoQ ? 'wait' : 'pointer', fontWeight: 600,
                              marginLeft: 'auto',
                            }}
                          >{removendoQ ? '...' : '🗑️ Remover'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── Paginação ── */}
              {totalPaginas > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  gap: '8px', paddingTop: '12px',
                }}>
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--r-md)',
                      border: '1px solid var(--gray-200)', background: 'white',
                      fontSize: '13px', cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                      color: pagina === 1 ? 'var(--gray-300)' : 'var(--gray-700)',
                    }}
                  >← Anterior</button>

                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPagina(n)}
                      style={{
                        width: '34px', height: '34px', borderRadius: 'var(--r-md)',
                        border: `1.5px solid ${n === pagina ? 'var(--brand-400)' : 'var(--gray-200)'}`,
                        background: n === pagina ? 'var(--brand-50)' : 'white',
                        color: n === pagina ? 'var(--brand-700)' : 'var(--gray-600)',
                        fontSize: '13px', fontWeight: n === pagina ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    >{n}</button>
                  ))}

                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--r-md)',
                      border: '1px solid var(--gray-200)', background: 'white',
                      fontSize: '13px', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                      color: pagina === totalPaginas ? 'var(--gray-300)' : 'var(--gray-700)',
                    }}
                  >Próxima →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de preview (inalterado) */}
      {preview && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(15,23,42,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreview(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: 'var(--r-2xl)',
              width: '100%', maxWidth: '640px', maxHeight: '85vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>
                Questão {preview.numero || preview.id}
              </h4>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
              {preview.enunciado && (
                <p style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.7', marginBottom: '12px' }}>
                  {preview.enunciado}
                </p>
              )}
              {preview.comando && (
                <div style={{
                  background: '#fffbeb', borderLeft: '3px solid #f59e0b',
                  padding: '10px 14px', borderRadius: '0 var(--r-md) var(--r-md) 0',
                  marginBottom: '16px', fontSize: '13px', color: '#92400e', fontWeight: 500,
                }}>
                  {preview.comando}
                </div>
              )}

              {['A','B','C','D','E'].map(lt => {
                const txt = preview.alternativas?.[lt];
                if (!txt) return null;
                const correta = lt === preview.gabarito?.toUpperCase();
                return (
                  <div key={lt} style={{
                    display: 'flex', gap: '10px', padding: '9px 12px',
                    borderRadius: 'var(--r-md)', marginBottom: '6px',
                    background: correta ? 'rgba(16,185,129,0.08)' : 'var(--gray-50)',
                    border: `1.5px solid ${correta ? '#6ee7b7' : 'var(--gray-100)'}`,
                    fontSize: '13px',
                  }}>
                    <strong style={{ color: correta ? '#065f46' : 'var(--gray-600)', flexShrink: 0 }}>{lt})</strong>
                    <span style={{ color: 'var(--gray-700)', flex: 1, lineHeight: '1.6' }}>{txt}</span>
                    {correta && <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>✓</span>}
                  </div>
                );
              })}

              {preview.explicacao && (
                <div style={{
                  marginTop: '12px', background: 'var(--gray-50)',
                  borderRadius: 'var(--r-md)', padding: '12px 14px',
                  borderLeft: '3px solid var(--brand-300)',
                  fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6',
                }}>
                  <strong style={{ color: 'var(--brand-600)', display: 'block', marginBottom: '4px' }}>💡 Explicação</strong>
                  {preview.explicacao}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadernoErros;