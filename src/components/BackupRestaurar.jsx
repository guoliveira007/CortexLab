import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../database';
import { toast } from 'react-hot-toast';

const TABELAS = [
  'questoes', 'resultados', 'listas', 'simulados',
  'metas', 'sessoes', 'planejamento', 'conquistas', 'revisaoEspacada',
];

/* ── Exportar banco como JSON ── */
const exportarBanco = async () => {
  const dados = {};
  for (const tabela of TABELAS) {
    try {
      dados[tabela] = await db[tabela].toArray();
    } catch {
      dados[tabela] = [];
    }
  }
  dados._exportadoEm = new Date().toISOString();
  dados._versao = 3;
  return dados;
};

const baixarJSON = (dados) => {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cortexlab-backup-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ── Função de importação otimizada para Firestore (bulkSet/writeBatch) ── */
const importarBanco = async (dados, modo) => {
  if (!dados._versao) throw new Error('Arquivo de backup inválido.');
  for (const tabela of TABELAS) {
    if (!Array.isArray(dados[tabela]) || dados[tabela].length === 0) continue;
    if (modo === 'substituir') {
      try {
        await db[tabela].clear();
      } catch (e) {
        console.warn(`Erro ao limpar tabela ${tabela}:`, e);
      }
      // substituir: usa bulkSet (não bulkAdd) para PRESERVAR os IDs originais.
      // bulkAdd atribui IDs novos às questões, quebrando todas as referências
      // em resultados, revisaoEspacada e listas que guardam o questaoId antigo.
      try {
        await db[tabela].bulkSet(dados[tabela]);
      } catch (e) {
        console.warn(`Erro ao importar tabela ${tabela}:`, e);
      }
    } else {
      // merge: put item a item para preservar IDs existentes
      for (const item of dados[tabela]) {
        try {
          await db[tabela].put(item);
        } catch (e) {
          console.warn(`Erro ao mesclar item em ${tabela}:`, e);
        }
      }
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

/* ── BackupRestaurar ── */
const BackupRestaurar = () => {
  const [stats, setStats] = useState({});
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [arquivoInfo, setArquivoInfo] = useState(null);
  const [dadosImport, setDadosImport] = useState(null);
  const [modoImport, setModoImport] = useState('merge');
  const [ultimoBackup, setUltimoBackup] = useState('');

  const carregarStats = useCallback(async () => {
    const s = {};
    for (const t of TABELAS) {
      try {
        s[t] = await db[t].count();
      } catch {
        s[t] = 0;
      }
    }
    setStats(s);
  }, []);

  useEffect(() => {
    carregarStats();
    setUltimoBackup(localStorage.getItem('ultimo_backup') || '');
  }, [carregarStats]);

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
          questoes: dados.questoes?.length || 0,
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