import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_USERNAME } from './constants';

/** Accounts made with a username only get this made-up address, which cannot receive email. */
export const USERNAME_ONLY_DOMAIN = '@bolacomvisao.app';

export type ResetTarget = { kind: 'email'; email: string } | { kind: 'empty' } | { kind: 'username-only' };

/**
 * "Esqueci-me da palavra-passe" on the coaches' sign-in screen: which address the reset email goes to,
 * from what the person typed in "Utilizador ou Email". The admin aliases go to the admin's email (as the
 * sign-in does); any other username, or the made-up @bolacomvisao.app address, has no inbox to send to.
 */
export function resetTargetFor(input: string): ResetTarget {
  const value = input.trim().toLowerCase();
  if (!value) return { kind: 'empty' };
  if (value.includes('@')) {
    return value.endsWith(USERNAME_ONLY_DOMAIN) ? { kind: 'username-only' } : { kind: 'email', email: value };
  }
  if (value === MASTER_ADMIN_USERNAME || value === 'admin' || value === 'santos') {
    return { kind: 'email', email: MASTER_ADMIN_EMAIL };
  }
  return { kind: 'username-only' };
}
