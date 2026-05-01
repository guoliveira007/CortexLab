// src/hooks/useIsOwner.js
//
// Hook que retorna true apenas quando o usuário logado é o dono da plataforma.
// A verificação é feita pelo email do Firebase Auth — impossível de forjar
// pelo lado do cliente, pois depende da sessão autenticada no servidor.
//
// USO:
//   const isOwner = useIsOwner();
//   if (!isOwner) return null; // esconde o componente inteiro

import { useAuth } from '../AuthContext';

// ─── Troque pelo seu email real do Firebase ───────────────────
const OWNER_EMAIL = 'gusta.oli.fernandes@gmail.com'; // ← seu email aqui
// ─────────────────────────────────────────────────────────────

export const useIsOwner = () => {
  const { user } = useAuth();
  return user?.email === OWNER_EMAIL;
};
