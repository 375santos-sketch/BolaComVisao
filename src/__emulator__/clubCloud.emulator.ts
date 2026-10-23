/**
 * End-to-end tests of per-record cloud storage against the Firebase emulators, with the real firestore.rules
 * and the real app modules (firebase.ts, clubCloud.ts). See vitest.emulator.config.ts.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import realConfig from '../../firebase-applet-config.json';

// The emulator applies runtime rule updates to the (default) database only; the rules are the same for every
// database, so the app is pointed at (default) here.
vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});
void realConfig;
import { readFileSync } from 'node:fs';

// ---------- localStorage for node (synced hashes are kept there) ----------
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear()
};

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT = 'glowing-orbit-vk8sk';
const RULES_NOW = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const OPEN_RULES = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }`;

async function setRules(content: string) {
  const res = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
  });
  if (!res.ok) throw new Error(`rules upload failed: ${res.status} ${await res.text()}`);
}

/** Current rules without the records sub-collection = "new rules not published yet". */
function previousRules(): string {
  const stripped = RULES_NOW.replace(/\n\s*match \/records\/\{recordId\} \{[\s\S]*?\n {6}\}\n/, '\n');
  if (stripped.includes('match /records/')) throw new Error('could not strip the records rules');
  return stripped;
}

// ---------- App modules connected to the emulators ----------
const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const cloud = await import('../services/clubCloud');
const { normalizeClubState } = await import('../lib/storage');
const { CLUB_DOC_ID, recordDocId } = await import('../lib/recordSync');

import type { Match } from '../types';

const CLUB = 'clubA';
const player = (id: string, name: string, number: number) => ({
  id,
  name,
  number,
  positions: '',
  birthDate: null,
  active: true
});
const match = (id: string, opponent: string, date: string, notes = ''): Match => ({
  id,
  teamId: 'sub11',
  opponent,
  date,
  season: '2026/2027',
  type: 'campeonato',
  location: 'fora',
  finished: true,
  goals: [],
  subs: [],
  lineup: ['p1'],
  capitao: null,
  notes
});
const roster = [player('p1', 'Rui Silva', 9), player('p2', 'Tomás Gonçalves', 7)];
const matches = [match('m1', 'Esparteiros', '2026-10-10'), match('m2', 'Tramagal SU', '2026-10-17')];
const legacyState = normalizeClubState({
  activeTeamId: 'sub11',
  version: 2,
  myClubName: 'Dragões',
  roster,
  matches,
  teams: [{ id: 'sub11', clubName: 'Dragões', category: 'Sub-11', season: '2026/2027', roster, matches } as any]
});
const LEGACY_UPDATED_AT = 1_000;

const recordsCol = () => fs.collection(fb.db, 'club_workspace', CLUB, 'records');
const legacyDoc = () => fs.doc(fb.db, 'club_workspace', CLUB);
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const withMatches = (base: any, list: any[]) =>
  normalizeClubState({ ...base, matches: list, teams: base.teams.map((t: any) => ({ ...t, matches: list })) });
const waitFor = async (check: () => boolean, ms = 8000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, 50));
  }
};

let uid = '';

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  const cred = await fa.createUserWithEmailAndPassword(fb.auth, 'treinador@clube.pt', 'segredo123');
  uid = cred.user.uid;
  await fs.setDoc(fs.doc(fb.db, 'users', uid), {
    account: { status: 'approved', clubId: CLUB, role: 'Treinador Principal' }
  });
  await fs.setDoc(legacyDoc(), {
    state: plain({ ...legacyState, currentUser: undefined }),
    updatedAt: LEGACY_UPDATED_AT
  });
});

afterAll(async () => {
  await fa.signOut(fb.auth);
});

