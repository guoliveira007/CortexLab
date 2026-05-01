import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import PainelFiltros from './PainelFiltros';
import ExplicacaoIA from './ExplicacaoIA';
import Alternativas from './Alternativas';
import { useQuestaoFilters } from '../hooks/useQuestaoFilters';

const POR_PAGINA = 10;

export const QuestaoCard = memo(({ questao, numero, resposta, onResponder }) => {
  const respondida = !!resposta;
  const acertou    = resposta === questao.gabarito;

  return (
    <div className={`questao-card ${respondida ? (acertou ? 'acertou' : 'errou') : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{
          background: 'var(--gradient-brand)', color: 'white',
          borderRadius: 'var(--r-sm)', padding: '3px 12px',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
        }}>
          {numero}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
          {[questao.banca, questao.ano, questao.materia, questao.conteudo, questao.topico]
            .filter(Boolean).join(' › ')}
        </span>
      </div>

      {questao.enunciado && (
        <p style={{ marginBottom: '12px', lineHeight: '1.75', color: 'var(--gray-700)', fontSize: '15px' }}>
          {questao.enunciado}
        </p>
      )}
      {questao.imagemEnunciado && (
        <img src={questao.imagemEnunciado} alt="Enunciado"
          style={{ maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '12px' }} />
      )}

      <div style={{
        background: '#fffbeb', padding: '12px 16px',
        borderLeft: '3px solid var(--accent-amber)',
        borderRadius: '0 var(--r-md) var(--r-md) 0',
        marginBottom: '20px', color: '#92400e',
        fontSize: '14px', fontWeight: 500, lineHeight: '1.6',
      }}>
        {questao.comando}
      </div>

      <Alternativas
        alternativas={questao.alternativas}
        imagensAlternativas={questao.imagensAlternativas}
        gabarito={questao.gabarito}
        resposta={resposta}
        onResponder={(letra) => onResponder(questao.id, letra)}
        feedbackTexto={
          resposta
            ? (acertou ? '✅ Acertou!' : `❌ Resposta correta: ${questao.gabarito}`)
            : null
        }
        explicacao={questao.explicacao}
      />

      {respondida && !acertou && (
        <div style={{ marginTop: '12px' }}>
          <ExplicacaoIA questao={questao} respostaUsuario={resposta} />
        </div>
      )}
    </div>
  );
});

QuestaoCard.displayName = 'QuestaoCard';

const Freestyle = ({ materiaInicial = '', onMateriaAplicada }) => {
  const [todas, setTodas]    = useState([]);
  const [sessao, setSessao]  = useState(null);
  const [respostas, setResp] = useState({});
  const restauradoRef        = useRef(false);
  const STORAGE_KEY          = 'cortexlab_freestyle_sessao';

  const {
    filtros,
    setFiltro,
    opcoes,
    filtradas,
    resetar,
    pagina,
    setPagina,
    paginaQ,
    totalPag,
  } = useQuestaoFilters(todas, {
    pageSize: POR_PAGINA,
    includeCurriculo: true,
    storageKey: 'freestyle_filtros',
  });

  useEffect(() => { db.questoes.toArray().then(setTodas); }, []);

  // Quando vem do Pomodoro com sugestão de matéria, pré-aplica o filtro
  useEffect(() => {
    if (!materiaInicial) return;
    setFiltro('materia', materiaInicial);
    if (onMateriaAplicada) onMateriaAplicada();
  }, [materiaInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restaura sessão salva após as questões carregarem ──
  useEffect(() => {
    if (!todas.length || restauradoRef.current) return;
    restauradoRef.current = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const { ids, respostas: resp, pagina: pag } = JSON.parse(raw);
      const map = Object.fromEntries(todas.map(q => [q.id, q]));
      const ordered = ids.map(id => map[id]).filter(Boolean);
      if (!ordered.length) { localStorage.removeItem(STORAGE_KEY); return; }
      setSessao(ordered);
      setResp(resp || {});
      setPagina(pag || 1);
      toast('Sessão restaurada! Continuando de onde parou 🔄');
    } catch { localStorage.removeItem(STORAGE_KEY); }
  }, [todas]);

  // ── Persiste sessão a cada resposta/mudança de página ──
  useEffect(() => {
    if (!sessao) { localStorage.removeItem(STORAGE_KEY); return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ids: sessao.map(q => q.id),
      respostas,
      pagina,
    }));
  }, [sessao, respostas, pagina]);

  const iniciar = useCallback(() => {
    if (!filtradas.length) { toast.error('Nenhuma questão encontrada!'); return; }
    const embaralhadas = [...filtradas].sort(() => Math.random() - 0.5);
    setSessao(embaralhadas);
    setResp({});
    setPagina(1);
    toast.success(`${embaralhadas.length} questão(ões) carregada(s)!`);
  }, [filtradas, setPagina]);

  const sessaoRef    = useRef(null);
  const respostasRef = useRef({});
  useEffect(() => { sessaoRef.current    = sessao; },    [sessao]);
  useEffect(() => { respostasRef.current = respostas; }, [respostas]);

  const responder = useCallback(async (id, letra) => {
    const sess = sessaoRef.current;
    if (!sess) return;
    const q = sess.find(q => q.id === id);
    if (!q) return;

    // Guard explícito: impede double-save por clique duplo antes do re-render.
    // setResp tem o mesmo guard, mas o estado React é assíncrono — o ref
    // é síncrono e garante que db.resultados.add seja chamado uma única vez.
    if (respostasRef.current[id]) return;

    // Atualiza UI imediatamente
    setResp(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: letra };
    });

    // Salva no banco fora de qualquer state updater
    const acertou = letra === q.gabarito;
    db.resultados.add({
      questaoId: id,
      data: new Date().toISOString(),
      acertou,
      tempo: 0,
      modo: 'freestyle',
      materia: q.materia || null,
    }).catch(err => console.error('[Freestyle] Erro ao salvar resultado:', err));
  }, []);

  if (!sessao) return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Freestyle</h2>
      </div>
      <div className="card">
        <p className="section-title">Filtrar questões</p>
        <PainelFiltros
          filtros={filtros}
          setFiltro={setFiltro}
          opcoes={opcoes}
          resetar={resetar}
          questoesFiltradas={filtradas.length}
        />
        <button
          className="btn-primary"
          onClick={iniciar}
          style={{ width: '100%', marginTop: '20px', padding: '12px', justifyContent: 'center', fontSize: '15px' }}
        >
          🚀 Iniciar Freestyle
        </button>
      </div>
    </div>
  );

  const total       = sessao.length;
  const respondidas = Object.keys(respostas).length;
  const acertos     = sessao.filter(q => respostas[q.id] === q.gabarito).length;
  const taxa        = respondidas ? Math.round((acertos / respondidas) * 100) : 0;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'white', padding: '14px 20px', borderRadius: 'var(--r-xl)',
        marginBottom: '20px', boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--gray-100)',
      }}>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--gray-600)' }}>📋 <strong>{total}</strong> questões</span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✅ {acertos} acertos</span>
          <span style={{ color: 'var(--gray-500)' }}>📚 {respondidas}/{total}</span>
          {respondidas > 0 && (
            <span style={{ color: 'var(--brand-500)', fontWeight: 700 }}>📈 {taxa}%</span>
          )}
        </div>
        <button
          className="btn-secondary"
          onClick={() => { localStorage.removeItem(STORAGE_KEY); setSessao(null); }}
          style={{ fontSize: '13px', padding: '7px 14px' }}
        >
          ← Novo filtro
        </button>
      </div>

      {paginaQ.map((q, i) => (
        <QuestaoCard
          key={q.id}
          questao={q}
          numero={`Q${(pagina - 1) * POR_PAGINA + i + 1}`}
          resposta={respostas[q.id]}
          onResponder={responder}
        />
      ))}

      {totalPag > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>← Ant.</button>
          {Array.from({ length: totalPag }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn ${p === pagina ? 'active' : ''}`} onClick={() => setPagina(p)}>{p}</button>
          ))}
          <button className="page-btn" onClick={() => setPagina(p => Math.min(totalPag, p + 1))} disabled={pagina === totalPag}>Próx. →</button>
        </div>
      )}
    </div>
  );
};

export default Freestyle;