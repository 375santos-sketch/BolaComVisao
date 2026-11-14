import {
  Query,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, isQuotaExceededError, markQuotaExhausted, getFirestoreQuotaState } from './firebase';
import type { CloudSyncResult } from './firebase';
import { AppState } from '../types';
import { initialDefaultState } from '../lib/storage';
import {
  CloudRecord,
  LocalRecord,
  RecordKind,
  SyncedHashes,
  CLUB_DOC_ID,
  extractRecords,
  assembleState,
  mergeRecords,
  pendingRecordIds,
  buildCloudWrite,
  toPlainData,
  setSynced,
  isRecordKey
} from '../lib/recordSync';
import { legacySyncedKey, syncedKeyFor } from '../lib/deviceCache';

/**
 * Cloud storage of a club, one Firestore document per record (club_workspace/{club}/records/{docId}).
 *
 * Modes, per club workspace:
 * - "legacy": the whole club lives in club_workspace/{club} (one document, 1 MB limit). Used until migrated,
 *   or while the Firestore rules for the records sub-collection are not published.
 * - "records": the records sub-collection holds the data. The "club" record is written LAST during the
 *   migration, so its presence means the migration completed. The legacy document is never modified again and
 *   stays as a backup (deleting records/club in the console falls back to it).
 */

type CloudMode = 'unknown' | 'legacy' | 'records';

const RECORD_KINDS: RecordKind[] = [
  'club',
  'player',
  'match',
  'training',
  'schedule',
  'message',
  'scouting',
  'exercise',
  'setpiece',
  'tacticplay',
  'teamphoto',
  'report',
  'teamconfig'
];
const MAX_BATCH_WRITES = 400;
const MAX_BATCH_BYTES = 4_000_000;
/** A save that would delete more than this share of the club's records is treated as a broken load. */
const MASS_DELETE_GUARD = 0.5;

const modeByWorkspace = new Map<string, CloudMode>();
const remoteByWorkspace = new Map<string, Map<string, CloudRecord>>();

const cleanWorkspaceId = (ws?: string | null) => (ws && ws.trim() ? ws.trim() : 'main');
const recordsCollection = (ws: string) => collection(db, 'club_workspace', ws, 'records');

// ---------- F2.2: team scope ----------
// A member who only works with some teams (organizations/{org}/members/{uid}.teamIds without '*') reads and
// writes ONLY those teams' records. The club record is read but never written by them (only who manages the club
// writes it), and the records of other teams are never touched nor taken for deleted. null = every team (as before).

const CLUB_RECORD_TEAM = '_club';
const IN_LIMIT = 30; // Firestore "in" queries take at most 30 values
const scopeByWorkspace = new Map<string, Set<string> | null>();

/** Sets the teams this device works with in a club (null = all teams). Called before subscribing. */
export function setTeamScope(workspaceId: string | null | undefined, teamIds: string[] | null): void {
  const ws = cleanWorkspaceId(workspaceId);
  scopeByWorkspace.set(ws, teamIds ? new Set(teamIds.filter((t) => t && t !== '*')) : null);
}
export const getTeamScope = (workspaceId?: string | null): Set<string> | null =>
  scopeByWorkspace.get(cleanWorkspaceId(workspaceId)) ?? null;

/** The queries that read this device's records: the whole collection, or only its teams plus the club record. */
function recordQueries(ws: string): Query[] {
  const scope = getTeamScope(ws);
  if (!scope) return [recordsCollection(ws)];
  const ids = [...scope, CLUB_RECORD_TEAM];
  const out: Query[] = [];
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    out.push(query(recordsCollection(ws), where('teamId', 'in', ids.slice(i, i + IN_LIMIT))));
  }
  return out;
}

/** The team of a record id ("kind__team__entity"), from the cloud copy when known. */
function teamOfRecordId(id: string, remote: Map<string, CloudRecord>): string {
  return remote.get(id)?.teamId ?? (id === CLUB_DOC_ID ? CLUB_RECORD_TEAM : id.split('__')[1] || '');
}

/**
 * This device's records as they may be written: with a team scope, only its teams' records, and the club record
 * replaced by the cloud's (so it is never written from here).
 */
