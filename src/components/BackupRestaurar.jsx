import React, { useState, useEffect } from 'react';
import { db } from '../database';
import { toast } from 'react-hot-toast';
import { useAutoBackup } from '../hooks/useAutoBackup';
import { useGoogleDrive } from '../hooks/useGoogleDrive';

const TABELAS = [
  'questoes', 'resultados', 'listas', 'simulados',
  'metas', 'sessoes', 'planejamento', 'conquistas', 'revisaoEspacada',
];

/* ── Exportar banco como JSON ── */
const exportarBanco = async () => {
  const dados = {};
  for (const tabela of TABELAS) {
    try { dados[tabela] = await db[tabela].toArray(); }
    catch { dados[tabela] = []; }
  }
  dados._exportadoEm = new Date().toISOString();
  dados._versao      = 3;
  return dados;
};

const baixarJSON = (dados) => {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cortexlab-backup-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importarBanco = async (dados, modo) => {
  if (!dados._versao) throw new Error('Arquivo de backup inválido.');
  for (const tabela of TABELAS) {
    if (!Array.isArray(dados[tabela])) continue;
    if (modo === 'substituir') await db[tabela].clear();
    for (const item of dados[tabela]) {
      try {
        if (modo === 'substituir') await db[tabela].add(item);
        else await db[tabela].put(item);
      } catch { /* ignora duplicatas */ }
    }
  }
};

/* ── StatItem ── */
const StatItem = ({ label, valor, emoji }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--r-md)',
    border: '1px solid var(--gray-100)',
  }}>
    <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>{emoji} {label}</span>
    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-600)', fontSize: '16px' }}>
      {valor}
    </span>
  </div>
);

