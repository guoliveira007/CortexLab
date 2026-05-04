import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { db } from '../database';
import {
  aplicarSM2, deveRevisarHoje,
  descricaoIntervalo, taxaAcerto, SM2_GRAUS,
} from './sm2';
import ExplicacaoIA from './ExplicacaoIA';
import ProgressBar from './ProgressBar';
import BotaoGrau from './BotaoGrau';
import Alternativas from './Alternativas';

const TelaInicio = memo(({ total, onIniciar, onFechar }) => (
  <div style={{ textAlign: 'center', padding: '48px 32px' }}>
    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--gray-900)' }}>
      Revisão Espaçada
    </h2>
    <p style={{ color: 'var(--gray-500)', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
      {total > 0
        ? <>Você tem <strong style={{ color: 'var(--brand-600)' }}>{total} questão(ões)</strong> para revisar hoje.<br />Isso leva ~{Math.ceil(total * 0.5)} minuto(s).</>
        : <>Nenhuma questão para revisar hoje! 🎉<br />Volte amanhã ou adicione questões ao caderno de erros.</>
      }
    </p>

    {total > 0 && (
      <div style={{
        background: 'var(--brand-50)', border: '1px solid var(--brand-200)',
        borderRadius: 'var(--r-lg)', padding: '14px 20px',
        marginBottom: '28px', textAlign: 'left', maxWidth: '380px', margin: '0 auto 28px',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--brand-600)', fontWeight: 700, marginBottom: '6px' }}>
          ⚡ Como funciona
        </p>
        {[
          'Veja a questão e responda mentalmente',
          'Revele o gabarito e avalie sua resposta',
          'O sistema agenda a próxima revisão automaticamente',
        ].map((t, i) => (
          <p key={i} style={{ fontSize: '12px', color: 'var(--brand-500)', lineHeight: '1.6' }}>
            {i + 1}. {t}
          </p>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      <button
        onClick={onFechar}
        style={{
          padding: '12px 24px', background: 'white',
          border: '1.5px solid var(--gray-200)', borderRadius: 'var(--r-lg)',
          fontWeight: 600, fontSize: '14px', color: 'var(--gray-600)', cursor: 'pointer',
        }}
      >Voltar</button>
      {total > 0 && (
        <button
          onClick={onIniciar}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
            border: 'none', borderRadius: 'var(--r-lg)',
            fontWeight: 700, fontSize: '14px', color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >Iniciar revisão →</button>
      )}
    </div>
  </div>
));
TelaInicio.displayName = 'TelaInicio';

const TelaFim = memo(({ stats, onFechar }) => (
  <div style={{ textAlign: 'center', padding: '48px 32px' }}>
    <div style={{ fontSize: '64px', marginBottom: '16px' }}>
      {stats.acertos === stats.total ? '🏆' : stats.acertos >= stats.total * 0.7 ? '🎉' : '💪'}
    </div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
      Sessão concluída!
    </h2>
    <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '28px' }}>
      {stats.acertos === stats.total ? 'Perfeito! Você acertou tudo.' : 'Continue revisando — você está evoluindo!'}
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px' }}>
      {[
        { label: 'Revisadas', valor: stats.total, cor: 'var(--brand-600)', fundo: 'var(--brand-50)', borda: 'var(--brand-200)' },
        { label: 'Acertos', valor: stats.acertos, cor: '#059669', fundo: '#ecfdf5', borda: '#bbf7d0' },
        { label: 'Erros', valor: stats.erros, cor: '#dc2626', fundo: '#fef2f2', borda: '#fecaca' },
      ].map(s => (
        <div key={s.label} style={{
          background: s.fundo, border: `1.5px solid ${s.borda}`,
          borderRadius: 'var(--r-lg)', padding: '14px 8px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: s.cor }}>{s.valor}</div>
          <div style={{ fontSize: '11px', color: s.cor, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>

    <button
      onClick={onFechar}
      style={{
        padding: '12px 32px',
        background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
        border: 'none', borderRadius: 'var(--r-lg)',
        fontWeight: 700, fontSize: '14px', color: 'white', cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
      }}
    >Concluir ✓</button>
  </div>
));
TelaFim.displayName = 'TelaFim';

const RevisaoEspacada = ({ onFechar }) => {
  const [fase, setFase]                   = useState('carregando');
  const [questoesDoDia, setQuestoesDoDia] = useState([]);
  const [indiceAtual, setIndiceAtual]     = useState(0);
  const [revelado, setRevelado]           = useState(false);
  const [respostaUsuario, setRespostaUsuario] = useState(null);
  const [stats, setStats]                 = useState({ total: 0, acertos: 0, erros: 0 });

  // ✅ CORRIGIDO: apiKey removida daqui.
  // O ExplicacaoIA agora carrega a chave internamente do Firestore (config/groq).
  // Não há mais necessidade de ler do localStorage neste componente.

  useEffect(() => {
    const carregar = async () => {
      try {
        const estados = await db.revisaoEspacada.toArray();
        const estadosPorId = {};
        estados.forEach(e => { estadosPorId[e.questaoId] = e; });

        const devidas = estados.filter(e => deveRevisarHoje(e));

        if (devidas.length === 0) {
          setFase('inicio');
          setQuestoesDoDia([]);
          return;
        }

        const ids = devidas.map(e => String(e.questaoId));
        const questoes = await db.questoes.getByIds(ids);

        const questoesComEstado = questoes.map(q => ({
          ...q,
          sm2: estadosPorId[String(q.id)] || estadosPorId[q.id],
        })).filter(q => q.sm2);

        const embaralhadas = questoesComEstado.sort(() => Math.random() - 0.5);

        setQuestoesDoDia(embaralhadas);
        setStats({ total: embaralhadas.length, acertos: 0, erros: 0 });
        setFase('inicio');
      } catch (err) {
        console.error('Erro ao carregar revisão:', err);
        toast.error('Erro ao carregar questões.');
        setFase('inicio');
      }
    };
    carregar();
  }, []);

  const handleIniciar = useCallback(() => setFase('revisando'), []);

  const handleFechar = useCallback(() => {
    if (fase === 'fim') {
      window.dispatchEvent(new CustomEvent('revisao:concluida'));
    }
    onFechar();
  }, [fase, onFechar]);

  const questaoAtual = questoesDoDia[indiceAtual];

  const proximaQuestao = useCallback(async (grau) => {
    if (!questaoAtual) return;

    const novoEstado = aplicarSM2(questaoAtual.sm2, grau);
    const acertou = grau >= 3;

    try {
      await db.revisaoEspacada.put({
        id: questaoAtual.sm2.id,
        questaoId: questaoAtual.sm2.questaoId,
        ...novoEstado,
      });

      await db.resultados.add({
        questaoId: questaoAtual.id,
        data:      new Date().toISOString(),
        acertou,
        tempo:     0,
        modo:      'revisao',
        materia:   questaoAtual.materia || null,
      });

      window.dispatchEvent(new CustomEvent('revisao:concluida'));
    } catch (err) {
      console.error('Erro ao salvar revisão:', err);
    }

    setStats(prev => ({
      ...prev,
      acertos: prev.acertos + (acertou ? 1 : 0),
      erros:   prev.erros   + (acertou ? 0 : 1),
    }));

    if (acertou) {
      toast.success(`✓ Próxima revisão: ${descricaoIntervalo(novoEstado.intervalo)}`, { duration: 2000 });
    } else {
      toast(`↩ Revisará novamente amanhã`, { icon: '📅', duration: 2000 });
    }

    if (indiceAtual + 1 >= questoesDoDia.length) {
      setFase('fim');
    } else {
      setIndiceAtual(prev => prev + 1);
      setRevelado(false);
      setRespostaUsuario(null);
    }
  }, [questaoAtual, indiceAtual, questoesDoDia.length]);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--r-2xl)',
        width: '100%', maxWidth: '680px', maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        border: '1px solid var(--gray-100)',
      }}>

        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'linear-gradient(135deg, #fafafa, white)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>🧠</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--gray-900)' }}>
                Revisão Espaçada
              </h3>
              {fase === 'revisando' && (
                <p style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                  Questão {indiceAtual + 1} de {questoesDoDia.length}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (fase === 'revisando' && !revelado) {
                if (!window.confirm('Sair da revisão agora? O progresso desta questão será perdido.')) return;
              }
              handleFechar();
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '22px', color: 'var(--gray-400)',
            }}
          >×</button>
        </div>

        {fase === 'revisando' && (
          <div style={{ padding: '0 24px', paddingTop: '12px', flexShrink: 0 }}>
            <ProgressBar
              valor={((indiceAtual) / questoesDoDia.length) * 100}
              cor='linear-gradient(90deg, var(--brand-400), var(--brand-600))'
              altura={5}
            />
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {fase === 'carregando' && (
            <div style={{ textAlign: 'center', padding: '64px 32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: 'var(--gray-500)' }}>Carregando questões...</p>
            </div>
          )}

          {fase === 'inicio' && (
            <TelaInicio
              total={questoesDoDia.length}
              onIniciar={handleIniciar}
              onFechar={handleFechar}
            />
          )}

          {fase === 'fim' && (
            <TelaFim stats={stats} onFechar={handleFechar} />
          )}

          {fase === 'revisando' && questaoAtual && (
            <div style={{ padding: '24px' }}>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[questaoAtual.banca, questaoAtual.ano, questaoAtual.materia, questaoAtual.topico]
                  .filter(Boolean).map((v, i) => (
                    <span key={i} style={{
                      background: 'var(--brand-50)', color: 'var(--brand-600)',
                      borderRadius: '99px', padding: '2px 10px',
                      fontSize: '11px', fontWeight: 600, border: '1px solid var(--brand-200)',
                    }}>{v}</span>
                  ))}
                {questaoAtual.sm2 && (
                  <span style={{
                    background: '#f0fdf4', color: '#059669',
                    borderRadius: '99px', padding: '2px 10px',
                    fontSize: '11px', fontWeight: 600, border: '1px solid #bbf7d0',
                    marginLeft: 'auto',
                  }}>
                    {taxaAcerto(questaoAtual.sm2) !== null ? `${taxaAcerto(questaoAtual.sm2)}% de acerto` : 'Nova'}
                  </span>
                )}
              </div>

              <div style={{
                background: 'var(--gray-50)', borderRadius: 'var(--r-lg)',
                padding: '16px 18px', marginBottom: '16px',
                border: '1px solid var(--gray-100)',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.7', marginBottom: questaoAtual.comando ? '10px' : 0 }}>
                  {questaoAtual.enunciado}
                </p>
                {questaoAtual.comando && (
                  <p style={{
                    fontSize: '13px', color: '#92400e', fontWeight: 600,
                    borderTop: '1px solid var(--gray-200)', paddingTop: '10px',
                  }}>
                    {questaoAtual.comando}
                  </p>
                )}
              </div>

              <Alternativas
                alternativas={questaoAtual.alternativas}
                imagensAlternativas={questaoAtual.imagensAlternativas}
                gabarito={questaoAtual.gabarito}
                resposta={respostaUsuario}
                onResponder={(lt) => !revelado && setRespostaUsuario(lt)}
                feedbackTexto={
                  revelado
                    ? (respostaUsuario === questaoAtual.gabarito ? '✅ Acertou!' : `❌ Resposta correta: ${questaoAtual.gabarito}`)
                    : null
                }
                explicacao={questaoAtual.explicacao}
              />

              {!revelado && (
                <button
                  onClick={() => setRevelado(true)}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                    border: 'none', borderRadius: 'var(--r-lg)',
                    fontWeight: 700, fontSize: '15px', color: 'white',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                    marginTop: '20px',
                  }}
                >
                  Revelar gabarito →
                </button>
              )}

              {revelado && (
                <div style={{ marginTop: '16px' }}>
                  {questaoAtual.explicacao && (
                    <div style={{
                      background: 'var(--gray-50)', borderRadius: 'var(--r-md)',
                      padding: '12px 14px', marginBottom: '16px',
                      borderLeft: '3px solid var(--brand-300)',
                      fontSize: '13px', color: 'var(--gray-600)', lineHeight: '1.6',
                    }}>
                      <strong style={{ color: 'var(--brand-600)', display: 'block', marginBottom: '4px' }}>💡 Explicação</strong>
                      {questaoAtual.explicacao}
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    {/* ✅ CORRIGIDO: apiKey removida — ExplicacaoIA carrega
                        a chave internamente do Firestore (config/groq).
                        A prop pode ser omitida sem quebrar nada. */}
                    <ExplicacaoIA
                      questao={questaoAtual}
                      respostaUsuario={respostaUsuario || ''}
                      style={{ width: '100%', justifyContent: 'center' }}
                    />
                  </div>

                  <p style={{
                    textAlign: 'center', fontSize: '13px',
                    color: 'var(--gray-500)', marginBottom: '10px', fontWeight: 600,
                  }}>
                    Como foi?
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <BotaoGrau
                      grau={SM2_GRAUS.ERROU}
                      label="Errei"
                      emoji="😓"
                      cor="#dc2626"
                      fundo="#fef2f2"
                      borda="#fca5a5"
                      onClick={proximaQuestao}
                    />
                    <BotaoGrau
                      grau={SM2_GRAUS.DIFICIL}
                      label="Difícil"
                      emoji="😅"
                      cor="#d97706"
                      fundo="#fffbeb"
                      borda="#fde68a"
                      onClick={proximaQuestao}
                    />
                    <BotaoGrau
                      grau={SM2_GRAUS.FACIL}
                      label="Fácil"
                      emoji="😄"
                      cor="#059669"
                      fundo="#ecfdf5"
                      borda="#bbf7d0"
                      onClick={proximaQuestao}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  , document.body);
};

export default RevisaoEspacada;
