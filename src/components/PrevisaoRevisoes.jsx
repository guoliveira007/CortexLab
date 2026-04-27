import React, { useState, useEffect } from 'react';
import { db } from '../database';

/**
 * PrevisaoRevisoes — Calendário de previsão das revisões espaçadas (SM-2)
 * nos próximos 30 dias. Mostra quantas questões vencem por dia.
 *
 * FIX: ao montar, despacha o evento 'previsao:visitada' e grava a data em
 * localStorage, fazendo o BadgeRevisoes (com ignorarSeVisitado=true) sumir
 * da aba de navegação enquanto durar o dia.
 */

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const corCarga = (n) => {
  if (!n) return { bg: 'var(--gray-50)', color: 'var(--gray-300)', border: 'var(--gray-100)' };
  if (n <= 5)  return { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' };
  if (n <= 15) return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
  return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
};

/* ─── Minicard de dia ─── */
const DiaCard = ({ dia, questoes, hoje, passado, onClick, selecionado }) => {
  const cores = corCarga(questoes);
  const ehHoje = dia.toDateString() === hoje.toDateString();

  return (
    <button
      onClick={() => questoes > 0 && onClick(dia)}
      disabled={!questoes}
      style={{
        width: '100%', aspectRatio: '1',
        background: selecionado ? 'var(--brand-600)' : ehHoje ? 'var(--brand-50)' : passado ? 'var(--gray-50)' : cores.bg,
        border: `1.5px solid ${selecionado ? 'var(--brand-600)' : ehHoje ? 'var(--brand-300)' : cores.border}`,
        borderRadius: 'var(--r-md)',
        cursor: questoes ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '2px',
        transition: 'all 0.15s', padding: '4px',
        opacity: passado && !ehHoje ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (questoes) e.currentTarget.style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <span style={{
        fontSize: '13px', fontWeight: ehHoje ? 800 : 600,
        color: selecionado ? 'white' : ehHoje ? 'var(--brand-700)' : 'var(--gray-600)',
      }}>
        {dia.getDate()}
      </span>
      {questoes > 0 && (
        <span style={{
          fontSize: '10px', fontWeight: 700,
          color: selecionado ? 'rgba(255,255,255,0.9)' : cores.color,
        }}>
          {questoes}
        </span>
      )}
    </button>
  );
};

/* ─── PrevisaoRevisoes ─── */
const PrevisaoRevisoes = () => {
  const [estados, setEstados]         = useState([]);
  const [questoesMap, setQuestoesMap] = useState({});
  const [diaSel, setDiaSel]           = useState(null);
  const [questoesDia, setQuestoesDia] = useState([]);
  const [mesOffset, setMesOffset]     = useState(0);

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  // FIX: ao entrar na aba, marca o badge como "visto hoje" para que desapareça
  // do item de navegação enquanto durar o dia.
  useEffect(() => {
    const dataHoje = new Date().toDateString();
    localStorage.setItem('previsao_badge_visto', dataHoje);
    window.dispatchEvent(new CustomEvent('previsao:visitada'));
  }, []);

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const [estadosArr, questoesArr] = await Promise.all([
      db.revisaoEspacada.toArray(),
      db.questoes.toArray(),
    ]);
    setEstados(estadosArr);
    const mapa = {};
    questoesArr.forEach(q => { mapa[String(q.id)] = q; });
    setQuestoesMap(mapa);
  };

  // Agrupa estados por data de próxima revisão
  const porDia = {};
  estados.forEach(e => {
    const data = e.proximaRevisao;
    if (!porDia[data]) porDia[data] = [];
    porDia[data].push(e);
  });

  // Conta questões vencidas (atrasadas)
  const atrasadas = estados.filter(e => e.proximaRevisao < hoje.toISOString().split('T')[0]).length;
  // Conta de hoje
  const deHoje = estados.filter(e => e.proximaRevisao === hoje.toISOString().split('T')[0]).length;
  // Total na fila
  const totalFila = estados.length;

  // Calendário do mês exibido
  const dataBase = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1);
  const ano  = dataBase.getFullYear();
  const mes  = dataBase.getMonth();

  const primeiroDia  = new Date(ano, mes, 1);
  const ultimoDia    = new Date(ano, mes + 1, 0);
  const diasNoMes    = ultimoDia.getDate();
  const offsetInicio = primeiroDia.getDay();

  // Próximos 30 dias de previsão (barras)
  const proximos30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    return { data: d, key, qtd: (porDia[key] || []).length };
  });

  const maxDia = Math.max(...proximos30.map(d => d.qtd), 1);

  const selecionarDia = (dia) => {
    const key = dia.toISOString().split('T')[0];
    setDiaSel(dia);
    const estadosDia = porDia[key] || [];
    setQuestoesDia(estadosDia.map(e => ({
      ...questoesMap[String(e.questaoId)],
      sm2: e,
    })).filter(q => q.id));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Previsão de Revisões</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            Calendário SM-2 — quantas questões vencem por dia.
          </p>
        </div>
      </div>

      {/* Stats resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { emoji: '📚', label: 'Na fila', valor: totalFila, cor: 'var(--brand-600)' },
          { emoji: '⏰', label: 'Vencidas', valor: atrasadas, cor: atrasadas > 0 ? '#ef4444' : 'var(--accent-green)' },
          { emoji: '📅', label: 'Hoje', valor: deHoje + atrasadas, cor: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: 'var(--r-xl)', padding: '20px',
            textAlign: 'center', border: '1px solid var(--gray-100)', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>{s.emoji}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: s.cor, lineHeight: 1 }}>
              {s.valor}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {totalFila === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p className="empty-state-title">Nenhuma questão na fila</p>
            <p className="empty-state-desc">
              Adicione questões à Revisão Espaçada para ver a previsão aqui.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico de barras — próximos 30 dias */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p className="section-title" style={{ margin: 0 }}>Próximos 30 dias</p>
              <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                <span style={{ color: '#4f46e5' }}>■ Pouco (≤5)</span>
                <span style={{ color: '#92400e' }}>■ Médio (≤15)</span>
                <span style={{ color: '#b91c1c' }}>■ Muito (&gt;15)</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
              {proximos30.map(({ data, key, qtd }, i) => {
                const ehHoje = data.toDateString() === hoje.toDateString();
                const selecionadoBar = diaSel?.toDateString() === data.toDateString();
                const cores = corCarga(qtd);
                return (
                  <div
                    key={key}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: qtd ? 'pointer' : 'default' }}
                    onClick={() => qtd && selecionarDia(data)}
                    title={`${data.toLocaleDateString('pt-BR')}: ${qtd} questões`}
                  >
                    <div style={{
                      width: '100%',
                      height: qtd ? `${Math.round((qtd / maxDia) * 85)}px` : '3px',
                      background: selecionadoBar ? 'var(--brand-600)' : ehHoje ? 'var(--brand-400)' : cores.bg,
                      border: `1px solid ${selecionadoBar ? 'var(--brand-700)' : ehHoje ? 'var(--brand-400)' : cores.border}`,
                      borderRadius: '4px 4px 0 0', transition: 'all 0.2s',
                    }} />
                    {(i === 0 || data.getDate() === 1 || i % 5 === 0) && (
                      <span style={{
                        fontSize: '8px', color: ehHoje ? 'var(--brand-600)' : 'var(--gray-400)',
                        marginTop: '3px', fontWeight: ehHoje ? 700 : 400,
                        transform: 'rotate(-45deg)', display: 'block',
                      }}>
                        {data.getDate()}/{data.getMonth() + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Calendário mensal */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <button onClick={() => setMesOffset(m => m - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-500)' }}>◀</button>
                <p className="section-title" style={{ margin: 0 }}>
                  {MESES_PT[mes]} {ano}
                </p>
                <button onClick={() => setMesOffset(m => m + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-500)' }}>▶</button>
              </div>

              {/* Header dias da semana */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {DIAS_PT.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--gray-400)', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid do mês */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {Array.from({ length: offsetInicio }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: diasNoMes }, (_, i) => {
                  const dia = new Date(ano, mes, i + 1);
                  const key = dia.toISOString().split('T')[0];
                  const qtd = (porDia[key] || []).length;
                  const passado = dia < hoje;
                  const selecionado = diaSel?.toDateString() === dia.toDateString();
                  return (
                    <DiaCard
                      key={key}
                      dia={dia}
                      questoes={qtd}
                      hoje={hoje}
                      passado={passado}
                      onClick={selecionarDia}
                      selecionado={selecionado}
                    />
                  );
                })}
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                {[
                  { bg: '#eef2ff', border: '#c7d2fe', label: '1-5' },
                  { bg: '#fef3c7', border: '#fde68a', label: '6-15' },
                  { bg: '#fef2f2', border: '#fecaca', label: '>15' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '12px', height: '12px', background: l.bg, border: `1.5px solid ${l.border}`, borderRadius: '3px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{l.label} questões</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel lateral — questões do dia selecionado */}
            <div className="card">
              {!diaSel ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--gray-400)' }}>
                  <span style={{ fontSize: '36px', marginBottom: '12px' }}>👆</span>
                  <p style={{ fontSize: '14px', textAlign: 'center' }}>
                    Clique em um dia com questões para ver os detalhes.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <p className="section-title" style={{ margin: 0 }}>
                      {diaSel.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <span style={{
                      background: 'var(--brand-50)', color: 'var(--brand-600)',
                      padding: '3px 10px', borderRadius: 'var(--r-full)',
                      fontSize: '12px', fontWeight: 700,
                    }}>
                      {questoesDia.length} questões
                    </span>
                  </div>

                  {questoesDia.length === 0 ? (
                    <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
                      Nenhuma questão neste dia (ou questões sem dados no banco).
                    </p>
                  ) : (
                    <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {questoesDia.map((q, i) => (
                        <div key={i} style={{
                          padding: '10px 14px', background: 'var(--gray-50)',
                          borderRadius: 'var(--r-md)', border: '1px solid var(--gray-100)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)' }}>
                              {q.materia || 'Sem matéria'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              Rep. {q.sm2?.repeticoes || 0} · EF {q.sm2?.fatorFacilidade?.toFixed(1) || '2.5'}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.5' }}>
                            {((q?.comando || q?.enunciado) || 'Questão sem texto').substring(0, 100)}
                            {((q?.comando || q?.enunciado) || '').length > 100 ? '…' : ''}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px', display: 'block' }}>
                            {q.topico ? `📌 ${q.topico}` : ''} {q.banca ? `· ${q.banca}` : ''} {q.ano ? `${q.ano}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PrevisaoRevisoes;
