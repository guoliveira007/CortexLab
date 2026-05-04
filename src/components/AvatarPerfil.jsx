// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  User, Settings, HardDrive, LogOut, Check, Target, X, Sparkles,
  Camera, Trash2, Search,
} from 'lucide-react';
import { auth } from '../firebase';
import { useIsOwner } from '../hooks/useIsOwner';
import { useDark } from '../hooks/useDark';

const db = getFirestore(getApp());

/* ═══════════════════════════════════════════════
   EMOJIS EXPANDIDOS POR CATEGORIA
   ═══════════════════════════════════════════════ */
const EMOJI_CATEGORIES = {
  '😊 Rostos': [
    '😀','😎','🤓','🧑','👩','👨','🧔','👱','🧕','🎓',
    '😊','😇','🙂','😍','🥰','😘','😜','🤪','😴','🤔',
  ],
  '💼 Profissões': [
    '👨‍⚕️','👩‍⚕️','👨‍🏫','👩‍🏫','👨‍🍳','👩‍🍳','👨‍🚒','👩‍🚒','👨‍🔬','👩‍🔬',
    '👨‍💻','👩‍💻','👨‍🎨','👩‍🎨','🧑‍💼','🧑‍🏫','🧑‍⚖️','🧑‍🎤',
  ],
  '⚽ Esportes': [
    '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥏','🎱','🏓',
    '🏊','🏄','🚴','🏋️','🤸','⛹️','🏌️','🧗',
  ],
  '🐾 Animais': [
    '🐶','🐱','🐼','🐨','🐯','🦁','🐸','🐵','🐰','🦊',
    '🐻','🐮','🐷','🐭','🐹','🐔','🐧','🐦','🐤','🦄',
  ],
  '✨ Fantasia': [
    '🦸','🧙','🧚','🧛','🧜','🧝','🧞','🦹','👼','👻',
    '🤖','👽','🛸','💀','🎃','😈','👺','🐉',
  ],
  '🌿 Natureza & Objetos': [
    '🌸','🌺','🌻','🌹','🍀','🌵','🍄','🌙','⭐','🔥',
    '💎','🎵','🎸','🎮','📚','✈️','🚀','🎂','🍕','☕',
  ],
};

const EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

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

const MOLDURAS = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'double-ring', label: '⭕ Aro Duplo' },
  { id: 'arc-bottom', label: '🌅 Arco Inferior' },
  { id: 'elegant-stroke', label: '✨ Traço Elegante' },
  { id: 'glass', label: '🧊 Vidro' },
  { id: 'dot-highlight', label: '💠 Ponto de Destaque' },
];

const CONFIG_PADRAO = { emoji: '😎', cor: '#6366f1', tipo: 'emoji', moldura: 'none' };
const STORAGE_KEY = 'cortexlab_perfil';

