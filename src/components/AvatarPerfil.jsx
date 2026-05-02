// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import Avatar from 'avataaars';

/* ════════════════════════════════════════════════════
   OPÇÕES COMPLETAS DE CUSTOMIZAÇÃO (avataaars)
   ════════════════════════════════════════════════════ */
const OPCOES = {
  skinColor: ['Tanned','Yellow','Pale','Light','Brown','DarkBrown','Black'],
  topType: [
    'NoHair','Eyepatch','Hat','Hijab','Turban',
    'WinterHat1','WinterHat2','WinterHat3','WinterHat4',
    'LongHairBigHair','LongHairBob','LongHairBun','LongHairCurly','LongHairCurvy',
    'LongHairDreads','LongHairFrida','LongHairFro','LongHairFroBand',
    'LongHairNotTooLong','LongHairShavedSides','LongHairMiaWallace',
    'LongHairStraight','LongHairStraight2','LongHairStraightStrand',
    'ShortHairDreads01','ShortHairDreads02','ShortHairFrizzle',
    'ShortHairShaggyMullet','ShortHairShortCurly','ShortHairShortFlat',
    'ShortHairShortRound','ShortHairShortWaved','ShortHairSides',
    'ShortHairTheCaesar','ShortHairTheCaesarSidePart',
  ],
  hairColor: [
    'Auburn','Black','Blonde','BlondeGolden','Brown','BrownDark',
    'PastelPink','Platinum','Red','SilverGray',
  ],
  accessoriesType: ['Blank','Kurt','Prescription01','Prescription02','Round','Sunglasses','Wayfarers'],
  facialHairType: ['Blank','BeardMedium','BeardLight','BeardMajestic','MoustacheFancy','MoustacheMagnum'],
  facialHairColor: ['Auburn','Black','Blonde','BlondeGolden','Brown','BrownDark','Platinum','Red'],
  clotheType: [
    'BlazerShirt','BlazerSweater','CollarSweater','GraphicShirt',
    'Hoodie','Overall','ShirtCrewNeck','ShirtScoopNeck','ShirtVNeck',
  ],
  clotheColor: [
    'Black','Blue01','Blue02','Blue03','Gray01','Gray02','Heather',
    'PastelBlue','PastelGreen','PastelOrange','PastelRed','PastelYellow',
    'Pink','Red','White',
  ],
  eyeType: [
    'Close','Cry','Default','Dizzy','EyeRoll','Happy','Hearts',
    'Side','Squint','Surprised','Wink','WinkWacky',
  ],
  eyebrowType: [
    'Angry','AngryNatural','Default','DefaultNatural','FlatNatural',
    'RaisedExcited','RaisedExcitedNatural','SadConcerned','SadConcernedNatural',
    'UnibrowNatural','UpDown','UpDownNatural',
  ],
  mouthType: [
    'Concerned','Default','Disbelief','Eating','Grimace','Sad',
    'ScreamOpen','Serious','Smile','Tongue','Twinkle','Vomit',
  ],
};

// Configuração padrão inicial (primeiro acesso)
const CONFIG_PADRAO = {
  avatarStyle: 'Circle',
  topType: 'ShortHairShortFlat',
  accessoriesType: 'Blank',
  hairColor: 'Black',
  facialHairType: 'Blank',
  facialHairColor: 'Black',
  clotheType: 'Hoodie',
  clotheColor: 'Blue01',
  eyeType: 'Default',
  eyebrowType: 'Default',
  mouthType: 'Smile',
  skinColor: 'Light',
};

