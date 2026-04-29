import React, { useState, useEffect, useCallback, memo } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import PainelFiltros from './PainelFiltros';
import ExplicacaoIA from './ExplicacaoIA';
import { useQuestaoFilters } from '../hooks/useQuestaoFilters';

const POR_PAGINA = 10;

/* ─── Card de questão puro — memo evita re-render dos demais cards ao responder ─── */
const QuestaoCardLista = memo(({ questao, numero, resposta, onResponder }) => {
  const acertou = resposta === questao.gabarito;

  return (
    <div className={`questao-card ${resposta ? (acertou ? 'acertou' : 'errou') : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ background: 'var(--gradient-brand)', color: 'white', padding: '3px 12px', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px' }}>
          {numero}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
          {[questao.banca, questao.ano, questao.materia].filter(Boolean).join(' · ')}
        </span>
      </div>
      {questao.enunciado && <p style={{ marginBottom: '12px', lineHeight: '1.75', color: 'var(--gray-700)' }}>{questao.enunciado}</p>}
      {questao.imagemEnunciado && <img src={questao.imagemEnunciado} alt="" style={{ maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '12px' }} />}
      <div style={{ background: '#fffbeb', padding: '12px 16px', borderLeft: '3px solid var(--accent-amber)', borderRadius: '0 var(--r-md) var(--r-md) 0', marginBottom: '18px', color: '#92400e', fontSize: '14px', fontWeight: 500 }}>
        {questao.comando}
      </div>
      {['A', 'B', 'C', 'D', 'E'].map(lt => {
        const txt = questao.alternativas?.[lt];
        if (!txt) return null;
        let cls = 'alternativa';
        if (resposta) {
          if (lt === questao.gabarito) cls += ' correta';
          else if (lt === resposta) cls += ' errada';
        }
        return (
          <div key={lt} className={cls} onClick={() => !resposta && onResponder(questao.id, lt)} style={{ cursor: resposta ? 'default' : 'pointer' }}>
            <strong style={{ minWidth: '22px' }}>{lt})</strong>
            <span style={{ flex: 1, fontSize: '14px' }}>{txt}</span>
            {resposta && lt === questao.gabarito && <span>✅</span>}
            {resposta && lt === resposta && lt !== questao.gabarito && <span>❌</span>}
          </div>
        );
      })}
      {resposta && (
        <div style={{ marginTop: '12px', padding: '12px 16px', background: acertou ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', borderRadius: 'var(--r-md)', borderLeft: `3px solid ${acertou ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
          <strong style={{ color: acertou ? '#065f46' : '#991b1b' }}>
            {acertou ? '✅ Acertou!' : `❌ Resposta correta: ${questao.gabarito}`}
          </strong>
          {questao.explicacao && <p style={{ marginTop: '6px', color: 'var(--gray-600)', fontSize: '14px' }}>{questao.explicacao}</p>}
        </div>
      )}
      {resposta && !acertou && (
        <div style={{ marginTop: '12px' }}>
          <ExplicacaoIA questao={questao} respostaUsuario={resposta} />
        </div>
      )}
    </div>
  );
});
QuestaoCardLista.displayName = 'QuestaoCardLista';

