/**
 * F1.1a — Reads the platform for the inventory. ONLY READS: getDocsFromServer, getDocFromServer and
 * getCountFromServer. The lint configuration forbids the Firestore write functions in this file, and a unit test
 * checks it too. Nothing is written anywhere, not even an audit entry.
 *
 * Reads straight from the server (never from the device cache), so the counts are the ones in the cloud.
 */
import { collection, doc, getCountFromServer, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { db } from './firebase';
import {
  InventorySource,
  READ_TIMEOUT_MS,
  RawDoc,
  RawWorkspace,
  serverProblemMessage,
  withTimeout,
  workspaceIdsToRead
} from '../lib/inventory';

/** Collections that are only counted (their content is not needed for the inventory). */
const COUNTED_COLLECTIONS = ['team_workspaces', 'team_databases', 'clubs', 'audit_logs', 'system'];

const reason = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  return e?.code || e?.message || String(err);
};

async function readAll(path: string[]): Promise<RawDoc[]> {
  const [first, ...rest] = path;
  const snap = await withTimeout(getDocsFromServer(collection(db, first, ...rest)), READ_TIMEOUT_MS, path.join('/'));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

async function readWorkspace(id: string): Promise<RawWorkspace> {
  const ws: RawWorkspace = { id, legacy: null, records: [], pushSubscriptions: [], errors: [] };
  try {
    const snap = await withTimeout(
      getDocFromServer(doc(db, 'club_workspace', id)),
      READ_TIMEOUT_MS,
      `club_workspace/${id}`
    );
    ws.legacy = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch (err) {
    ws.errors.push(`documento do clube: ${reason(err)}`);
  }
  try {
    ws.records = await readAll(['club_workspace', id, 'records']);
  } catch (err) {
    ws.errors.push(`registos: ${reason(err)}`);
  }
  try {
    ws.pushSubscriptions = await readAll(['club_workspace', id, 'push_subscriptions']);
  } catch (err) {
    ws.errors.push(`telemóveis com avisos: ${reason(err)}`);
  }
  return ws;
}

/** Everything the inventory needs, read from the cloud. Reading errors are collected and shown, never hidden. */
export async function readInventorySource(onProgress?: (text: string) => void): Promise<InventorySource> {
  const errors: string[] = [];
  const safe = async <T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await read();
    } catch (err) {
      errors.push(`${label}: ${reason(err)}`);
      return fallback;
    }
  };

  onProgress?.('A ler as contas…');
  // The first reading tells whether the cloud answers at all: if not, stop with a clear reason instead of
  // waiting for every other reading to give up too
  let users: RawDoc[];
  try {
    users = await readAll(['users']);
  } catch (err) {
    throw new Error(serverProblemMessage(err), { cause: err });
  }
  const admins = await safe('administradores (admins)', async () => (await readAll(['admins'])).map((d) => d.id), []);
  onProgress?.('A ler os convites…');
  const invitations = await safe('convites (invitations)', () => readAll(['invitations']), []);
  onProgress?.('A ler os espaços dos clubes…');
  const listed = await safe(
    'espaços dos clubes (club_workspace)',
    async () => (await readAll(['club_workspace'])).map((d) => d.id),
    []
  );

  const orgIds = await safe(
    'organizações (organizations)',
    async () => (await readAll(['organizations'])).map((d) => d.id),
    []
  );

  const workspaces: RawWorkspace[] = [];
  for (const id of workspaceIdsToRead(listed, users, invitations, orgIds)) {
    onProgress?.(`A contar os registos de «${id}»…`);
    workspaces.push(await readWorkspace(id));
  }

  onProgress?.('A contar as outras coleções…');
  const collectionCounts: Record<string, number | null> = {};
  for (const name of COUNTED_COLLECTIONS) {
    collectionCounts[name] = await safe(
      `contagem de ${name}`,
      async () => (await withTimeout(getCountFromServer(collection(db, name)), READ_TIMEOUT_MS, name)).data().count,
      null
    );
  }
  return { users, admins, invitations, workspaces, collectionCounts, errors };
}
