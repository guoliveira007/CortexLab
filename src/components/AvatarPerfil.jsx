// src/components/AvatarPerfil.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, Settings, HardDrive, LogOut, Check, Target, X, RefreshCw } from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

/* ════════════════════════════════════════════════════
   OPÇÕES DE CUSTOMIZAÇÃO — estilo Avataaars
   ════════════════════════════════════════════════════ */
const OPCOES = {
  sexo: [
    { valor: 'man',   rotulo: 'Masculino' },
    { valor: 'woman', rotulo: 'Feminino' },
  ],
  corPele: [
    { valor: 'light',  cor: '#f5d0b0' },
    { valor: 'brown',  cor: '#c48768' },
    { valor: 'dark',   cor: '#8a5a44' },
    { valor: 'pale',   cor: '#fde8d0' },
    { valor: 'yellow', cor: '#e8c170' },
  ],
  cabelo: [
    { valor: 'normal',   rotulo: 'Normal' },
    { valor: 'thick',    rotulo: 'Volumoso' },
    { valor: 'mohawk',   rotulo: 'Moicano' },
    { valor: 'short',    rotulo: 'Curto' },
    { valor: 'long',     rotulo: 'Longo' },
    { valor: 'bob',      rotulo: 'Bob' },
    { valor: 'curly',    rotulo: 'Cacheado' },
    { valor: 'dreads',   rotulo: 'Dreads' },
  ],
  corCabelo: [
    { valor: 'black',  cor: '#1a1a1a' },
    { valor: 'brown',  cor: '#6b4226' },
    { valor: 'blonde', cor: '#e6c34a' },
    { valor: 'red',    cor: '#c9302c' },
    { valor: 'gray',   cor: '#9e9e9e' },
    { valor: 'blue',   cor: '#4a90d9' },
  ],
  barba: [
    { valor: 'none',     rotulo: 'Sem barba' },
    { valor: 'medium',   rotulo: 'Média' },
    { valor: 'light',    rotulo: 'Leve' },
    { valor: 'majestic', rotulo: 'Farta' },
  ],
  corBarba: [
    { valor: 'black',  cor: '#1a1a1a' },
    { valor: 'brown',  cor: '#6b4226' },
    { valor: 'blonde', cor: '#e6c34a' },
    { valor: 'red',    cor: '#c9302c' },
  ],
  roupa: [
    { valor: 'hoodie', rotulo: 'Moletom' },
    { valor: 'shirt',  rotulo: 'Camiseta' },
    { valor: 'polo',   rotulo: 'Polo' },
    { valor: 'blazer', rotulo: 'Blazer' },
  ],
  corRoupa: [
    { valor: 'blue',   cor: '#4a90d9' },
    { valor: 'red',    cor: '#e74c3c' },
    { valor: 'green',  cor: '#2ecc71' },
    { valor: 'yellow', cor: '#f1c40f' },
    { valor: 'black',  cor: '#2c3e50' },
    { valor: 'white',  cor: '#ecf0f1' },
    { valor: 'purple', cor: '#9b59b6' },
  ],
  olhos: [
    { valor: 'default', rotulo: 'Normal' },
    { valor: 'happy',   rotulo: 'Feliz' },
    { valor: 'wink',    rotulo: 'Piscando' },
    { valor: 'sleep',   rotulo: 'Sonolento' },
  ],
  oculos: [
    { valor: 'none',   rotulo: 'Sem óculos' },
    { valor: 'round',  rotulo: 'Redondo' },
    { valor: 'square', rotulo: 'Quadrado' },
  ],
  chapeu: [
    { valor: 'none',   rotulo: 'Sem chapéu' },
    { valor: 'beanie', rotulo: 'Touca' },
    { valor: 'cap',    rotulo: 'Boné' },
  ],
  boca: [
    { valor: 'smile',   rotulo: 'Sorriso' },
    { valor: 'serious', rotulo: 'Sério' },
    { valor: 'frown',   rotulo: 'Franzido' },
  ],
};

const CONFIG_PADRAO = {
  sexo: 'man',
  corPele: 'light',
  cabelo: 'normal',
  corCabelo: 'black',
  barba: 'none',
  corBarba: 'black',
  roupa: 'shirt',
  corRoupa: 'blue',
  olhos: 'default',
  oculos: 'none',
  chapeu: 'none',
  boca: 'smile',
};

/* ─── Cache de avatares gerados ─── */
const AVATAR_CACHE = new Map();

