import React, { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   AVATARES — 5 masculinos + 5 femininos
   ═══════════════════════════════════════════════════════════ */
export const AVATARES = [
  // Masculinos
  { id: 'masc_1', emoji: '🧑‍💻', label: 'Desenvolvedor',  grupo: 'masculino' },
  { id: 'masc_2', emoji: '👨‍🎓', label: 'Estudante',      grupo: 'masculino' },
  { id: 'masc_3', emoji: '🧑‍🏫', label: 'Professor',      grupo: 'masculino' },
  { id: 'masc_4', emoji: '🧑‍⚖️', label: 'Advogado',       grupo: 'masculino' },
  { id: 'masc_5', emoji: '🧑‍🔬', label: 'Cientista',      grupo: 'masculino' },
  // Femininos
  { id: 'fem_1',  emoji: '👩‍💻', label: 'Desenvolvedora', grupo: 'feminino'  },
  { id: 'fem_2',  emoji: '👩‍🎓', label: 'Estudante',      grupo: 'feminino'  },
  { id: 'fem_3',  emoji: '👩‍🏫', label: 'Professora',     grupo: 'feminino'  },
  { id: 'fem_4',  emoji: '👩‍⚖️', label: 'Advogada',       grupo: 'feminino'  },
  { id: 'fem_5',  emoji: '👩‍🔬', label: 'Cientista',      grupo: 'feminino'  },
];

const STORAGE_KEY = 'cortexlab_perfil';

export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

const salvarPerfil = (dados) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
};

