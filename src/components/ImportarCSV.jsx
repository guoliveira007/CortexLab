import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../database';

/**
 * ImportarCSV — Modal de importação em lote via CSV.
 *
 * Colunas esperadas no CSV (separador vírgula ou ponto-e-vírgula):
 * banca, ano, materia, conteudo, topico, assunto,
 * enunciado, comando, alt_a, alt_b, alt_c, alt_d, alt_e, gabarito, explicacao
 *
 * Props:
 *   onFechar  — callback para fechar o modal
 *   onImportar — callback chamado após importação bem-sucedida (ex: recarregar lista)
 */

const COLUNAS_OBRIGATORIAS = ['banca', 'materia', 'comando', 'gabarito'];

const MODELO_CSV = [
  'banca,ano,materia,conteudo,topico,assunto,enunciado,comando,alt_a,alt_b,alt_c,alt_d,alt_e,gabarito,explicacao',
  'CESPE,2024,Direito Constitucional,Direitos Fundamentais,Liberdades,,"","Acerca dos direitos fundamentais, assinale a alternativa correta.",Correto,Incorreto,Correto,Incorreto,Correto,A,"Gabarito: A"',
  'FCC,2023,Português,Interpretação de Texto,Coesão,,"O texto apresenta argumentação sobre..."," Assinale a alternativa que melhor interpreta o texto.",Alternativa A,Alternativa B,Alternativa C,Alternativa D,Alternativa E,C,',
].join('\n');

