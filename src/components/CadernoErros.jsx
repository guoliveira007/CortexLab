import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { db } from '../database';
import { estadoInicial } from './sm2';
import ProgressBar from './ProgressBar';

/**
 * CadernoErros — Tela dedicada de erros + widget para Dashboard.
 *
 * MELHORIA DE PERFORMANCE: A lista de questões agora usa react-window
 * (FixedSizeList) para renderizar apenas os itens visíveis na tela.
 * Com centenas/milhares de questões, a UI permanece fluida.
 *
 * Filtra db.resultados onde acertou === false e cruza com db.questoes.
 *
 * FIX: Agora exibe apenas questões cujo RESULTADO MAIS RECENTE foi errado,
 * evitando que questões já acertadas posteriormente permaneçam no caderno.
 * Também inclui botão "Remover do caderno" para remoção manual.
 */

/* ─── Helpers ─── */
const formatarData = (dataStr) => {
  if (!dataStr) return '—';
  try {
    return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
};

// Altura fixa de cada item da lista virtualizada (em px).
// Deve ser a altura máxima que um card pode ocupar.
const ITEM_HEIGHT = 170;

/* ─── Card de questão — componente separado e memoizado ─── */
// Recebe todos os dados via props para que react-window possa renderizá-lo
// sem fechar sobre o estado do pai, evitando re-renders desnecessários.
const CardQuestao = React.memo(({ questao, adicionandoSM2, removendo, onAdicionarRevisao, onRemover, onPreview }) => {
  const q         = questao;
  const idStr     = String(q.id);
  const taxaErro  = q.meta.totalErros;
  const adicionando = adicionandoSM2.has(idStr);
  const removendoQ  = removendo.has(idStr);

  return (
    <div
      style={{
        background: 'white', border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--r-lg)', padding: '16px',
        transition: 'box-shadow 0.15s',
        boxSizing: 'border-box',
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

          {/* Barra de frequência de erros */}
          <div style={{ marginBottom: '10px' }}>
            <ProgressBar valor={Math.min(taxaErro * 20, 100)} cor='#ef4444' />
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onPreview(q)}
              style={{
                padding: '5px 12px', background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--r-md)',
                fontSize: '12px', color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 500,
              }}
            >👁 Ver questão</button>

            {!q.emRevisao ? (
              <button
                onClick={() => onAdicionarRevisao(q)}
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

            <button
              onClick={() => onRemover(q.id)}
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
});
CardQuestao.displayName = 'CardQuestao';

/* ─── Tela principal ─── */
const CadernoErros = ({ onFechar }) => {
  const [questoesErradas, setQuestoesErradas] = useState([]);
  const [carregando, setCarregando]           = useState(true);
  const [filtroMateria, setFiltroMateria]     = useState('');
  const [filtroModo, setFiltroModo]           = useState('');
  const [ordenacao, setOrdenacao]             = useState('recente'); // 'recente' | 'erros' | 'materia'
  const [filtroPeriodo, setFiltroPeriodo]     = useState('');        // '' | '7' | '30'
  const [materiasDisponiveis, setMaterias]    = useState([]);
  const [preview, setPreview]                 = useState(null);
  const [adicionandoSM2, setAdicionandoSM2]   = useState(new Set());
  const [removendo, setRemovendo]             = useState(new Set());

  useEffect(() => {
    carregarErros();
  }, []);

  const carregarErros = async () => {
    setCarregando(true);
    try {
      const todosResultados = await db.resultados.toArray();

      const ultimoPorQuestao = {};
      todosResultados.forEach(r => {
        const id  = String(r.questaoId || r.id_questao || '');
        if (!id) return;
        const data = r.data || '';
        if (!ultimoPorQuestao[id] || data > ultimoPorQuestao[id].data) {
          ultimoPorQuestao[id] = { ...r, data };
        }
      });

      const agrupado = {};
      todosResultados
        .filter(r => r.acertou === false || r.acertou === 0)
        .forEach(r => {
          const id = String(r.questaoId || r.id_questao || '');
          if (!id) return;

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
          const data = r.data || '';
          if (!agrupado[id].ultimoErro || data > agrupado[id].ultimoErro) {
            agrupado[id].ultimoErro = data;
          }
          if (r.modo) agrupado[id].modos.add(r.modo);
          if (r.respostaUsuario) {
            agrupado[id].respostasErradas.push(r.respostaUsuario);
          }
        });

      // Busca os dados das questões
      const ids = new Set(Object.keys(agrupado).map(id => isNaN(id) ? id : Number(id)));
      const todasQuestoes = await db.questoes.toArray();
      const questoes = todasQuestoes.filter(q => ids.has(q.id) || ids.has(String(q.id)));

      // Busca estados SM-2 existentes
      const idsAgrupado = new Set(Object.keys(agrupado));
      const todasRevisoes = await db.revisaoEspacada.toArray();
      const sm2Estados = todasRevisoes.filter(e => idsAgrupado.has(String(e.questaoId)));
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
  const adicionarRevisao = useCallback(async (questao) => {
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
  }, []);

  /* ── FIX: Remove questão do caderno apagando seus resultados errados ── */
  const removerDoCaderno = useCallback(async (questaoId) => {
    const idStr = String(questaoId);
    setRemovendo(prev => new Set([...prev, idStr]));
    try {
      const todos = await db.resultados.toArray();
      const idsParaDeletar = todos
        .filter(r => {
          const id = String(r.questaoId || r.id_questao || '');
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
  }, []);

  const abrirPreview = useCallback((q) => setPreview(q), []);

  /* ── Filtragem ── */
  const questoesFiltradas = useMemo(() => {
    const corte = filtroPeriodo
      ? new Date(Date.now() - Number(filtroPeriodo) * 86_400_000)
      : null;

    return questoesErradas
      .filter(q => {
        if (filtroMateria && q.materia !== filtroMateria) return false;
        if (filtroModo && !q.meta.modos?.includes(filtroModo)) return false;
        if (corte && (!q.meta.ultimoErro || new Date(q.meta.ultimoErro) < corte)) return false;
        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'erros')   return (b.meta.totalErros ?? 0) - (a.meta.totalErros ?? 0);
        if (ordenacao === 'materia') return (a.materia ?? '').localeCompare(b.materia ?? '');
        // 'recente' — padrão
        return (b.meta.ultimoErro ?? '') > (a.meta.ultimoErro ?? '') ? 1 : -1;
      });
  }, [questoesErradas, filtroMateria, filtroModo, filtroPeriodo, ordenacao]);

  /* ── Row renderer para react-window ── */
  // É CRÍTICO que essa função seja estável — envolve em useCallback
  // e recebe os dados necessários via itemData (evita closure stale).
  const RowRenderer = useCallback(({ index, style, data }) => {
    const { itens, adicionandoSM2: sm2Set, removendo: remSet, onAdicionar, onRemover, onPreview } = data;
    const q = itens[index];
    return (
      // O wrapper com style é obrigatório para react-window posicionar o item
      <div style={{ ...style, paddingBottom: '10px', boxSizing: 'border-box' }}>
        <CardQuestao
          questao={q}
          adicionandoSM2={sm2Set}
          removendo={remSet}
          onAdicionarRevisao={onAdicionar}
          onRemover={onRemover}
          onPreview={onPreview}
        />
      </div>
    );
  }, []);

  // Empacota os dados passados para cada row — deve ser estável (useMemo)
  // para evitar que react-window re-renderize toda a lista a cada setState.
  const itemData = useMemo(() => ({
    itens: questoesFiltradas,
    adicionandoSM2,
    removendo,
    onAdicionar: adicionarRevisao,
    onRemover: removerDoCaderno,
    onPreview: abrirPreview,
  }), [questoesFiltradas, adicionandoSM2, removendo, adicionarRevisao, removerDoCaderno, abrirPreview]);

  /* ─── Render ─── */
  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        width: '100%', maxWidth: '900px', height: '85vh', minHeight: '500px',
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
                {questoesFiltradas.length} questão(ões) — clique em 🧠 para adicionar à revisão espaçada
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

          <select
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--gray-200)', background: 'white',
              fontSize: '13px', color: 'var(--gray-700)', cursor: 'pointer',
            }}
          >
            <option value="recente">Mais recente</option>
            <option value="erros">Mais erros</option>
            <option value="materia">Matéria A→Z</option>
          </select>

          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--r-md)',
              border: '1px solid var(--gray-200)', background: 'white',
              fontSize: '13px', color: 'var(--gray-700)', cursor: 'pointer',
            }}
          >
            <option value="">Todos os períodos</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>

          {(filtroMateria || filtroModo || filtroPeriodo || ordenacao !== 'recente') && (
            <button
              onClick={() => { setFiltroMateria(''); setFiltroModo(''); setFiltroPeriodo(''); setOrdenacao('recente'); }}
              style={{
                padding: '6px 12px', background: 'white',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--r-md)',
                fontSize: '12px', color: 'var(--gray-500)', cursor: 'pointer',
              }}
            >✕ Limpar filtros</button>
          )}
        </div>

        {/* Corpo — lista virtualizada */}
        <div style={{ flex: 1, padding: '16px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

          {/* AutoSizer mede o espaço disponível e passa para FixedSizeList */}
          {!carregando && questoesFiltradas.length > 0 && (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  width={width}
                  itemCount={questoesFiltradas.length}
                  itemSize={ITEM_HEIGHT}
                  itemData={itemData}
                  overscanCount={3}
                >
                  {RowRenderer}
                </List>
              )}
            </AutoSizer>
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
  , document.body);
};

export default CadernoErros;
