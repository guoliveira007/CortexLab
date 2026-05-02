// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';

/* ════════════════════════════════════════════════════
   100 AVATARES DIVERSOS — estilo Lorelei (DiceBear)
   Cada seed gera um personagem único e determinístico.
   Não há opções manuais: diversidade garantida automaticamente.
   ════════════════════════════════════════════════════ */
const TOTAL_AVATARES = 100;
const AVATARES = Array.from({ length: TOTAL_AVATARES }, (_, i) => ({
  id: `lorelei-${String(i + 1).padStart(3, '0')}`,
  seed: `cortexlab-lorelei-${i + 1}`, // seed determinística
}));

/* ─── Armazenamento do perfil ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Cache de avatares gerados ─── */
const AVATAR_CACHE = new Map();

const gerarDataUri = (seed, size = 128) => {
  const chave = `${seed}-${size}`;
  if (AVATAR_CACHE.has(chave)) return AVATAR_CACHE.get(chave);

  const avatar = createAvatar(lorelei, {
    seed,
    size,
    // Sem opções manuais: o lorelei gera diversidade automaticamente
  });
  const uri = avatar.toDataUri();
  AVATAR_CACHE.set(chave, uri);
  return uri;
};

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome] = useState(perfil.nome || '');
  const [curso, setCurso] = useState(perfil.curso || '');
  const [avatarId, setAvatarId] = useState(perfil.avatarId || AVATARES[0].id);

  const salvar = () => {
    onSalvar({ nome, curso, avatarId });
    onFechar();
  };

  const seedAtual = AVATARES.find(a => a.id === avatarId)?.seed || AVATARES[0].seed;
  const dataUriPreview = useMemo(() => gerarDataUri(seedAtual, 80), [seedAtual]);

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Cabeçalho */}
          <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <div style={{ width:'64px',height:'64px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,0.4)',background:'#f0f0f0' }}>
              <img src={dataUriPreview} alt="Preview" style={{ width:'100%',height:'100%' }} draggable={false} />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'2px',display:'flex',alignItems:'center',gap:'5px' }}><Target size={12} />{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'2px' }}>Sem curso alvo definido</p>}
            </div>
            <button onClick={onFechar} style={{ position:'absolute',top:'14px',right:'14px',width:'30px',height:'30px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}><X size={16} /></button>
          </div>

          {/* Corpo com grade de avatares */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'18px' }}>
              <div><label className="field-label">Seu nome</label><input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} className="input-modern" /></div>
              <div><label className="field-label">Curso alvo</label><input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito..." maxLength={60} className="input-modern" /></div>
            </div>

            <p style={{ fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--gray-400)',marginBottom:'12px' }}>
              Escolha seu avatar — {TOTAL_AVATARES} opções com diversidade
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              gap: '8px',
              marginBottom: '10px',
            }}>
              {AVATARES.map((av) => {
                const isSelected = av.id === avatarId;
                const dataUri = useMemo(() => gerarDataUri(av.seed, 44), [av.seed]);
                return (
                  <button
                    key={av.id}
                    onClick={() => setAvatarId(av.id)}
                    title={`Avatar ${av.id}`}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: isSelected ? '2.5px solid #6366f1' : '2px solid var(--gray-200)',
                      background: isSelected ? 'var(--brand-50)' : 'transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: '2px',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
                    }}
                  >
                    <img src={dataUri} alt={av.id} style={{ width:'100%',height:'100%',display:'block' }} draggable={false} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ padding:'14px 24px 20px',display:'flex',gap:'10px',justifyContent:'flex-end',borderTop:'1px solid var(--gray-100)',flexShrink:0 }}>
            <button onClick={onFechar} className="btn-secondary" style={{ display:'flex',alignItems:'center',gap:'6px' }}><X size={15} /> Cancelar</button>
            <button onClick={salvar} className="btn-primary" style={{ display:'flex',alignItems:'center',gap:'6px' }}><Check size={15} /> Salvar</button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Componente principal ─── */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData, setPerfilData] = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();

  // Avatar atual salvo (ou o primeiro da lista)
  const avatarAtual = AVATARES.find(a => a.id === perfilData.avatarId) || AVATARES[0];
  const seedAtual = avatarAtual.seed;
  const dataUriAtual = useMemo(() => gerarDataUri(seedAtual, 46), [seedAtual]);

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = (d) => { salvarPerfil(d); setPerfilData(d); };
  const nomeExibido = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';

  const menuItems = [
    { icon: <User size={16} />, label:'Editar perfil', action:()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16} />, label:'Configurações', action:()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16} />, label:'Backup & Restauração', action:()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <div ref={containerRef} style={{ position:'relative' }}>
        {/* Botão do perfil */}
        <button onClick={()=>setDropdownAberto(d=>!d)} title="Perfil" style={{ width:'52px',height:'52px',borderRadius:'50%',background:dropdownAberto?'linear-gradient(135deg,#6366f1,#8b5cf6)':'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))',border:dropdownAberto?'2.5px solid #6366f1':'2px solid rgba(99,102,241,0.25)',cursor:'pointer',overflow:'hidden',transition:'all 0.2s',flexShrink:0,boxShadow:dropdownAberto?'0 0 0 4px rgba(99,102,241,0.15)':'none',padding:'3px' }}
          onMouseEnter={e=>{ if(!dropdownAberto){ e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))'; e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'; }}}
          onMouseLeave={e=>{ if(!dropdownAberto){ e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))'; e.currentTarget.style.borderColor='rgba(99,102,241,0.25)'; }}}
        >
          <img src={dataUriAtual} alt="Avatar" style={{ width:'100%',height:'100%',display:'block' }} draggable={false} />
        </button>

        {/* Dropdown do perfil */}
        {dropdownAberto && (
          <>
            <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>
            <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:'16px',boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:'240px',overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'42px',height:'42px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)',background:'#f0f0f0' }}>
                  <img src={dataUriAtual} alt="Avatar" style={{ width:'100%',height:'100%',display:'block' }} draggable={false} />
                </div>
                <div style={{ overflow:'hidden',flex:1 }}>
                  <p style={{ color:'white',fontWeight:700,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                  {perfilData.curso ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:'12px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'4px' }}><Target size={11} />{perfilData.curso}</p>
                    : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:'11px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
                </div>
                {isOwner && <span style={{ background:'linear-gradient(135deg, #f59e0b, #d97706)',color:'white',fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'4px',letterSpacing:'0.05em',textTransform:'uppercase',flexShrink:0,boxShadow:'0 2px 6px rgba(245,158,11,0.4)' }}>Admin</span>}
              </div>
              <div style={{ padding:'6px' }}>
                {menuItems.map((item,i) => (
                  <button key={i} onClick={item.action} style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'var(--gray-700)',transition:'background 0.12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span> {item.label}
                  </button>
                ))}
                <div style={{ borderTop:'1px solid var(--gray-100)',margin:'4px 0' }} />
                <button onClick={()=>{ setDropdownAberto(false); signOut(auth); }} style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'#ef4444',transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center' }}><LogOut size={16} /></span> Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {modalAberto && <ModalPerfil perfil={perfilData} onFechar={()=>setModalAberto(false)} onSalvar={handleSalvar} />}
    </>
  );
};

export default AvatarPerfil;