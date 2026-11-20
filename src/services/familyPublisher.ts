/**
 * E1 — Keeps the family pages up to date from the coaches' phones: for each ACCEPTED invitation of the active team,
 * the page of that athlete (familyViewOf) is published again when it changed. Loaded only when needed (lazy).
 */
import { AppState } from '../types';
import { workspaceIdOf } from '../lib/deviceCache';
import { familyViewOf, GuardianInvite } from '../lib/familyView';
import { hashData } from '../lib/recordSync';
import { careerClubs, publishAthleteView, publishFamilyView, teamGuardianInvites } from './guardians';
import { athleteViewOf } from '../lib/athleteView';
import { Player } from '../types';

const INVITES_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; invites: GuardianInvite[] }>();
let career: { at: number; clubs: string[] } | null = null;

/** MC2a: the athlete's page («O Meu Percurso») of one accepted invitation, published again when it changed. */
async function publishAthlete(invite: GuardianInvite, state: AppState, player: Player): Promise<number> {
  const view = athleteViewOf(state, player);
  const hash = hashData({ ...view, updatedAt: 0 });
  const mark = `bcv_ath_${invite.id}`;
  try {
    if (localStorage.getItem(mark) === hash) return 0;
  } catch {
    /* publish anyway */
  }
  try {
    await publishAthleteView(invite, view);
    try {
      localStorage.setItem(mark, hash);
    } catch {
      /* the next change publishes again */
    }
    return 1;
  } catch (err) {
    console.warn('O Meu Percurso: não foi possível atualizar.', err);
    return 0;
  }
}

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
  // MC2a: «O Meu Percurso» only in the clubs the platform Administrator switched on (read again every 10 minutes)
  if (!career || Date.now() - career.at > INVITES_TTL) {
    const clubs = await careerClubs().catch(() => null);
    career = { at: Date.now(), clubs: clubs || [] };
  }
  const careerOn = career.clubs.includes(clubId);
  let published = 0;
  for (const invite of entry.invites.filter((i) => i.status === 'accepted')) {
    const player = (state.roster || []).find((p) => p.id === invite.athleteId);
    if (!player) continue;
    // «O Meu Percurso» on its own: the coach's ticks change it without changing the family's page
    if (careerOn) published += await publishAthlete(invite, state, player);
    // The athlete's own account (13+) has only «O Meu Percurso»: never a family page
    if (invite.kind === 'atleta') continue;
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
