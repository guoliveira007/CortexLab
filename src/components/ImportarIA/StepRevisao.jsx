import React, { useState, useEffect } from 'react';
import CardRevisao from './CardRevisao';
import EditorQuestao from './EditorQuestao';
import { detectarDuplicatas } from './utils';

const StepRevisao = ({ questoes: inicial, paginasOCR, lotesComErro, onImportar, onVoltar }) => {
  const [questoes, setQuestoes]       = useState(inicial);
  const [editando, setEditando]       = useState(null);
  const [filtro, setFiltro]           = useState('todas');
  const [duplicatas, setDuplicatas]   = useState(new Set());
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    detectarDuplicatas(inicial).then(ids => {
      setDuplicatas(new Set(ids));
      setVerificando(false);
    });
  }, [inicial]);

  const toggle    = (id) => setQuestoes(qs => qs.map(q => q._id === id ? { ...q, _sel: !q._sel } : q));
  const remover   = (id) => setQuestoes(qs => qs.filter(q => q._id !== id));
  const atualizar = (q)  => setQuestoes(qs => qs.map(x => x._id === q._id ? { ...x, ...q } : x));

  const comImagem    = questoes.filter(q => q.tem_imagem).length;
  const semGabarito  = questoes.filter(q => !q.gabarito).length;
  const viaOCR       = questoes.filter(q => q._modoExtracao === 'ocr').length;
  const qtdDuplicatas = questoes.filter(q => duplicatas.has(q._id)).length;
  const selecionadas  = questoes.filter(q => q._sel);

  const filtradas = (() => {
    if (filtro === 'imagem')        return questoes.filter(q => q.tem_imagem);
    if (filtro === 'sem_gabarito')  return questoes.filter(q => !q.gabarito);
    if (filtro === 'ocr')           return questoes.filter(q => q._modoExtracao === 'ocr');
    if (filtro === 'duplicatas')    return questoes.filter(q => duplicatas.has(q._id));
    return questoes;
  })();

  const toggleTudo = () => {
    const todasSel = filtradas.every(q => q._sel);
    const ids = filtradas.map(q => q._id);
    setQuestoes(qs => qs.map(q => ids.includes(q._id) ? { ...q, _sel: !todasSel } : q));
  };

  return (
    <div>
      {/* Aviso de lotes com erro */}
      {lotesComErro?.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fecaca',
          borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: '16px',
          fontSize: '13px', color: '#991b1b',
        }}>
          <strong>⚠️ {lotesComErro.length} lote(s) falharam durante a extração.</strong>{' '}
          As páginas {lotesComErro.map(l => l.paginas).join(', ')} podem estar incompletas.{' '}
          Verifique as questões dessas páginas ou tente reimportar o PDF.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Extraídas',    valor: questoes.length,    cor: 'var(--brand-600)', bg: 'var(--brand-50)', icon: '📋' },
          { label: 'Selecionadas', valor: selecionadas.length, cor: '#10b981', bg: '#ecfdf5', icon: '✅' },
          { label: 'Com imagem',   valor: comImagem,           cor: '#f59e0b', bg: '#fffbeb', icon: '🖼️' },
          { label: 'Sem gabarito', valor: semGabarito,         cor: '#ef4444', bg: '#fef2f2', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 'var(--r-xl)', padding: '16px',
            border: `1px solid ${s.cor}22`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: s.cor }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Avisos */}
      {paginasOCR.length > 0 && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 'var(--r-lg)', padding: '12px 16px',
          fontSize: '13px', color: '#1d4ed8', marginBottom: '16px',
        }}>
          🔍 <strong>{paginasOCR.length} página(s)</strong> lidas via OCR (pág. {paginasOCR.join(', ')}).
          Revise essas questões — podem ter pequenos erros de reconhecimento.
        </div>
      )}

      {!verificando && qtdDuplicatas > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 'var(--r-lg)', padding: '12px 16px',
          fontSize: '13px', color: '#92400e', marginBottom: '16px',
        }}>
          🔁 <strong>{qtdDuplicatas} questão(ões)</strong> parecem já existir no banco.
          Elas estão marcadas em vermelho — desmarque-as para evitar duplicar.
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div className="tab-group">
          {[
            { id: 'todas',        label: `Todas (${questoes.length})` },
            { id: 'imagem',       label: `🖼️ Imagem (${comImagem})` },
            { id: 'sem_gabarito', label: `⚠️ Sem gabarito (${semGabarito})` },
            ...(viaOCR > 0 ? [{ id: 'ocr', label: `🔍 OCR (${viaOCR})` }] : []),
            ...(qtdDuplicatas > 0 ? [{ id: 'duplicatas', label: `🔁 Duplicatas (${qtdDuplicatas})` }] : []),
          ].map(f => (
            <button key={f.id} className={`tab-btn ${filtro === f.id ? 'active' : ''}`} onClick={() => setFiltro(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={toggleTudo} style={{
          marginLeft: 'auto', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
          borderRadius: 'var(--r-md)', padding: '7px 14px',
          fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', cursor: 'pointer',
        }}>
          {filtradas.every(q => q._sel) ? 'Desmarcar visíveis' : 'Marcar visíveis'}
        </button>
      </div>

      {/* Cards */}
      <div style={{ marginBottom: '100px' }}>
        {filtradas.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Nenhuma questão neste filtro.</div>
          : filtradas.map(q => (
            <CardRevisao
              key={q._id} questao={q} selecionada={q._sel}
              duplicata={duplicatas.has(q._id)}
              onToggle={() => toggle(q._id)}
              onEditar={() => setEditando(q)}
              onRemover={() => remover(q._id)}
            />
          ))
        }
      </div>

      {/* Footer sticky */}
      <div style={{
        position: 'sticky', bottom: '20px',
        background: 'white', borderRadius: 'var(--r-xl)',
        padding: '14px 20px', boxShadow: '0 -4px 28px rgba(0,0,0,0.12)',
        border: '1px solid var(--gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <button className="btn-ghost" onClick={onVoltar} style={{ fontSize: '13px' }}>← Voltar</button>
        <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
          <strong style={{ color: 'var(--gray-800)' }}>{selecionadas.length}</strong> questões para importar
        </p>
        <button className="btn-primary" onClick={() => onImportar(selecionadas)}
          disabled={selecionadas.length === 0}
          style={{ padding: '10px 24px', opacity: selecionadas.length === 0 ? 0.4 : 1 }}>
          💾 Importar {selecionadas.length} questões
        </button>
      </div>

      {editando && (
        <EditorQuestao questao={editando} onChange={atualizar} onFechar={() => setEditando(null)} />
      )}
    </div>
  );
};

export default StepRevisao;