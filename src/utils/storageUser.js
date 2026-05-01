// src/utils/storageUser.js
//
// Helper centralizado para localStorage com escopo por usuário.
// Todas as chaves são prefixadas com o uid do Firebase Auth,
// garantindo que dados de usuários diferentes nunca se misturem.
//
// USO:
//   import { userStorage } from '../utils/storageUser';
//   userStorage.getItem('cortexlab_tema')         → 'uid123__cortexlab_tema'
//   userStorage.setItem('cortexlab_tema', 'escuro')
//   userStorage.removeItem('cortexlab_tema')

import { auth } from '../firebase';

const uid = () => auth.currentUser?.uid || 'anonymous';

export const userStorage = {
  key: (k) => `${uid()}__${k}`,

  getItem: (k) => {
    try { return localStorage.getItem(`${uid()}__${k}`); }
    catch { return null; }
  },

  setItem: (k, v) => {
    try { localStorage.setItem(`${uid()}__${k}`, v); }
    catch { /* quota exceeded — ignora */ }
  },

  removeItem: (k) => {
    try { localStorage.removeItem(`${uid()}__${k}`); }
    catch { /* ignorado */ }
  },

  getJSON: (k, fallback = null) => {
    try {
      const raw = localStorage.getItem(`${uid()}__${k}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  setJSON: (k, v) => {
    try { localStorage.setItem(`${uid()}__${k}`, JSON.stringify(v)); }
    catch { /* ignorado */ }
  },
};