/* ─── Armazenamento do perfil ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Componente de seletor reutilizável ─── */
const SeletorOpcao = React.memo(({ rotulo, opcoes, valorAtual, onChange }) => (
  <div style={{ marginBottom: '14px' }}>
    <label className="field-label" style={{ marginBottom: '6px' }}>{rotulo}</label>
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {opcoes.map((op) => {
        const selecionado = op === valorAtual;
        return (
          <button
            key={op}
            onClick={() => onChange(op)}
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              border: selecionado ? '2px solid #6366f1' : '1.5px solid var(--gray-200)',
              background: selecionado ? 'var(--brand-50)' : 'transparent',
              color: selecionado ? '#4f46e5' : 'var(--gray-600)',
              fontWeight: selecionado ? 700 : 500,
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {op.replace(/([A-Z])/g, ' $1').replace(/([0-9]+)/g, ' $1').trim()}
          </button>
        );
      })}
    </div>
  </div>
));
SeletorOpcao.displayName = 'SeletorOpcao';

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome] = useState(perfil.nome || '');
  const [curso, setCurso] = useState(perfil.curso || '');
  // Estado com todas as opções do avatar
  const [avatarConfig, setAvatarConfig] = useState(() => ({
    ...CONFIG_PADRAO,
    ...(perfil.avatarConfig || {}),
  }));

  const atualizar = useCallback((chave, valor) => {
    setAvatarConfig(prev => ({ ...prev, [chave]: valor }));
  }, []);

  const salvar = () => {
    onSalvar({ nome, curso, avatarConfig });
    onFechar();
  };

  return (
    <>
      <style>{`
        @keyframes pm-in { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pm-bg { from { opacity:0; } to { opacity:1; } }
      `}</style>
      <div onClick={onFechar} style={{ position:'fixed',inset:0,zIndex:9100,background:'rgba(10,15,30,0.65)',backdropFilter:'blur(6px)',animation:'pm-bg 0.2s ease' }} />
      <div onClick={e => e.stopPropagation()} style={{ position:'fixed',inset:0,zIndex:9101,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',pointerEvents:'none' }}>
        <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'24px',width:'100%',maxWidth:'700px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.25)',animation:'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:'all' }}>

          {/* Cabeçalho com preview */}
          <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'20px 24px 18px',display:'flex',alignItems:'center',gap:'14px',position:'relative',flexShrink:0 }}>
            <div style={{ width:'100px',height:'100px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,0.4)',background:'#f0f0f0' }}>
              <Avatar
                style={{ width:'100%',height:'100%' }}
                avatarStyle="Circle"
                {...avatarConfig}
              />
            </div>
            <div>
              <p style={{ color:'white',fontWeight:800,fontSize:'16px',fontFamily:'var(--font-display)' }}>{nome || 'Meu perfil'}</p>
              {curso ? <p style={{ color:'rgba(255,255,255,0.75)',fontSize:'13px',marginTop:'2px',display:'flex',alignItems:'center',gap:'5px' }}><Target size={12} />{curso}</p>
                : <p style={{ color:'rgba(255,255,255,0.6)',fontSize:'12px',marginTop:'2px' }}>Sem curso alvo definido</p>}
            </div>
            <button onClick={onFechar} style={{ position:'absolute',top:'14px',right:'14px',width:'30px',height:'30px',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}><X size={16} /></button>
          </div>

          {/* Corpo com scroll e editor completo */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px' }}>
              <div><label className="field-label">Seu nome</label><input type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Maria, João..." maxLength={40} className="input-modern" /></div>
              <div><label className="field-label">Curso alvo</label><input type="text" value={curso} onChange={e=>setCurso(e.target.value)} placeholder="Ex: Medicina, Direito..." maxLength={60} className="input-modern" /></div>
            </div>

            <p style={{ fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--gray-400)',marginBottom:'16px' }}>
              Personalizar avatar
            </p>

            <SeletorOpcao rotulo="Tom de pele" opcoes={OPCOES.skinColor} valorAtual={avatarConfig.skinColor} onChange={v => atualizar('skinColor', v)} />
            <SeletorOpcao rotulo="Cabelo" opcoes={OPCOES.topType} valorAtual={avatarConfig.topType} onChange={v => atualizar('topType', v)} />
            <SeletorOpcao rotulo="Cor do cabelo" opcoes={OPCOES.hairColor} valorAtual={avatarConfig.hairColor} onChange={v => atualizar('hairColor', v)} />
            <SeletorOpcao rotulo="Acessórios / Óculos" opcoes={OPCOES.accessoriesType} valorAtual={avatarConfig.accessoriesType} onChange={v => atualizar('accessoriesType', v)} />
            <SeletorOpcao rotulo="Barba" opcoes={OPCOES.facialHairType} valorAtual={avatarConfig.facialHairType} onChange={v => atualizar('facialHairType', v)} />
            {avatarConfig.facialHairType !== 'Blank' && (
              <SeletorOpcao rotulo="Cor da barba" opcoes={OPCOES.facialHairColor} valorAtual={avatarConfig.facialHairColor} onChange={v => atualizar('facialHairColor', v)} />
            )}
            <SeletorOpcao rotulo="Roupa" opcoes={OPCOES.clotheType} valorAtual={avatarConfig.clotheType} onChange={v => atualizar('clotheType', v)} />
            <SeletorOpcao rotulo="Cor da roupa" opcoes={OPCOES.clotheColor} valorAtual={avatarConfig.clotheColor} onChange={v => atualizar('clotheColor', v)} />
            <SeletorOpcao rotulo="Olhos (expressão)" opcoes={OPCOES.eyeType} valorAtual={avatarConfig.eyeType} onChange={v => atualizar('eyeType', v)} />
            <SeletorOpcao rotulo="Sobrancelhas" opcoes={OPCOES.eyebrowType} valorAtual={avatarConfig.eyebrowType} onChange={v => atualizar('eyebrowType', v)} />
            <SeletorOpcao rotulo="Boca" opcoes={OPCOES.mouthType} valorAtual={avatarConfig.mouthType} onChange={v => atualizar('mouthType', v)} />
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

/* ─── Componente principal (dropdown do perfil) ─── */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData, setPerfilData] = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();

  const avatarConfig = { ...CONFIG_PADRAO, ...(perfilData.avatarConfig || {}) };

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
        <button onClick={()=>setDropdownAberto(d=>!d)} title="Perfil" style={{ width:'52px',height:'52px',borderRadius:'50%',background:dropdownAberto?'linear-gradient(135deg,#6366f1,#8b5cf6)':'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))',border:dropdownAberto?'2.5px solid #6366f1':'2px solid rgba(99,102,241,0.25)',cursor:'pointer',overflow:'hidden',transition:'all 0.2s',flexShrink:0,boxShadow:dropdownAberto?'0 0 0 4px rgba(99,102,241,0.15)':'none',padding:'3px' }}
          onMouseEnter={e=>{ if(!dropdownAberto){ e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))'; e.currentTarget.style.borderColor='rgba(99,102,241,0.5)'; }}}
          onMouseLeave={e=>{ if(!dropdownAberto){ e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))'; e.currentTarget.style.borderColor='rgba(99,102,241,0.25)'; }}}
        >
          <Avatar style={{ width:'100%',height:'100%' }} avatarStyle="Circle" {...avatarConfig} />
        </button>

        {dropdownAberto && (
          <>
            <style>{`@keyframes dd-in { from { opacity:0; transform:translateY(-8px) scale(0.96); } to { opacity:1; transform:none; } }`}</style>
            <div className="dark-modal" style={{ position:'absolute',top:'calc(100% + 10px)',right:0,background:'var(--surface-card)',borderRadius:'16px',boxShadow:'0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',minWidth:'240px',overflow:'hidden',zIndex:8000,animation:'dd-in 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px' }}>
                <div style={{ width:'42px',height:'42px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:'2px solid rgba(255,255,255,0.3)',background:'#f0f0f0' }}>
                  <Avatar style={{ width:'100%',height:'100%' }} avatarStyle="Circle" {...avatarConfig} />
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