/* ═══════════════════════════════════════════════════════════
   MODAL DE EDIÇÃO DE PERFIL
   ═══════════════════════════════════════════════════════════ */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome]         = useState(perfil.nome || '');
  const [concurso, setConcurso] = useState(perfil.concurso || '');
  const [avatarId, setAvatarId] = useState(perfil.avatarId || 'masc_2');

  const salvar = () => {
    onSalvar({ nome, concurso, avatarId });
    onFechar();
  };

  const avatarAtual = AVATARES.find(a => a.id === avatarId) || AVATARES[1];

  return (
    <>
      <style>{`
        @keyframes perfil-modal-in {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes perfil-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onFechar}
        style={{
          position: 'fixed', inset: 0, zIndex: 9100,
          background: 'rgba(10, 15, 30, 0.65)',
          backdropFilter: 'blur(6px)',
          animation: 'perfil-overlay-in 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9101,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', pointerEvents: 'none',
        }}
      >
        <div style={{
          background: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'perfil-modal-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'all',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '28px 28px 24px',
            textAlign: 'center',
            position: 'relative',
          }}>
            <button
              onClick={onFechar}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                width: '32px', height: '32px',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', color: 'white',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >×</button>

            {/* Avatar atual grande */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '44px',
              margin: '0 auto 12px',
              border: '3px solid rgba(255,255,255,0.4)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}>
              {avatarAtual.emoji}
            </div>
            <h3 style={{
              color: 'white', fontSize: '20px', fontWeight: 800,
              fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
            }}>
              Editar Perfil
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '4px' }}>
              {avatarAtual.label}
            </p>
          </div>

          {/* Conteúdo */}
          <div style={{ padding: '24px 28px' }}>

            {/* Escolher avatar */}
            <p style={{
              fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: '10px',
            }}>
              Escolha seu avatar
            </p>

            {/* Grupos */}
            {['masculino', 'feminino'].map(grupo => (
              <div key={grupo} style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '6px', fontWeight: 600 }}>
                  {grupo === 'masculino' ? '👦 Masculinos' : '👧 Femininos'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {AVATARES.filter(a => a.grupo === grupo).map(av => (
                    <button
                      key={av.id}
                      onClick={() => setAvatarId(av.id)}
                      title={av.label}
                      style={{
                        width: '52px', height: '52px',
                        borderRadius: '14px',
                        border: av.id === avatarId
                          ? '2.5px solid #6366f1'
                          : '2px solid var(--gray-200)',
                        background: av.id === avatarId ? '#eef2ff' : 'var(--gray-50)',
                        cursor: 'pointer',
                        fontSize: '26px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        boxShadow: av.id === avatarId ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (av.id !== avatarId) e.currentTarget.style.borderColor = '#a5b4fc';
                      }}
                      onMouseLeave={e => {
                        if (av.id !== avatarId) e.currentTarget.style.borderColor = 'var(--gray-200)';
                      }}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Nome */}
            <div style={{ marginTop: '8px', marginBottom: '14px' }}>
              <label style={{
                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--gray-400)',
                display: 'block', marginBottom: '6px',
              }}>
                Seu nome (opcional)
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Maria, João..."
                maxLength={40}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: '10px', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', color: 'var(--gray-700)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            {/* Concurso alvo */}
            <div style={{ marginBottom: '4px' }}>
              <label style={{
                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--gray-400)',
                display: 'block', marginBottom: '6px',
              }}>
                Concurso alvo (opcional)
              </label>
              <input
                type="text"
                value={concurso}
                onChange={e => setConcurso(e.target.value)}
                placeholder="Ex: TRF, INSS, Receita Federal..."
                maxLength={60}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: '10px', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', color: 'var(--gray-700)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px 24px',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            borderTop: '1px solid var(--gray-100)',
          }}>
            <button
              onClick={onFechar}
              style={{
                padding: '10px 20px',
                background: 'var(--gray-100)', border: 'none',
                borderRadius: '10px', color: 'var(--gray-600)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-200)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-100)'}
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}
            >
              ✓ Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — Avatar com dropdown
   ═══════════════════════════════════════════════════════════ */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData, setPerfilData] = useState(getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto]       = useState(false);
  const containerRef = useRef(null);

  const avatar = AVATARES.find(a => a.id === perfilData.avatarId) || AVATARES[1];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSalvarPerfil = (dados) => {
    salvarPerfil(dados);
    setPerfilData(dados);
  };

  const nomeExibido = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';

  return (
    <>
      <div ref={containerRef} style={{ position: 'relative' }}>

        {/* Botão do avatar */}
        <button
          onClick={() => setDropdownAberto(d => !d)}
          title="Perfil"
          style={{
            width: '42px', height: '42px',
            borderRadius: '50%',
            background: dropdownAberto
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
            border: dropdownAberto
              ? '2.5px solid #6366f1'
              : '2px solid rgba(99,102,241,0.25)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
            transition: 'all 0.2s',
            boxShadow: dropdownAberto
              ? '0 0 0 4px rgba(99,102,241,0.15)'
              : 'none',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (!dropdownAberto) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
            }
          }}
          onMouseLeave={e => {
            if (!dropdownAberto) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
            }
          }}
        >
          {avatar.emoji}
        </button>

        {/* Dropdown */}
        {dropdownAberto && (
          <>
            <style>{`
              @keyframes dropdown-in {
                from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
              minWidth: '220px',
              overflow: 'hidden',
              zIndex: 8000,
              animation: 'dropdown-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}>

              {/* Cabeçalho do dropdown */}
              <div style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.3)',
                }}>
                  {avatar.emoji}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{
                    color: 'white', fontWeight: 700, fontSize: '14px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {nomeExibido}
                  </p>
                  {perfilData.concurso && (
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '2px' }}>
                      🎯 {perfilData.concurso}
                    </p>
                  )}
                  {userEmail && (
                    <p style={{
                      color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {userEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Itens do menu */}
              <div style={{ padding: '6px' }}>
                {[
                  { icon: '👤', label: 'Editar perfil', action: () => { setDropdownAberto(false); setModalAberto(true); } },
                  { icon: '⚙️', label: 'Configurações', action: () => { setDropdownAberto(false); onAbrirConfig(); } },
                  { icon: '💾', label: 'Backup & Restauração', action: () => { setDropdownAberto(false); onIrParaBackup(); } },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'none', border: 'none',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      cursor: 'pointer', textAlign: 'left',
                      fontSize: '14px', fontWeight: 500,
                      color: 'var(--gray-700)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de edição de perfil */}
      {modalAberto && (
        <ModalPerfil
          perfil={perfilData}
          onFechar={() => setModalAberto(false)}
          onSalvar={handleSalvarPerfil}
        />
      )}
    </>
  );
};

export default AvatarPerfil;
