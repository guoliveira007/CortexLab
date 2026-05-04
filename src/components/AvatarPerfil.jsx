// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { User, Settings, HardDrive, LogOut, Check, Target, X, Sparkles } from 'lucide-react';
import NiceAvatar from '@nice-avatar-svg/react';
import { auth } from '../firebase';
import { useIsOwner } from '../hooks/useIsOwner';

// db inicializado localmente — firebase.js exporta só auth para evitar
// conflito com a persistência offline configurada em database.js
const db = getFirestore(getApp());

/* ════════════════════════════════════════════════════
   SISTEMA DE AVATAR — Emoji SVG + Nice Avatar SVG 2D
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

const CONFIG_PADRAO = { emoji: '😎', cor: '#6366f1' };

/* ─── Opções do Nice Avatar ─── */
const NICE_OPCOES = {
  skinColor:  ['#F9C9B6', '#FDDBB4', '#F0C27F', '#C8A97E', '#A0724A', '#7B4F2E', '#4A2E1A'],
  hairColor:  ['#2C1B18', '#4A2E1A', '#8D5524', '#C68642', '#F0C040', '#E8B4B8', '#9B59B6', '#2980B9', '#FFFFFF'],
  bgColor:    ['#6BD9E9', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#1e293b'],
  shirtColor: ['#FFFFFF', '#F4D150', '#6BD9E9', '#6366f1', '#ec4899', '#10b981', '#ef4444', '#475569', '#1e293b'],
};

const NICE_AVATAR_PADRAO = {
  bgColor:         '#6BD9E9',
  skinColor:       '#F9C9B6',
  hairColor:       '#4A2E1A',
  hairStyle:       'normal',
  eyesStyle:       'smiling',
  eyebrowsStyle:   'up',
  mouthStyle:      'smile',
  noseStyle:       'round',
  glassesStyle:    'none',
  facialHairStyle: 'none',
  shirtStyle:      'hoody',
  shirtColor:      '#6366f1',
  earRing:         'none',
  earSize:         'small',
};

const NICE_LABELS = {
  hairStyle:       { label: 'Cabelo',       options: { normal:'Normal', thick:'Espesso', mohawk:'Moicano', womanLong:'Feminino longo', womanShort:'Feminino curto', dannyPhantom:'Danny Phantom', fonze:'Fonzie', pixie:'Pixie', turban:'Turbante', hat:'Chapéu' } },
  eyesStyle:       { label: 'Olhos',        options: { circle:'Círculo', oval:'Oval', smiling:'Sorridente', base:'Base' } },
  eyebrowsStyle:   { label: 'Sobrancelhas', options: { up:'Para cima', eyelashesUp:'Cílios cima', eyelashesDown:'Cílios baixo' } },
  mouthStyle:      { label: 'Boca',         options: { laugh:'Gargalhada', smile:'Sorriso', peace:'Paz', smirk:'Irônico', surprised:'Surpreso', nervous:'Nervoso', sad:'Triste', pucker:'Beicinho' } },
  noseStyle:       { label: 'Nariz',        options: { short:'Curto', long:'Longo', round:'Redondo', curve:'Curvado' } },
  glassesStyle:    { label: 'Óculos',       options: { none:'Nenhum', round:'Redondo', square:'Quadrado' } },
  facialHairStyle: { label: 'Barba',        options: { none:'Nenhuma', beard:'Barba', stubble:'Cavanhaque' } },
  shirtStyle:      { label: 'Roupa',        options: { hoody:'Moletom', short:'Camiseta', polo:'Polo', crew:'Careca', collared:'Gola', open:'Aberta' } },
  earRing:         { label: 'Brinco',       options: { none:'Nenhum', stud:'Piercing', loop:'Argola' } },
  earSize:         { label: 'Orelha',       options: { small:'Pequena', big:'Grande' } },
};

/* ─── Avatar SVG (modo emoji) ─── */
const AvatarSvg = ({ emoji, cor, size = 46 }) => (
  <svg
    width={size} height={size} viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', borderRadius: '50%' }}
  >
    <circle cx="50" cy="50" r="50" fill={cor} />
    <text x="50" y="54" dominantBaseline="middle" textAnchor="middle" fontSize="46" style={{ userSelect: 'none' }}>
      {emoji}
    </text>
  </svg>
);

/* ─── Avatar 2D (Nice Avatar SVG) ─── */
const AvatarNice = ({ config, size = 46 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
    <NiceAvatar style={{ width: size, height: size }} {...config} />
  </div>
);

/* ─── Componente unificado de avatar ─── */
const AvatarAtual = ({ config, niceAvatarConfig, size = 46 }) => {
  if (niceAvatarConfig) return <AvatarNice config={niceAvatarConfig} size={size} />;
  return <AvatarSvg emoji={config.emoji} cor={config.cor} size={size} />;
};

/* ─── Armazenamento: localStorage + Firestore ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

// ⚠️ IMPORTANTE: usa 'usuarios' (com S) para bater com as regras do Firestore
async function salvarNiceAvatarFirestore(uid, niceConfig) {
  await setDoc(
    doc(db, 'usuarios', uid),
    { niceAvatarConfig: niceConfig, niceAvatarAt: new Date() },
    { merge: true }
  );
}

/* ─── Hook: escuta niceAvatarConfig no Firestore (aguarda auth) ─── */
function useNiceAvatar() {
  const [niceAvatarConfig, setNiceAvatarConfig] = useState(null);

  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setNiceAvatarConfig(null); return; }
      // Usa 'usuarios' para bater com as Firestore Rules
      unsubSnap = onSnapshot(
        doc(db, 'usuarios', user.uid),
        (snap) => { setNiceAvatarConfig(snap.data()?.niceAvatarConfig ?? null); },
        (err) => { console.warn('[AvatarPerfil] onSnapshot erro:', err.code); }
      );
    });
    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  return { niceAvatarConfig, setNiceAvatarConfig };
}

