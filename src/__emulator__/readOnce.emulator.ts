/**
 * Reading the club once: the load when the app opens keeps its query open for a while, so the listener that
 * follows (subscribeToClubCloud) shares it instead of reading every document again from the server.
 * Proof: after the load the network is switched off; a new listener on the same query still gets every document,
 * which is only possible if the first query is still alive in the app (without it there would be nothing).
 * Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: (i: number) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  }
};

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT = 'glowing-orbit-vk8sk';
const OPEN_RULES = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }`;

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const cloud = await import('../services/clubCloud');

const WS = 'orgLerUmaVez';
const records = () => fs.collection(fb.db, 'club_workspace', WS, 'records');
const rec = (kind: string, teamId: string, id: string) => ({
  kind,
  teamId,
  entityId: id,
  data: { id, name: `Atleta ${id}`, number: 1, positions: '', birthDate: null, active: true },
  updatedAt: 1,
  deleted: false
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: OPEN_RULES }] } })
  });
  await fa.createUserWithEmailAndPassword(fb.auth, 'ler.uma.vez@teste.pt', 'segredo123');
  for (let i = 0; i < 12; i++) await fs.setDoc(fs.doc(records(), `player__eq1__p${i}`), rec('player', 'eq1', `p${i}`));
});

describe('ler o clube uma só vez ao abrir', () => {
  it('the load gives the server answer, and the listener that follows shares the same query', async () => {
    const snap = await cloud.readKeepingListen(records());
    expect(snap.size).toBe(12);
    expect(snap.metadata.fromCache).toBe(false);
    // No network now: only a query still open in the app can answer
    await fs.disableNetwork(fb.db);
    const shared = await new Promise<number>((resolve) => {
      const unsub = fs.onSnapshot(records(), (s) => {
        unsub();
        resolve(s.size);
      });
    });
    expect(shared).toBe(12);
    await fs.enableNetwork(fb.db);
  });

  it('without network the load gives up with a clear error instead of waiting forever', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await fs.disableNetwork(fb.db);
    const other = fs.query(records(), fs.where('teamId', '==', 'eqSemRede'));
    const pending = cloud.readKeepingListen(other);
    vi.advanceTimersByTime(31_000);
    await expect(pending).rejects.toMatchObject({ code: 'unavailable' });
    await fs.enableNetwork(fb.db);
    vi.useRealTimers();
  });
});
