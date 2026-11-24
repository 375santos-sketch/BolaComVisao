/**
 * P0-08: who may use the AI routes of the server (crónica, leitura de prints, exercício com IA), and how often.
 *
 * - Only an approved account of the coaching staff (users/{uid}.account.status == 'approved', read with the user's own
 *   sign-in) or the Administrator (admins/{uid}). A signed-in account that is pending, rejected or has no profile
 *   is refused.
 * - Each account has a daily limit, so a leaked or misused account cannot spend the Gemini quota of the club.
 *
 * Pure functions: the server reads the documents and keeps the counters; the tests check the decisions here.
 */

/** Calls to the AI routes per account per day (UTC). Free Gemini plan for now (decisão 12). */
export const AI_DAILY_LIMIT = 40;

export type AiAccess = { ok: true } | { ok: false; status: 403; reason: string };

const NOT_APPROVED =
  'As funções de IA são só para contas aprovadas da equipa técnica. Peça ao Administrador para aprovar a sua conta.';

/**
 * Decides from the account of users/{uid} (already converted from the REST format) and from whether admins/{uid}
 * exists. The Administrator is recognised only by admins/{uid}, never by the e-mail.
 */
export function aiAccessFor(userDoc: Record<string, unknown> | null, isAdmin: boolean): AiAccess {
  if (isAdmin) return { ok: true };
  const account = userDoc?.account as Record<string, unknown> | undefined;
  if (!account || typeof account !== 'object') return { ok: false, status: 403, reason: NOT_APPROVED };
  const role = typeof account.role === 'string' ? account.role.trim() : '';
  if (account.status !== 'approved' || !role) return { ok: false, status: 403, reason: NOT_APPROVED };
  return { ok: true };
}

export type LimitResult = { ok: true; remaining: number } | { ok: false; status: 429; reason: string };

/**
 * Daily counter per account, kept in the memory of the server. It restarts when the server restarts (and each
 * server copy counts on its own): a brake against abuse, not an exact bill.
 */
export function createDailyLimiter(limit = AI_DAILY_LIMIT, now: () => number = Date.now) {
  let day = '';
  const counts = new Map<string, number>();
  return {
    take(uid: string): LimitResult {
      const today = new Date(now()).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        counts.clear();
      }
      const used = counts.get(uid) || 0;
      if (used >= limit) {
        return {
          ok: false,
          status: 429,
          reason: `Chegou ao limite de ${limit} pedidos de IA por dia. Amanhã volta a poder usar.`
        };
      }
      counts.set(uid, used + 1);
      return { ok: true, remaining: limit - used - 1 };
    }
  };
}
