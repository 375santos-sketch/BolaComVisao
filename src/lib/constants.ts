import { Match } from '../types';

/**
 * Single source of truth for global admin identity constants.
 * Firestore security rules authenticate administrators via /admins/{uid} documents
 * and authenticated user claims dynamically.
 */
export const MASTER_ADMIN_EMAIL = '375.santos@gmail.com';
export const MASTER_ADMIN_USERNAME = '375.santos';

export function isStrictAdminEmail(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Tamanho padrão de titulares (Futebol de 7).
 * Configurável por jogo através de match.lineupSize.
 */
export const LINEUP_SIZE = 7;

export function getLineupSize(match?: Match | null): number {
  return match?.lineupSize ?? LINEUP_SIZE;
}
