const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const { URL } = require('url');

// ─── Armazenamento seguro do refresh_token ───────────────────────────────────
//
// keytar delega ao cofre nativo do sistema operacional:
//   • Windows  → Credential Manager (wincred)
//   • macOS    → Keychain
//   • Linux    → libsecret / KWallet
//
// O token nunca é gravado em disco pelo app — nem em localStorage, nem em
// electron-store, nem em arquivo de texto. Para lê-lo, o processo principal
// (com privilégios do SO) precisa autenticar; o renderer não tem acesso direto.
//
// Se keytar não estiver disponível (ex.: ambiente de CI sem libsecret),
// as operações lançam erro controlado e o app continua funcionando sem
// armazenamento persistente — o usuário precisará reconectar ao Drive.
//
// Para instalar: npm install keytar
// Para empacotar com electron-builder adicione em package.json:
//   "build": { "extraResources": [{ "from": "node_modules/keytar", ... }] }
// ou use o plugin electron-rebuild antes do build.
// ────────────────────────────────────────────────────────────────────────────
let keytar;
try {
  keytar = require('keytar');
} catch {
  console.warn('[keytar] Módulo não encontrado — refresh_token não será persistido.');
}

const KEYTAR_SERVICE = 'cortexlab';
const KEYTAR_ACCOUNT = 'gdrive_refresh_token';

const CLIENT_ID     = '1006235137059-j8u3n4j8befkc6308a1pshcumcrop1fs.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI  = 'http://localhost:42813/oauth2callback';
const SCOPES        = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

let win;
let oauthServer = null;
let oauthResolve = null;

/* ── Cria janela principal ── */
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 38,
    },
    icon: path.join(__dirname, 'public', 'cortexlab.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

/* ── Servidor local para capturar o callback OAuth ── */
function startOAuthServer() {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      oauthServer.close();
      oauthServer = null;
    }

    oauthResolve = resolve;

    oauthServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:42813');
      if (url.pathname !== '/oauth2callback') return;

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:white">
          <h2>${error ? '❌ Erro na autorização' : '✅ CortexLab conectado ao Google Drive!'}</h2>
          <p>${error ? error : 'Pode fechar esta aba e voltar ao app.'}</p>
          <script>setTimeout(()=>window.close(),2000)</script>
        </body></html>
      `);

      if (oauthServer) { oauthServer.close(); oauthServer = null; }
      if (error) reject(new Error(error));
      else resolve(code);
    });

    oauthServer.listen(42813, '127.0.0.1', () => {});
    oauthServer.on('error', reject);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  /* ── IPC: iniciar fluxo OAuth ── */
  ipcMain.handle('gdrive:authorize', async () => {
    try {
      const serverPromise = startOAuthServer();

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      await shell.openExternal(authUrl);

      const code = await serverPromise;
      return { success: true, code };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  /* ── IPC: trocar code por tokens ── */
  ipcMain.handle('gdrive:exchangeCode', async (_, code) => {
    try {
      const body = new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      });

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await res.json();
      if (data.error) return { success: false, error: data.error_description };
      return { success: true, tokens: data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  /* ── IPC: renovar access token ── */
  ipcMain.handle('gdrive:refreshToken', async (_, refreshToken) => {
    try {
      const body = new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'refresh_token',
      });

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await res.json();
      if (data.error) return { success: false, error: data.error_description };
      return { success: true, tokens: data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  /* ── IPC: salvar refresh_token no cofre do SO ── */
  ipcMain.handle('gdrive:saveToken', async (_, token) => {
    if (!keytar) return { success: false, error: 'keytar indisponível' };
    try {
      await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, token);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  /* ── IPC: carregar refresh_token do cofre do SO ── */
  ipcMain.handle('gdrive:loadToken', async () => {
    if (!keytar) return { success: false, error: 'keytar indisponível' };
    try {
      const token = await keytar.findPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
      return { success: true, token }; // token é null se não existir
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  /* ── IPC: apagar refresh_token do cofre (desconectar Drive) ── */
  ipcMain.handle('gdrive:deleteToken', async () => {
    if (!keytar) return { success: false, error: 'keytar indisponível' };
    try {
      await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
});

app.on('window-all-closed', () => {
  if (oauthServer) { oauthServer.close(); oauthServer = null; }
  if (process.platform !== 'darwin') app.quit();
});

/* ── Controles da janela via IPC ── */
ipcMain.on('window:minimize', () => win.minimize());

ipcMain.on('window:maximize', () => {
  if (win.isMaximized()) {
    win.unmaximize();
    win.webContents.send('window:unmaximized');
  } else {
    win.maximize();
    win.webContents.send('window:maximized');
  }
});

ipcMain.on('window:close', () => win.close());
