// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import Avatar from 'react-nice-avatar';

/* ─── Avatares disponíveis ───
   Cada objeto agora tem uma `config` (props do React Nice Avatar)
   em vez de `emoji`. O label ajuda a identificar o estilo.
   Adaptei os mesmos grupos: estudantes, devs, cientistas, etc.
────────────────────────────────────────────────────────── */
export const AVATARES = [
  // ── Estudantes ──
  { id: 'av_01', label: 'Estudante ♀', config: { sex: 'woman',  hairStyle: 'normal',  hairColor: 'black',  skinColor: 'light' } },
  { id: 'av_02', label: 'Estudante ♂', config: { sex: 'man',    hairStyle: 'normal',  hairColor: 'brown',  skinColor: 'light' } },
  { id: 'av_03', label: 'Estudante ♀', config: { sex: 'woman',  hairStyle: 'thick',    hairColor: 'blonde', skinColor: 'light' } },
  { id: 'av_04', label: 'Estudante ♂', config: { sex: 'man',    hairStyle: 'thick',    hairColor: 'black',  skinColor: 'light' } },
  { id: 'av_05', label: 'Estudante ♀', config: { sex: 'woman',  hairStyle: 'mohawk',   hairColor: 'red',    skinColor: 'brown' } },
  { id: 'av_06', label: 'Estudante ♂', config: { sex: 'man',    hairStyle: 'mohawk',   hairColor: 'blonde', skinColor: 'brown' } },
  { id: 'av_07', label: 'Estudante ♀', config: { sex: 'woman',  hairStyle: 'normal',  hairColor: 'black',  skinColor: 'dark' } },
  { id: 'av_08', label: 'Estudante ♂', config: { sex: 'man',    hairStyle: 'normal',  hairColor: 'brown',  skinColor: 'dark' } },

  // ── Tech / Dev ──
  { id: 'av_11', label: 'Dev ♀', config: { sex: 'woman',  hairStyle: 'normal',  hairColor: 'blue',   skinColor: 'light', glassesStyle: 'round' } },
  { id: 'av_12', label: 'Dev ♂', config: { sex: 'man',    hairStyle: 'normal',  hairColor: 'black',  skinColor: 'light', glassesStyle: 'square' } },
  { id: 'av_13', label: 'Dev ♀', config: { sex: 'woman',  hairStyle: 'thick',   hairColor: 'pink',   skinColor: 'brown', glassesStyle: 'none' } },
  { id: 'av_14', label: 'Dev ♂', config: { sex: 'man',    hairStyle: 'thick',   hairColor: 'brown',  skinColor: 'brown', glassesStyle: 'none' } },

  // ── Ciência / Lab ──
  { id: 'av_16', label: 'Cientista ♀', config: { sex: 'woman', hairStyle: 'normal', hairColor: 'black', skinColor: 'light', hatStyle: 'beanie' } },
  { id: 'av_17', label: 'Cientista ♂', config: { sex: 'man',   hairStyle: 'normal', hairColor: 'brown', skinColor: 'light', hatStyle: 'none' } },
  { id: 'av_18', label: 'Cientista ♀', config: { sex: 'woman', hairStyle: 'thick',  hairColor: 'blonde',skinColor: 'brown', hatStyle: 'none' } },

  // ── Professores ──
  { id: 'av_21', label: 'Professora', config: { sex: 'woman', hairStyle: 'normal', hairColor: 'black', skinColor: 'light', shirtStyle: 'polo' } },
  { id: 'av_22', label: 'Professor',  config: { sex: 'man',   hairStyle: 'normal', hairColor: 'brown', skinColor: 'light', shirtStyle: 'polo' } },

  // ── Médicos ──
  { id: 'av_27', label: 'Médica ♀', config: { sex: 'woman', hairStyle: 'normal', hairColor: 'black', skinColor: 'light', hatStyle: 'none' } },
  { id: 'av_28', label: 'Médico ♂', config: { sex: 'man',   hairStyle: 'normal', hairColor: 'brown', skinColor: 'light', hatStyle: 'none' } },

  // ── Artistas ──
  { id: 'av_37', label: 'Artista ♀', config: { sex: 'woman', hairStyle: 'thick', hairColor: 'pink',  skinColor: 'light', hatStyle: 'beret' } },
  { id: 'av_38', label: 'Artista ♂', config: { sex: 'man',   hairStyle: 'mohawk',hairColor: 'blue',  skinColor: 'light', hatStyle: 'none' } },
];