/* ═══════════════════════════════════════════════
   ANIMAÇÕES CSS (leves)
   ═══════════════════════════════════════════════ */
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = '__avatar-animations-v6';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes avatarGradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    @keyframes emojiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes emojiWave { 0%{transform:rotate(0) scale(1)} 25%{transform:rotate(-10deg) scale(1.1)} 75%{transform:rotate(10deg) scale(1.1)} 100%{transform:rotate(0) scale(1)} }
    @keyframes avatarPulse { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(1.2);opacity:0} }
    @keyframes syncPulse { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.7)} 70%{box-shadow:0 0 0 8px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }
    @keyframes dotPulse { 0%,100%{transform:translate(-50%,-50%) scale(1); opacity:0.7} 50%{transform:translate(-50%,-50%) scale(1.4); opacity:1} }
    @keyframes elegantRotate { 0%{transform:translate(-50%,-50%) rotate(0deg)} 100%{transform:translate(-50%,-50%) rotate(360deg)} }
    @keyframes arcGlow { 0%,100%{opacity:0.5} 50%{opacity:0.9} }

    /* Admin premium */
    .moldura-admin {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-admin::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #f59e0b, #d97706, #fbbf24, #f59e0b);
      opacity: 0.8;
      z-index: 0;
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 2px));
    }
    .moldura-admin-crown {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      z-index: 2;
      filter: drop-shadow(0 0 2px rgba(245,158,11,0.6));
    }
    .moldura-admin-check {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 16px;
      height: 16px;
      background: #f59e0b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
      z-index: 3;
      box-shadow: 0 0 4px rgba(245,158,11,0.5);
    }

    /* Aro Duplo */
    .moldura-double-ring {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-double-ring::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 1px solid currentColor;
      opacity: 0.25;
      z-index: 0;
    }
    .moldura-double-ring::after {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      border: 1px solid currentColor;
      opacity: 0.15;
      z-index: 0;
    }

    /* Arco Inferior */
    .moldura-arc-bottom {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-arc-bottom::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid transparent;
      border-bottom-color: currentColor;
      opacity: 0.4;
      animation: arcGlow 2s ease-in-out infinite;
      z-index: 0;
    }

    /* Traço Elegante */
    .moldura-elegant-stroke {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-elegant-stroke::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-bottom-color: transparent;
      animation: elegantRotate 4s linear infinite;
      opacity: 0.6;
      z-index: 0;
      top: 50%;
      left: 50%;
      width: calc(100% + 6px);
      height: calc(100% + 6px);
      transform: translate(-50%, -50%);
    }

    /* Vidro (glass) */
    .moldura-glass {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-glass::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05));
      backdrop-filter: blur(1px);
      z-index: 0;
    }

    /* Ponto de destaque */
    .moldura-dot-highlight {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .moldura-dot-highlight::before {
      content: '';
      position: absolute;
      top: -4px;
      left: 50%;
      width: 8px;
      height: 8px;
      background: currentColor;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: dotPulse 2s ease-in-out infinite;
      z-index: 2;
    }
  `;
  document.head.appendChild(style);
};

if (typeof window !== 'undefined') injectStyles();

/* ═══════════════════════════════════════════════
   COMPONENTES DE AVATAR
   ═══════════════════════════════════════════════ */

const AvatarIniciais = ({ nome, cor, size = 46 }) => {
  const iniciais = (nome || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: 'white',
      fontFamily: 'var(--font-display)', userSelect: 'none',
    }}>
      {iniciais}
    </div>
  );
};

const AvatarAnimado = ({ emoji, cor, size = 46 }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${cor}, ${cor}88, #ffffff44, ${cor})`,
        backgroundSize: '400% 400%',
        animation: 'avatarGradient 3s ease infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        transform: hover ? 'scale(1.08)' : 'scale(1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: hover ? `0 0 14px ${cor}44, 0 4px 14px rgba(0,0,0,0.1)` : 'none',
      }}
    >
      <span style={{
        fontSize: size * 0.55,
        animation: hover ? 'emojiWave 0.6s ease' : 'emojiFloat 2s ease-in-out infinite',
        lineHeight: 1, userSelect: 'none', position: 'relative', zIndex: 1,
      }}>
        {emoji}
      </span>
    </div>
  );
};

const AvatarFoto = ({ src, size = 46, isGif = false }) => (
  <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
    <img
      src={src}
      alt="avatar"
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
    {isGif && (
      <span style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6 }}>
        GIF
      </span>
    )}
  </div>
);

/* ═══════════════════════════════════════════════
   MOLDURA WRAPPER
   ═══════════════════════════════════════════════ */
const AvatarMoldura = ({ children, moldura, isAdmin, color }) => {
  if (!moldura || moldura === 'none') return children;

  if (isAdmin && moldura === 'admin') {
    return (
      <div className="moldura-admin" style={{ color }}>
        <div className="moldura-admin-crown">👑</div>
        <div className="moldura-admin-check">✓</div>
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    );
  }

  if (moldura === 'double-ring') {
    return <div className="moldura-double-ring" style={{ color }}>{children}</div>;
  }

  if (moldura === 'arc-bottom') {
    return <div className="moldura-arc-bottom" style={{ color }}>{children}</div>;
  }

  if (moldura === 'elegant-stroke') {
    return <div className="moldura-elegant-stroke" style={{ color }}>{children}</div>;
  }

  if (moldura === 'glass') {
    return <div className="moldura-glass">{children}</div>;
  }

  if (moldura === 'dot-highlight') {
    return <div className="moldura-dot-highlight" style={{ color }}>{children}</div>;
  }

  return children;
};

