// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

/* ═══════════════════════════════════════════════════════════
   100 AVATARES DISPONÍVEIS
   Cada um é identificado por uma seed única (string).
   A seed é usada para gerar o SVG via DiceBear.
   O estilo é "avataaars" (personagens de corpo inteiro).
   ═══════════════════════════════════════════════════════════ */
const TOTAL_AVATARES = 100;
const AVATARES = Array.from({ length: TOTAL_AVATARES }, (_, i) => ({
  id: `ava-${String(i + 1).padStart(3, '0')}`,
  seed: `cortexlab-user-${i + 1}`, // seed determinística
}));

const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Componente para renderizar um avatar (evita recriações) ─── */
const AvatarImage = React.memo(({ seed, size = 128 }) => {
  const svg = useMemo(() => {
    const avatar = createAvatar(avataaars, {
      seed,
      size,
      backgroundColor: ['f0f0f0', 'e8f4f8', 'f5f5dc', 'ffe4e1', 'e6e6fa'],
    });
    return avatar.toString(); // retorna SVG como string
  }, [seed, size]);

  return (
    <div
      style={{ width: size, height: size, overflow: 'hidden', borderRadius: '50%' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
AvatarImage.displayName = 'AvatarImage';

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome] = useState(perfil.nome || '');
  const [curso, setCurso] = useState(perfil.curso || '');
  const [avatarId, setAvatarId] = useState(perfil.avatarId || AVATARES[0].id);
  const salvar = () => {
    onSalvar({ nome, curso, avatarId });
    onFechar();
  };

  const seedSelecionada = AVATARES.find(a => a.id === avatarId)?.seed || AVATARES[0].seed;

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div
        onClick={onFechar}
        style={{
          position: 'fixed', inset: 0, zIndex: 9100,
          background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(6px)',
          animation: 'pm-bg 0.2s ease',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9101,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', pointerEvents: 'none',
        }}
      >
        <div
          className="dark-modal"
          style={{
            background: 'var(--surface-card)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            animation: 'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'all',
          }}
        >
          {/* Cabeçalho */}
          <div style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            padding: '20px 24px 18px',
            display: 'flex', alignItems: 'center', gap: '14px',
            position: 'relative', flexShrink: 0,
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '3px solid rgba(255,255,255,0.4)' }}>
              <AvatarImage seed={seedSelecionada} size={64} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-display)' }}>
                {nome || 'Meu perfil'}
              </p>
              {curso ? (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Target size={12} />{curso}
                </p>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>
                  Sem curso alvo definido
                </p>
              )}
            </div>
            <button
              onClick={onFechar}
              style={{
                position: 'absolute', top: '14px', right: '14px',
                width: '30px', height: '30px',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Corpo com scroll */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* Seletor de avatar */}
            <p style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: '12px',
            }}>
              Escolha seu avatar — {TOTAL_AVATARES} opções
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
              gap: '8px',
              marginBottom: '20px',
            }}>
              {AVATARES.map((av) => {
                const isSelected = av.id === avatarId;
                return (
                  <button
                    key={av.id}
                    onClick={() => setAvatarId(av.id)}
                    title={av.id}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      border: isSelected ? '2.5px solid #6366f1' : '2px solid var(--gray-200)',
                      background: isSelected ? 'var(--brand-50)' : 'transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: '2px',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
                    }}
                  >
                    <AvatarImage seed={av.seed} size={42} />
                  </button>
                );
              })}
            </div>

            {/* Nome */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--gray-400)',
                display: 'block', marginBottom: '5px',
              }}>
                Seu nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria, João..."
                maxLength={40}
                className="input-modern"
              />
            </div>

            {/* Curso */}
            <div>
              <label style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--gray-400)',
                display: 'block', marginBottom: '5px',
              }}>
                Curso alvo
              </label>
              <input
                type="text"
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                placeholder="Ex: Medicina, Direito, Engenharia..."
                maxLength={60}
                className="input-modern"
              />
            </div>
          </div>

          {/* Rodapé */}
          <div style={{
            padding: '14px 24px 20px',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            borderTop: '1px solid var(--gray-100)',
            flexShrink: 0,
          }}>
            <button
              onClick={onFechar}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={15} /> Cancelar
            </button>
            <button
              onClick={salvar}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={15} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Componente principal ─── */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData, setPerfilData] = useState(getPerfil);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();

  // Seed atual (a salva ou a primeira da lista)
  const avatarAtual = AVATARES.find(a => a.id === perfilData.avatarId) || AVATARES[0];
  const seedAtual = avatarAtual.seed;

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = (d) => {
    salvarPerfil(d);
    setPerfilData(d);
  };

  const nomeExibido = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';

  const menuItems = [
    {
      icon: <User size={16} />,
      label: 'Editar perfil',
      action: () => {
        setDropdownAberto(false);
        setModalAberto(true);
      },
    },
    {
      icon: <Settings size={16} />,
      label: 'Configurações',
      action: () => {
        setDropdownAberto(false);
        onAbrirConfig();
      },
    },
    {
      icon: <HardDrive size={16} />,
      label: 'Backup & Restauração',
      action: () => {
        setDropdownAberto(false);
        onIrParaBackup();
      },
    },
  ];

  return (
    <>
      <div ref={containerRef} style={{ position: 'relative' }}>
        {/* Botão principal (bolinha) */}
        <button
          onClick={() => setDropdownAberto((d) => !d)}
          title="Perfil"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: dropdownAberto
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))',
            border: dropdownAberto ? '2.5px solid #6366f1' : '2px solid rgba(99,102,241,0.25)',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.2s',
            flexShrink: 0,
            boxShadow: dropdownAberto ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
            padding: '3px',
          }}
          onMouseEnter={(e) => {
            if (!dropdownAberto) {
              e.currentTarget.style.background =
                'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!dropdownAberto) {
              e.currentTarget.style.background =
                'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
            }
          }}
        >
          <AvatarImage seed={seedAtual} size={46} />
        </button>

        {/* Dropdown */}
        {dropdownAberto && (
          <>
            <style>{`
              @keyframes dd-in {
                from { opacity:0; transform:translateY(-8px) scale(0.96); }
                to { opacity:1; transform:none; }
              }
            `}</style>
            <div
              className="dark-modal"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                background: 'var(--surface-card)',
                borderRadius: '16px',
                boxShadow:
                  '0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
                minWidth: '240px',
                overflow: 'hidden',
                zIndex: 8000,
                animation: 'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {/* Cabeçalho do dropdown */}
              <div
                style={{
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <AvatarImage seed={seedAtual} size={42} />
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <p
                    style={{
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {nomeExibido}
                  </p>
                  {perfilData.curso ? (
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '12px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Target size={11} />
                      {perfilData.curso}
                    </p>
                  ) : (
                    userEmail && (
                      <p
                        style={{
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '11px',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {userEmail}
                      </p>
                    )
                  )}
                </div>
                {isOwner && (
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(245,158,11,0.4)',
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>

              {/* Itens do menu */}
              <div style={{ padding: '6px' }}>
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--gray-700)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--gray-50)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'none')
                    }
                  >
                    <span
                      style={{
                        width: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--gray-500)',
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--gray-100)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    setDropdownAberto(false);
                    signOut(auth);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#ef4444',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#fef2f2')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'none')
                  }
                >
                  <span
                    style={{
                      width: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LogOut size={16} />
                  </span>
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de edição */}
      {modalAberto && (
        <ModalPerfil
          perfil={perfilData}
          onFechar={() => setModalAberto(false)}
          onSalvar={handleSalvar}
        />
      )}
    </>
  );
};

export default AvatarPerfil;