function writableLocal(ws: string, local: Map<string, LocalRecord>, remote: Map<string, CloudRecord>) {
  const scope = getTeamScope(ws);
  if (!scope) return local;
  const out = new Map<string, LocalRecord>();
  local.forEach((r, id) => {
    if (id !== CLUB_DOC_ID && scope.has(r.teamId)) out.set(id, r);
  });
  const club = remote.get(CLUB_DOC_ID);
  if (club) out.set(CLUB_DOC_ID, club);
  return out;
}

export function getCloudMode(workspaceId?: string | null): CloudMode {
  return modeByWorkspace.get(cleanWorkspaceId(workspaceId)) || 'unknown';
}

// ---------- Synced hashes (per device, per club) ----------

// F1.4: per account AND club (two accounts on the same device never share what they know to be in the cloud).
// An old device reads the old per-club key once and moves it.
const syncedKey = (ws: string) => syncedKeyFor(auth.currentUser?.uid || 'sem-sessao', ws);

function loadSyncedHashes(ws: string): SyncedHashes | null {
  try {
    const raw = localStorage.getItem(syncedKey(ws)) ?? localStorage.getItem(legacySyncedKey(ws));
    return raw ? (JSON.parse(raw) as SyncedHashes) : null;
  } catch {
    return null;
  }
}

function saveSyncedHashes(ws: string, hashes: SyncedHashes) {
  try {
    localStorage.setItem(syncedKey(ws), JSON.stringify(hashes));
    localStorage.removeItem(legacySyncedKey(ws));
  } catch {
    // Storage full/unavailable: the next merge simply re-derives the baseline.
  }
}

// ---------- Reading ----------

function parseRecord(data: Record<string, unknown> | undefined): CloudRecord | null {
  if (!data || !RECORD_KINDS.includes(data.kind as RecordKind)) return null;
  if (typeof data.teamId !== 'string' || typeof data.entityId !== 'string') return null;
  return {
    kind: data.kind as RecordKind,
    teamId: data.teamId,
    entityId: data.entityId,
    data: (data.data as Record<string, unknown>) || {},
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    deleted: data.deleted === true
  };
}

const hasClubRecord = (records: Map<string, CloudRecord>) => {
  const club = records.get(CLUB_DOC_ID);
  return Boolean(club && !club.deleted);
};

const liveRecords = (records: Map<string, CloudRecord>): Map<string, LocalRecord> =>
  new Map([...records].filter(([, r]) => !r.deleted));

const isPermissionDenied = (err: unknown) => (err as { code?: string })?.code === 'permission-denied';

/** Mode of a club workspace, asking Firestore when not known yet. */
export async function resolveCloudMode(workspaceId?: string | null): Promise<CloudMode> {
  const ws = cleanWorkspaceId(workspaceId);
  const known = modeByWorkspace.get(ws);
  if (known && known !== 'unknown') return known;
  try {
    const snap = await getDoc(doc(db, 'club_workspace', ws, 'records', CLUB_DOC_ID));
    const mode: CloudMode = snap.exists() && snap.data()?.deleted !== true ? 'records' : 'legacy';
    modeByWorkspace.set(ws, mode);
    return mode;
  } catch (err) {
    if (isQuotaExceededError(err)) markQuotaExhausted(15);
    // Rules for records not published (permission denied) or offline: behave as before.
    return 'legacy';
  }
}

/** Club state assembled from the records sub-collection, or null when the club is not in records mode. */
export async function loadClubStateFromRecords(workspaceId?: string | null): Promise<AppState | null> {
  const ws = cleanWorkspaceId(workspaceId);
  try {
    const records = new Map<string, CloudRecord>();
    for (const q of recordQueries(ws)) {
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const r = parseRecord(d.data());
        if (r) records.set(d.id, r);
      });
    }
    if (!hasClubRecord(records)) {
      modeByWorkspace.set(ws, 'legacy');
      return null;
    }
    modeByWorkspace.set(ws, 'records');
    remoteByWorkspace.set(ws, records);
    return assembleState(liveRecords(records), { ...initialDefaultState, teams: [] }, getTeamScope(ws));
  } catch (err) {
    if (isQuotaExceededError(err)) markQuotaExhausted(15);
    return null;
  }
}