const gerarDataUri = (config, size = 128) => {
  const chave = JSON.stringify({ ...config, size });
  if (AVATAR_CACHE.has(chave)) return AVATAR_CACHE.get(chave);

  const opcoesDiceBear = {
    seed: 'cortexlab',
    size,
    backgroundColor: ['f0f0f0', 'e8f4f8', 'f5f5dc', 'ffe4e1', 'e6e6fa'],
    sex: config.sexo,
    skinColor: config.corPele,
    hairStyle: config.cabelo,
    hairColor: config.corCabelo,
    facialHairStyle: config.barba,
    facialHairColor: config.corBarba,
    clothingStyle: config.roupa,
    clothingColor: config.corRoupa,
    eyeStyle: config.olhos,
    glassesStyle: config.oculos,
    hatStyle: config.chapeu,
    mouthStyle: config.boca,
  };

  const avatar = createAvatar(avataaars, opcoesDiceBear);
  const uri = avatar.toDataUri();
  AVATAR_CACHE.set(chave, uri);
  return uri;
};

/* ─── Armazenamento do perfil ─── */
const STORAGE_KEY = 'cortexlab_perfil';
export const getPerfil = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};
const salvarPerfil = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ─── Seletor de opção (bolinhas coloridas ou botões de texto) ─── */
const SeletorOpcao = React.memo(({ opcoes, valorAtual, onChange, tipo = 'cor' }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {opcoes.map((op) => {
        const selecionado = op.valor === valorAtual;
        if (tipo === 'cor') {
          return (
            <button
              key={op.valor}
              onClick={() => onChange(op.valor)}
              title={op.valor}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: op.cor,
                border: selecionado ? '3px solid #6366f1' : '2px solid var(--gray-200)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: selecionado ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                padding: 0,
              }}
            />
          );
        }
        return (
          <button
            key={op.valor}
            onClick={() => onChange(op.valor)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: selecionado ? '2px solid #6366f1' : '1.5px solid var(--gray-200)',
              background: selecionado ? 'var(--brand-50)' : 'transparent',
              color: selecionado ? '#4f46e5' : 'var(--gray-600)',
              fontWeight: selecionado ? 700 : 500,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {op.rotulo}
          </button>
        );
      })}
    </div>
  );
});
SeletorOpcao.displayName = 'SeletorOpcao';

