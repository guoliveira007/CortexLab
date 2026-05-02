import React, { useState, useEffect } from 'react';
import { Bot, Palette, Settings, Lock, Save, Trash2, Sun, Moon, Check, X, ExternalLink } from 'lucide-react';

const TEMA_KEY = 'cortexlab_tema';

export const getTema = () => localStorage.getItem(TEMA_KEY) || 'claro';
export const aplicarTema = (tema) => {
  localStorage.setItem(TEMA_KEY, tema);
  if (tema === 'escuro') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
};

const Configuracoes = ({ onFechar }) => {
  const [aba, setAba] = useState('ia');
  const [apiKey, setApiKey] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [tema, setTema] = useState(getTema());

  useEffect(() => {
    setApiKey(localStorage.getItem('groq_api_key') || '');
  }, []);

  const salvarKey = () => {
    localStorage.setItem('groq_api_key', apiKey);
    setFeedback('salvo');
    setTimeout(() => setFeedback(null), 3000);
  };

  const removerKey = () => {
    localStorage.removeItem('groq_api_key');
    setApiKey('');
    setFeedback('removido');
    setTimeout(() => setFeedback(null), 3000);
  };

  const mudarTema = (novoTema) => {
    setTema(novoTema);
    aplicarTema(novoTema);
  };

  const abas = [
    { id: 'ia',        label: 'IA',        Icon: Bot     },
    { id: 'aparencia', label: 'Aparência',  Icon: Palette },
  ];

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9000 }}>
      <div className="dark-modal" style={{ background:'var(--surface-card)',borderRadius:'var(--r-2xl)',maxWidth:'500px',width:'90%',boxShadow:'0 24px 64px rgba(0,0,0,0.25)',overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'22px 24px 0',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <h3 style={{ fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:700,color:'var(--gray-900)',display:'flex',alignItems:'center',gap:'8px' }}>
            <Settings size={20} style={{ color:'var(--brand-500)' }} />
            Configurações
          </h3>
          <button onClick={onFechar} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)',display:'flex',alignItems:'center',justifyContent:'center',padding:'4px',borderRadius:'6px' }} onMouseEnter={e=>e.currentTarget.style.color='var(--gray-700)'} onMouseLeave={e=>e.currentTarget.style.color='var(--gray-400)'}>
            <X size={22} />
          </button>
        </div>

        {/* Abas */}
        <div style={{ display:'flex',gap:'4px',padding:'16px 24px 0',borderBottom:'1px solid var(--gray-100)' }}>
          {abas.map(({ id, label, Icon }) => (
            <button key={id} onClick={()=>setAba(id)} style={{ padding:'8px 16px',borderRadius:'10px 10px 0 0',border:'none',fontFamily:'inherit',fontSize:'14px',fontWeight:600,cursor:'pointer',transition:'all 0.15s',background:aba===id?'var(--surface-card)':'none',color:aba===id?'var(--brand-500)':'var(--gray-400)',borderBottom:aba===id?'2px solid var(--brand-500)':'2px solid transparent',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px' }}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ padding:'24px' }}>

          {/* ── ABA IA ── */}
          {aba === 'ia' && (
            <div>
              <p style={{ fontSize:'14px',color:'var(--gray-600)',marginBottom:'16px',lineHeight:'1.6' }}>
                Configure sua chave da API GroqCloud para usar as explicações com IA quando você errar uma questão.
                <br /><br />
                <strong style={{ display:'flex',alignItems:'center',gap:'5px' }}><ExternalLink size={13} /> Como obter (grátis, 14.400 req/dia):</strong><br />
                1. Acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color:'var(--brand-500)' }}>console.groq.com</a><br />
                2. Faça login com sua conta Google<br />
                3. Vá em "API Keys" e clique em "Create API Key"<br />
                4. Copie a chave (começa com gsk_...)
              </p>

              <div style={{ display:'flex',gap:'10px',alignItems:'flex-start',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'var(--r-md)',padding:'10px 14px',marginBottom:'18px',fontSize:'12px',color:'#92400e',lineHeight:'1.5' }}>
                <Lock size={14} style={{ flexShrink:0,marginTop:'1px' }} />
                <span>Sua chave é salva <strong>apenas localmente neste navegador</strong> e nunca enviada para servidores externos.</span>
              </div>

              <div style={{ marginBottom:'20px' }}>
                <label style={{ fontSize:'13px',fontWeight:600,color:'var(--gray-700)',display:'block',marginBottom:'6px' }}>Chave da API GroqCloud</label>
                <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="gsk_..." style={{ width:'100%',padding:'12px 14px',borderRadius:'var(--r-md)',border:'1.5px solid var(--gray-200)',fontSize:'14px',fontFamily:'monospace',background:'var(--surface-card)',color:'var(--gray-800)',outline:'none',boxSizing:'border-box' }} onFocus={e=>e.target.style.borderColor='#6366f1'} onBlur={e=>e.target.style.borderColor='var(--gray-200)'} />
              </div>

              {feedback === 'salvo'    && (
                <div style={{ background:'#ecfdf5',color:'#065f46',padding:'10px',borderRadius:'var(--r-md)',fontSize:'13px',marginBottom:'16px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px' }}>
                  <Check size={14} /> Chave salva!
                </div>
              )}
              {feedback === 'removido' && (
                <div style={{ background:'#fef2f2',color:'#991b1b',padding:'10px',borderRadius:'var(--r-md)',fontSize:'13px',marginBottom:'16px',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px' }}>
                  <Trash2 size={14} /> Chave removida.
                </div>
              )}

              <div style={{ display:'flex',gap:'10px',justifyContent:'flex-end' }}>
                {apiKey && (
                  <button onClick={removerKey} style={{ padding:'10px 20px',background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:'var(--r-md)',color:'#dc2626',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
                    <Trash2 size={15} /> Remover
                  </button>
                )}
                <button onClick={onFechar} style={{ padding:'10px 20px',background:'var(--gray-100)',border:'none',borderRadius:'var(--r-md)',color:'var(--gray-600)',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
                  <X size={15} /> Cancelar
                </button>
                <button onClick={salvarKey} style={{ padding:'10px 24px',background:'linear-gradient(135deg,var(--brand-500),var(--brand-600))',border:'none',borderRadius:'var(--r-md)',color:'white',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
                  <Save size={15} /> Salvar
                </button>
              </div>
            </div>
          )}

          {/* ── ABA APARÊNCIA ── */}
          {aba === 'aparencia' && (
            <div>
              <p style={{ fontSize:'14px',color:'var(--gray-600)',marginBottom:'20px',lineHeight:'1.6' }}>
                Escolha o tema visual da plataforma. A preferência é salva no seu navegador.
              </p>

              <div style={{ display:'flex',flexDirection:'column',gap:'12px',marginBottom:'28px' }}>
                {[
                  { valor:'claro',  Icon: Sun,  titulo:'Modo Claro',  desc:'Fundo branco, ideal para ambientes bem iluminados.' },
                  { valor:'escuro', Icon: Moon, titulo:'Modo Escuro',  desc:'Fundo escuro, menos cansativo à noite.' },
                ].map(op => (
                  <button key={op.valor} onClick={()=>mudarTema(op.valor)} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'16px',borderRadius:'14px',border:tema===op.valor?'2px solid #6366f1':'2px solid var(--gray-200)',background:tema===op.valor?'var(--brand-50)':'var(--surface-bg)',cursor:'pointer',textAlign:'left',transition:'all 0.15s',boxShadow:tema===op.valor?'0 0 0 3px rgba(99,102,241,0.15)':'none' }}>
                    <div style={{ width:'44px',height:'44px',borderRadius:'12px',background:tema===op.valor?'rgba(99,102,241,0.12)':'var(--gray-100)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <op.Icon size={22} style={{ color: tema===op.valor ? '#6366f1' : 'var(--gray-500)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight:700,fontSize:'15px',color:tema===op.valor?'#4f46e5':'var(--gray-800)',marginBottom:'2px' }}>{op.titulo}</p>
                      <p style={{ fontSize:'13px',color:'var(--gray-500)',lineHeight:'1.4' }}>{op.desc}</p>
                    </div>
                    {tema === op.valor && (
                      <div style={{ marginLeft:'auto',width:'22px',height:'22px',borderRadius:'50%',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <Check size={13} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex',justifyContent:'flex-end' }}>
                <button onClick={onFechar} style={{ padding:'10px 24px',background:'linear-gradient(135deg,var(--brand-500),var(--brand-600))',border:'none',borderRadius:'var(--r-md)',color:'white',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
                  <Check size={15} /> Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
