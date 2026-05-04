// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { auth } from '../firebase';

// db inicializado localmente — firebase.js exporta só auth para evitar
// conflito com a persistência offline configurada em database.js
const db = getFirestore(getApp());
import { User, Settings, HardDrive, LogOut, Check, Target, X, Sparkles, RotateCcw } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';

/* ════════════════════════════════════════════════════
   SISTEMA DE AVATAR — Emoji SVG + Ready Player Me 3D
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

// Troque pelo seu subdomain em studio.readyplayer.me
const RPM_SUBDOMAIN = 'demo';

/* ─── Avatar SVG (modo emoji — inalterado) ─── */
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

/* ─── Avatar 3D RPM — renderizado em canvas pequeno ─── */
function RpmModel({ url }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.4; });
  return <primitive ref={ref} object={scene} position={[0, -0.72, 0]} scale={1} />;
}

const AvatarRpm3D = ({ url, size = 46 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
    <Canvas
      camera={{ position: [0, 1.25, 1.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 3, 2]} intensity={1.2} />
      <pointLight position={[-1, 1, -1]} intensity={0.3} color="#8B7FFF" />
      <Environment preset="city" />
      <Suspense fallback={null}>
        <RpmModel url={url} />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} target={[0, 1.1, 0]} />
    </Canvas>
  </div>
);

/* ─── Componente unificado de avatar (emoji ou 3D) ─── */
const AvatarAtual = ({ config, rpmUrl, size = 46 }) => {
  if (rpmUrl) return <AvatarRpm3D url={rpmUrl} size={size} />;
  return <AvatarSvg emoji={config.emoji} cor={config.cor} size={size} />;
};

/* ─── Iframe do Ready Player Me ─── */
const RpmEditor = ({ onSalvar, onFechar }) => {
  const iframeRef = useRef(null);
  const [carregando, setCarregando] = useState(true);
  const src = `https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi&clearCache`;

  useEffect(() => {
    function onMsg(e) {
      if (!e.origin.includes('readyplayer.me')) return;
      try {
        const json = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (json?.source !== 'readyplayerme') return;
        if (json.eventName === 'v1.frame.ready') {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ target: 'readyplayerme', type: 'subscribe', eventName: 'v1.**' }), '*'
          );
        }
        if (json.eventName === 'v1.avatar.exported') {
          onSalvar(json.data?.url);
        }
      } catch (_) {}
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSalvar]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} color="#8b5cf6" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>Avatar 3D — Ready Player Me</span>
        </div>
        <button onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center' }}>
          <X size={16} />
        </button>
      </div>
      {carregando && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--surface-card)', zIndex: 2 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #ede9fe', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Carregando editor 3D…</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera *; microphone *"
        onLoad={() => setCarregando(false)}
        style={{ flex: 1, border: 'none', opacity: carregando ? 0 : 1, transition: 'opacity 0.3s' }}
        title="Ready Player Me"
      />
    </div>
  );
};