// ---------- Writing ----------

/**
 * Sends this device's changed records (and tombstones for deleted ones) to the cloud. Only records that differ
 * from the last synced version are written; the club record is always written last.
 */
export async function pushClubRecords(
  workspaceId: string | null | undefined,
  state: AppState,
  options: { authorId?: string; allowMassDelete?: boolean; migrating?: boolean } = {}
): Promise<CloudSyncResult> {
  const ws = cleanWorkspaceId(workspaceId);
  if (!auth.currentUser) return { success: false, message: 'Autenticação necessária para guardar na Nuvem.' };
  if (getFirestoreQuotaState().isExhausted) {
    return { success: false, isQuotaExceeded: true, message: 'Quota diária gratuita do Firebase atingida.' };
  }

  const synced = options.migrating ? {} : loadSyncedHashes(ws) || {};
  const remote = options.migrating ? new Map<string, CloudRecord>() : remoteByWorkspace.get(ws) || new Map();
  // F2.2: with a team scope, only this device's teams are written (never the club record nor other teams)
  const local = options.migrating ? extractRecords(state) : writableLocal(ws, extractRecords(state), remote);
  const now = Date.now();
  const author = options.authorId || auth.currentUser.uid;

  let pending = pendingRecordIds(local, synced);
  // F2.2: with a team scope, a record of another team is never deleted from here (e.g. after the access was narrowed)
  const scope = options.migrating ? null : getTeamScope(ws);
  // …and the club record is never sent from a device with a team scope (only who manages the club writes it)
  if (scope) {
    pending = pending.filter((id) => id !== CLUB_DOC_ID && (local.has(id) || scope.has(teamOfRecordId(id, remote))));
  }
  const deletions = pending.filter((id) => !local.has(id));
  const entityCount = Object.keys(synced).filter((id) => isRecordKey(id) && id !== CLUB_DOC_ID).length;
  if (!options.allowMassDelete && deletions.length > 20 && deletions.length > entityCount * MASS_DELETE_GUARD) {
    console.warn(`Proteção de dados: ${deletions.length} registos por apagar ignorados (carregamento incompleto?).`);
    pending = pending.filter((id) => local.has(id));
  }

  const writes = pending
    .map((id) => [id, buildCloudWrite(id, local, remote.get(id), now, author)] as const)
    .filter((w): w is readonly [string, CloudRecord] => w[1] !== null)
    .sort(([a], [b]) => Number(a === CLUB_DOC_ID) - Number(b === CLUB_DOC_ID));

  const nextSynced: SyncedHashes = { ...synced };
  try {
    let batch = writeBatch(db);
    let ops = 0;
    let bytes = 0;
    let inBatch: Array<readonly [string, CloudRecord]> = [];
    const commit = async () => {
      if (ops === 0) return;
      await batch.commit();
      // Committed = confirmed by the server: this is now the cloud version of these records.
      const confirmed = remoteByWorkspace.get(ws) || new Map<string, CloudRecord>();
      inBatch.forEach(([id, rec]) => {
        confirmed.set(id, rec);
        setSynced(nextSynced, id, rec.deleted ? null : rec.data);
      });
      remoteByWorkspace.set(ws, confirmed);
      if (!options.migrating) saveSyncedHashes(ws, nextSynced);
      batch = writeBatch(db);
      ops = 0;
      bytes = 0;
      inBatch = [];
    };

    for (const write of writes) {
      const [id, rec] = write;
      const size = JSON.stringify(rec).length;
      // The club record goes in its own final batch: it marks the end of a migration.
      if (ops > 0 && (ops >= MAX_BATCH_WRITES || bytes + size > MAX_BATCH_BYTES || id === CLUB_DOC_ID)) await commit();
      batch.set(doc(db, 'club_workspace', ws, 'records', id), toPlainData(rec));
      ops++;
      bytes += size;
      inBatch.push(write);
    }
    await commit();

    if (options.migrating) saveSyncedHashes(ws, nextSynced);
    if (writes.some(([id]) => id === CLUB_DOC_ID)) modeByWorkspace.set(ws, 'records');
    return { success: true, message: `Nuvem atualizada (${writes.length} registos).` };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExhausted(15);
      return { success: false, isQuotaExceeded: true, message: 'Quota diária gratuita do Firebase atingida.' };
    }
    if (isPermissionDenied(err)) {
      return { success: false, message: 'Acesso recusado pelo Firestore (regras dos registos por publicar?).' };
    }
    return { success: false, message: (err as Error)?.message || 'Erro ao guardar na nuvem.' };
  }
}