describe('Regras ainda não publicadas (como hoje)', () => {
  it('keeps working on the single document and never tries to migrate', async () => {
    await setRules(previousRules());
    await expect(fs.getDocs(recordsCol())).rejects.toMatchObject({ code: 'permission-denied' });
    let migrationRequested = false;
    let applied: any = null;
    const unsub = cloud.subscribeToClubCloud(
      CLUB,
      (onSnap, onErr) => fb.subscribeToLegacyClubDocument(CLUB, onSnap, onErr),
      {
        getLocal: () => ({ ...legacyState, lastLocalMutationAt: 0 }) as any,
        applyRemote: (s) => (applied = s),
        requestPush: () => {},
        onInSync: () => {},
        requestMigration: () => (migrationRequested = true)
      }
    );
    await waitFor(() => applied !== null);
    unsub();
    expect(applied.matches.map((m: any) => m.opponent)).toEqual(['Esparteiros', 'Tramagal SU']);
    expect(migrationRequested).toBe(false);
    expect(cloud.getCloudMode(CLUB)).toBe('legacy');

    // Saving still goes to the single document
    const res = await fb.saveMasterClubState(CLUB, { ...legacyState, updatedAt: 2_000 } as any, uid, 'Treinador');
    expect(res.success).toBe(true);
    expect((await fs.getDoc(legacyDoc())).data()?.updatedAt).toBe(2_000);
  });
});

