// src/hooks/useIsOwner.js
// ──────────────────────────────────────────────
// Retorna true se o usuário logado é o dono da plataforma.
// Troque o email abaixo pelo seu email real do Firebase.
// ──────────────────────────────────────────────
import { useAuth } from '../AuthContext';

const OWNER_EMAIL = 'gusta.oli.fernandes@gmail.com';

export const useIsOwner = () => {
  const { user } = useAuth();
  return user?.email === OWNER_EMAIL;
};
