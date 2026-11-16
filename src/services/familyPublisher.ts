/**
 * E1 — Keeps the family pages up to date from the coaches' phones: for each ACCEPTED invitation of the active team,
 * the page of that athlete (familyViewOf) is published again when it changed. Loaded only when needed (lazy).
 */
import { AppState } from '../types';
import { workspaceIdOf } from '../lib/deviceCache';
import { familyViewOf, GuardianInvite } from '../lib/familyView';
import { hashData } from '../lib/recordSync';
import { publishFamilyView, teamGuardianInvites } from './guardians';

const INVITES_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; invites: GuardianInvite[] }>();

export async function publishFamilyViews(state: AppState): Promise<number> {
  const user = state.currentUser;
  if (!user?.id || user.id.startsWith('guest-') || !state.activeTeamId) return 0;
  const clubId = workspaceIdOf(user);
  const key = `${clubId}|${state.activeTeamId}`;
  let entry = cache.get(key);
  // While an invitation waits for the guardian, look again more often (the page appears soon after it is accepted)
  const ttl = entry?.invites.some((i) => i.status === 'pending') ? 60 * 1000 : INVITES_TTL;
  if (!entry || Date.now() - entry.at > ttl) {
    // Only who may invite lists the invitations (the others publish nothing: their pages are kept by the coach)
    const invites = await teamGuardianInvites(clubId, state.activeTeamId).catch(() => null);
    if (!invites) return 0;
    entry = { at: Date.now(), invites };
    cache.set(key, entry);
  }
  let published = 0;
  for (const invite of entry.invites.filter((i) => i.status === 'accepted')) {
    const player = (state.roster || []).find((p) => p.id === invite.athleteId);
    if (!player) continue;
    const view = familyViewOf(state, player);
    const hash = hashData({ ...view, updatedAt: 0 });
    const mark = `bcv_fam_${invite.id}`;
    try {
      if (localStorage.getItem(mark) === hash) continue;
    } catch {
      /* publish anyway */
    }
    try {
      await publishFamilyView(invite, view);
      published++;
      try {
        localStorage.setItem(mark, hash);
      } catch {
        /* the next change publishes again */
      }
    } catch (err) {
      console.warn('Página do educando: não foi possível atualizar.', err);
    }
  }
  return published;
}

/** After an invitation is created or revoked here, the next publish reads the list again. */
export const forgetFamilyInvites = () => cache.clear();