/** One-off migration: uploads every record of the current state; the club record is written last. */
export async function migrateClubToRecords(workspaceId: string | null | undefined, state: AppState, authorId?: string) {
  return pushClubRecords(workspaceId, state, { authorId, migrating: true, allowMassDelete: true });
}

// ---------- Deleted records (recovery) ----------

interface DeletedRecord<T = Record<string, unknown>> {
  data: T;
  deletedAt: number;
  deletedBy?: string;
}

/**
 * Records of a team deleted in the cloud that still carry their last version (newest first). Only available
 * once the club uses per-record storage.
 */
export function getDeletedRecords<T = Record<string, unknown>>(
  workspaceId: string | null | undefined,
  kind: RecordKind,
  teamId: string
): DeletedRecord<T>[] {
  const remote = remoteByWorkspace.get(cleanWorkspaceId(workspaceId));
  if (!remote) return [];
  return [...remote.values()]
    .filter((r) => r.deleted && r.kind === kind && r.teamId === teamId && r.data && Object.keys(r.data).length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => ({ data: r.data as T, deletedAt: r.updatedAt, deletedBy: r.updatedBy }));
}

// ---------- Real-time ----------

interface ClubCloudHandlers {
  /** Current state on this device. */
  getLocal: () => AppState;
  /** Replace the state on this device with a merged/cloud version. */
  applyRemote: (state: AppState) => void;
  /** This device has changes the cloud does not have: save them. */
  requestPush: () => void;
  /** This device and the cloud are in sync. */
  onInSync: () => void;
  /** Rules allow records but the club is still in legacy mode: migrate. */
  requestMigration: () => void;
  onError?: (err: Error) => void;
}

interface LegacySnapshot {
  state: AppState;
  updatedAt: number;
}

/**
 * Listens to the legacy document AND the records sub-collection and keeps this device in sync in whichever mode
 * the club is. Waits until the mode is known before touching local data.
 */