/* ─── Seletor de cor circular ─── */
const ColorPicker = ({ colors, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {colors.map(c => (
      <button
        key={c}
        title={c}
        onClick={() => onChange(c)}
        style={{
          width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
          border: value === c ? '3px solid var(--gray-900)' : '2px solid transparent',
          outline: value === c ? `3px solid ${c}` : 'none',
          outlineOffset: 2, transition: 'transform 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.18)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      />
    ))}
  </div>
);

/* ─── Seletor de opção (chips de texto) ─── */
const OptionPicker = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {Object.entries(options).map(([key, label]) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        style={{
          padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          border: value === key ? '1.5px solid #6366f1' : '1.5px solid var(--gray-200)',
          background: value === key ? 'var(--brand-50, #eef2ff)' : 'transparent',
          color: value === key ? '#6366f1' : 'var(--gray-600)',
          transition: 'all 0.12s',
        }}
      >
        {label}
      </button>
    ))}
  </div>
);

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome,     setNome]     = useState(perfil.nome  || '');
  const [curso,    setCurso]    = useState(perfil.curso || '');
  const [config,   setConfig]   = useState({ ...CONFIG_PADRAO, ...(perfil.avatarConfig || {}) });
  const [abaAtiva, setAbaAtiva] = useState('emoji');
  const [niceTemp, setNiceTemp] = useState(null);
  const { niceAvatarConfig, setNiceAvatarConfig } = useNiceAvatar();

  const niceEdit = niceTemp || (niceAvatarConfig ? { ...niceAvatarConfig } : { ...NICE_AVATAR_PADRAO });
  const corAtiva = (niceTemp || niceAvatarConfig) ? (niceEdit.bgColor || '#6366f1') : config.cor;

  const atualizarNice = (chave, valor) => setNiceTemp({ ...niceEdit, [chave]: valor });

  const salvar = async () => {
    const uid = auth.currentUser?.uid;
    if (abaAtiva === 'avatar' && niceTemp && uid) {
      await salvarNiceAvatarFirestore(uid, niceTemp);
      setNiceAvatarConfig(niceTemp);
    }
    if (abaAtiva === 'emoji' && uid) {
      await setDoc(doc(db, 'usuarios', uid), { niceAvatarConfig: null }, { merge: true });
      setNiceAvatarConfig(null);
    }
    onSalvar({ nome, curso, avatarConfig: config });
    onFechar();
  };

  const removerNice = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) await setDoc(doc(db, 'usuarios', uid), { niceAvatarConfig: null }, { merge: true });
    setNiceAvatarConfig(null);
    setNiceTemp(null);
  };

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg  { from { opacity:0; } to { opacity:1; } }
      `}</style>

      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />

      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'560px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Header */}
          <div style={{ background:`linear-gradient(135deg, ${corAtiva}ee, ${corAtiva}99)`,padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <div style={{ width:80,height:80,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,0.4)' }}>
              <AvatarAtual config={config} niceAvatarConfig={niceTemp || niceAvatarConfig} size={80} />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {(niceTemp || niceAvatarConfig) && (
                <span style={{ background:'rgba(255,255,255,0.2)',color:'white',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:4,marginTop:4 }}>
                  <Sparkles size={10} /> Avatar personalizado
                </span>
              )}
              {curso
                ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'4px',display:'flex',alignItems:'center',gap:5 }}><Target size={12}/>{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'4px' }}>Sem curso alvo</p>}
            </div>
            <button onClick={onFechar}
              style={{ position:'absolute',top:14,right:14,width:30,height:30,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            ><X size={16}/></button>
          </div>

          {/* Corpo */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:20 }}>

            {/* Nome + Curso */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div>
                <label className="field-label">Seu nome</label>
                <input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} className="input-modern" />
              </div>
              <div>
                <label className="field-label">Curso alvo</label>
                <input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito..." maxLength={60} className="input-modern" />
              </div>
            </div>

            {/* Abas */}
            <div>
              <div style={{ display:'flex',gap:4,background:'var(--gray-50)',borderRadius:12,padding:4,marginBottom:16 }}>
                {[['emoji','🎨 Emoji'], ['avatar','✨ Avatar']].map(([id, label]) => (
                  <button key={id} onClick={()=>setAbaAtiva(id)}
                    style={{ flex:1,padding:'8px 0',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s',
                      background: abaAtiva===id ? 'var(--surface-card)' : 'transparent',
                      color: abaAtiva===id ? (id==='avatar'?'#6366f1':'var(--gray-800)') : 'var(--gray-400)',
                      boxShadow: abaAtiva===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Aba Emoji ── */}
              {abaAtiva === 'emoji' && (
                <div>
                  <p className="field-label" style={{ marginBottom:10 }}>Cor do avatar</p>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:20 }}>
                    {CORES.map(c => (
                      <button key={c.bg} title={c.label} onClick={()=>setConfig(p=>({...p,cor:c.bg}))}
                        style={{ width:32,height:32,borderRadius:'50%',background:c.bg,border:config.cor===c.bg?'3px solid var(--gray-900)':'2px solid transparent',outline:config.cor===c.bg?`3px solid ${c.bg}`:'none',outlineOffset:2,cursor:'pointer',transition:'transform 0.12s' }}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                      />
                    ))}
                  </div>
                  <p className="field-label" style={{ marginBottom:10 }}>Ícone</p>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                    {EMOJIS.map(em => (
                      <button key={em} onClick={()=>setConfig(p=>({...p,emoji:em}))}
                        style={{ width:44,height:44,borderRadius:10,fontSize:22,lineHeight:1,border:config.emoji===em?'2px solid #6366f1':'1.5px solid var(--gray-200)',background:config.emoji===em?'var(--brand-50)':'transparent',cursor:'pointer',transition:'all 0.12s',display:'flex',alignItems:'center',justifyContent:'center' }}
                        onMouseEnter={e=>{ if(config.emoji!==em) e.currentTarget.style.background='var(--gray-50)'; }}
                        onMouseLeave={e=>{ if(config.emoji!==em) e.currentTarget.style.background='transparent'; }}
                      >{em}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Aba Avatar (Nice Avatar SVG) ── */}
              {abaAtiva === 'avatar' && (
                <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                  <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:16,flexWrap:'wrap' }}>
                    <div style={{ width:120,height:120,borderRadius:'50%',overflow:'hidden',border:'2px solid var(--gray-100)',flexShrink:0 }}>
                      <NiceAvatar style={{ width:120,height:120 }} {...niceEdit} />
                    </div>
                    {niceAvatarConfig && (
                      <button onClick={removerNice}
                        style={{ padding:'7px 14px',borderRadius:10,border:'1.5px solid #fecaca',background:'#fef2f2',fontSize:12,fontWeight:600,color:'#ef4444',cursor:'pointer' }}>
                        Remover avatar
                      </button>
                    )}
                  </div>

                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                    <div>
                      <p className="field-label" style={{ marginBottom:8 }}>Cor de fundo</p>
                      <ColorPicker colors={NICE_OPCOES.bgColor} value={niceEdit.bgColor} onChange={v=>atualizarNice('bgColor',v)} />
                    </div>
                    <div>
                      <p className="field-label" style={{ marginBottom:8 }}>Tom de pele</p>
                      <ColorPicker colors={NICE_OPCOES.skinColor} value={niceEdit.skinColor} onChange={v=>atualizarNice('skinColor',v)} />
                    </div>
                    <div>
                      <p className="field-label" style={{ marginBottom:8 }}>Cor do cabelo</p>
                      <ColorPicker colors={NICE_OPCOES.hairColor} value={niceEdit.hairColor} onChange={v=>atualizarNice('hairColor',v)} />
                    </div>
                    <div>
                      <p className="field-label" style={{ marginBottom:8 }}>Cor da roupa</p>
                      <ColorPicker colors={NICE_OPCOES.shirtColor} value={niceEdit.shirtColor} onChange={v=>atualizarNice('shirtColor',v)} />
                    </div>
                  </div>

                  {['hairStyle','eyesStyle','eyebrowsStyle','mouthStyle','noseStyle','glassesStyle','facialHairStyle','shirtStyle','earRing','earSize'].map(chave => (
                    <div key={chave}>
                      <p className="field-label" style={{ marginBottom:8 }}>{NICE_LABELS[chave].label}</p>
                      <OptionPicker
                        options={NICE_LABELS[chave].options}
                        value={niceEdit[chave]}
                        onChange={v=>atualizarNice(chave,v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 24px 20px',display:'flex',gap:10,justifyContent:'flex-end',borderTop:'1px solid var(--gray-100)',flexShrink:0 }}>
            <button onClick={onFechar} className="btn-secondary" style={{ display:'flex',alignItems:'center',gap:6 }}><X size={15}/> Cancelar</button>
            <button onClick={salvar}   className="btn-primary"   style={{ display:'flex',alignItems:'center',gap:6 }}><Check size={15}/> Salvar</button>
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
  const { niceAvatarConfig } = useNiceAvatar();

  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };
  const nomeExibido  = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';
  const corBorda     = niceAvatarConfig ? (niceAvatarConfig.bgColor || '#6366f1') : avatarConfig.cor;

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = (d) => { salvarPerfil(d); setPerfilData(d); };

  const menuItems = [
    { icon: <User size={16}/>,      label: 'Editar perfil',        action: ()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16}/>,  label: 'Configurações',        action: ()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16}/>, label: 'Backup & Restauração', action: ()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>

      <div ref={containerRef} style={{ position:'relative' }}>
        <button
          onClick={()=>setDropdownAberto(d=>!d)}
          title="Perfil"
          style={{
            width:52,height:52,borderRadius:'50%',background:'transparent',
            border: dropdownAberto ? `2.5px solid ${corBorda}` : `2px solid ${corBorda}55`,
            cursor:'pointer',overflow:'hidden',transition:'all 0.2s',flexShrink:0,
            boxShadow: dropdownAberto ? `0 0 0 4px ${corBorda}33` : 'none',
            padding:2,
          }}
          onMouseEnter={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=corBorda; }}
          onMouseLeave={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=`${corBorda}55`; }}
        >
          <AvatarAtual config={avatarConfig} niceAvatarConfig={niceAvatarConfig} size={46} />
        </button>

        {dropdownAberto && (
          <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:16,boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:240,overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>

            <div style={{ background:`linear-gradient(135deg, ${corBorda}ee, ${corBorda}99)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)' }}>
                <AvatarAtual config={avatarConfig} niceAvatarConfig={niceAvatarConfig} size={42} />
              </div>
              <div style={{ overflow:'hidden',flex:1 }}>
                <p style={{ color:'white',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                {perfilData.curso
                  ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:12,marginTop:2,display:'flex',alignItems:'center',gap:4 }}><Target size={11}/>{perfilData.curso}</p>
                  : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
                {niceAvatarConfig && (
                  <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:3 }}>
                    <Sparkles size={10}/> Avatar personalizado
                  </span>
                )}
              </div>
              {isOwner && (
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,textTransform:'uppercase',flexShrink:0 }}>
                  Admin
                </span>
              )}
            </div>

            <div style={{ padding:6 }}>
              {menuItems.map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:500,color:'var(--gray-700)',transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  <span style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop:'1px solid var(--gray-100)',margin:'4px 0' }}/>
              <button
                onClick={()=>{ setDropdownAberto(false); signOut(auth); }}
                style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:500,color:'#ef4444',transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                <span style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center' }}><LogOut size={16}/></span>
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
