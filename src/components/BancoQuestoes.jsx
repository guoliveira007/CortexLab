import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import PainelFiltros from './PainelFiltros';
import ImportarCSV from './ImportarCSV';
import ImportarPDF from './ImportarPDF';
import ImportarIA from './ImportarIA';
import { CURRICULO, MATERIAS, getConteudos, getTopicos } from '../curriculo';
import { useQuestaoFilters } from '../hooks/useQuestaoFilters';

const VAZIO = {
  banca: '', ano: '', materia: '', conteudo: '', topico: '', assunto: '',
  enunciado: '', imagemEnunciado: '', comando: '',
  alternativas: { A: '', B: '', C: '', D: '', E: '' },
  imagensAlternativas: { A: '', B: '', C: '', D: '', E: '' },
  gabarito: '', explicacao: '',
};

const POR_PAG = 15;

const toBase64 = f => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
});

/* ── Estilos inline para select com aparência de input-modern ── */
const selectStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid var(--gray-200)',
  borderRadius: 'var(--r-md)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  color: 'var(--gray-800)',
  background: 'white',
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 0.15s',
  appearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '32px',
};

/* ── CamposMetadados (inalterado) ── */
const CamposMetadados = ({ form, setForm, bancasExtras }) => {
  const conteudosCurr = getConteudos(form.materia);
  const topicosCurr   = getTopicos(form.materia, form.conteudo);

  const handleMateria = (v) => {
    setForm(f => ({ ...f, materia: v, conteudo: '', topico: '' }));
  };
  const handleConteudo = (v) => {
    setForm(f => ({ ...f, conteudo: v, topico: '' }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>

      {/* Banca — input livre com sugestões */}
      <div>
        <label className="field-label">Banca *</label>
        <input
          className="input-modern"
          list="dl-bancas"
          value={form.banca || ''}
          onChange={e => setForm(f => ({ ...f, banca: e.target.value }))}
          placeholder="Ex: CESPE"
        />
        <datalist id="dl-bancas">
          {bancasExtras.map(o => <option key={o} value={o} />)}
        </datalist>
      </div>

      {/* Ano — input numérico */}
      <div>
        <label className="field-label">Ano</label>
        <input
          className="input-modern"
          type="number"
          placeholder="2024"
          value={form.ano || ''}
          onChange={e => setForm(f => ({ ...f, ano: e.target.value }))}
        />
      </div>

      {/* Matéria — select currículo completo */}
      <div>
        <label className="field-label">Matéria *</label>
        <select style={selectStyle} value={form.materia || ''} onChange={e => handleMateria(e.target.value)}>
          <option value="">— Selecione —</option>
          {MATERIAS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Conteúdo — cascateia pela matéria */}
      <div>
        <label className="field-label">Conteúdo</label>
        {conteudosCurr.length > 0 ? (
          <select
            style={{
              ...selectStyle,
              borderColor: form.materia ? 'var(--gray-200)' : 'var(--gray-100)',
              color: form.materia ? 'var(--gray-800)' : 'var(--gray-400)',
            }}
            value={form.conteudo || ''}
            onChange={e => handleConteudo(e.target.value)}
            disabled={!form.materia}
          >
            <option value="">— Selecione —</option>
            {conteudosCurr.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input
            className="input-modern"
            value={form.conteudo || ''}
            onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
            placeholder="Conteúdo livre"
          />
        )}
      </div>

      {/* Tópico — cascateia pelo conteúdo */}
      <div>
        <label className="field-label">Tópico</label>
        {topicosCurr.length > 0 ? (
          <select
            style={{
              ...selectStyle,
              color: form.conteudo ? 'var(--gray-800)' : 'var(--gray-400)',
            }}
            value={form.topico || ''}
            onChange={e => setForm(f => ({ ...f, topico: e.target.value }))}
            disabled={!form.conteudo}
          >
            <option value="">— Selecione —</option>
            {topicosCurr.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <input
            className="input-modern"
            value={form.topico || ''}
            onChange={e => setForm(f => ({ ...f, topico: e.target.value }))}
            placeholder="Tópico livre"
          />
        )}
      </div>

      {/* Assunto — sempre livre */}
      <div>
        <label className="field-label">Assunto</label>
        <input
          className="input-modern"
          value={form.assunto || ''}
          onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
          placeholder="Assunto específico"
        />
      </div>
    </div>
  );
};

/* ── Formulario (inalterado) ── */
const Formulario = ({ formInicial, editandoId, bancasExtras, onCancelar, onSalvar }) => {
  const [form, setForm] = useState(formInicial);

  const handleImg = async (e, campo, letra) => {
    const file = e.target.files[0]; if (!file) return;
    const b64 = await toBase64(file);
    if (letra) setForm(f => ({ ...f, [campo]: { ...f[campo], [letra]: b64 } }));
    else setForm(f => ({ ...f, [campo]: b64 }));
  };

  const salvar = () => {
    if (!form.banca || !form.materia || !form.comando || !form.gabarito) {
      toast.error('Preencha banca, matéria, comando e gabarito'); return;
    }
    onSalvar(form);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)' }}>
          {editandoId ? '✏️ Editar Questão' : '➕ Nova Questão'}
        </h3>
        <button className="btn-secondary" onClick={onCancelar}>← Cancelar</button>
      </div>

      <div style={{ marginBottom: '6px' }}><p className="section-title">Metadados</p></div>
      <CamposMetadados form={form} setForm={setForm} bancasExtras={bancasExtras} />

      <div style={{ marginBottom: '6px' }}><p className="section-title">Enunciado e Comando</p></div>
      <div style={{ marginBottom: '14px' }}>
        <label className="field-label">Enunciado</label>
        <textarea className="input-modern" rows={4} value={form.enunciado || ''}
          onChange={e => setForm(f => ({ ...f, enunciado: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label className="field-label">Imagem do Enunciado</label>
        <input type="file" accept="image/*" onChange={e => handleImg(e, 'imagemEnunciado')} style={{ fontSize: '13px' }} />
        {form.imagemEnunciado && (
          <img src={form.imagemEnunciado} alt="" style={{ maxWidth: '240px', borderRadius: 'var(--r-md)', marginTop: '8px', display: 'block', border: '1px solid var(--gray-200)' }} />
        )}
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label className="field-label">Comando *</label>
        <textarea className="input-modern" rows={2} value={form.comando || ''}
          onChange={e => setForm(f => ({ ...f, comando: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: '6px' }}><p className="section-title">Alternativas</p></div>
      <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '20px', border: '1px solid var(--gray-200)' }}>
        {['A', 'B', 'C', 'D', 'E'].map((lt, idx) => (
          <div key={lt} style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            marginBottom: idx < 4 ? '16px' : 0, paddingBottom: idx < 4 ? '16px' : 0,
            borderBottom: idx < 4 ? '1px solid var(--gray-200)' : 'none',
          }}>
            <span style={{
              background: 'var(--gradient-brand)', color: 'white',
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px',
              flexShrink: 0, marginTop: '7px',
            }}>{lt}</span>
            <div style={{ flex: 1 }}>
              <input
                className="input-modern"
                placeholder={`Texto da alternativa ${lt}`}
                value={form.alternativas?.[lt] || ''}
                onChange={e => setForm(f => ({ ...f, alternativas: { ...f.alternativas, [lt]: e.target.value } }))}
                style={{ marginBottom: '7px' }}
              />
              <input type="file" accept="image/*" onChange={e => handleImg(e, 'imagensAlternativas', lt)} style={{ fontSize: '12px' }} />
              {form.imagensAlternativas?.[lt] && (
                <img src={form.imagensAlternativas[lt]} alt="" style={{ maxWidth: '160px', borderRadius: 'var(--r-sm)', marginTop: '7px', display: 'block' }} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '6px' }}><p className="section-title">Gabarito e Explicação</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '14px', marginBottom: '24px' }}>
        <div>
          <label className="field-label">Gabarito *</label>
          <select className="select-modern" value={form.gabarito || ''} onChange={e => setForm(f => ({ ...f, gabarito: e.target.value }))}>
            <option value="">—</option>
            {['A', 'B', 'C', 'D', 'E'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Explicação</label>
          <textarea className="input-modern" rows={2} value={form.explicacao || ''}
            onChange={e => setForm(f => ({ ...f, explicacao: e.target.value }))} style={{ resize: 'vertical' }} />
        </div>
      </div>

      <button className="btn-primary" onClick={salvar}
        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
        {editandoId ? '💾 Salvar Alterações' : '✅ Salvar Questão'}
      </button>
    </div>
  );
};

/* ─── BancoQuestoes ─── */
const BancoQuestoes = () => {
  const [aba, setAba]           = useState('listar');
  const [todas, setTodas]       = useState([]);
  const [formInicial, setFormInicial] = useState(VAZIO);
  const [editandoId, setEditId] = useState(null);
  const [bancasExtras, setBancasExtras] = useState([]);
  const [modalCSV, setModalCSV] = useState(false);
  const [modalPDF, setModalPDF] = useState(false);
  const [modalIA, setModalIA]   = useState(false);

  // Hook de filtros unificado (com integração do currículo e paginação de 15)
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
    pageSize: POR_PAG,
    includeCurriculo: true,
  });

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const q = await db.questoes.toArray();
    setTodas(q);
    const uniq = fn => [...new Set(q.map(fn).filter(Boolean))].sort();
    setBancasExtras(uniq(x => x.banca));
  };

  const salvar = async (formData) => {
    const dados = { ...formData, ano: Number(formData.ano) || null };
    if (editandoId) {
      await db.questoes.update(editandoId, dados);
      toast.success('Questão atualizada!');
    } else {
      await db.questoes.add(dados);
      toast.success('Questão salva!');
    }
    setEditId(null);
    setAba('listar');
    await carregar();
  };

  const editar = q => {
    setFormInicial({
      ...VAZIO, ...q, ano: String(q.ano || ''),
      alternativas: q.alternativas || { A: '', B: '', C: '', D: '', E: '' },
      imagensAlternativas: q.imagensAlternativas || { A: '', B: '', C: '', D: '', E: '' },
    });
    setEditId(q.id);
    setAba('editar');
  };

  const excluir = async id => {
    if (!window.confirm('Excluir esta questão? Os resultados e revisões associados também serão removidos.')) return;
    await db.questoes.delete(id);
    const idsResultados = await db.resultados.where('id_questao').equals(id).primaryKeys();
    if (idsResultados.length > 0) await db.resultados.bulkDelete(idsResultados);
    await db.removerDaRevisao(String(id));
    window.dispatchEvent(new Event('revisao:concluida'));
    toast.success('Questão excluída!');
    await carregar();
  };

  const abrirNova = () => { setFormInicial(VAZIO); setEditId(null); setAba('criar'); };
  const cancelar  = () => { setFormInicial(VAZIO); setEditId(null); setAba('listar'); };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Banco de Questões</h2>
        {aba === 'listar' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setModalCSV(true)}>📥 Importar CSV</button>
            <button className="btn-secondary" onClick={() => setModalPDF(true)} style={{ borderColor: '#fca5a5', color: '#dc2626', background: '#fef2f2' }}>📄 Importar PDF</button>
            <button className="btn-secondary" onClick={() => setModalIA(true)} style={{ borderColor: '#a78bfa', color: '#7c3aed', background: '#f5f3ff' }}>🤖 Importar com IA</button>
            <button className="btn-primary" onClick={abrirNova}>+ Nova Questão</button>
          </div>
        )}
      </div>

      {modalCSV && <ImportarCSV onFechar={() => setModalCSV(false)} onImportar={() => { setModalCSV(false); carregar(); }} />}
      {modalPDF && <ImportarPDF onFechar={() => setModalPDF(false)} onImportar={() => { setModalPDF(false); carregar(); }} />}
      {modalIA  && <ImportarIA  onFechar={() => setModalIA(false)}  onImportar={() => { setModalIA(false);  carregar(); }} />}

      {(aba === 'criar' || aba === 'editar') && (
        <Formulario
          key={editandoId ?? 'novo'}
          formInicial={formInicial}
          editandoId={editandoId}
          bancasExtras={bancasExtras}
          onSalvar={salvar}
          onCancelar={cancelar}
        />
      )}

      {aba === 'listar' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <p className="section-title">Filtros</p>
            <PainelFiltros
              filtros={filtros}
              setFiltro={setFiltro}
              opcoes={opcoes}
              resetar={resetar}
              questoesFiltradas={filtradas.length}
            />
          </div>

          {paginaQ.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🗃️</div>
                <p className="empty-state-title">Nenhuma questão encontrada</p>
                <p className="empty-state-desc">Tente ajustar os filtros ou adicione novas questões ao banco.</p>
              </div>
            </div>
          ) : (
            paginaQ.map(q => (
              <div key={q.id} style={{
                background: 'white', borderRadius: 'var(--r-lg)',
                padding: '16px 20px', marginBottom: '10px',
                boxShadow: 'var(--shadow-xs)', border: '1px solid var(--gray-100)',
                display: 'flex', gap: '16px', alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                    {[q.banca, q.ano, q.materia, q.conteudo, q.topico].filter(Boolean).map((t, i) => (
                      <span key={i} className="badge badge-gray">{t}</span>
                    ))}
                  </div>
                  <p style={{ color: 'var(--gray-700)', fontSize: '14px', lineHeight: '1.55' }}>
                    {(q.comando || q.enunciado || '').slice(0, 140)}
                    {(q.comando || q.enunciado || '').length > 140 ? '…' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => editar(q)} style={{
                    padding: '7px 14px', border: '1.5px solid var(--brand-200)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    background: 'var(--brand-50)', color: 'var(--brand-600)',
                    fontSize: '13px', fontWeight: 600,
                  }}>✏️ Editar</button>
                  <button onClick={() => excluir(q.id)} style={{
                    padding: '7px 12px', border: '1.5px solid #fecaca',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    background: '#fef2f2', color: 'var(--accent-red)', fontSize: '13px',
                  }}>🗑️</button>
                </div>
              </div>
            ))
          )}

          {totalPag > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>← Ant.</button>
              {Array.from({ length: totalPag }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${p === pagina ? 'active' : ''}`} onClick={() => setPagina(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => setPagina(p => Math.min(totalPag, p + 1))} disabled={pagina === totalPag}>Próx. →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BancoQuestoes;