const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome] = useState(perfil.nome || '');
  const [curso, setCurso] = useState(perfil.curso || '');
  const [avatarId, setAvatarId] = useState(perfil.avatarId || 'av_01');
  const salvar = () => { onSalvar({ nome, curso, avatarId }); onFechar(); };
  const avatarAtual = AVATARES.find(a => a.id === avatarId) || AVATARES[0];

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />
      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'460px',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',overflow:'hidden',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative' }}>
            <div style={{ width:'56px',height:'56px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.35)' }}>
              <Avatar style={{ width:'100%',height:'100%' }} {...avatarAtual.config} />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso
                ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'2px',display:'flex',alignItems:'center',gap:'5px' }}><Target size={12} />{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'2px' }}>Sem curso alvo definido</p>
              }
            </div>
            <button onClick={onFechar} style={{ position:'absolute',top:'14px',right:'14px',width:'30px',height:'30px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding:'22px 24px' }}>
            <p style={{ fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--gray-400)',marginBottom:'10px' }}>Escolha seu avatar</p>
            <div style={{ display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'18px',maxHeight:'200px',overflowY:'auto',padding:'4px' }}>
              {AVATARES.map(av => (
                <button
                  key={av.id}
                  onClick={() => setAvatarId(av.id)}
                  title={av.label}
                  style={{
                    width:'48px',height:'48px',borderRadius:'12px',
                    border: av.id===avatarId ? '2.5px solid #6366f1' : '2px solid var(--gray-200)',
                    background: av.id===avatarId ? 'var(--brand-50)' : 'var(--gray-50)',
                    cursor:'pointer', overflow:'hidden',
                    transition:'all 0.15s',
                    boxShadow: av.id===avatarId ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
                    padding: 0,
                  }}
                >
                  <Avatar style={{ width:'100%',height:'100%' }} {...av.config} />
                </button>
              ))}
            </div>

            <div style={{ marginBottom:'12px' }}>
              <label style={{ fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--gray-400)',display:'block',marginBottom:'5px' }}>Seu nome</label>
              <input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} style={{ width:'100%',padding:'9px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'var(--gray-700)',background:'var(--surface-card)',transition:'border-color 0.15s' }} onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='var(--gray-200)'} />
            </div>

            <div>
              <label style={{ fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--gray-400)',display:'block',marginBottom:'5px' }}>Curso alvo</label>
              <input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito, Engenharia..." maxLength={60} style={{ width:'100%',padding:'9px 12px',border:'1.5px solid var(--gray-200)',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box',fontFamily:'inherit',color:'var(--gray-700)',background:'var(--surface-card)',transition:'border-color 0.15s' }} onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='var(--gray-200)'} />
            </div>
          </div>

          <div style={{ padding:'14px 24px 20px',display:'flex',gap:'10px',justifyContent:'flex-end',borderTop:'1px solid var(--gray-100)' }}>
            <button onClick={onFechar} style={{ padding:'9px 18px',background:'var(--gray-100)',border:'none',borderRadius:'10px',color:'var(--gray-600)',fontSize:'14px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }} onMouseEnter={e=>e.currentTarget.style.background='var(--gray-200)'} onMouseLeave={e=>e.currentTarget.style.background='var(--gray-100)'}>
              <X size={15} /> Cancelar
            </button>
            <button onClick={salvar} style={{ padding:'9px 22px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:'10px',color:'white',fontSize:'14px',fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(99,102,241,0.35)',display:'flex',alignItems:'center',gap:'6px' }} onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(99,102,241,0.45)'; }} onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 16px rgba(99,102,241,0.35)'; }}>
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
  const [perfilData, setPerfilData] = useState(getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const containerRef = useRef(null);
  const avatarConfig = AVATARES.find(a => a.id === perfilData.avatarId)?.config || AVATARES[0].config;
  const isOwner = useIsOwner();

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = (d) => { salvarPerfil(d); setPerfilData(d); };
  const nomeExibido = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';

  const menuItems = [
    { icon: <User size={16} />,       label:'Editar perfil',       action:()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16} />,   label:'Configurações',        action:()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16} />,  label:'Backup & Restauração', action:()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <div ref={containerRef} style={{ position:'relative' }}>
        <button
          onClick={() => setDropdownAberto(d => !d)}
          title="Perfil"
          style={{
            width:'52px',height:'52px',borderRadius:'50%',
            background: dropdownAberto
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))',
            border: dropdownAberto ? '2.5px solid #6366f1' : '2px solid rgba(99,102,241,0.25)',
            cursor:'pointer',overflow:'hidden',
            transition:'all 0.2s',flexShrink:0,
            boxShadow: dropdownAberto ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
            padding: '4px', // pequeno padding para destacar o avatar do círculo
          }}
          onMouseEnter={e => {
            if (!dropdownAberto) {
              e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
            }
          }}
          onMouseLeave={e => {
            if (!dropdownAberto) {
              e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
            }
          }}
        >
          <Avatar style={{ width:'100%',height:'100%' }} {...avatarConfig} />
        </button>

        {dropdownAberto && (
          <>
            <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>
            <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:'16px',boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:'220px',overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'42px',height:'42px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)' }}>
                  <Avatar style={{ width:'100%',height:'100%' }} {...avatarConfig} />
                </div>
                <div style={{ overflow:'hidden', flex: 1 }}>
                  <p style={{ color:'white',fontWeight:700,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                  {perfilData.curso
                    ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:'12px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'4px' }}><Target size={11} />{perfilData.curso}</p>
                    : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:'11px',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>
                  }
                </div>
                {isOwner && (
                  <span style={{
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
                  }}>
                    Admin
                  </span>
                )}
              </div>

              <div style={{ padding:'6px' }}>
                {menuItems.map((item,i) => (
                  <button key={i} onClick={item.action} style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'var(--gray-700)',transition:'background 0.12s' }} onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop:'1px solid var(--gray-100)',margin:'4px 0' }} />
                <button onClick={()=>{ setDropdownAberto(false); signOut(auth); }} style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:'10px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textAlign:'left',fontSize:'14px',fontWeight:500,color:'#ef4444',transition:'background 0.12s' }} onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ width:'20px',display:'flex',alignItems:'center',justifyContent:'center' }}><LogOut size={16} /></span>
                  Sair
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