/* ── Parser CSV simples (suporta vírgula e ponto-e-vírgula, aspas duplas) ── */
const parseCSV = (texto) => {
  const separador = texto.includes(';') ? ';' : ',';
  const linhas = texto.trim().split(/\r?\n/);
  if (linhas.length < 2) return { erro: 'Arquivo vazio ou sem dados.', linhas: [] };

  const cabecalho = linhas[0].split(separador).map(c =>
    c.trim().replace(/^"|"$/g, '').toLowerCase()
  );

  const faltando = COLUNAS_OBRIGATORIAS.filter(c => !cabecalho.includes(c));
  if (faltando.length) {
    return { erro: `Colunas obrigatórias ausentes: ${faltando.join(', ')}`, linhas: [] };
  }

  const dados = linhas.slice(1).map((linha, idx) => {
    // Parsing respeitando aspas duplas
    const campos = [];
    let dentro = false, cur = '';
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { dentro = !dentro; continue; }
      if (c === separador && !dentro) { campos.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    campos.push(cur.trim());

    const get = (col) => {
      const i = cabecalho.indexOf(col);
      return i >= 0 ? (campos[i] || '').replace(/^"|"$/g, '').trim() : '';
    };

    const gabarito = get('gabarito').toUpperCase();
    const erros = [];
    if (!get('banca'))   erros.push('banca');
    if (!get('materia')) erros.push('matéria');
    if (!get('comando')) erros.push('comando');
    if (!['A','B','C','D','E'].includes(gabarito)) erros.push('gabarito inválido');

    return {
      _linha: idx + 2,
      _erros: erros,
      banca:    get('banca'),
      ano:      get('ano') ? Number(get('ano')) : null,
      materia:  get('materia'),
      conteudo: get('conteudo'),
      topico:   get('topico'),
      assunto:  get('assunto'),
      enunciado: get('enunciado'),
      imagemEnunciado: '',
      comando:  get('comando'),
      alternativas: {
        A: get('alt_a'), B: get('alt_b'), C: get('alt_c'),
        D: get('alt_d'), E: get('alt_e'),
      },
      imagensAlternativas: { A:'', B:'', C:'', D:'', E:'' },
      gabarito,
      explicacao: get('explicacao'),
    };
  }).filter(r => r.banca || r.materia || r.comando); // ignora linhas totalmente vazias

  return { erro: null, linhas: dados };
};

/* ── Baixar modelo ── */
const baixarModelo = () => {
  const blob = new Blob([MODELO_CSV], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'modelo_questoes.csv'; a.click();
  URL.revokeObjectURL(url);
};

/* ── ImportarCSV ── */
const ImportarCSV = ({ onFechar, onImportar }) => {
  const [fase, setFase]         = useState('upload');   // 'upload' | 'previa' | 'importando'
  const [linhas, setLinhas]     = useState([]);
  const [arrastar, setArrastar] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const inputRef = useRef(null);

  const validas  = linhas.filter(l => l._erros.length === 0);
  const invalidas = linhas.filter(l => l._erros.length > 0);

  const processarArquivo = (arquivo) => {
    if (!arquivo) return;
    if (!arquivo.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv'); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const { erro, linhas: parsed } = parseCSV(e.target.result);
      if (erro) { toast.error(erro); return; }
      if (!parsed.length) { toast.error('Nenhuma questão encontrada no arquivo.'); return; }
      setLinhas(parsed);
      setFase('previa');
    };
    reader.readAsText(arquivo, 'UTF-8');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setArrastar(false);
    processarArquivo(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setArrastar(true); };
  const onDragLeave = () => setArrastar(false);

  const confirmar = async () => {
    if (!validas.length) { toast.error('Nenhuma questão válida para importar.'); return; }
    setFase('importando');
    // eslint-disable-next-line no-unused-vars
    const lote = validas.map(({ _linha, _erros, ...q }) => q);
    let ok = 0;
    for (let i = 0; i < lote.length; i++) {
      await db.questoes.add(lote[i]);
      ok++;
      setProgresso(Math.round((ok / lote.length) * 100));
    }
    toast.success(`${ok} questão(ões) importada(s) com sucesso!`);
    onImportar?.();
    onFechar();
  };

  /* ── Overlay / Modal ── */
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(6px)',
      padding: '16px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--r-2xl)',
        width: '100%',
        maxWidth: fase === 'previa' ? '860px' : '560px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        border: '1px solid var(--gray-100)',
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'var(--gradient-brand)',
              borderRadius: 'var(--r-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>📥</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Importar Questões via CSV
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '1px' }}>
                {fase === 'upload' && 'Baixe o modelo, preencha no Excel e importe em lote'}
                {fase === 'previa' && `${linhas.length} questão(ões) detectada(s) — revise antes de confirmar`}
                {fase === 'importando' && 'Salvando questões no banco...'}
              </p>
            </div>
          </div>
          {fase !== 'importando' && (
            <button
              onClick={onFechar}
              style={{
                background: 'var(--gray-100)', border: 'none', cursor: 'pointer',
                width: '32px', height: '32px', borderRadius: '50%',
                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--gray-500)',
              }}
            >×</button>
          )}
        </div>

        {/* Corpo scrollável */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>

          {/* ── FASE: UPLOAD ── */}
          {fase === 'upload' && (
            <>
              {/* Botão modelo */}
              <button
                onClick={baixarModelo}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  padding: '10px 20px', borderRadius: 'var(--r-lg)',
                  fontWeight: 700, fontSize: '14px',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                  marginBottom: '20px',
                }}
              >
                <span style={{ fontSize: '16px' }}>⬇️</span> Baixar Modelo CSV
              </button>

              {/* Instruções rápidas */}
              <div style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 'var(--r-lg)',
                padding: '14px 18px',
                marginBottom: '20px',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-600)', marginBottom: '8px' }}>
                  📋 Colunas do CSV
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['banca *', 'ano', 'materia *', 'conteudo', 'topico', 'assunto', 'enunciado', 'comando *', 'alt_a', 'alt_b', 'alt_c', 'alt_d', 'alt_e', 'gabarito *', 'explicacao'].map(col => (
                    <span key={col} style={{
                      background: col.includes('*') ? 'var(--brand-50)' : 'var(--gray-100)',
                      color: col.includes('*') ? 'var(--brand-600)' : 'var(--gray-600)',
                      border: `1px solid ${col.includes('*') ? 'var(--brand-200)' : 'var(--gray-200)'}`,
                      padding: '2px 8px', borderRadius: 'var(--r-full)',
                      fontSize: '11px', fontWeight: 600,
                    }}>{col}</span>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '8px' }}>* obrigatório · separador: vírgula ou ponto-e-vírgula · codificação: UTF-8</p>
              </div>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${arrastar ? 'var(--brand-400)' : 'var(--gray-200)'}`,
                  borderRadius: 'var(--r-xl)',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: arrastar ? 'rgba(99,102,241,0.04)' : 'var(--gray-50)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>☁️</div>
                <p style={{ fontWeight: 700, color: 'var(--gray-700)', fontSize: '15px', marginBottom: '4px' }}>
                  Arraste ou clique para selecionar o arquivo CSV
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Apenas arquivos .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={e => processarArquivo(e.target.files[0])}
                />
              </div>
            </>
          )}

          {/* ── FASE: PRÉVIA ── */}
          {fase === 'previa' && (
            <>
              {/* Resumo */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total detectado', valor: linhas.length, cor: 'var(--brand-600)', bg: 'var(--brand-50)', borda: 'var(--brand-200)' },
                  { label: 'Válidas',  valor: validas.length,   cor: '#065f46', bg: '#ecfdf5', borda: '#6ee7b7' },
                  { label: 'Com erro', valor: invalidas.length, cor: '#991b1b', bg: '#fef2f2', borda: '#fecaca' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: s.bg, border: `1px solid ${s.borda}`,
                    borderRadius: 'var(--r-lg)', padding: '12px 20px',
                    flex: 1, minWidth: '120px', textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: s.cor }}>{s.valor}</div>
                    <div style={{ fontSize: '12px', color: s.cor, marginTop: '2px', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabela prévia */}
              <div style={{
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      {['#', 'Banca', 'Matéria', 'Comando', 'Gabarito', 'Status'].map(col => (
                        <th key={col} style={{
                          padding: '10px 14px', textAlign: 'left',
                          fontWeight: 700, color: 'var(--gray-600)',
                          fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, i) => {
                      const ok = l._erros.length === 0;
                      return (
                        <tr key={i} style={{
                          borderBottom: i < linhas.length - 1 ? '1px solid var(--gray-100)' : 'none',
                          background: ok ? (i % 2 === 0 ? 'white' : '#f9fafb') : '#fef2f2',
                        }}>
                          <td style={{ padding: '10px 14px', color: 'var(--gray-400)', fontWeight: 600 }}>{l._linha}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--gray-700)', fontWeight: 600 }}>{l.banca || '—'}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--gray-600)' }}>{l.materia || '—'}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--gray-600)', maxWidth: '280px' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {l.comando || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              background: ok ? 'var(--brand-50)' : '#fef2f2',
                              color: ok ? 'var(--brand-600)' : 'var(--accent-red)',
                              fontWeight: 700, padding: '2px 8px',
                              borderRadius: 'var(--r-full)', fontSize: '12px',
                            }}>
                              {l.gabarito || '?'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {ok ? (
                              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>✓ Válida</span>
                            ) : (
                              <span style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600 }} title={l._erros.join(', ')}>
                                ✗ {l._erros.join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {invalidas.length > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--accent-red)', marginTop: '10px' }}>
                  ⚠️ {invalidas.length} linha(s) inválida(s) serão ignoradas. Apenas as {validas.length} válidas serão importadas.
                </p>
              )}
            </>
          )}

          {/* ── FASE: IMPORTANDO ── */}
          {fase === 'importando' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Importando questões...
              </h3>
              <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '24px' }}>
                {progresso}% concluído
              </p>
              <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--r-full)', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progresso}%`,
                  background: 'var(--gradient-brand)',
                  borderRadius: 'var(--r-full)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {fase === 'previa' && (
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--gray-100)',
            display: 'flex', gap: '12px', justifyContent: 'flex-end',
            flexShrink: 0,
            background: 'var(--gray-50)',
          }}>
            <button
              className="btn-secondary"
              onClick={() => { setFase('upload'); setLinhas([]); }}
              style={{ padding: '10px 20px' }}
            >
              ← Voltar
            </button>
            <button
              className="btn-primary"
              onClick={confirmar}
              disabled={validas.length === 0}
              style={{
                padding: '10px 24px',
                opacity: validas.length === 0 ? 0.5 : 1,
              }}
            >
              ✅ Confirmar Importação ({validas.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportarCSV;