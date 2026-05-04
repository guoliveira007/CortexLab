// src/groqConfig.js
//
// A chave Groq é salva em: config/groq  (path GLOBAL, não por usuário)
// Todos os usuários autenticados leem do mesmo documento.
// Só o owner pode escrever — verificado tanto aqui quanto nas Firestore Rules.

import { auth } from './firebase';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';

const db = getFirestore(getApp());

const OWNER_EMAIL = 'gusta.oli.fernandes@gmail.com';

// Path global — um único documento compartilhado por todos os usuários
const configRef = () => doc(db, 'config', 'groq');

export const salvarGroqKey = async (apiKey) => {
  if (auth.currentUser?.email !== OWNER_EMAIL) throw new Error('Sem permissão.');
  await setDoc(configRef(), { apiKey });
};

export const carregarGroqKey = async () => {
  try {
    const snap = await getDoc(configRef());
    return snap.exists() ? (snap.data().apiKey || null) : null;
  } catch {
    return null;
  }
};

export const removerGroqKey = async () => {
  if (auth.currentUser?.email !== OWNER_EMAIL) throw new Error('Sem permissão.');
  try { await deleteDoc(configRef()); } catch { /* já não existia */ }
};
