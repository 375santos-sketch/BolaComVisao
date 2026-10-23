import { AppState, Player, StaffMember } from '../types';
import { dataUrlBytes } from './imageCompress';

/**
 * Photos saved before uploads were compressed are full-size data URLs (often 1–5 MB each, and the athletes' copy is
 * kept twice: state.roster and the team's roster). A few of them fill the phone's storage ("Espaço esgotado") and
 * exceed the cloud's 1 MB per record. These helpers find them and swap them for their small versions.
 */

/** Photos larger than this are reduced (the new uploads stay well below it). */
export const PHOTO_SHRINK_THRESHOLD = 80_000;

const isBig = (url?: string) =>
  typeof url === 'string' && url.startsWith('data:image/') && dataUrlBytes(url) > PHOTO_SHRINK_THRESHOLD;

/** Distinct oversized photos of athletes and staff, in every team. */
export function oversizedPhotos(state: Pick<AppState, 'roster' | 'teams' | 'staffMembers'>): string[] {
  const urls = new Set<string>();
  const add = (list?: { photoUrl?: string }[]) =>
    (list || []).forEach((x) => {
      if (x && isBig(x.photoUrl)) urls.add(x.photoUrl!);
    });
  add(state.roster);
  add(state.staffMembers);
  (state.teams || []).forEach((t) => {
    add(t.roster);
    add(t.staffMembers);
  });
  return [...urls];
}

/** State updates with each photo in `replacements` (old URL → small URL) swapped; null when nothing changes. */
export function replacePhotos(
  state: Pick<AppState, 'roster' | 'teams' | 'staffMembers'>,
  replacements: Map<string, string>
): Partial<AppState> | null {
  let changed = false;
  const swap = <T extends Player | StaffMember>(list?: T[]): T[] | undefined =>
    list?.map((x) => {
      const small = x?.photoUrl ? replacements.get(x.photoUrl) : undefined;
      if (!small) return x;
      changed = true;
      return { ...x, photoUrl: small };
    });
  const updates: Partial<AppState> = {
    roster: swap(state.roster) || state.roster,
    staffMembers: swap(state.staffMembers),
    teams: state.teams?.map((t) => ({
      ...t,
      roster: swap(t.roster) || t.roster,
      ...(t.staffMembers ? { staffMembers: swap(t.staffMembers) } : {})
    }))
  };
  if (!changed) return null;
  if (!state.staffMembers) delete updates.staffMembers;
  if (!state.teams) delete updates.teams;
  return updates;
}
