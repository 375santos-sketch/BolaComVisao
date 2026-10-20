import { AppState, SquadProfile } from '../types';
import { normalizeClubState } from './storage';

/**
 * Per-record cloud storage (club_workspace/{club}/records/{docId}).
 *
 * Every player, match, training, scheduled game, staff message and scouting report of every team is its own
 * Firestore document, plus one "club" document holding everything else (team list, settings, ...). This keeps
 * each document far below Firestore's 1 MB limit and lets two coaches edit different records at the same time.
 *
 * Changes are reconciled per record with a three-way merge between this device (local), the cloud (remote) and
 * the last version both agreed on (synced): whichever side changed wins; if both changed, the newer change wins.
 * This module is pure (no Firebase), so it can be tested exhaustively.
 */

export type EntityKind = 'player' | 'match' | 'training' | 'schedule' | 'message' | 'scouting';
export type RecordKind = EntityKind | 'club';

/** Team array that holds each kind of record. */
export const ENTITY_FIELDS: Record<EntityKind, keyof SquadProfile & keyof AppState> = {
  player: 'roster',
  match: 'matches',
  training: 'trainings',
  schedule: 'schedule',
  message: 'staffMessages',
  scouting: 'opponentScouting'
};
const ENTITY_KINDS = Object.keys(ENTITY_FIELDS) as EntityKind[];

/** Device-only fields that are never stored in the shared club document. */
const DEVICE_ONLY_FIELDS = ['currentUser', 'syncInfo', 'notifications', 'updatedAt', 'lastLocalMutationAt'] as const;

export const CLUB_DOC_ID = 'club';
const CLUB_TEAM_ID = '_club';
const ABSENT = '∅';

export interface LocalRecord {
  kind: RecordKind;
  teamId: string;
  entityId: string;
  data: Record<string, unknown>;
}

/** A record document as stored in Firestore. */
export interface CloudRecord extends LocalRecord {
  updatedAt: number;
  updatedBy?: string;
  deleted: boolean;
}

/** Hash of the last version of each record known to be identical on this device and in the cloud. */
export type SyncedHashes = Record<string, string>;

// ---------- Canonical JSON + hashing ----------

/** JSON with sorted keys and without undefined values: Firestore does not keep key order nor undefined. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

/** cyrb53 string hash (53-bit), compact enough to keep one per record in localStorage. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const hashData = (data: unknown): string => hashString(canonicalJson(data));

/** Plain JSON copy (drops undefined, which Firestore rejects). */
export const toPlainData = <T>(data: T): T => JSON.parse(JSON.stringify(data ?? null));

// ---------- Ids ----------

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

/** Firestore document id for a record (rules require [a-zA-Z0-9_-], max 128 chars). */
export function recordDocId(kind: RecordKind, teamId: string, entityId: string): string {
  if (kind === 'club') return CLUB_DOC_ID;
  const raw = `${kind}__${teamId}__${entityId}`;
  return SAFE_ID.test(raw) && raw.length <= 128 ? raw : `${kind}__h${hashString(raw)}${hashString(`${raw}#`)}`;
}

// ---------- AppState <-> records ----------

/** Splits a club state into one record per entity plus the "club" record (everything else). */
export function extractRecords(state: AppState): Map<string, LocalRecord> {
  const normalized = normalizeClubState(state);
  const records = new Map<string, LocalRecord>();

  normalized.teams.forEach((team) => {
    ENTITY_KINDS.forEach((kind) => {
      const list = (team[ENTITY_FIELDS[kind]] as unknown as Array<{ id?: string }> | undefined) || [];
      list.forEach((item) => {
        if (!item || !item.id) return;
        const id = recordDocId(kind, team.id, item.id);
        records.set(id, {
          kind,
          teamId: team.id,
          entityId: item.id,
          data: toPlainData(item) as Record<string, unknown>
        });
      });
    });
  });

  records.set(CLUB_DOC_ID, {
    kind: 'club',
    teamId: CLUB_TEAM_ID,
    entityId: CLUB_DOC_ID,
    data: toPlainData(clubDataOf(normalized)) as Record<string, unknown>
  });
  return records;
}

/** The shared club document: the state without per-record arrays and without device-only fields. */
export function clubDataOf(state: AppState): Partial<AppState> {
  const club: Record<string, unknown> = { ...state };
  DEVICE_ONLY_FIELDS.forEach((f) => delete club[f]);
  ENTITY_KINDS.forEach((kind) => delete club[ENTITY_FIELDS[kind]]);
  club.teams = (state.teams || []).map((t) => {
    const team: Record<string, unknown> = { ...t };
    ENTITY_KINDS.forEach((kind) => delete team[ENTITY_FIELDS[kind]]);
    return team;
  });
  return club as Partial<AppState>;
}

/**
 * Rebuilds a club state from the club record + entity records, keeping this device's device-only fields and
 * the order of records already on this device (new ones are appended).
 */