/* ─── Modal de edição de perfil ─── */
const ModalPerfil = ({ onFechar, perfil, onSalvar }) => {
  const [nome, setNome] = useState(perfil.nome || '');
  const [curso, setCurso] = useState(perfil.curso || '');
  const [config, setConfig] = useState(perfil.avatarConfig || CONFIG_PADRAO);

  // Estado para a URI da preview, atualizado automaticamente e também via botão "Gerar"
  const [previewUri, setPreviewUri] = useState(() => gerarDataUri(perfil.avatarConfig || CONFIG_PADRAO, 120));

  // Sempre que config mudar, atualiza a preview automaticamente
  useEffect(() => {
    setPreviewUri(gerarDataUri(config, 120));
  }, [config]);

  // Força a regeneração da preview (botão "Gerar")
  const gerarPreview = () => {
    // Limpa o cache para essa configuração? Não necessário, queremos forçar nova URI
    // Podemos simplesmente chamar setPreviewUri com nova chamada
    setPreviewUri(gerarDataUri(config, 120));
  };

  const salvar = () => {
    onSalvar({ nome, curso, avatarConfig: config });
    onFechar();
  };

  const atualizar = useCallback((campo, valor) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }, []);

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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            animation: 'pm-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'all',
          }}
        >
          {/* Cabeçalho com preview */}
          <div style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            padding: '20px 24px 18px',
            display: 'flex', alignItems: 'center', gap: '14px',
            position: 'relative', flexShrink: 0,
          }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              border: '3px solid rgba(255,255,255,0.4)',
              background: '#fff',
            }}>
              <img src={previewUri} alt="Preview" style={{ width: '100%', height: '100%' }} draggable={false} />
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

          {/* Corpo com scroll e editor */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* Nome e Curso */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="field-label">Seu nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria, João..."
                  maxLength={40}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="field-label">Curso alvo</label>
                <input
                  type="text"
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  placeholder="Ex: Medicina, Direito..."
                  maxLength={60}
                  className="input-modern"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{
                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--gray-400)', margin: 0,
              }}>
                Personalizar avatar
              </p>
              {/* Botão Gerar Preview */}
              <button
                onClick={gerarPreview}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
              >
                <RefreshCw size={14} /> Gerar Preview
              </button>
            </div>

            {/* Sexo */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Sexo</label>
              <SeletorOpcao opcoes={OPCOES.sexo} valorAtual={config.sexo} onChange={(v) => atualizar('sexo', v)} tipo="texto" />
            </div>

            {/* Cor da pele */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Cor da pele</label>
              <SeletorOpcao opcoes={OPCOES.corPele} valorAtual={config.corPele} onChange={(v) => atualizar('corPele', v)} tipo="cor" />
            </div>

            {/* Cabelo */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Estilo de cabelo</label>
              <SeletorOpcao opcoes={OPCOES.cabelo} valorAtual={config.cabelo} onChange={(v) => atualizar('cabelo', v)} tipo="texto" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Cor do cabelo</label>
              <SeletorOpcao opcoes={OPCOES.corCabelo} valorAtual={config.corCabelo} onChange={(v) => atualizar('corCabelo', v)} tipo="cor" />
            </div>

            {/* Barba (só aparece para sexo masculino) */}
            {config.sexo === 'man' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label className="field-label" style={{ marginBottom: '6px' }}>Estilo de barba</label>
                  <SeletorOpcao opcoes={OPCOES.barba} valorAtual={config.barba} onChange={(v) => atualizar('barba', v)} tipo="texto" />
                </div>
                {config.barba !== 'none' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label className="field-label" style={{ marginBottom: '6px' }}>Cor da barba</label>
                    <SeletorOpcao opcoes={OPCOES.corBarba} valorAtual={config.corBarba} onChange={(v) => atualizar('corBarba', v)} tipo="cor" />
                  </div>
                )}
              </>
            )}

            {/* Roupas */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Estilo de roupa</label>
              <SeletorOpcao opcoes={OPCOES.roupa} valorAtual={config.roupa} onChange={(v) => atualizar('roupa', v)} tipo="texto" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Cor da roupa</label>
              <SeletorOpcao opcoes={OPCOES.corRoupa} valorAtual={config.corRoupa} onChange={(v) => atualizar('corRoupa', v)} tipo="cor" />
            </div>

            {/* Olhos */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Expressão dos olhos</label>
              <SeletorOpcao opcoes={OPCOES.olhos} valorAtual={config.olhos} onChange={(v) => atualizar('olhos', v)} tipo="texto" />
            </div>

            {/* Óculos */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Óculos</label>
              <SeletorOpcao opcoes={OPCOES.oculos} valorAtual={config.oculos} onChange={(v) => atualizar('oculos', v)} tipo="texto" />
            </div>

            {/* Chapéu */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Chapéu</label>
              <SeletorOpcao opcoes={OPCOES.chapeu} valorAtual={config.chapeu} onChange={(v) => atualizar('chapeu', v)} tipo="texto" />
            </div>

            {/* Boca */}
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ marginBottom: '6px' }}>Boca</label>
              <SeletorOpcao opcoes={OPCOES.boca} valorAtual={config.boca} onChange={(v) => atualizar('boca', v)} tipo="texto" />
            </div>
          </div>

          {/* Rodapé */}
          <div style={{
            padding: '14px 24px 20px',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            borderTop: '1px solid var(--gray-100)',
            flexShrink: 0,
          }}>
            <button onClick={onFechar} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={15} /> Cancelar
            </button>
            <button onClick={salvar} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={15} /> Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Componente principal (sem alterações) ─── */
const AvatarPerfil = ({ onAbrirConfig, onIrParaBackup, userEmail }) => {
  const [perfilData, setPerfilData] = useState(() => getPerfil());
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const containerRef = useRef(null);
  const isOwner = useIsOwner();

  const configAtual = perfilData.avatarConfig || CONFIG_PADRAO;
  const dataUriAtual = useMemo(() => gerarDataUri(configAtual, 46), [configAtual]);

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
          <img
            src={dataUriAtual}
            alt="Avatar"
            style={{ width: '100%', height: '100%', display: 'block' }}
            draggable={false}
          />
        </button>

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
                    background: '#fff',
                  }}
                >
                  <img
                    src={dataUriAtual}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    draggable={false}
                  />
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <p style={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {nomeExibido}
                  </p>
                  {perfilData.curso ? (
                    <p style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '12px',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Target size={11} />
                      {perfilData.curso}
                    </p>
                  ) : (
                    userEmail && (
                      <p style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: '11px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {userEmail}
                      </p>
                    )
                  )}
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
                    <span style={{
                      width: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gray-500)',
                    }}>
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
                  <span style={{
                    width: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <LogOut size={16} />
                  </span>
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>

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