/* ── Toggle ── */
const Toggle = ({ value, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: '44px', height: '24px', borderRadius: '12px',
      background: value ? 'var(--brand-500)' : 'var(--gray-300)',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: '3px',
      left: value ? '23px' : '3px',
      width: '18px', height: '18px', borderRadius: '50%',
      background: 'white', transition: 'left 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </button>
);

/* ── BackupRestaurar ── */
const BackupRestaurar = () => {
  const [stats, setStats]             = useState({});
  const [exportando, setExportando]   = useState(false);
  const [importando, setImportando]   = useState(false);
  const [arquivoInfo, setArquivoInfo] = useState(null);
  const [dadosImport, setDadosImport] = useState(null);
  const [modoImport, setModoImport]   = useState('merge');
  const [ultimoBackup, setUltimoBackup] = useState('');
  const [autoBackup, setAutoBackup]   = useState(
    () => localStorage.getItem('auto_backup') === 'true'
  );
  const [autoNuvem, setAutoNuvem]     = useState(
    () => localStorage.getItem('cortexlab_auto_nuvem') === 'true'
  );
  const [conectando, setConectando]   = useState(false);

  useAutoBackup(autoBackup);

  const {
    conectado, salvando, restaurando, ultimoEnvio,
    conectar, desconectar, enviarBackup, restaurarDoDrive,
  } = useGoogleDrive();

  // Auto-backup na nuvem: envia a cada 24h enquanto ativo
  useEffect(() => {
    if (!autoNuvem || !conectado) return;
    const intervalo = setInterval(async () => {
      try {
        const dados = await exportarBanco();
        await enviarBackup(JSON.stringify(dados, null, 2));
      } catch (e) {
        console.error('[AutoNuvem]', e);
      }
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [autoNuvem, conectado, enviarBackup]);

  useEffect(() => {
    carregarStats();
    setUltimoBackup(localStorage.getItem('ultimo_backup') || '');
  }, []);

  const carregarStats = async () => {
    const s = {};
    for (const t of TABELAS) {
      try { s[t] = await db[t].count(); }
      catch { s[t] = 0; }
    }
    setStats(s);
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const dados = await exportarBanco();
      baixarJSON(dados);
      const agora = new Date().toLocaleString('pt-BR');
      localStorage.setItem('ultimo_backup', agora);
      setUltimoBackup(agora);
      toast.success('Backup exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar: ' + e.message);
    } finally {
      setExportando(false);
    }
  };

  const handleArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        if (!dados._versao) throw new Error('Inválido');
        setDadosImport(dados);
        setArquivoInfo({
          nome: file.name,
          data: dados._exportadoEm ? new Date(dados._exportadoEm).toLocaleString('pt-BR') : 'desconhecida',
          questoes:   dados.questoes?.length   || 0,
          resultados: dados.resultados?.length || 0,
        });
      } catch {
        toast.error('Arquivo de backup inválido ou corrompido.');
        setDadosImport(null);
        setArquivoInfo(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportar = async () => {
    if (!dadosImport) return;
    setImportando(true);
    try {
      await importarBanco(dadosImport, modoImport);
      toast.success('Backup importado com sucesso!');
      setDadosImport(null);
      setArquivoInfo(null);
      carregarStats();
    } catch (e) {
      toast.error('Erro ao importar: ' + e.message);
    } finally {
      setImportando(false);
    }
  };

  const toggleAutoBackup = () => {
    const novo = !autoBackup;
    setAutoBackup(novo);
    localStorage.setItem('auto_backup', String(novo));
    toast(novo ? '✅ Auto-backup local ativado.' : 'Auto-backup local desativado.');
  };

  const toggleAutoNuvem = () => {
    const novo = !autoNuvem;
    setAutoNuvem(novo);
    localStorage.setItem('cortexlab_auto_nuvem', String(novo));
    toast(novo ? '☁️ Auto-backup na nuvem ativado.' : 'Auto-backup na nuvem desativado.');
  };

  const handleConectar = async () => {
    setConectando(true);
    try {
      await conectar();
      toast.success('✅ Google Drive conectado!');
    } catch (e) {
      toast.error('Erro ao conectar: ' + e.message);
    } finally {
      setConectando(false);
    }
  };

  const handleDesconectar = () => {
    desconectar();
    setAutoNuvem(false);
    localStorage.setItem('cortexlab_auto_nuvem', 'false');
    toast('Google Drive desconectado.');
  };

  const handleEnviarAgora = async () => {
    try {
      const dados = await exportarBanco();
      await enviarBackup(JSON.stringify(dados, null, 2));
      toast.success('☁️ Backup enviado para o Google Drive!');
    } catch (e) {
      toast.error('Erro ao enviar: ' + e.message);
    }
  };

  const handleRestaurarDrive = async () => {
    try {
      const dados = await restaurarDoDrive();
      await importarBanco(dados, 'merge');
      toast.success('✅ Backup restaurado do Google Drive!');
      carregarStats();
    } catch (e) {
      toast.error('Erro ao restaurar: ' + e.message);
    }
  };

  const restaurarAutoBackup = async () => {
    const backupStr = localStorage.getItem('cortexlab_autobackup');
    if (!backupStr) { toast.error('Nenhum backup automático encontrado.'); return; }
    try {
      const dados = JSON.parse(backupStr);
      await importarBanco(dados, 'merge');
      toast.success('Backup automático restaurado!');
      carregarStats();
    } catch (e) {
      toast.error('Falha ao restaurar: ' + e.message);
    }
  };

  const ultimoAutoBackup = localStorage.getItem('cortexlab_ultimo_autobackup');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Backup &amp; Restauração</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '2px' }}>
            Exporte e importe todos os seus dados com segurança.
          </p>
        </div>
      </div>

      {/* ── Google Drive ── */}
      <div className="card" style={{ marginBottom: '20px', border: conectado ? '1.5px solid #34d399' : '1.5px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, #4285F4, #34A853)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
          }}>☁️</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>
              Backup no Google Drive
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>
              {conectado
                ? '✅ Conectado — seus dados são enviados direto para a nuvem.'
                : 'Conecte sua conta Google para backup automático na nuvem.'}
            </p>
          </div>
          {conectado && (
            <span style={{
              background: '#d1fae5', color: '#065f46',
              fontSize: '11px', fontWeight: 700,
              padding: '3px 10px', borderRadius: '999px',
            }}>CONECTADO</span>
          )}
        </div>

        {conectado ? (
          <>
            <div style={{
              padding: '12px 14px', marginBottom: '12px',
              background: autoNuvem ? 'var(--brand-50)' : 'var(--gray-50)',
              border: `1px solid ${autoNuvem ? 'var(--brand-200)' : 'var(--gray-200)'}`,
              borderRadius: 'var(--r-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
            }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: autoNuvem ? 'var(--brand-700)' : 'var(--gray-700)' }}>
                  Auto-backup na nuvem
                </p>
                <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                  Envia automaticamente ao alterar dados (10s de debounce)
                </p>
                {ultimoEnvio && (
                  <p style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '2px' }}>
                    Último envio: {ultimoEnvio}
                  </p>
                )}
              </div>
              <Toggle value={autoNuvem} onChange={toggleAutoNuvem} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <button
                className="btn-primary"
                onClick={handleEnviarAgora}
                disabled={salvando}
                style={{ justifyContent: 'center', padding: '10px' }}
              >
                {salvando ? '⏳ Enviando...' : '☁️ Enviar backup agora'}
              </button>
              <button
                className="btn-secondary"
                onClick={handleRestaurarDrive}
                disabled={restaurando}
                style={{ justifyContent: 'center', padding: '10px' }}
              >
                {restaurando ? '⏳ Restaurando...' : '🔄 Restaurar do Drive'}
              </button>
            </div>

            <button
              onClick={handleDesconectar}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--gray-400)', fontSize: '12px', padding: '4px 0',
              }}
            >
              Desconectar Google Drive
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            onClick={handleConectar}
            disabled={conectando}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
          >
            {conectando ? '⏳ Abrindo navegador...' : '🔗 Conectar Google Drive'}
          </button>
        )}
      </div>

      {/* ── Exportar + Importar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>📥</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Exportar Backup</h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Baixa um arquivo .json com todos os dados</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            <StatItem emoji="📝" label="Questões"   valor={stats.questoes   || 0} />
            <StatItem emoji="✅" label="Resultados" valor={stats.resultados || 0} />
            <StatItem emoji="📋" label="Listas"     valor={stats.listas     || 0} />
            <StatItem emoji="🔄" label="Revisões"   valor={stats.revisaoEspacada || 0} />
          </div>

          {ultimoBackup && (
            <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '12px' }}>
              🕓 Último backup manual: <strong>{ultimoBackup}</strong>
            </p>
          )}

          <button
            className="btn-primary"
            onClick={handleExportar}
            disabled={exportando}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {exportando ? '⏳ Exportando...' : '🔄 Exportar Backup'}
          </button>

          <div style={{
            marginTop: '14px', padding: '12px 14px',
            background: autoBackup ? 'var(--brand-50)' : 'var(--gray-50)',
            border: `1px solid ${autoBackup ? 'var(--brand-200)' : 'var(--gray-200)'}`,
            borderRadius: 'var(--r-md)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
          }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: autoBackup ? 'var(--brand-700)' : 'var(--gray-700)' }}>
                Auto-backup local
              </p>
              <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>
                Salva no navegador a cada alteração
              </p>
              {ultimoAutoBackup && (
                <p style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '2px' }}>
                  Último: {ultimoAutoBackup}
                </p>
              )}
            </div>
            <Toggle value={autoBackup} onChange={toggleAutoBackup} />
          </div>

          <button
            className="btn-secondary"
            onClick={restaurarAutoBackup}
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center', padding: '10px' }}
          >
            🔧 Restaurar backup automático
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>📂</div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Restaurar Backup</h3>
              <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Importe um arquivo .json salvo anteriormente</p>
            </div>
          </div>

          <label style={{
            display: 'block', border: '2px dashed var(--gray-200)',
            borderRadius: 'var(--r-lg)', padding: '24px',
            textAlign: 'center', cursor: 'pointer',
            background: 'var(--gray-50)', marginBottom: '14px',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-400)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
          >
            <input type="file" accept=".json" onChange={handleArquivo} style={{ display: 'none' }} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-600)' }}>
              Clique para selecionar o arquivo
            </p>
            <p style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>
              Apenas arquivos .json do CortexLab
            </p>
          </label>

          {arquivoInfo && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: '14px',
            }}>
              <p style={{ fontWeight: 600, fontSize: '13px', color: '#166534', marginBottom: '4px' }}>
                ✅ {arquivoInfo.nome}
              </p>
              <p style={{ fontSize: '12px', color: '#15803d' }}>
                Exportado em: {arquivoInfo.data}<br />
                {arquivoInfo.questoes} questões · {arquivoInfo.resultados} resultados
              </p>
            </div>
          )}

          {arquivoInfo && (
            <div style={{ marginBottom: '14px' }}>
              <label className="field-label">Modo de importação</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'merge',      label: '🔀 Mesclar',    desc: 'Adiciona sem apagar existentes' },
                  { id: 'substituir', label: '⚠️ Substituir', desc: 'APAGA tudo e reimporta' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModoImport(m.id)}
                    style={{
                      flex: 1, padding: '10px',
                      border: `1.5px solid ${modoImport === m.id ? (m.id === 'substituir' ? '#ef4444' : 'var(--brand-500)') : 'var(--gray-200)'}`,
                      borderRadius: 'var(--r-md)',
                      background: modoImport === m.id ? (m.id === 'substituir' ? '#fef2f2' : 'var(--brand-50)') : 'white',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <p style={{ fontWeight: 700, fontSize: '12px', color: modoImport === m.id ? (m.id === 'substituir' ? '#dc2626' : 'var(--brand-700)') : 'var(--gray-700)' }}>
                      {m.label}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className={modoImport === 'substituir' ? 'btn-danger' : 'btn-primary'}
            onClick={handleImportar}
            disabled={!dadosImport || importando}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: !dadosImport ? 0.5 : 1 }}
          >
            {importando ? '⏳ Importando...' : '🔅 Restaurar Backup'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestaurar;
