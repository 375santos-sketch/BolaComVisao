import { collection, doc, getDoc, getDocs, onSnapshot, writeBatch, Unsubscribe } from 'firebase/firestore';
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

export type CloudMode = 'unknown' | 'legacy' | 'records';

const RECORD_KINDS: RecordKind[] = [
  'club',
  'player',
  'match',
  'training',
  'schedule',
  'message',
  'scouting',
  'exercise',
  'setpiece'
];
const MAX_BATCH_WRITES = 400;
const MAX_BATCH_BYTES = 4_000_000;
/** A save that would delete more than this share of the club's records is treated as a broken load. */
const MASS_DELETE_GUARD = 0.5;

const modeByWorkspace = new Map<string, CloudMode>();
const remoteByWorkspace = new Map<string, Map<string, CloudRecord>>();

export const cleanWorkspaceId = (ws?: string | null) => (ws && ws.trim() ? ws.trim() : 'main');
const recordsCollection = (ws: string) => collection(db, 'club_workspace', ws, 'records');

export function getCloudMode(workspaceId?: string | null): CloudMode {
  return modeByWorkspace.get(cleanWorkspaceId(workspaceId)) || 'unknown';
}

// ---------- Synced hashes (per device, per club) ----------

const syncedKey = (ws: string) => `bcv-synced-records-${ws}`;

export function loadSyncedHashes(ws: string): SyncedHashes | null {
  try {
    const raw = localStorage.getItem(syncedKey(ws));
    return raw ? (JSON.parse(raw) as SyncedHashes) : null;
  } catch {
    return null;
  }
}

function saveSyncedHashes(ws: string, hashes: SyncedHashes) {
  try {
    localStorage.setItem(syncedKey(ws), JSON.stringify(hashes));
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
    const snap = await getDocs(recordsCollection(ws));
    const records = new Map<string, CloudRecord>();
    snap.forEach((d) => {
      const r = parseRecord(d.data());
      if (r) records.set(d.id, r);
    });
    if (!hasClubRecord(records)) {
      modeByWorkspace.set(ws, 'legacy');
      return null;
    }
    modeByWorkspace.set(ws, 'records');
    remoteByWorkspace.set(ws, records);
    return assembleState(liveRecords(records), { ...initialDefaultState, teams: [] });
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

  const local = extractRecords(state);
  const synced = options.migrating ? {} : loadSyncedHashes(ws) || {};
  const remote = options.migrating ? new Map<string, CloudRecord>() : remoteByWorkspace.get(ws) || new Map();
  const now = Date.now();
  const author = options.authorId || auth.currentUser.uid;

  let pending = pendingRecordIds(local, synced);
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

export interface DeletedRecord<T = Record<string, unknown>> {
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

export interface ClubCloudHandlers {
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
    const knownTeamIds = new Set<string>([
      ...(local.teams || []).map((t) => t.id),
      ...(((club?.data as Partial<AppState>)?.teams || []) as Array<{ id: string }>).map((t) => t.id)
    ]);
    const result = mergeRecords({
      local: extractRecords(local),
      remote,
      synced,
      knownTeamIds,
      localMutationAt: local.lastLocalMutationAt || 0
    });
    saveSyncedHashes(ws, result.synced);
    if (result.changedLocally || local !== h.getLocal()) h.applyRemote(assembleState(result.records, local));
    if (result.toPush.length > 0) h.requestPush();
    else h.onInSync();
  };

  const evaluate = () => {
    if (!recordsReady && !recordsBlocked) return; // mode not known yet
    if (modeByWorkspace.get(ws) === 'records') handleRecords();
    else handleLegacy();
  };

  const unsubLegacy = subscribeLegacy(
    (state, updatedAt) => {
      legacy = state ? { state, updatedAt } : null;
      evaluate();
    },
    (err) => h.onError?.(err)
  );

  const unsubRecords = onSnapshot(
    recordsCollection(ws),
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
      remoteByWorkspace.set(ws, records);
      modeByWorkspace.set(ws, hasClubRecord(records) ? 'records' : 'legacy');
      recordsReady = true;
      evaluate();
    },
    (err) => {
      if (isQuotaExceededError(err)) markQuotaExhausted(30);
      // Permission denied = rules for the records sub-collection not published yet: keep working as before.
      console.warn(`Registos separados indisponíveis (${ws}): ${(err as { code?: string }).code || ''} ${err.message}`);
      recordsBlocked = true;
      if (modeByWorkspace.get(ws) !== 'records') modeByWorkspace.set(ws, 'legacy');
      evaluate();
    }
  );

  return () => {
    unsubLegacy();
    unsubRecords();
  };
}