export function subscribeToClubCloud(
  workspaceId: string | null | undefined,
  subscribeLegacy: (
    onSnapshot: (state: AppState | null, updatedAt: number) => void,
    onError: (err: Error) => void
  ) => Unsubscribe,
  h: ClubCloudHandlers
): Unsubscribe {
  const ws = cleanWorkspaceId(workspaceId);
  let legacy: LegacySnapshot | null | undefined; // undefined = not loaded yet, null = no legacy document
  let lastAppliedLegacy: LegacySnapshot | null = null;
  let recordsReady = false;
  let recordsBlocked = false;
  let migrationRequested = false;

  const handleLegacy = () => {
    if (legacy === undefined) return;
    if (legacy && legacy !== lastAppliedLegacy) {
      lastAppliedLegacy = legacy;
      const local = h.getLocal();
      if ((local.lastLocalMutationAt || 0) > (legacy.updatedAt || 0)) {
        h.requestPush(); // never let an older cloud copy overwrite newer local edits
      } else {
        h.applyRemote({ ...legacy.state, currentUser: local.currentUser });
        h.onInSync();
      }
    }
    if (!recordsBlocked && !migrationRequested && !getFirestoreQuotaState().isExhausted) {
      migrationRequested = true;
      h.requestMigration();
    }
  };

  const handleRecords = () => {
    const remote = remoteByWorkspace.get(ws) || new Map<string, CloudRecord>();
    let local = h.getLocal();
    let synced = loadSyncedHashes(ws);

    if (!synced) {
      // First time this device sees the club in records mode: use the legacy document (the state the cloud
      // agreed on when the club was migrated) as the baseline, so only real local edits count as changes.
      if (legacy === undefined) return; // wait for it
      if (legacy && (legacy.updatedAt || 0) >= (local.lastLocalMutationAt || 0)) {
        local = { ...legacy.state, currentUser: local.currentUser, lastLocalMutationAt: local.lastLocalMutationAt };
      }
      const baseline: SyncedHashes = {};
      if (legacy) extractRecords(legacy.state).forEach((r, id) => setSynced(baseline, id, r.data));
      synced = baseline;
    }

    const club = remote.get(CLUB_DOC_ID);
    const scope = getTeamScope(ws);
    // F2.2: with a team scope only its teams are known: records of other teams are left exactly as they are
    const knownTeamIds = scope
      ? new Set<string>(scope)
      : new Set<string>([
          ...(local.teams || []).map((t) => t.id),
          ...(((club?.data as Partial<AppState>)?.teams || []) as Array<{ id: string }>).map((t) => t.id)
        ]);
    const result = mergeRecords({
      local: writableLocal(ws, extractRecords(local), remote),
      remote,
      synced,
      knownTeamIds,
      localMutationAt: local.lastLocalMutationAt || 0
    });
    saveSyncedHashes(ws, result.synced);
    if (result.changedLocally || local !== h.getLocal()) h.applyRemote(assembleState(result.records, local, scope));
    if (result.toPush.length > 0) h.requestPush();
    else h.onInSync();
  };

  const evaluate = () => {
    if (!recordsReady && !recordsBlocked) return; // mode not known yet
    if (modeByWorkspace.get(ws) === 'records') handleRecords();
    else handleLegacy();
  };

  // F2.2: a member with a team scope never reads the old single document (it holds every team's data; only who
  // manages the club may read it): it counts as "no legacy document"
  const scoped = Boolean(getTeamScope(ws));
  if (scoped) legacy = null;
  const unsubLegacy = scoped
    ? () => {}
    : subscribeLegacy(
        (state, updatedAt) => {
          legacy = state ? { state, updatedAt } : null;
          evaluate();
        },
        (err) => {
          // F2.3: only who manages the club reads the old single document; for the others it does not exist
          if (isPermissionDenied(err)) {
            legacy = null;
            evaluate();
            return;
          }
          h.onError?.(err);
        }
      );

  // One listener per query (the whole collection, or this device's teams in groups of 30 + the club record); the
  // records of all of them form the cloud copy.
  const queries = recordQueries(ws);
  const perQuery: Array<Map<string, CloudRecord> | null> = queries.map(() => null);
  const unsubs = queries.map((q, index) =>
    onSnapshot(
      q,
      // Also notified when a pending write is confirmed by the server (same data, hasPendingWrites → false).
      { includeMetadataChanges: true },
      (snap) => {
        // Writes still waiting for the server (e.g. offline) show up here immediately; they are not in the cloud
        // yet, so keep the last server version of those documents (otherwise they would look "saved").
        const previous = remoteByWorkspace.get(ws) || new Map<string, CloudRecord>();
        const records = new Map<string, CloudRecord>();
        snap.forEach((d) => {
          if (d.metadata.hasPendingWrites) {
            const confirmed = previous.get(d.id);
            if (confirmed) records.set(d.id, confirmed);
            return;
          }
          const r = parseRecord(d.data());
          if (r) records.set(d.id, r);
        });
        perQuery[index] = records;
        if (perQuery.some((m) => m === null)) return; // wait until every query has answered once
        const all = new Map<string, CloudRecord>();
        perQuery.forEach((m) => m!.forEach((r, id) => all.set(id, r)));
        remoteByWorkspace.set(ws, all);
        modeByWorkspace.set(ws, hasClubRecord(all) ? 'records' : 'legacy');
        recordsReady = true;
        evaluate();
      },
      (err) => {
        if (isQuotaExceededError(err)) markQuotaExhausted(30);
        // Permission denied = rules for the records sub-collection not published yet: keep working as before.
        console.warn(
          `Registos separados indisponíveis (${ws}): ${(err as { code?: string }).code || ''} ${err.message}`
        );
        recordsBlocked = true;
        if (modeByWorkspace.get(ws) !== 'records') modeByWorkspace.set(ws, 'legacy');
        evaluate();
      }
    )
  );

  return () => {
    unsubLegacy();
    unsubs.forEach((u) => u());
  };
}
