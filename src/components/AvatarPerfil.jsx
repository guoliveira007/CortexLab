// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';

/* ════════════════════════════════════════════════════
   SISTEMA DE AVATAR — SVG puro, sem dependências externas
   ════════════════════════════════════════════════════ */

const EMOJIS = [
  '😀','😎','🤓','🧑','👩','👨','🧔','👱','🧕','🎓',
  '🥷','🧑‍💻','👩‍💻','👨‍💻','🧑‍🔬','👩‍🔬','👨‍🔬','🦸','🧙','🐱',
  '🐶','🦊','🐼','🐨','🐯','🦁','🐸','🦋','🌟','🚀',
];

const CORES = [
  { label: 'Índigo',    bg: '#6366f1' },
  { label: 'Violeta',   bg: '#8b5cf6' },
  { label: 'Rosa',      bg: '#ec4899' },
  { label: 'Vermelho',  bg: '#ef4444' },
  { label: 'Laranja',   bg: '#f97316' },
  { label: 'Âmbar',     bg: '#f59e0b' },
  { label: 'Verde',     bg: '#10b981' },
  { label: 'Ciano',     bg: '#06b6d4' },
  { label: 'Azul',      bg: '#3b82f6' },
  { label: 'Slate',     bg: '#475569' },
  { label: 'Nude',      bg: '#d4a27f' },
  { label: 'Escuro',    bg: '#1e293b' },
];

const CONFIG_PADRAO = {
  emoji: '😎',
  cor:   '#6366f1',
};

/* ─── Avatar SVG inline — zero requests externos ─── */
const AvatarSvg = ({ emoji, cor, size = 46 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '50%' }}
  >
    <circle cx="50" cy="50" r="50" fill={cor} />
    <text
      x="50"
      y="54"
      dominantBaseline="middle"
      textAnchor="middle"
      fontSize="46"
      style={{ userSelect: 'none' }}
    >
      {emoji}
    </text>
  </svg>
);

/* ─── Armazenamento do perfil ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome,   setNome]   = useState(perfil.nome   || '');
  const [curso,  setCurso]  = useState(perfil.curso  || '');
  const [config, setConfig] = useState({ ...CONFIG_PADRAO, ...(perfil.avatarConfig || {}) });

  const salvar = () => {
    onSalvar({ nome, curso, avatarConfig: config });
    onFechar();
  };

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg  { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />

      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Header */}
          <div style={{ background:`linear-gradient(135deg, ${config.cor}ee, ${config.cor}99)`,padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <div style={{ width:'80px',height:'80px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,0.4)' }}>
              <AvatarSvg emoji={config.emoji} cor={config.cor} size={80} />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso
                ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'2px',display:'flex',alignItems:'center',gap:'5px' }}><Target size={12} />{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'2px' }}>Sem curso alvo</p>}
            </div>
            <button onClick={onFechar}
              style={{ position:'absolute',top:'14px',right:'14px',width:'30px',height:'30px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            ><X size={16} /></button>
          </div>

          {/* Corpo */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>

            {/* Nome + Curso */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px' }}>
              <div>
                <label className="field-label">Seu nome</label>
                <input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} className="input-modern" />
              </div>
              <div>
                <label className="field-label">Curso alvo</label>
                <input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito..." maxLength={60} className="input-modern" />
              </div>
            </div>

            {/* Cor */}
            <p className="field-label" style={{ marginBottom:'10px' }}>Cor do avatar</p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'24px' }}>
              {CORES.map(c => (
                <button
                  key={c.bg}
                  title={c.label}
                  onClick={() => setConfig(prev => ({ ...prev, cor: c.bg }))}
                  style={{
                    width:'32px',height:'32px',borderRadius:'50%',
                    background: c.bg,
                    border: config.cor === c.bg ? '3px solid var(--gray-900)' : '2px solid transparent',
                    outline: config.cor === c.bg ? `3px solid ${c.bg}` : 'none',
                    outlineOffset: '2px',
                    cursor:'pointer',transition:'transform 0.12s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                />
              ))}
            </div>

            {/* Emoji */}
            <p className="field-label" style={{ marginBottom:'10px' }}>Ícone do avatar</p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:'6px' }}>
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setConfig(prev => ({ ...prev, emoji: em }))}
                  style={{
                    width:'44px',height:'44px',borderRadius:'10px',
                    fontSize:'22px',lineHeight:1,
                    border: config.emoji === em ? '2px solid #6366f1' : '1.5px solid var(--gray-200)',
                    background: config.emoji === em ? 'var(--brand-50)' : 'transparent',
                    cursor:'pointer',transition:'all 0.12s',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}
                  onMouseEnter={e=>{ if(config.emoji!==em) e.currentTarget.style.background='var(--gray-50)'; }}
                  onMouseLeave={e=>{ if(config.emoji!==em) e.currentTarget.style.background='transparent'; }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
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
  const [perfilData,     setPerfilData]    = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto,    setModalAberto]    = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();

  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };
  const nomeExibido  = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = (d) => { salvarPerfil(d); setPerfilData(d); };

  const menuItems = [
    { icon: <User size={16} />,      label:'Editar perfil',        action:()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16} />,  label:'Configurações',        action:()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16} />, label:'Backup & Restauração', action:()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>

      <div ref={containerRef} style={{ position:'relative' }}>

        {/* Botão avatar */}
        <button
          onClick={()=>setDropdownAberto(d=>!d)}
          title="Perfil"
          style={{
            width:'52px',height:'52px',borderRadius:'50%',
            background:'transparent',
            border: dropdownAberto ? `2.5px solid ${avatarConfig.cor}` : `2px solid ${avatarConfig.cor}55`,
            cursor:'pointer',overflow:'hidden',transition:'all 0.2s',flexShrink:0,
            boxShadow: dropdownAberto ? `0 0 0 4px ${avatarConfig.cor}33` : 'none',
            padding:'2px',
          }}
          onMouseEnter={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=avatarConfig.cor; }}
          onMouseLeave={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=`${avatarConfig.cor}55`; }}
        >
          <AvatarSvg emoji={avatarConfig.emoji} cor={avatarConfig.cor} size={46} />
        </button>

        {/* Dropdown */}
        {dropdownAberto && (
          <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:'16px',boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:'240px',overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>

            <div style={{ background:`linear-gradient(135deg, ${avatarConfig.cor}ee, ${avatarConfig.cor}99)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px' }}>
              <div style={{ width:'42px',height:'42px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)' }}>
                <AvatarSvg emoji={avatarConfig.emoji} cor={avatarConfig.cor} size={42} />
              </div>
              <div style={{ overflow:'hidden',flex:1 }}>
                <p style={{ color:'white',fontWeight:700,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                {perfilData.curso
                  ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:'12px',marginTop:'2px',display:'flex',alignItems:'center',gap:'4px' }}><Target size={11} />{perfilData.curso}</p>
                  : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:'11px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
              </div>
              {isOwner && (
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'4px',textTransform:'uppercase',flexShrink:0 }}>
                  Admin
                </span>
              )}
            </div>

            <div style={{ padding:'6px' }}>
              {menuItems.map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'var(--gray-700)',transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop:'1px solid var(--gray-100)',margin:'4px 0' }} />
              <button
                onClick={()=>{ setDropdownAberto(false); signOut(auth); }}
                style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'#ef4444',transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center' }}><LogOut size={16} /></span>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalPerfil
          perfil={perfilData}
          onFechar={()=>setModalAberto(false)}
          onSalvar={handleSalvar}
        />
      )}
    </>
  );
};

export default AvatarPerfil;