/* ─── Armazenamento: localStorage + Firestore ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

async function salvarRpmFirestore(uid, url) {
  await setDoc(doc(db, 'users', uid), { rpmAvatarUrl: url, rpmAvatarAt: new Date() }, { merge: true });
}

function useRpmAvatar() {
  const [rpmUrl, setRpmUrl] = useState(null);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      setRpmUrl(snap.data()?.rpmAvatarUrl ?? null);
    });
    return () => unsub();
  }, []);
  return { rpmUrl, setRpmUrl };
}

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome,       setNome]       = useState(perfil.nome   || '');
  const [curso,      setCurso]      = useState(perfil.curso  || '');
  const [config,     setConfig]     = useState({ ...CONFIG_PADRAO, ...(perfil.avatarConfig || {}) });
  const [abaAtiva,   setAbaAtiva]   = useState('emoji'); // 'emoji' | 'rpm'
  const [rpmUrlTemp, setRpmUrlTemp] = useState(null);
  const { rpmUrl, setRpmUrl } = useRpmAvatar();

  const corAtiva = rpmUrlTemp || rpmUrl ? '#8b5cf6' : config.cor;

  const salvar = async () => {
    const uid = auth.currentUser?.uid;
    if (rpmUrlTemp && uid) {
      await salvarRpmFirestore(uid, rpmUrlTemp);
      setRpmUrl(rpmUrlTemp);
    }
    onSalvar({ nome, curso, avatarConfig: config });
    onFechar();
  };

  const removerRpm = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) await setDoc(doc(db, 'users', uid), { rpmAvatarUrl: null }, { merge: true });
    setRpmUrl(null);
    setRpmUrlTemp(null);
  };

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg  { from { opacity:0; } to { opacity:1; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />

      <div onClick={e=>e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'560px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Header */}
          <div style={{ background:`linear-gradient(135deg, ${corAtiva}ee, ${corAtiva}99)`,padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <div style={{ width:80,height:80,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,0.4)' }}>
              <AvatarAtual config={config} rpmUrl={rpmUrlTemp || rpmUrl} size={80} />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {(rpmUrlTemp || rpmUrl) && (
                <span style={{ background:'rgba(255,255,255,0.2)',color:'white',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:4,marginTop:4 }}>
                  <Sparkles size={10} /> Avatar 3D ativo
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

            {/* Abas: Emoji vs 3D */}
            <div>
              <div style={{ display:'flex',gap:4,background:'var(--gray-50)',borderRadius:12,padding:4,marginBottom:16 }}>
                {[['emoji','🎨 Emoji'], ['rpm','✨ Avatar 3D']].map(([id, label]) => (
                  <button key={id} onClick={()=>setAbaAtiva(id)}
                    style={{ flex:1,padding:'8px 0',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s',
                      background: abaAtiva===id ? 'var(--surface-card)' : 'transparent',
                      color: abaAtiva===id ? (id==='rpm'?'#8b5cf6':'var(--gray-800)') : 'var(--gray-400)',
                      boxShadow: abaAtiva===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Aba Emoji */}
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

              {/* Aba 3D */}
              {abaAtiva === 'rpm' && (
                <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1.5px solid var(--gray-100)', minHeight: 400 }}>
                  {(rpmUrlTemp || rpmUrl) && abaAtiva === 'rpm' ? (
                    /* Preview + opção de trocar */
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:24 }}>
                      <div style={{ width:180,height:220,borderRadius:16,overflow:'hidden',background:'var(--gray-50)',border:'1px solid var(--gray-100)' }}>
                        <Canvas camera={{ position:[0,1.3,2],fov:40 }} gl={{ antialias:true,alpha:true }} style={{ background:'transparent' }}>
                          <ambientLight intensity={0.7}/>
                          <directionalLight position={[1,3,2]} intensity={1.2}/>
                          <Environment preset="city"/>
                          <Suspense fallback={null}><RpmModel url={rpmUrlTemp||rpmUrl}/></Suspense>
                          <OrbitControls enableZoom={false} enablePan={false} target={[0,1.1,0]}/>
                        </Canvas>
                      </div>
                      <p style={{ fontSize:13,color:'var(--gray-500)',textAlign:'center' }}>
                        Avatar 3D configurado! Você pode rotacioná-lo arrastando.
                      </p>
                      <div style={{ display:'flex',gap:10 }}>
                        <button onClick={()=>setRpmUrlTemp(null)} style={{ padding:'8px 16px',borderRadius:10,border:'1.5px solid var(--gray-200)',background:'transparent',fontSize:13,fontWeight:600,color:'var(--gray-600)',cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
                          <RotateCcw size={13}/> Trocar avatar
                        </button>
                        <button onClick={removerRpm} style={{ padding:'8px 16px',borderRadius:10,border:'1.5px solid #fecaca',background:'#fef2f2',fontSize:13,fontWeight:600,color:'#ef4444',cursor:'pointer' }}>
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <RpmEditor
                      onSalvar={(url) => setRpmUrlTemp(url)}
                      onFechar={() => setAbaAtiva('emoji')}
                    />
                  )}
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

/* ─── Componente principal — inalterado na interface ─── */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData,     setPerfilData]    = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto,    setModalAberto]    = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();
  const { rpmUrl } = useRpmAvatar();

  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };
  const nomeExibido  = perfilData.nome || userEmail?.split('@')[0] || 'Meu perfil';
  const corBorda     = rpmUrl ? '#8b5cf6' : avatarConfig.cor;

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
        {/* Botão avatar — agora pode mostrar 3D */}
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
          <AvatarAtual config={avatarConfig} rpmUrl={rpmUrl} size={46} />
        </button>

        {/* Dropdown — inalterado */}
        {dropdownAberto && (
          <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:16,boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:240,overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>

            <div style={{ background:`linear-gradient(135deg, ${corBorda}ee, ${corBorda}99)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)' }}>
                <AvatarAtual config={avatarConfig} rpmUrl={rpmUrl} size={42} />
              </div>
              <div style={{ overflow:'hidden',flex:1 }}>
                <p style={{ color:'white',fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nomeExibido}</p>
                {perfilData.curso
                  ? <p style={{ color:'rgba(255,255,255,0.7)',fontSize:12,marginTop:2,display:'flex',alignItems:'center',gap:4 }}><Target size={11}/>{perfilData.curso}</p>
                  : userEmail && <p style={{ color:'rgba(255,255,255,0.55)',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userEmail}</p>}
                {rpmUrl && (
                  <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:3 }}>
                    <Sparkles size={10}/> Avatar 3D
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