const AvatarAtual = ({ config, nome, size = 46, isAdmin = false, syncEffect = false }) => {
  const tipo = config.tipo || 'emoji';
  const moldura = config.moldura || (isAdmin ? 'admin' : 'none');
  const isGif = tipo === 'foto' && config.fotoUrl && (config.fotoUrl.includes('.gif') || config.fotoUrl.includes('gif'));

  let avatarContent;
  if (tipo === 'foto' && config.fotoUrl) {
    avatarContent = <AvatarFoto src={config.fotoUrl} size={size} isGif={isGif} />;
  } else if (tipo === 'iniciais') {
    avatarContent = <AvatarIniciais nome={nome} cor={config.cor} size={size} />;
  } else {
    avatarContent = <AvatarAnimado emoji={config.emoji} cor={config.cor} size={size} />;
  }

  return (
    <div style={{
      borderRadius: '50%',
      animation: syncEffect ? 'syncPulse 1.5s ease-out' : undefined,
    }}>
      <AvatarMoldura moldura={moldura} isAdmin={isAdmin} color={config.cor}>
        {avatarContent}
      </AvatarMoldura>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   ARMAZENAMENTO LOCAL + FIRESTORE
   ═══════════════════════════════════════════════ */
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

async function salvarPerfilFirestore(uid, perfil) {
  await setDoc(doc(db, 'usuarios', uid), { perfil, perfilAt: new Date() }, { merge: true });
}

function usePerfil() {
  const [perfil, setPerfil] = useState(null);
  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setPerfil(null); return; }
      unsubSnap = onSnapshot(
        doc(db, 'usuarios', user.uid),
        (snap) => { setPerfil(snap.data()?.perfil ?? null); },
        (err) => { console.warn('[AvatarPerfil] onSnapshot erro:', err.code); }
      );
    });
    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);
  return perfil;
}

/* ═══════════════════════════════════════════════
   UPLOAD PARA CLOUDINARY
   ═══════════════════════════════════════════════ */
const CLOUD_NAME = 'dfmeirevl'; // seu cloud name
const UPLOAD_PRESET = 'avatar_preset'; // ⚠️ Altere para o nome do upload preset que você criou

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return data.secure_url; // URL pública da imagem/GIF
};

/* ═══════════════════════════════════════════════
   MODAL DE EDIÇÃO
   ═══════════════════════════════════════════════ */
