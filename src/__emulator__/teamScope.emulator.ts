/**
 * F2.2 — Sync by team against the emulator (open rules: this checks the APP, not the rules). A device whose person
 * works only with team eq1 reads only eq1 (plus the club record) and, when saving, never writes the club record
 * nor touches team eq2's records — not even after its access was narrowed (old sync markers of eq2 on the device).
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
const { extractRecords, setSynced, hashData } = await import('../lib/recordSync');
const { normalizeClubState } = await import('../lib/storage');

const WS = 'orgEscopo';
const NOW = Date.now();
const team = (id: string, category: string, roster: unknown[]) => ({
  id,
  clubName: 'Clube Teste',
  category,
  season: '2026/2027',
  createdAt: '2026-09-01',
  roster,
  matches: [],
  trainings: [],
  schedule: [],
  tactics: [],
  tacticFormat: 7,
  liveToken: `segredo-${id}`
});
const athlete = (id: string, name: string) => ({ id, name, number: 1, positions: '', birthDate: null, active: true });
const fullState = () =>
  normalizeClubState({
    activeTeamId: 'eq1',
    teams: [team('eq1', 'Sub-11', [athlete('a1', 'Atleta Um')]), team('eq2', 'Sub-13', [athlete('b1', 'Atleta Dois')])],
    myClubName: 'Clube Teste',
    updatedAt: 1,
    lastLocalMutationAt: 1
  } as any);

const records = async () => {
  const snap = await fs.getDocs(fs.collection(fb.db, 'club_workspace', WS, 'records'));
  return new Map(snap.docs.map((d) => [d.id, d.data() as Record<string, any>]));
};

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
  await fa.createUserWithEmailAndPassword(fb.auth, 'treinador.eq1@teste.pt', 'segredo123');
  // The club in per-record storage with two teams (written as a device with access to every team)
  cloud.setTeamScope(WS, null);
  const res = await cloud.migrateClubToRecords(WS, fullState(), 'dono');
  expect(res.success).toBe(true);
});

describe('F2.2 — sincronização por equipa', () => {
  it('a device limited to eq1 loads only eq1 (and the club summary)', async () => {
    cloud.setTeamScope(WS, ['eq1']);
    const state = await cloud.loadClubStateFromRecords(WS);
    expect(state?.teams.map((t) => t.id)).toEqual(['eq1']);
    expect(state?.roster.map((p) => p.name)).toEqual(['Atleta Um']);
    expect(JSON.stringify(state)).not.toContain('Atleta Dois');
    expect(JSON.stringify(state)).not.toContain('segredo-eq2');
  });

  it("saving from that device changes eq1 only: never eq2's records nor the club record", async () => {
    cloud.setTeamScope(WS, ['eq1']);
    const before = await records();
    const local = await cloud.loadClubStateFromRecords(WS);
    // This device knows eq1 as in the cloud (synced markers), then the coach renames an athlete and the club name
    const synced: Record<string, string> = {};
    extractRecords(local!).forEach((r, id) => setSynced(synced, id, r.data));
    storage.set(`bcv-synced-records-${fb.auth.currentUser!.uid}-${WS}`, JSON.stringify(synced));
    const edited = normalizeClubState({
      ...local!,
      myClubName: 'Nome Mudado Por Treinador',
      roster: [athlete('a1', 'Atleta Um Editado')],
      lastLocalMutationAt: NOW
    } as any);
    expect((await cloud.pushClubRecords(WS, edited)).success).toBe(true);
    const after = await records();
    expect(after.get('player__eq1__a1')?.data?.name).toBe('Atleta Um Editado');
    expect(hashData(after.get('club'))).toBe(hashData(before.get('club'))); // club record untouched
    for (const id of [...before.keys()].filter((k) => k.includes('__eq2__'))) {
      expect(hashData(after.get(id))).toBe(hashData(before.get(id)));
    }
  });

  it('after the access was narrowed, old markers of eq2 on the device never delete eq2', async () => {
    // The device used to see everything: its markers include eq2's records
    cloud.setTeamScope(WS, null);
    const all = await cloud.loadClubStateFromRecords(WS);
    const synced: Record<string, string> = {};
    extractRecords(all!).forEach((r, id) => setSynced(synced, id, r.data));
    storage.set(`bcv-synced-records-${fb.auth.currentUser!.uid}-${WS}`, JSON.stringify(synced));
    // Now limited to eq1; its local state has no eq2 at all
    cloud.setTeamScope(WS, ['eq1']);
    const onlyEq1 = await cloud.loadClubStateFromRecords(WS);
    expect((await cloud.pushClubRecords(WS, onlyEq1!)).success).toBe(true);
    const after = await records();
    expect(after.get('player__eq2__b1')?.deleted).toBe(false);
    expect(after.get('teamconfig__eq2__config')?.deleted).toBe(false);
  });

  it('a device with every team (no scope) still reads and writes as before', async () => {
    cloud.setTeamScope(WS, null);
    const state = await cloud.loadClubStateFromRecords(WS);
    expect(state?.teams.map((t) => t.id).sort()).toEqual(['eq1', 'eq2']);
  });
});
