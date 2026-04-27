const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',       // mantém os botões nativos do Windows mas permite customizar a cor
    titleBarOverlay: {
      color: '#0f172a',            // fundo da barra — mesmo tom do sidebar
      symbolColor: '#94a3b8',      // cor dos ícones (_, □, ×)
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Em desenvolvimento, carrega o servidor do Vite/CRA
  // Em produção, carrega o build
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');  // ajuste a porta se usar CRA (3000) ou outra
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html')); // ajuste para 'build/index.html' se usar CRA
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ── Controles da janela via IPC ── */
ipcMain.on('window:minimize', () => {
  win.minimize();
});

ipcMain.on('window:maximize', () => {
  if (win.isMaximized()) {
    win.unmaximize();
    win.webContents.send('window:unmaximized');
  } else {
    win.maximize();
    win.webContents.send('window:maximized');
  }
});

ipcMain.on('window:close', () => {
  win.close();
});
