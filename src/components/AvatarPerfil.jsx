// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { User, Settings, HardDrive, LogOut, Check, Target, X, Sparkles, Camera, Trash2 } from 'lucide-react';
import { auth } from '../firebase';
import { useIsOwner } from '../hooks/useIsOwner';

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

/* ─── Cores expandidas ─── */
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

const CONFIG_PADRAO = { emoji: '😎', cor: '#6366f1', tipo: 'emoji' };

/* ─── Storage Key ─── */
const STORAGE_KEY = 'cortexlab_perfil';

/* ═══════════════════════════════════════════════
   AVATAR COM INICIAIS
   ═══════════════════════════════════════════════ */
const AvatarIniciais = ({ nome, cor, size = 46 }) => {
  const iniciais = (nome || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

/* ═══════════════════════════════════════════════
   AVATAR COM GRADIENTE ANIMADO + EMOJI FLUTUANTE
   ═══════════════════════════════════════════════ */
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
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
        transform: hover ? 'scale(1.12)' : 'scale(1)',
        boxShadow: hover ? `0 0 20px ${cor}66, 0 8px 24px rgba(0,0,0,0.15)` : 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span style={{
        fontSize: size * 0.55,
        animation: hover ? 'emojiWave 0.6s ease' : 'emojiFloat 2s ease-in-out infinite',
        display: 'block',
        lineHeight: 1,
        userSelect: 'none',
        position: 'relative',
        zIndex: 1,
      }}>
        {emoji}
      </span>
      {hover && (
        <span style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          border: '2px solid white', opacity: 0.3,
          animation: 'avatarPulse 1s ease-out infinite',
        }} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   AVATAR FOTO (upload)
   ═══════════════════════════════════════════════ */
const AvatarFoto = ({ src, size = 46 }) => (
  <img
    src={src}
    alt="avatar"
    style={{
      width: size, height: size, borderRadius: '50%', objectFit: 'cover',
      display: 'block',
    }}
    onError={(e) => { e.target.style.display = 'none'; }}
  />
);

/* ─── Componente unificado ─── */
const AvatarAtual = ({ config, nome, size = 46 }) => {
  const tipo = config.tipo || 'emoji';
  if (tipo === 'foto' && config.fotoUrl) {
    return <AvatarFoto src={config.fotoUrl} size={size} />;
  }
  if (tipo === 'iniciais') {
    return <AvatarIniciais nome={nome} cor={config.cor} size={size} />;
  }
  return <AvatarAnimado emoji={config.emoji} cor={config.cor} size={size} />;
};

/* ═══════════════════════════════════════════════
   ARMAZENAMENTO LOCAL + FIRESTORE
   ═══════════════════════════════════════════════ */
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

async function salvarPerfilFirestore(uid, perfil) {
  await setDoc(
    doc(db, 'usuarios', uid),
    { perfil, perfilAt: new Date() },
    { merge: true }
  );
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
   MODAL DE EDIÇÃO (emojis + iniciais + foto)
   ═══════════════════════════════════════════════ */
const ModalPerfil = ({ onFechar, perfilData, onSalvar }) => {
  const [nome,   setNome]   = useState(perfilData.nome  || '');
  const [curso,  setCurso]  = useState(perfilData.curso || '');
  const [config, setConfig] = useState({ ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) });
  const [categoria, setCategoria] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const fileInputRef = useRef(null);

  const corAtiva = config.cor;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConfig(p => ({ ...p, tipo: 'foto', fotoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const salvar = () => {
    onSalvar({ nome, curso, avatarConfig: config });
    onFechar();
  };

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg  { from { opacity:0; } to { opacity:1; } }
        @keyframes avatarGradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes emojiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes emojiWave { 0%{transform:rotate(0) scale(1)} 25%{transform:rotate(-10deg) scale(1.1)} 75%{transform:rotate(10deg) scale(1.1)} 100%{transform:rotate(0) scale(1)} }
        @keyframes avatarPulse { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(1.2);opacity:0} }
      `}</style>

      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />

      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'540px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Header */}
          <div style={{ background:`linear-gradient(135deg, ${corAtiva}ee, ${corAtiva}99)`,padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <AvatarAtual config={config} nome={nome} size={80} />
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso
                ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'4px',display:'flex',alignItems:'center',gap:5 }}><Target size={12}/>{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'4px' }}>Sem curso alvo</p>}
              {config.tipo === 'foto' && (
                <span style={{ background:'rgba(255,255,255,0.2)',color:'white',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:4,marginTop:4 }}>
                  <Camera size={10} /> Foto
                </span>
              )}
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

            {/* Abas de tipo de avatar */}
            <div style={{ display:'flex',gap:6,background:'var(--gray-50)',borderRadius:12,padding:4,marginBottom:4 }}>
              {[
                ['emoji','😊 Emoji'],
                ['iniciais','🔤 Iniciais'],
                ['foto','📷 Foto'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setConfig(p => ({ ...p, tipo: id }))}
                  style={{ flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
                    background: config.tipo === id ? 'var(--surface-card)' : 'transparent',
                    color: config.tipo === id ? '#6366f1' : 'var(--gray-400)',
                    boxShadow: config.tipo === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── EMOJI ── */}
            {config.tipo === 'emoji' && (
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

                {/* Categorias */}
                <p className="field-label" style={{ marginBottom:8 }}>Categoria</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:4, marginBottom:12 }}>
                  {Object.keys(EMOJI_CATEGORIES).map(cat => (
                    <button key={cat} onClick={() => setCategoria(cat)}
                      style={{
                        padding:'4px 10px', borderRadius:12, border:'1.5px solid var(--gray-200)',
                        background: categoria === cat ? 'var(--brand-50)' : 'transparent',
                        color: categoria === cat ? '#6366f1' : 'var(--gray-600)',
                        fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
                      }}>
                      {cat}
                    </button>
                  ))}
                </div>

                <p className="field-label" style={{ marginBottom:8 }}>Ícone</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6, maxHeight:240, overflowY:'auto' }}>
                  {(EMOJI_CATEGORIES[categoria] || []).map(em => (
                    <button key={em} onClick={()=>setConfig(p=>({...p,emoji:em}))}
                      style={{ width:48,height:48,borderRadius:10,fontSize:24,lineHeight:1,border:config.emoji===em?'2px solid #6366f1':'1.5px solid var(--gray-200)',background:config.emoji===em?'var(--brand-50)':'transparent',cursor:'pointer',transition:'all 0.12s',display:'flex',alignItems:'center',justifyContent:'center' }}
                      onMouseEnter={e=>{ if(config.emoji!==em) e.currentTarget.style.background='var(--gray-50)'; }}
                      onMouseLeave={e=>{ if(config.emoji!==em) e.currentTarget.style.background='transparent'; }}
                    >{em}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ── INICIAIS ── */}
            {config.tipo === 'iniciais' && (
              <div>
                <p className="field-label" style={{ marginBottom:10 }}>Cor das iniciais</p>
                <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                  {CORES.map(c => (
                    <button key={c.bg} title={c.label} onClick={()=>setConfig(p=>({...p,cor:c.bg}))}
                      style={{ width:32,height:32,borderRadius:'50%',background:c.bg,border:config.cor===c.bg?'3px solid var(--gray-900)':'2px solid transparent',outline:config.cor===c.bg?`3px solid ${c.bg}`:'none',outlineOffset:2,cursor:'pointer',transition:'transform 0.12s' }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'}
                      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                    />
                  ))}
                </div>
                <p style={{ color:'var(--gray-400)',fontSize:13,marginTop:16 }}>
                  🔤 As iniciais são geradas automaticamente a partir do nome acima.
                </p>
              </div>
            )}

            {/* ── FOTO ── */}
            {config.tipo === 'foto' && (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <p className="field-label" style={{ marginBottom:16 }}>Escolha uma foto</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display:'none' }} />
                <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
                  <button onClick={()=>fileInputRef.current?.click()} className="btn-primary" style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <Camera size={16} /> Escolher arquivo
                  </button>
                  {config.fotoUrl && (
                    <button onClick={()=>setConfig(p=>({...p,fotoUrl:'',tipo:'emoji'}))} className="btn-secondary" style={{ display:'flex',alignItems:'center',gap:8,color:'#ef4444' }}>
                      <Trash2 size={16} /> Remover foto
                    </button>
                  )}
                </div>
                <p style={{ color:'var(--gray-400)',fontSize:12,marginTop:12 }}>Formatos aceitos: JPG, PNG, GIF. Tamanho máximo 5 MB.</p>
              </div>
            )}
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

/* ═══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════ */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [localData,      setLocalData]      = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto,    setModalAberto]    = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();
  const firestorePerfil = usePerfil();

  const perfilData = { ...localData, ...(firestorePerfil || {}) };
  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };
  const nomeExibido  = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';
  const corBorda     = avatarConfig.cor;

  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSalvar = async (d) => {
    salvarPerfil(d);
    setLocalData(d);
    const uid = auth.currentUser?.uid;
    if (uid) await salvarPerfilFirestore(uid, d);
  };

  const menuItems = [
    { icon: <User size={16}/>,      label: 'Editar perfil',        action: ()=>{ setDropdownAberto(false); setModalAberto(true); } },
    { icon: <Settings size={16}/>,  label: 'Configurações',        action: ()=>{ setDropdownAberto(false); onAbrirConfig(); } },
    { icon: <HardDrive size={16}/>, label: 'Backup & Restauração', action: ()=>{ setDropdownAberto(false); onIrParaBackup(); } },
  ];

  return (
    <>
      <style>{`
        @keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }
        @keyframes avatarGradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes emojiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes emojiWave { 0%{transform:rotate(0) scale(1)} 25%{transform:rotate(-10deg) scale(1.1)} 75%{transform:rotate(10deg) scale(1.1)} 100%{transform:rotate(0) scale(1)} }
        @keyframes avatarPulse { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(1.2);opacity:0} }
      `}</style>

      <div ref={containerRef} style={{ position:'relative' }}>
        <button
          onClick={()=>setDropdownAberto(d=>!d)}
          title="Perfil"
          style={{
            width:52,height:52,borderRadius:'50%',background:'transparent',
            border: dropdownAberto ? `2.5px solid ${corBorda}` : `2px solid ${corBorda}55`,
            cursor:'pointer',overflow:'hidden',transition:'all 0.2s',flexShrink:0,
            boxShadow: dropdownAberto ? `0 0 0 4px ${corBorda}33` : 'none',
            padding:0,
          }}
          onMouseEnter={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=corBorda; }}
          onMouseLeave={e=>{ if(!dropdownAberto) e.currentTarget.style.borderColor=`${corBorda}55`; }}
        >
          <AvatarAtual config={avatarConfig} nome={nomeExibido} size={48} />
        </button>

        {dropdownAberto && (
          <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:16,boxShadow:'0 16px 48px rgba(0,0,0,0.16)',minWidth:240,overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ background:`linear-gradient(135deg, ${corBorda}ee, ${corBorda}99)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
              <AvatarAtual config={avatarConfig} nome={nomeExibido} size={42} />
              <div style={{ overflow:'hidden',flex:1 }}>
                <p style={{ color:'white',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                {perfilData.curso
                  ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:12,marginTop:2 }}><Target size={11} style={{display:'inline',marginRight:4}}/>{perfilData.curso}</p>
                  : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
              </div>
              {isOwner && (
                <span style={{ background:'#f59e0b',color:'white',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,textTransform:'uppercase' }}>Admin</span>
              )}
            </div>
            <div style={{ padding:6 }}>
              {menuItems.map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width:'100%',padding:'10px 12px',background:'none',border:'none',borderRadius:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:500,color:'var(--gray-700)',transition:'background 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--gray-50)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ width:20,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray-500)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop:'1px solid var(--gray-100)',margin:'4px 0' }}/>
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
        <ModalPerfil
          perfilData={perfilData}
          onFechar={()=>setModalAberto(false)}
          onSalvar={handleSalvar}
        />
      )}
    </>
  );
};

export default AvatarPerfil;