describe('Regras dos registos', () => {
  beforeAll(async () => {
    await setRules(RULES_NOW);
  });

  it('the real rules are active (control: writes outside the rules are denied)', async () => {
    await expect(fs.setDoc(fs.doc(fb.db, 'qualquer', 'coisa'), { a: 1 })).rejects.toMatchObject({
      code: 'permission-denied'
    });
  });

  const validRecord = (overrides: Record<string, unknown> = {}) => ({
    kind: 'match',
    teamId: 'sub11',
    entityId: 'probe',
    updatedAt: Date.now(),
    deleted: false,
    data: { id: 'probe' },
    ...overrides
  });

  it('accepts a valid record from an approved member of the club', async () => {
    await fs.setDoc(fs.doc(recordsCol(), 'match__sub11__probe'), validRecord());
    await fs.setDoc(fs.doc(recordsCol(), 'match__sub11__probe'), validRecord({ deleted: true, data: {} }));
  });

  it('accepts every kind of record the app writes (exercises, set pieces and tactics-board plays included)', async () => {
    for (const kind of ['exercise', 'setpiece', 'tacticplay']) {
      await fs.setDoc(
        fs.doc(recordsCol(), `${kind}__sub11__probe`),
        validRecord({ kind, data: { id: 'probe', name: 'Teste', image: 'data:image/jpeg;base64,AAAA' } })
      );
    }
  });

  it('rejects malformed records and other clubs', async () => {
    const bad = [
      validRecord({ kind: 'hack' }),
      validRecord({ extra: 1 }),
      validRecord({ data: undefined, deleted: false }),
      validRecord({ updatedAt: Date.now() + 3_600_000 })
    ];
    for (const rec of bad) {
      const clean = JSON.parse(JSON.stringify(rec));
      await expect(fs.setDoc(fs.doc(recordsCol(), 'match__sub11__bad'), clean)).rejects.toMatchObject({
        code: 'permission-denied'
      });
    }
    await expect(
      fs.setDoc(fs.doc(fb.db, 'club_workspace', 'outroClube', 'records', 'match__x__y'), validRecord())
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(fs.deleteDoc(fs.doc(recordsCol(), 'match__sub11__probe'))).rejects.toMatchObject({
      code: 'permission-denied'
    });
  });
});

describe('Migração e utilização', () => {
  it('migrates every record, writes the club record, and leaves the legacy document untouched', async () => {
    const legacyBefore = (await fs.getDoc(legacyDoc())).data();
    const res = await cloud.migrateClubToRecords(CLUB, legacyState, uid);
    expect(res.success).toBe(true);

    const snap = await fs.getDocs(recordsCol());
    const ids = snap.docs.map((d) => d.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        CLUB_DOC_ID,
        recordDocId('match', 'sub11', 'm1'),
        recordDocId('match', 'sub11', 'm2'),
        recordDocId('player', 'sub11', 'p1'),
        recordDocId('player', 'sub11', 'p2')
      ])
    );
    expect(cloud.getCloudMode(CLUB)).toBe('records');
    expect((await fs.getDoc(legacyDoc())).data()).toEqual(legacyBefore);
  });

  it('loads the club from its records', async () => {
    const loaded = await fb.loadMasterClubState(CLUB);
    expect(loaded?.matches.map((m) => m.opponent)).toEqual(['Esparteiros', 'Tramagal SU']);
    // Without a previous order on the device, players come in shirt-number order
    expect(loaded?.roster.map((p) => p.name)).toEqual(['Tomás Gonçalves', 'Rui Silva']);
    expect(loaded?.myClubName).toBe('Dragões');
  });

  it('saving sends only the record that changed', async () => {
    const before = Object.fromEntries((await fs.getDocs(recordsCol())).docs.map((d) => [d.id, d.data().updatedAt]));
    const edited = withMatches(legacyState, [matches[0], { ...matches[1], notes: 'Vitória 2-1' }]);
    const res = await fb.saveMasterClubState(CLUB, edited as any, uid, 'Treinador');
    expect(res.success).toBe(true);
    const after = Object.fromEntries((await fs.getDocs(recordsCol())).docs.map((d) => [d.id, d.data().updatedAt]));
    const changed = Object.keys(after).filter((id) => after[id] !== before[id]);
    expect(changed).toEqual([recordDocId('match', 'sub11', 'm2')]);
  });

  it('two coaches editing different matches at the same time: both edits survive', async () => {
    // This device (coach A) has the latest synced state and edits m1 locally (not saved yet)
    const synced = withMatches(legacyState, [matches[0], { ...matches[1], notes: 'Vitória 2-1' }]);
    let local: any = withMatches(synced, [
      { ...matches[0], notes: 'A: bom jogo' },
      { ...matches[1], notes: 'Vitória 2-1' }
    ]);
    local = { ...local, lastLocalMutationAt: Date.now() };
    let pushRequested = 0;
    const unsub = cloud.subscribeToClubCloud(
      CLUB,
      (onSnap, onErr) => fb.subscribeToLegacyClubDocument(CLUB, onSnap, onErr),
      {
        getLocal: () => local,
        applyRemote: (s) => (local = { ...s, lastLocalMutationAt: local.lastLocalMutationAt }),
        requestPush: () => pushRequested++,
        onInSync: () => {},
        requestMigration: () => {}
      }
    );
    await waitFor(() => pushRequested > 0); // A's unsaved edit is detected as pending

    // Coach B (another device) saves an edit to m2 meanwhile
    const m2Id = recordDocId('match', 'sub11', 'm2');
    await fs.setDoc(fs.doc(recordsCol(), m2Id), {
      kind: 'match',
      teamId: 'sub11',
      entityId: 'm2',
      updatedAt: Date.now(),
      updatedBy: 'coachB',
      deleted: false,
      data: plain({ ...matches[1], notes: 'B: golo do Rui aos 12' })
    });
    await waitFor(() => local.matches.find((m: any) => m.id === 'm2')?.notes === 'B: golo do Rui aos 12');
    expect(local.matches.find((m: any) => m.id === 'm1')?.notes).toBe('A: bom jogo'); // A's edit kept

    // A saves: only m1 is written, B's m2 is not overwritten
    const res = await fb.saveMasterClubState(CLUB, local, uid, 'Treinador');
    expect(res.success).toBe(true);
    unsub();
    const cloudNow = Object.fromEntries((await fs.getDocs(recordsCol())).docs.map((d) => [d.id, d.data()]));
    expect(cloudNow[recordDocId('match', 'sub11', 'm1')].data.notes).toBe('A: bom jogo');
    expect(cloudNow[m2Id].data.notes).toBe('B: golo do Rui aos 12');
  });

  it('a saved change is not undone when another coach saves something else afterwards', async () => {
    let local: any = await fb.loadMasterClubState(CLUB);
    local = { ...local, lastLocalMutationAt: Date.now() };
    const unsub = cloud.subscribeToClubCloud(
      CLUB,
      (onSnap, onErr) => fb.subscribeToLegacyClubDocument(CLUB, onSnap, onErr),
      {
        getLocal: () => local,
        applyRemote: (st) => (local = { ...st, lastLocalMutationAt: local.lastLocalMutationAt }),
        requestPush: () => {},
        onInSync: () => {},
        requestMigration: () => {}
      }
    );
    await new Promise((r) => setTimeout(r, 1000));

    // A saves an edit to m1
    local = withMatches(
      local,
      local.matches.map((m: any) => (m.id === 'm1' ? { ...m, notes: 'A: guardado' } : m))
    );
    local = { ...local, lastLocalMutationAt: Date.now() };
    expect((await fb.saveMasterClubState(CLUB, local, uid, 'Treinador')).success).toBe(true);

    // Then B saves an edit to m2 (arrives through the listener and triggers a merge here)
    const m2Id = recordDocId('match', 'sub11', 'm2');
    const m2 = (await fs.getDoc(fs.doc(recordsCol(), m2Id))).data()!;
    await fs.setDoc(fs.doc(recordsCol(), m2Id), {
      ...m2,
      updatedAt: Date.now(),
      data: { ...m2.data, notes: 'B: depois' }
    });
    await waitFor(() => local.matches.find((m: any) => m.id === 'm2')?.notes === 'B: depois');
    unsub();

    expect(local.matches.find((m: any) => m.id === 'm1')?.notes).toBe('A: guardado');
    const m1 = (await fs.getDoc(fs.doc(recordsCol(), recordDocId('match', 'sub11', 'm1')))).data();
    expect(m1?.data.notes).toBe('A: guardado');
  });

  it('two coaches changing different club settings at the same time: both changes survive', async () => {
    let local: any = await fb.loadMasterClubState(CLUB);
    let pushRequested = 0;
    const unsub = cloud.subscribeToClubCloud(
      CLUB,
      (onSnap, onErr) => fb.subscribeToLegacyClubDocument(CLUB, onSnap, onErr),
      {
        getLocal: () => local,
        applyRemote: (st) => (local = { ...st, lastLocalMutationAt: local.lastLocalMutationAt }),
        requestPush: () => pushRequested++,
        onInSync: () => {},
        requestMigration: () => {}
      }
    );
    await new Promise((r) => setTimeout(r, 1000));

    // A changes the language here (not saved yet)…
    local = { ...local, lang: 'en', lastLocalMutationAt: Date.now() };
    // …while B saves another setting (the newer save)
    const clubDoc = fs.doc(recordsCol(), CLUB_DOC_ID);
    const club = (await fs.getDoc(clubDoc)).data()!;
    await fs.setDoc(clubDoc, { ...club, updatedAt: Date.now() + 5000, data: { ...club.data, theme: 'luzsolar' } });
    await waitFor(() => local.theme === 'luzsolar');
    expect(local.lang).toBe('en'); // A's change kept
    await waitFor(() => pushRequested > 0);

    expect((await fb.saveMasterClubState(CLUB, local, uid, 'Treinador')).success).toBe(true);
    unsub();
    const saved = (await fs.getDoc(clubDoc)).data()!;
    expect(saved.data.lang).toBe('en');
    expect(saved.data.theme).toBe('luzsolar');
  });

  it('a match deleted on this device is removed for everyone (tombstone), and comes back to nobody', async () => {
    const current = await fb.loadMasterClubState(CLUB);
    const without = withMatches(
      current,
      current!.matches.filter((m) => m.id !== 'm1')
    );
    expect((await fb.saveMasterClubState(CLUB, without as any, uid, 'Treinador')).success).toBe(true);
    const m1 = (await fs.getDoc(fs.doc(recordsCol(), recordDocId('match', 'sub11', 'm1')))).data();
    expect(m1?.deleted).toBe(true);
    const reloaded = await fb.loadMasterClubState(CLUB);
    expect(reloaded?.matches.map((m) => m.id)).toEqual(['m2']);
  });

  it('a deleted match keeps its last version and can be recovered', async () => {
    const deleted = cloud.getDeletedRecords<any>(CLUB, 'match', 'sub11');
    const m1 = deleted.find((d) => d.data.id === 'm1');
    expect(m1?.data.opponent).toBe('Esparteiros');
    expect(m1?.deletedBy).toBe(uid);

    const current = await fb.loadMasterClubState(CLUB);
    const restored = withMatches(current, [...current!.matches, m1!.data]);
    expect((await fb.saveMasterClubState(CLUB, restored as any, uid, 'Treinador')).success).toBe(true);
    const doc = (await fs.getDoc(fs.doc(recordsCol(), recordDocId('match', 'sub11', 'm1')))).data();
    expect(doc?.deleted).toBe(false);
    expect((await fb.loadMasterClubState(CLUB))?.matches.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
    expect(cloud.getDeletedRecords<any>(CLUB, 'match', 'sub11').some((d) => d.data.id === 'm1')).toBe(false);

    // Delete it again so the following scenarios start from the same state
    const again = withMatches(
      restored,
      restored.matches.filter((m: any) => m.id !== 'm1')
    );
    expect((await fb.saveMasterClubState(CLUB, again as any, uid, 'Treinador')).success).toBe(true);
  });

  it('a broken load with an empty squad does not wipe the cloud', async () => {
    const many = Array.from({ length: 30 }, (_, i) => player(`x${i}`, `Atleta ${i}`, i + 10));
    const current = await fb.loadMasterClubState(CLUB);
    const big = normalizeClubState({
      ...current!,
      roster: many,
      teams: current!.teams.map((t) => ({ ...t, roster: many }))
    });
    expect((await fb.saveMasterClubState(CLUB, big as any, uid, 'Treinador')).success).toBe(true);
    const empty = normalizeClubState({ ...big, roster: [], teams: big.teams.map((t) => ({ ...t, roster: [] })) });
    await fb.saveMasterClubState(CLUB, { ...empty, roster: [] } as any, uid, 'Treinador');
    const live = (await fs.getDocs(recordsCol())).docs.filter((d) => d.data().kind === 'player' && !d.data().deleted);
    expect(live.length).toBeGreaterThanOrEqual(30);
  });

  it('a second device entering records mode for the first time does not bring back its stale data', async () => {
    // Cloud: m2 was edited after the migration. This device still has the old (pre-migration) data and never
    // synced in records mode (no synced hashes on this device).
    localStorage.removeItem(`bcv-synced-records-${CLUB}`);
    const m2Id = recordDocId('match', 'sub11', 'm2');
    await fs.setDoc(fs.doc(recordsCol(), m2Id), {
      kind: 'match',
      teamId: 'sub11',
      entityId: 'm2',
      updatedAt: Date.now(),
      deleted: false,
      data: plain({ ...matches[1], notes: 'Versão final' })
    });
    let local: any = { ...legacyState, lastLocalMutationAt: 500 };
    let pushes = 0;
    let applied = false;
    const unsub = cloud.subscribeToClubCloud(
      CLUB,
      (onSnap, onErr) => fb.subscribeToLegacyClubDocument(CLUB, onSnap, onErr),
      {
        getLocal: () => local,
        applyRemote: (st) => {
          applied = true;
          local = { ...st, lastLocalMutationAt: local.lastLocalMutationAt };
        },
        requestPush: () => pushes++,
        onInSync: () => {},
        requestMigration: () => {}
      }
    );
    await waitFor(() => applied && local.matches.find((m: any) => m.id === 'm2')?.notes === 'Versão final');
    unsub();
    expect(local.matches.map((m: any) => m.id)).toEqual(['m2']); // m1 stays deleted
    expect(pushes).toBe(0);
  });

  it('handles a club bigger than the old 1 MB limit (many matches and photos)', async () => {
    const current = await fb.loadMasterClubState(CLUB);
    const bigMatches = Array.from({ length: 300 }, (_, i) =>
      match(`big${i}`, `Adversário ${i}`, `2026-${String((i % 9) + 1).padStart(2, '0')}-10`, 'x'.repeat(3000))
    );
    const photo = `data:image/jpeg;base64,${'A'.repeat(60_000)}`;
    const players = Array.from({ length: 40 }, (_, i) => ({
      ...player(`ph${i}`, `Atleta ${i}`, i + 1),
      photoUrl: photo
    }));
    const big = normalizeClubState({
      ...current!,
      roster: players,
      matches: bigMatches,
      teams: current!.teams.map((t) => ({ ...t, roster: players, matches: bigMatches }))
    });
    expect(JSON.stringify(big).length).toBeGreaterThan(3_000_000);
    const res = await fb.saveMasterClubState(CLUB, big as any, uid, 'Treinador', true);
    expect(res.success).toBe(true);
    const reloaded = await fb.loadMasterClubState(CLUB);
    expect(reloaded?.matches.length).toBe(300);
    expect(reloaded?.roster.length).toBe(40);
    expect(reloaded?.roster[0].photoUrl?.length).toBe(photo.length);
  });
});
