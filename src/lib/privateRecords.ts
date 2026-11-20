import { AppState, Match, Player } from '../types';
import { LocalRecord, recordDocId, toPlainData } from './recordSync';

/**
 * F3.2 — The athletes' private data (F3 plan): contacts and health, evaluations, notes, goals (one record each per
 * athlete) and the ratings of each game, stored apart in club_workspace/{club}/private, where staff never reads.
 * Phase 0 (this step): the sport profile (records/player) still keeps everything and is the source of truth; the
 * devices that may write also keep these private copies up to date ("double writing"), only in the clubs the
 * platform Administrator switched on. Pure (no Firebase).
 */

export type PrivateKind = 'pcontact' | 'peval' | 'pnotes' | 'pgoals' | 'mratings';
export type PlayerPrivateKind = Exclude<PrivateKind, 'mratings'>;
export const PRIVATE_KINDS: PrivateKind[] = ['pcontact', 'peval', 'pnotes', 'pgoals', 'mratings'];

/** Which fields of the athlete go to each private record (F3 plan, section 1). */
export const PLAYER_PRIVATE_FIELDS: Record<PlayerPrivateKind, Array<keyof Player>> = {
  pcontact: ['phone', 'email', 'emergencyContact', 'height', 'weight', 'statusNote'],
  peval: ['evaluations', 'competencyEvaluations', 'fitnessTests'],
  pnotes: ['notes', 'coachNotes', 'seasonMessages'],
  pgoals: ['individualGoals']
};
const PLAYER_KINDS = Object.keys(PLAYER_PRIVATE_FIELDS) as PlayerPrivateKind[];
const ALL_PLAYER_FIELDS = PLAYER_KINDS.flatMap((k) => PLAYER_PRIVATE_FIELDS[k]);

/** Who writes each kind (the same as the rules, writesPrivate in firestore.rules: decisions D1–D8). */
const WRITES_BY_ROLE: Record<string, PrivateKind[]> = {
  owner: ['pcontact', 'peval', 'pgoals'],
  admin: ['pcontact', 'peval', 'pgoals'],
  diretor: ['pcontact'],
  coordenador: ['peval', 'pgoals'],
  treinador: PRIVATE_KINDS,
  adjunto: PRIVATE_KINDS,
  staff: []
};

/** The private kinds this member writes (none without a club membership: the old access has no private data). */
export const privateKindsFor = (user: { orgId?: string; orgRole?: string } | null | undefined): PrivateKind[] =>
  user?.orgId && user.orgRole ? WRITES_BY_ROLE[user.orgRole] || [] : [];

/** Whether this member reads the private data (every club role except staff). */
export const readsPrivateData = (user: { orgId?: string; orgRole?: string } | null | undefined): boolean =>
  Boolean(user?.orgId && user.orgRole && user.orgRole in WRITES_BY_ROLE && user.orgRole !== 'staff');

const filled = (v: unknown) =>
  v !== undefined &&
  v !== null &&
  v !== '' &&
  !(Array.isArray(v) && v.length === 0) &&
  !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

const pick = (item: object, fields: string[]): Record<string, unknown> | null => {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = (item as Record<string, unknown>)[f];
    if (filled(v)) out[f] = v;
  }
  return Object.keys(out).length ? out : null;
};

/** One private record per athlete and kind (only when it holds something) and one per game with ratings. */
export function extractPrivateRecords(state: AppState): Map<string, LocalRecord> {
  const out = new Map<string, LocalRecord>();
  for (const team of state.teams || []) {
    for (const p of team.roster || []) {
      if (!p?.id) continue;
      for (const kind of PLAYER_KINDS) {
        const data = pick(p, PLAYER_PRIVATE_FIELDS[kind] as string[]);
        if (data)
          out.set(recordDocId(kind as never, team.id, p.id), {
            kind: kind as never,
            teamId: team.id,
            entityId: p.id,
            data: toPlainData({ id: p.id, ...data })
          });
      }
    }
    for (const m of team.matches || []) {
      if (!m?.id || !filled(m.ratings)) continue;
      out.set(recordDocId('mratings' as never, team.id, m.id), {
        kind: 'mratings' as never,
        teamId: team.id,
        entityId: m.id,
        data: toPlainData({ id: m.id, ratings: m.ratings })
      });
    }
  }
  return out;
}

/** The state without any private field (what a member who does not read them keeps on the device). */
export function stripPrivate(state: AppState): AppState {
  const cleanPlayer = (p: Player): Player => {
    const copy = { ...p } as Record<string, unknown>;
    ALL_PLAYER_FIELDS.forEach((f) => delete copy[f as string]);
    return copy as unknown as Player;
  };
  const cleanMatch = (m: Match): Match => {
    const copy = { ...m };
    delete copy.ratings;
    return copy;
  };
  return {
    ...state,
    roster: (state.roster || []).map(cleanPlayer),
    matches: (state.matches || []).map(cleanMatch),
    teams: (state.teams || []).map((t) => ({
      ...t,
      roster: (t.roster || []).map(cleanPlayer),
      matches: (t.matches || []).map(cleanMatch)
    }))
  };
}

/** Whether a state still holds private data (to clean a device's cache once). */
export const hasPrivateData = (state: AppState): boolean =>
  extractPrivateRecords(state).size > 0 ||
  (state.roster || []).some((p) => pick(p, ALL_PLAYER_FIELDS as string[])) ||
  (state.matches || []).some((m) => filled(m.ratings));

/**
 * The state with the private records put back into the athletes and games (for when the private records become
 * the source, F3.5; and to check a copy against the sport profile, F3.3). Fields of a kind come only from its record.
 */
export function joinPrivate(state: AppState, records: Map<string, LocalRecord>): AppState {
  const byKey = new Map<string, Record<string, unknown>>();
  records.forEach((r) => byKey.set(`${r.kind}|${r.teamId}|${r.entityId}`, r.data));
  const joinPlayer = (teamId: string, p: Player): Player => {
    const out = { ...p } as Record<string, unknown>;
    for (const kind of PLAYER_KINDS) {
      const fields = PLAYER_PRIVATE_FIELDS[kind] as string[];
      fields.forEach((f) => delete out[f]);
      const data = byKey.get(`${kind}|${teamId}|${p.id}`);
      if (data) fields.forEach((f) => data[f] !== undefined && (out[f] = data[f]));
    }
    return out as unknown as Player;
  };
  const joinMatch = (teamId: string, m: Match): Match => {
    const out = { ...m };
    delete out.ratings;
    const data = byKey.get(`mratings|${teamId}|${m.id}`);
    if (data?.ratings) out.ratings = data.ratings as Match['ratings'];
    return out;
  };
  const teams = (state.teams || []).map((t) => ({
    ...t,
    roster: (t.roster || []).map((p) => joinPlayer(t.id, p)),
    matches: (t.matches || []).map((m) => joinMatch(t.id, m))
  }));
  const active = teams.find((t) => t.id === state.activeTeamId);
  return {
    ...state,
    teams,
    ...(active ? { roster: active.roster, matches: active.matches } : {})
  };
}