/* ─── MinhasListas ─── */
const MinhasListas = () => {
  const [aba, setAba]             = useState('listas');
  const [listas, setListas]       = useState([]);
  const [todasQuestoes, setTQ]    = useState([]);

  const [nomeLista, setNomeLista]     = useState('');
  const [qtdAleatorio, setQtd]        = useState(10);
  const [modoSelecao, setModoSelecao] = useState('aleatorio');
  const [selecionadas, setSel]        = useState(new Set());
  const [erros, setErros]             = useState({});

  const [listaSelecionada, setListaSel] = useState(null);
  const [sessaoQuestoes, setSessaoQ]    = useState([]);
  const [respostas, setRespostas]       = useState({});
  const [paginaEstudo, setPagEst]       = useState(1);

  // Hook de filtros – sem mesclagem com currículo
  const { filtros, setFiltro, opcoes, filtradas, resetar } = useQuestaoFilters(todasQuestoes, {
    includeCurriculo: false,
  });

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const [ls, qs] = await Promise.all([db.listas.toArray(), db.questoes.toArray()]);
    setListas(ls.reverse());
    setTQ(qs);
  };

  const criarLista = async () => {
    const novos = {};
    if (!nomeLista.trim()) novos.nome = 'Dê um nome para a lista';
    let ids = [];
    if (modoSelecao === 'aleatorio') {
      const pool = [...filtradas].sort(() => Math.random() - 0.5);
      ids = pool.slice(0, qtdAleatorio).map(q => q.id);
      if (!ids.length) novos.questoes = 'Nenhuma questão encontrada com esses filtros';
    } else {
      ids = [...selecionadas];
      if (!ids.length) novos.questoes = 'Selecione ao menos uma questão';
    }
    if (Object.keys(novos).length > 0) { setErros(novos); return; }
    await db.listas.add({
      nome: nomeLista.trim(),
      questoes: ids,
      filtros,
      criada: new Date().toISOString(),
      total: ids.length,
    });
    toast.success(`Lista "${nomeLista}" criada com ${ids.length} questão(ões)!`);
    setNomeLista(''); resetar(); setSel(new Set()); setErros({});
    setAba('listas');
    await carregarDados();
  };

  const excluirLista = async (id, nome) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    await db.listas.delete(id);
    toast.success('Lista excluída!');
    await carregarDados();
  };

  const iniciarEstudo = async (lista) => {
    const qs = (await Promise.all(lista.questoes.map(id => db.questoes.get(id)))).filter(Boolean);
    setSessaoQ(qs);
    setListaSel(lista);
    setRespostas({});
    setPagEst(1);
    setAba('estudar');
  };

  const responder = useCallback(async (idQ, letra) => {
    const q = sessaoQuestoes.find(x => x.id === idQ);
    if (!q || respostas[idQ]) return;
    setRespostas(prev => ({ ...prev, [idQ]: letra }));
    await db.resultados.add({
      questaoId: idQ,
      data: new Date().toISOString(),
      acertou: letra === q.gabarito,
      tempo: 0,
      modo: 'lista',
    });
  }, [sessaoQuestoes, respostas]);

  /* ── ABA ESTUDAR (inalterada) ── */
  if (aba === 'estudar') {
    const totalP   = Math.ceil(sessaoQuestoes.length / POR_PAGINA);
    const paginaQ  = sessaoQuestoes.slice((paginaEstudo - 1) * POR_PAGINA, paginaEstudo * POR_PAGINA);
    const respondidas = Object.keys(respostas).length;
    const acertos   = sessaoQuestoes.filter(q => respostas[q.id] === q.gabarito).length;
    const taxa      = respondidas ? Math.round((acertos / respondidas) * 100) : 0;

    return (
      <div>
        <div className="page-header">
          <div>
            <button className="btn-ghost" onClick={() => setAba('listas')}>← Voltar</button>
            <h2 className="page-title" style={{ marginTop: '4px' }}>{listaSelecionada?.nome}</h2>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: '20px', alignItems: 'center',
          background: 'white', padding: '14px 20px', borderRadius: 'var(--r-xl)',
          marginBottom: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>📋 <strong>{sessaoQuestoes.length}</strong> questões</span>
          <span style={{ fontSize: '14px', color: 'var(--accent-green)', fontWeight: 700 }}>✅ {acertos}</span>
          <span style={{ fontSize: '14px', color: 'var(--accent-red)', fontWeight: 700 }}>❌ {respondidas - acertos}</span>
          {respondidas > 0 && <span style={{ fontSize: '14px', color: 'var(--brand-500)', fontWeight: 700 }}>📊 {taxa}%</span>}
          <div style={{ flex: 1, minWidth: '120px' }} className="progress-track">
            <div className="progress-fill" style={{ width: `${(respondidas / sessaoQuestoes.length) * 100}%`, background: 'var(--gradient-brand)' }} />
          </div>
        </div>

        {paginaQ.map((q, i) => (
          <QuestaoCardLista
            key={q.id}
            questao={q}
            numero={`Q${(paginaEstudo - 1) * POR_PAGINA + i + 1}`}
            resposta={respostas[q.id]}
            onResponder={responder}
          />
        ))}

        {totalP > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={paginaEstudo === 1} onClick={() => { setPagEst(p => p - 1); window.scrollTo(0, 0); }}>← Ant.</button>
            {Array.from({ length: totalP }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === paginaEstudo ? 'active' : ''}`} onClick={() => { setPagEst(p); window.scrollTo(0, 0); }}>{p}</button>
            ))}
            <button className="page-btn" disabled={paginaEstudo === totalP} onClick={() => { setPagEst(p => p + 1); window.scrollTo(0, 0); }}>Próx. →</button>
          </div>
        )}
      </div>
    );
  }

  /* ── ABA CRIAR ── */
  if (aba === 'criar') {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-title">Nova Lista</h2>
          <button className="btn-secondary" onClick={() => setAba('listas')}>← Voltar</button>
        </div>

        <div className="card" style={{ marginBottom: '18px' }}>
          <label className="field-label">Nome da Lista *</label>
          <input
            className="input-modern"
            placeholder="Ex: Matemática — Geometria 2023"
            value={nomeLista}
            onChange={e => { setNomeLista(e.target.value); setErros(ev => ({ ...ev, nome: '' })); }}
            style={{ borderColor: erros.nome ? '#ef4444' : undefined }}
          />
          {erros.nome && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>⚠ {erros.nome}</p>}
        </div>

        <div className="card" style={{ marginBottom: '18px' }}>
          <p className="section-title">Filtros de Questões</p>
          <PainelFiltros
            filtros={filtros}
            setFiltro={setFiltro}
            opcoes={opcoes}
            resetar={resetar}
            questoesFiltradas={filtradas.length}
          />
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <p className="section-title">Modo de Seleção</p>
          <div className="tab-group" style={{ marginBottom: '18px', width: 'fit-content' }}>
            {[{ id: 'aleatorio', label: '🎲 Aleatório' }, { id: 'manual', label: '✋ Manual' }].map(m => (
              <button key={m.id} className={`tab-btn ${modoSelecao === m.id ? 'active' : ''}`} onClick={() => setModoSelecao(m.id)}>
                {m.label}
              </button>
            ))}
          </div>

          {modoSelecao === 'aleatorio' ? (
            <div>
              <label className="field-label">Quantidade de Questões</label>
              <input type="number" className="input-modern" min={1} max={200} value={qtdAleatorio}
                onChange={e => setQtd(Number(e.target.value))} style={{ maxWidth: '160px' }} />
              <p style={{ marginTop: '8px', color: 'var(--gray-400)', fontSize: '13px' }}>
                Questões selecionadas aleatoriamente conforme os filtros acima.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
                  <strong>{selecionadas.size}</strong> de {filtradas.length} selecionadas
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setSel(new Set(filtradas.map(q => q.id)))}>Todas</button>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setSel(new Set())}>Limpar</button>
                </div>
              </div>
              {filtradas.length > 0 && (
                <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  {filtradas.map(q => (
                    <div key={q.id} onClick={() => setSel(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center', background: selecionadas.has(q.id) ? 'var(--brand-50)' : 'white', transition: 'background 0.12s' }}>
                      <input type="checkbox" checked={selecionadas.has(q.id)} onChange={() => {}} style={{ cursor: 'pointer', accentColor: 'var(--brand-500)' }} />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--brand-600)', fontSize: '13px', marginBottom: '2px' }}>
                          {[q.banca, q.ano, q.materia, q.conteudo].filter(Boolean).join(' · ')}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                          {q.comando?.slice(0, 100)}{q.comando?.length > 100 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filtradas.length === 0 && (
                <p style={{ color: 'var(--gray-400)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                  Nenhuma questão corresponde aos filtros.
                </p>
              )}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={criarLista} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
          💾 Criar Lista
        </button>
        {erros.questoes && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: 500, textAlign: 'center' }}>⚠ {erros.questoes}</p>}
      </div>
    );
  }

  /* ── ABA LISTAS ── */
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Minhas Listas</h2>
        <button className="btn-primary" onClick={() => setAba('criar')}>+ Nova Lista</button>
      </div>

      {listas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-title">Nenhuma lista ainda</p>
            <p className="empty-state-desc">Crie listas personalizadas para organizar seu estudo.</p>
            <button className="btn-primary" onClick={() => setAba('criar')}>Criar primeira lista</button>
          </div>
        </div>
      ) : listas.map(lista => (
        <div key={lista.id} style={{
          background: 'white', borderRadius: 'var(--r-xl)',
          padding: '20px 24px', marginBottom: '12px',
          boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-100)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '6px' }}>
                {lista.nome}
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>
                {lista.total} questão(ões) · Criada em {new Date(lista.criada).toLocaleDateString('pt-BR')}
              </p>
              {lista.filtros && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {Object.entries(lista.filtros)
                    .flatMap(([k, v]) =>
                      Array.isArray(v)
                        ? v.map(val => ({ k, val }))
                        : v ? [{ k, val: v }] : []
                    )
                    .map(({ k, val }, i) => (
                      <span key={i} className="badge badge-brand">
                        {k}: {String(val).length > 15 ? String(val).slice(0, 15) + '…' : val}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="btn-primary" onClick={() => iniciarEstudo(lista)} style={{ padding: '8px 18px', fontSize: '14px' }}>▶ Estudar</button>
              <button className="btn-danger" onClick={() => excluirLista(lista.id, lista.nome)}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MinhasListas;