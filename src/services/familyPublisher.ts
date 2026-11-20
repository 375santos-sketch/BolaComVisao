/**
 * E1 — Keeps the family pages up to date from the coaches' phones: for each ACCEPTED invitation of the active team,
 * the page of that athlete (familyViewOf) is published again when it changed. Loaded only when needed (lazy).
 */
import { AppState } from '../types';
import { workspaceIdOf } from '../lib/deviceCache';
import { familyViewOf, GuardianInvite } from '../lib/familyView';
import { hashData, toPlainData } from '../lib/recordSync';
import {
  careerClubs,
  publishAthleteView,
  publishFamilyView,
  readAthleteView,
  readFamilyView,
  teamGuardianInvites
} from './guardians';
import { athleteViewOf } from '../lib/athleteView';
import { Player } from '../types';

const INVITES_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; invites: GuardianInvite[] }>();
let career: { at: number; clubs: string[] } | null = null;

/** What a published page holds, without its date (the same page published twice has the same hash). */
const viewHash = (view: { updatedAt: number }) => hashData({ ...toPlainData(view), updatedAt: 0 });

const readMark = (mark: string): string | null => {
  try {
    return localStorage.getItem(mark);
  } catch {
    return null; // publish anyway
  }
};

const remember = (mark: string, hash: string) => {
  try {
    localStorage.setItem(mark, hash);
  } catch {
    /* the next change publishes again */
  }
};

/** True when the cloud already holds exactly this page (unreadable or missing: publish it). */
async function sameInCloud(read: () => Promise<{ view: { updatedAt: number } } | null>, hash: string) {
  try {
    const current = await read();
    return Boolean(current?.view) && viewHash(current!.view) === hash;
  } catch {
    return false;
  }
}

/** MC2a: the athlete's page («O Meu Percurso») of one accepted invitation, published again when it changed. */
async function publishAthlete(invite: GuardianInvite, state: AppState, player: Player): Promise<number> {
  const view = athleteViewOf(state, player);
  const hash = viewHash(view);
  const mark = `bcv_ath_${invite.id}`;
  if (readMark(mark) === hash) return 0;
  if (await sameInCloud(() => readAthleteView(invite.id), hash)) {
    remember(mark, hash);
    return 0;
  }
  try {
    await publishAthleteView(invite, view);
    remember(mark, hash);
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
    const hash = viewHash(view);
    const mark = `bcv_fam_${invite.id}`;
    if (readMark(mark) === hash) continue;
    // A phone that never published this page (new device, after signing in again) first compares with the cloud:
    // the same page is not written again (it would only spend the daily quota and change nothing for the family).
    if (await sameInCloud(() => readFamilyView(invite.id), hash)) {
      remember(mark, hash);
      continue;
    }
    try {
      await publishFamilyView(invite, view);
      published++;
      remember(mark, hash);
    } catch (err) {
      console.warn('Página do educando: não foi possível atualizar.', err);
    }
  }
  return published;
}

/** After an invitation is created or revoked here, the next publish reads the list again. */
export const forgetFamilyInvites = () => cache.clear();