const ModalPerfil = ({ onFechar, perfilData, onSalvar, isDark, isOwner }) => {
  const [nome, setNome] = useState(perfilData.nome || '');
  const [curso, setCurso] = useState(perfilData.curso || '');
  const [config, setConfig] = useState({ ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) });
  const [categoria, setCategoria] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const isGif = config.fotoUrl && (config.fotoUrl.includes('.gif') || config.fotoUrl.includes('gif'));
  const corAtiva = config.cor;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite generoso: 10 MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 10 MB.');
      return;
    }

    setSalvando(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      const url = await uploadToCloudinary(file);
      setUploadProgress(100);
      setConfig(p => ({ ...p, tipo: 'foto', fotoUrl: url }));
    } catch (error) {
      alert('Falha no upload. Verifique sua conexão e tente novamente.');
      console.error(error);
    } finally {
      setSalvando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      onSalvar({ nome, curso, avatarConfig: config });
      onFechar();
    } catch (e) {
      alert('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const emojisFiltrados = busca
    ? EMOJIS.filter(em => em.includes(busca))
    : (EMOJI_CATEGORIES[categoria] || []);

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg  { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)' }} />
      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className={isDark ? 'dark-modal' : ''} style={{
          background: isDark ? 'var(--surface-card)' : 'white', color: isDark ? 'var(--gray-800)' : 'inherit',
          borderRadius:'24px',width:'100%',maxWidth:'540px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',
          boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all',
          border: isDark ? '1px solid var(--gray-200)' : 'none',
        }}>
          <div style={{ background:`linear-gradient(135deg, ${corAtiva}ee, ${corAtiva}99)`,padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <AvatarAtual config={config} nome={nome} size={80} isAdmin={isOwner} />
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'4px',display:'flex',alignItems:'center',gap:5 }}><Target size={12}/>{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'4px' }}>Sem curso alvo</p>}
              {config.tipo === 'foto' && config.fotoUrl && (
                <span style={{ background:'rgba(255,255,255,0.2)',color:'white',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:4,marginTop:4 }}>
                  <Camera size={10} /> {isGif ? 'GIF' : 'Foto'}
                </span>
              )}
            </div>
            <button onClick={onFechar}
              style={{ position:'absolute',top:14,right:14,width:30,height:30,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
              <X size={16}/>
            </button>
          </div>

          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:20 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div>
                <label className="field-label" style={{ color: isDark ? 'var(--gray-500)' : undefined }}>Seu nome</label>
                <input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} className="input-modern" style={{ background: isDark ? 'var(--gray-100)' : undefined, color: isDark ? 'var(--gray-800)' : undefined }} />
              </div>
              <div>
                <label className="field-label" style={{ color: isDark ? 'var(--gray-500)' : undefined }}>Curso alvo</label>
                <input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito..." maxLength={60} className="input-modern" style={{ background: isDark ? 'var(--gray-100)' : undefined, color: isDark ? 'var(--gray-800)' : undefined }} />
              </div>
            </div>

            <div style={{ display:'flex',gap:6,background:isDark?'var(--gray-200)':'var(--gray-50)',borderRadius:12,padding:4,marginBottom:4 }}>
              {[
                ['emoji','😊 Emoji'],
                ['iniciais','🔤 Iniciais'],
                ['foto','📷 Foto/GIF'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setConfig(p => ({ ...p, tipo: id }))}
                  style={{ flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                    background: config.tipo === id ? (isDark?'var(--gray-50)':'var(--surface-card)') : 'transparent',
                    color: config.tipo === id ? '#6366f1' : isDark?'var(--gray-500)':'var(--gray-400)',
                    boxShadow: config.tipo === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {config.tipo === 'emoji' && (
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position:'absolute', left:12, top:12, color: 'var(--gray-400)' }} />
                <input type="text" placeholder="Buscar emoji..." value={busca} onChange={e => setBusca(e.target.value)}
                  className="input-modern" style={{ paddingLeft: 34, fontSize: 13, background: isDark ? 'var(--gray-100)' : undefined, color: isDark ? 'var(--gray-800)' : undefined }} />
              </div>
            )}

            {config.tipo === 'emoji' && (
              <div>
                <p className="field-label" style={{ marginBottom:10, color: isDark?'var(--gray-500)':undefined }}>Cor do avatar</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:20 }}>
                  {CORES.map(c => (
                    <button key={c.bg} title={c.label} onClick={()=>setConfig(p=>({...p,cor:c.bg}))}
                      style={{ width:32,height:32,borderRadius:'50%',background:c.bg,border:config.cor===c.bg?'3px solid var(--gray-900)':'2px solid transparent',cursor:'pointer',transition:'transform 0.12s' }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'} />
                  ))}
                </div>
                {!busca && (
                  <>
                    <p className="field-label" style={{ marginBottom:8, color: isDark?'var(--gray-500)':undefined }}>Categoria</p>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:4, marginBottom:12 }}>
                      {Object.keys(EMOJI_CATEGORIES).map(cat => (
                        <button key={cat} onClick={() => setCategoria(cat)}
                          style={{ padding:'4px 10px', borderRadius:12, border:'1.5px solid var(--gray-200)', background: categoria === cat ? (isDark?'var(--brand-25)':'var(--brand-50)') : 'transparent', color: categoria === cat ? '#6366f1' : isDark?'var(--gray-500)':'var(--gray-600)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="field-label" style={{ marginBottom:8, color: isDark?'var(--gray-500)':undefined }}>Ícone</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6, maxHeight:200, overflowY:'auto' }}>
                  {emojisFiltrados.map(em => (
                    <button key={em} onClick={()=>setConfig(p=>({...p,emoji:em}))}
                      style={{ width:48,height:48,borderRadius:10,fontSize:24,lineHeight:1,border:config.emoji===em?'2px solid #6366f1':'1.5px solid var(--gray-200)',background:config.emoji===em?(isDark?'var(--brand-25)':'var(--brand-50)'):'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
                      onMouseEnter={e=>{ if(config.emoji!==em) e.currentTarget.style.background=isDark?'var(--gray-200)':'var(--gray-50)'; }}
                      onMouseLeave={e=>{ if(config.emoji!==em) e.currentTarget.style.background='transparent'; }}>
                      {em}
                    </button>
                  ))}
                  {emojisFiltrados.length === 0 && <p style={{ color:'var(--gray-400)',fontSize:13 }}>Nenhum emoji encontrado.</p>}
                </div>
              </div>
            )}

            {config.tipo === 'iniciais' && (
              <div>
                <p className="field-label" style={{ marginBottom:10, color: isDark?'var(--gray-500)':undefined }}>Cor das iniciais</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                  {CORES.map(c => (
                    <button key={c.bg} title={c.label} onClick={()=>setConfig(p=>({...p,cor:c.bg}))}
                      style={{ width:32,height:32,borderRadius:'50%',background:c.bg,border:config.cor===c.bg?'3px solid var(--gray-900)':'2px solid transparent',cursor:'pointer',transition:'transform 0.12s' }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'} />
                  ))}
                </div>
              </div>
            )}

            {config.tipo === 'foto' && (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <p className="field-label" style={{ marginBottom:16, color: isDark?'var(--gray-500)':undefined }}>Escolha uma foto ou GIF animado</p>
                <input ref={fileInputRef} type="file" accept="image/*,image/gif" onChange={handleFileChange} style={{ display:'none' }} />
                <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
                  <button onClick={()=>fileInputRef.current?.click()} className="btn-primary" style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <Camera size={16} /> Escolher arquivo
                  </button>
                  {config.fotoUrl && (
                    <button onClick={()=>setConfig(p=>({...p,fotoUrl:'',tipo:'emoji'}))} className="btn-secondary" style={{ display:'flex',alignItems:'center',gap:8,color:'#ef4444' }}>
                      <Trash2 size={16} /> Remover
                    </button>
                  )}
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: 12, background: 'var(--gray-100)', borderRadius: 8, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--brand-500)', transition: 'width 0.3s' }} />
                  </div>
                )}
                {config.fotoUrl && (
                  <p style={{ color: isDark?'var(--gray-500)':'var(--gray-400)',fontSize:11,marginTop:10 }}>
                    {isGif ? '✅ GIF animado carregado' : '✅ Imagem carregada'}
                  </p>
                )}
              </div>
            )}

            {/* Molduras */}
            <div>
              <p className="field-label" style={{ marginBottom:10, color: isDark?'var(--gray-500)':undefined }}>
                Moldura
                {isOwner && <span style={{ fontSize:10, marginLeft:6, background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',padding:'2px 8px',borderRadius:12,fontWeight:700 }}>👑 Admin</span>}
              </p>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                {(isOwner ? [{ id: 'admin', label: '👑 Premium' }, ...MOLDURAS] : MOLDURAS).map(m => (
                  <button key={m.id} onClick={()=>setConfig(p=>({...p,moldura:m.id}))}
                    style={{
                      padding:'5px 12px', borderRadius:12,
                      border: config.moldura === m.id ? `2px solid ${m.id === 'admin' ? '#f59e0b' : '#6366f1'}` : '1.5px solid var(--gray-200)',
                      background: config.moldura === m.id ? (m.id === 'admin' ? '#fef3c7' : isDark?'var(--brand-25)':'var(--brand-50)') : 'transparent',
                      color: config.moldura === m.id ? (m.id === 'admin' ? '#92400e' : '#6366f1') : isDark?'var(--gray-500)':'var(--gray-600)',
                      fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding:'14px 24px 20px',display:'flex',gap:10,justifyContent:'flex-end',borderTop: isDark?'1px solid var(--gray-200)':'1px solid var(--gray-100)',flexShrink:0 }}>
            <button onClick={onFechar} className="btn-secondary" style={{ display:'flex',alignItems:'center',gap:6, background: isDark?'var(--gray-200)':undefined, color: isDark?'var(--gray-700)':undefined }}><X size={15}/> Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="btn-primary" style={{ display:'flex',alignItems:'center',gap:6, opacity: salvando ? 0.7 : 1 }}>
              <Check size={15}/> {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════ */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [localData, setLocalData] = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [syncEffect, setSyncEffect] = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();
  const isDark = useDark();
  const firestorePerfil = usePerfil();
  const lastLocalSaveRef = useRef(Date.now());

  const perfilData = { ...localData, ...(firestorePerfil || {}) };
  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };
  if (isOwner && !perfilData.avatarConfig?.moldura) avatarConfig.moldura = 'admin';
  const nomeExibido = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';
  const corBorda = avatarConfig.cor;

  useEffect(() => {
    if (!firestorePerfil) return;
    if (Date.now() - lastLocalSaveRef.current > 2000) {
      setSyncEffect(true);
      setTimeout(() => setSyncEffect(false), 1500);
    }
  }, [firestorePerfil]);

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = async (d) => {
    salvarPerfil(d);
    setLocalData(d);
    lastLocalSaveRef.current = Date.now();
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await salvarPerfilFirestore(uid, d);
      } catch (e) {
        alert('Erro ao sincronizar perfil.');
      }
    }
  };

  const menuItems = [
    { icon: <User size={16}/>,      label: 'Editar perfil',        action: ()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16}/>,  label: 'Configurações',        action: ()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16}/>, label: 'Backup & Restauração', action: ()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <div ref={containerRef} style={{ position:'relative' }}>
        <button
          onClick={()=>setDropdownAberto(d=>!d)}
          title="Perfil"
          style={{
            width:52,height:52,borderRadius:'50%',background:'transparent',
            border: dropdownAberto ? `2.5px solid ${corBorda}` : `2px solid ${corBorda}55`,
            cursor:'pointer',overflow:'visible',transition:'all 0.2s',flexShrink:0,
            boxShadow: dropdownAberto ? `0 0 0 4px ${corBorda}33` : 'none',
            padding:0, position:'relative',
          }}
          onMouseEnter={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=corBorda; }}
          onMouseLeave={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=`${corBorda}55`; }}>
          <AvatarAtual config={avatarConfig} nome={nomeExibido} size={46} isAdmin={isOwner} syncEffect={syncEffect} />
        </button>

        {dropdownAberto && (
          <div className={isDark ? 'dark-modal' : ''} style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:isDark?'var(--surface-card)':'white',borderRadius:16,boxShadow:'0 16px 48px rgba(0,0,0,0.16)',minWidth:240,overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',border:isDark?'1px solid var(--gray-200)':'none' }}>
            <div style={{ background:`linear-gradient(135deg, ${corBorda}ee, ${corBorda}99)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
              <AvatarAtual config={avatarConfig} nome={nomeExibido} size={42} isAdmin={isOwner} />
              <div style={{ overflow:'hidden',flex:1 }}>
                <p style={{ color:'white',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                {perfilData.curso
                  ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:12,marginTop:2 }}><Target size={11} style={{display:'inline',marginRight:4}}/>{perfilData.curso}</p>
                  : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
              </div>
              {isOwner && (
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,textTransform:'uppercase' }}>Admin</span>
              )}
            </div>
            <div style={{ padding:6 }}>
              {menuItems.map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:500,color:isDark?'var(--gray-700)':'var(--gray-700)',transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=isDark?'var(--gray-200)':'var(--gray-50)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: isDark?'1px solid var(--gray-200)':'1px solid var(--gray-100)',margin:'4px 0' }}/>
              <button onClick={()=>{ setDropdownAberto(false); signOut(auth); }}
                style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:500,color:'#ef4444',transition:'background 0.12s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fef2f2'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <span style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center' }}><LogOut size={16}/></span>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalPerfil perfilData={perfilData} onFechar={()=>setModalAberto(false)} onSalvar={handleSalvar} isDark={isDark} isOwner={isOwner} />
      )}
    </>
  );
};

export default AvatarPerfil;