export function assembleState(records: Map<string, LocalRecord>, device: AppState): AppState {
  const club = records.get(CLUB_DOC_ID)?.data as Partial<AppState> | undefined;
  const base: AppState = { ...(device as AppState), ...(club || {}) } as AppState;
  const baseFields = base as unknown as Record<string, unknown>;
  const deviceFields = device as unknown as Record<string, unknown>;
  DEVICE_ONLY_FIELDS.forEach((f) => (baseFields[f] = deviceFields[f]));

  const deviceTeams = new Map((device.teams || []).map((t) => [t.id, t]));
  const teams: SquadProfile[] = (base.teams || []).map((team) => {
    const filled: Record<string, unknown> = { ...team };
    ENTITY_KINDS.forEach((kind) => {
      const field = ENTITY_FIELDS[kind];
      const items = new Map<string, Record<string, unknown>>();
      records.forEach((r) => {
        if (r.kind === kind && r.teamId === team.id) items.set(r.entityId, r.data);
      });
      const previousOrder = ((deviceTeams.get(team.id)?.[field] as unknown as Array<{ id: string }>) || []).map(
        (x) => x && x.id
      );
      const ordered = previousOrder.filter((id) => items.has(id)).map((id) => items.get(id)!);
      const appended = [...items].filter(([id]) => !previousOrder.includes(id)).map(([, data]) => data);
      appended.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      ordered.push(...appended);
      filled[field] = ordered;
    });
    return filled as unknown as SquadProfile;
  });

  const active = teams.find((t) => t.id === base.activeTeamId) || teams[0];
  const state: Record<string, unknown> = { ...base, teams };
  ENTITY_KINDS.forEach((kind) => {
    const field = ENTITY_FIELDS[kind];
    state[field] = active ? (active as unknown as Record<string, unknown>)[field] || [] : [];
  });
  return normalizeClubState(state as unknown as AppState);
}

/** Chronological (date / createdAt) or shirt-number order for records that have no previous position. */
function sortKey(d: Record<string, unknown>): string {
  if (typeof d.date === 'string') return d.date;
  if (d.createdAt != null) return String(d.createdAt).padStart(15, '0');
  if (typeof d.number === 'number') return String(d.number).padStart(4, '0');
  return String(d.name ?? d.id ?? '');
}

// ---------- Three-way merge ----------

export interface MergeResult {
  /** Records after the merge (absent = deleted). */
  records: Map<string, LocalRecord>;
  /** Records where this device's version must be sent to the cloud (upsert, or tombstone if absent). */
  toPush: string[];
  /** Updated synced hashes (records taken from, or equal to, the cloud). */
  synced: SyncedHashes;
  /** Whether anything coming from the cloud changed the local data. */
  changedLocally: boolean;
}

/**
 * Reconciles local and cloud records against the last synced versions.
 * - only one side changed since the last sync → that side wins;
 * - both changed → the newer change wins (cloud `updatedAt` vs this device's `localMutationAt`);
 * - cloud records of teams this device does not know are left untouched (the team list may still be arriving).
 */
export function mergeRecords(input: {
  local: Map<string, LocalRecord>;
  remote: Map<string, CloudRecord>;
  synced: SyncedHashes;
  knownTeamIds: Set<string>;
  localMutationAt: number;
}): MergeResult {
  const { local, remote, knownTeamIds, localMutationAt } = input;
  const synced: SyncedHashes = { ...input.synced };
  const records = new Map<string, LocalRecord>();
  const toPush: string[] = [];
  let changedLocally = false;

  const ids = new Set<string>([...local.keys(), ...remote.keys(), ...Object.keys(input.synced)]);
  ids.forEach((id) => {
    const L = local.get(id);
    const R = remote.get(id);
    const live = R && !R.deleted ? R : undefined;

    const teamId = L?.teamId ?? R?.teamId;
    if (id !== CLUB_DOC_ID && teamId && !knownTeamIds.has(teamId) && !L) return; // unknown team: leave as is

    const hL = L ? hashData(L.data) : ABSENT;
    const hR = live ? hashData(live.data) : ABSENT;
    const hS = synced[id] ?? ABSENT;

    const takeRemote = () => {
      if (live) records.set(id, { kind: live.kind, teamId: live.teamId, entityId: live.entityId, data: live.data });
      if (hR === ABSENT) delete synced[id];
      else synced[id] = hR;
      if (hR !== hL) changedLocally = true;
    };
    const keepLocal = () => {
      if (L) records.set(id, L);
      toPush.push(id);
    };

    if (hL === hR) {
      if (L) records.set(id, L);
      if (hL === ABSENT) delete synced[id];
      else synced[id] = hL;
      return;
    }
    const localChanged = hL !== hS;
    const remoteChanged = hR !== hS;
    if (!localChanged) takeRemote();
    else if (!remoteChanged) keepLocal();
    else if ((R?.updatedAt ?? 0) > localMutationAt) takeRemote();
    else keepLocal();
  });

  return { records, toPush, synced, changedLocally };
}

/** Records of this device that differ from the last synced version (what a save must send). */
export function pendingRecordIds(local: Map<string, LocalRecord>, synced: SyncedHashes): string[] {
  const ids = new Set<string>([...local.keys(), ...Object.keys(synced)]);
  return [...ids].filter((id) => {
    const L = local.get(id);
    return (L ? hashData(L.data) : ABSENT) !== (synced[id] ?? ABSENT);
  });
}

/** The Firestore document to write for a pending record: the local version, or a tombstone if it was deleted. */
export function buildCloudWrite(
  id: string,
  local: Map<string, LocalRecord>,
  known: { kind: RecordKind; teamId: string; entityId: string } | undefined,
  now: number,
  updatedBy?: string
): CloudRecord | null {
  const L = local.get(id);
  if (L) return { ...L, updatedAt: now, deleted: false, ...(updatedBy ? { updatedBy } : {}) };
  if (!known || id === CLUB_DOC_ID) return null; // never delete the club document
  return { ...known, data: {}, updatedAt: now, deleted: true, ...(updatedBy ? { updatedBy } : {}) };
}

export const recordHash = (r: LocalRecord | undefined): string => (r ? hashData(r.data) : ABSENT);
export const ABSENT_HASH = ABSENT;
