import { useState, useCallback, useRef, useEffect } from 'react';

const BACKUP_FILE_KEY = 'cortexlab_gdrive_file_id';

// 🔐 SEGURANÇA — estratégia de armazenamento de tokens:
//
//   refresh_token → cofre nativo do SO via keytar (Windows Credential Manager,
//                   macOS Keychain, Linux libsecret). Nunca toca localStorage.
//                   Operações via window.electronAPI.{saveToken, loadToken, deleteToken}.
//
//   access_token  → memória do processo (objeto `memTokens` abaixo). Vida curta
//                   (~1h); é renovado automaticamente a partir do refresh_token.
//                   Não precisa — e não deve — ser gravado em disco.
//
//   file_id e ultimoEnvio → localStorage. Não são sensíveis: o ID do arquivo
//                   é inútil sem um access_token válido, e ultimoEnvio é só
//                   um timestamp de exibição.

/** Cache de acesso em memória — descartado ao fechar o app. */
const memTokens = {
  access_token: null,
  expires_at:   0,
};

/* ── Garante um access_token válido, renovando se necessário ── */
const getValidAccessToken = async () => {
  // Usa o token em memória se ainda não expirou (margem de 60s)
  if (memTokens.access_token && Date.now() < memTokens.expires_at - 60_000) {
    return memTokens.access_token;
  }

  // Carrega o refresh_token do cofre do SO
  const stored = await window.electronAPI.loadToken();
  if (!stored.success || !stored.token) {
    throw new Error('Não conectado ao Google Drive.');
  }

  // Solicita novo access_token ao Google
  const result = await window.electronAPI.refreshToken(stored.token);
  if (!result.success) throw new Error('Falha ao renovar token: ' + result.error);

  // Guarda só em memória
  memTokens.access_token = result.tokens.access_token;
  memTokens.expires_at   = Date.now() + result.tokens.expires_in * 1000;
  return memTokens.access_token;
};

/* ── Busca ou cria o arquivo de backup no Drive ── */
const getOrCreateFile = async (accessToken) => {
  const savedId = localStorage.getItem(BACKUP_FILE_KEY);

  if (savedId) {
    const check = await fetch(
      `https://www.googleapis.com/drive/v3/files/${savedId}?fields=id,name,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (check.ok) {
      const f = await check.json();
      if (!f.trashed) return savedId;
    }
    localStorage.removeItem(BACKUP_FILE_KEY);
  }

  const meta = { name: 'cortexlab-backup.json', parents: ['appDataFolder'] };
  const res  = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(meta),
  });

  if (!res.ok) throw new Error('Erro ao criar arquivo no Drive: ' + res.status);
  const { id } = await res.json();
  localStorage.setItem(BACKUP_FILE_KEY, id);
  return id;
};

/* ── Hook principal ── */
export const useGoogleDrive = () => {
  // Começa false; o useEffect abaixo verifica o keychain assim que o hook monta.
  const [conectado, setConectado]     = useState(false);
  const [salvando, setSalvando]       = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [ultimoEnvio, setUltimoEnvio] = useState(
    () => localStorage.getItem('cortexlab_gdrive_ultimo') || ''
  );
  const debounceRef = useRef(null);

  /* ── Verifica na montagem se já existe um refresh_token salvo ── */
  useEffect(() => {
    window.electronAPI.loadToken().then((result) => {
      if (result.success && result.token) setConectado(true);
    });
  }, []);

  /* ── Conectar (OAuth) ── */
  const conectar = useCallback(async () => {
    const authResult = await window.electronAPI.authorize();
    if (!authResult.success) throw new Error(authResult.error);

    const tokenResult = await window.electronAPI.exchangeCode(authResult.code);
    if (!tokenResult.success) throw new Error(tokenResult.error);

    // Persiste o refresh_token no cofre do SO
    const saveResult = await window.electronAPI.saveToken(tokenResult.tokens.refresh_token);
    if (!saveResult.success) {
      console.warn('[useGoogleDrive] saveToken falhou:', saveResult.error);
      // Não bloqueia o fluxo — o token está em memória até o app fechar
    }

    // Guarda o access_token só em memória
    memTokens.access_token = tokenResult.tokens.access_token;
    memTokens.expires_at   = Date.now() + tokenResult.tokens.expires_in * 1000;

    setConectado(true);
  }, []);

  /* ── Desconectar ── */
  const desconectar = useCallback(async () => {
    // Apaga do cofre do SO
    await window.electronAPI.deleteToken();

    // Limpa memória e localStorage
    memTokens.access_token = null;
    memTokens.expires_at   = 0;
    localStorage.removeItem(BACKUP_FILE_KEY);
    localStorage.removeItem('cortexlab_gdrive_ultimo');

    setConectado(false);
    setUltimoEnvio('');
  }, []);

  /* ── Enviar backup para o Drive ── */
  const enviarBackup = useCallback(async (dadosJson) => {
    setSalvando(true);
    try {
      const accessToken = await getValidAccessToken();
      const fileId      = await getOrCreateFile(accessToken);

      const boundary = '-------cortexlab_boundary';
      const meta     = JSON.stringify({ name: 'cortexlab-backup.json' });
      const body     = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        meta,
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        dadosJson,
        `--${boundary}--`,
      ].join('\r\n');

      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        {
          method:  'PATCH',
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Erro no upload');
      }

      const agora = new Date().toLocaleString('pt-BR');
      localStorage.setItem('cortexlab_gdrive_ultimo', agora);
      setUltimoEnvio(agora);
    } finally {
      setSalvando(false);
    }
  }, []);

  /* ── Enviar com debounce (para auto-backup) ── */
  const enviarComDebounce = useCallback((dadosJson, ms = 10_000) => {
    if (!conectado) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => enviarBackup(dadosJson), ms);
  }, [conectado, enviarBackup]);

  /* ── Restaurar backup do Drive ── */
  const restaurarDoDrive = useCallback(async () => {
    setRestaurando(true);
    try {
      const accessToken = await getValidAccessToken();
      const fileId      = localStorage.getItem(BACKUP_FILE_KEY);
      if (!fileId) throw new Error('Nenhum backup encontrado no Drive.');

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) throw new Error('Erro ao baixar backup: ' + res.status);
      return await res.json();
    } finally {
      setRestaurando(false);
    }
  }, []);

  return {
    conectado,
    salvando,
    restaurando,
    ultimoEnvio,
    conectar,
    desconectar,
    enviarBackup,
    enviarComDebounce,
    restaurarDoDrive,
  };
};
