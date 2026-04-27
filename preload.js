const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Controles da janela
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),
  onMaximizeChange: (cb) => {
    ipcRenderer.on('window:maximized',   () => cb(true));
    ipcRenderer.on('window:unmaximized', () => cb(false));
  },

  // Google Drive OAuth
  authorize:    ()           => ipcRenderer.invoke('gdrive:authorize'),
  exchangeCode: (code)       => ipcRenderer.invoke('gdrive:exchangeCode', code),
  refreshToken: (refreshTok) => ipcRenderer.invoke('gdrive:refreshToken', refreshTok),

  // Armazenamento seguro do refresh_token (cofre do SO via keytar)
  // O renderer nunca toca no token diretamente — apenas pede ao processo principal
  // que salve, carregue ou apague. O valor nunca transita pelo disco do app.
  saveToken:   (token) => ipcRenderer.invoke('gdrive:saveToken', token),
  loadToken:   ()      => ipcRenderer.invoke('gdrive:loadToken'),
  deleteToken: ()      => ipcRenderer.invoke('gdrive:deleteToken'),
});
