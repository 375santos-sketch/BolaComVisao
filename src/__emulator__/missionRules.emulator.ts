/**
 * MC1b — Missions and assignments are records of the team (kinds "mission" and "assignment"), with the SAME rules as
 * the team's other records: the team's coaches write; staff only reads; other teams and clubs, and guardians, never.
 * A kind the rules do not list is still refused. And a device whose app does not know a kind ignores those records:
 * it never deletes them (what the app versions before MC1b rely on). Real rules. Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});

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

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const cloud = await import('../services/clubCloud');
const { extractRecords, setSynced } = await import('../lib/recordSync');

const ORG = 'orgMissoes';
const PEOPLE: Array<[string, string, string[]]> = [
  ['treinadorA', 'treinador', ['eqA']],
  ['adjuntoA', 'adjunto', ['eqA']],
  ['staffA', 'staff', ['eqA']],
  ['treinadorB', 'treinador', ['eqB']]
];
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@missoes.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const rec = (kind: string, teamId: string, id: string) => ({
  kind,
  teamId,
  entityId: id,
  data:
    kind === 'mission'
      ? { id, title: 'Missão Exemplo', steps: [{ challengeId: 'c1' }, { challengeId: 'c2' }], status: 'publicado' }
      : {
          id,
          target: { kind: 'missao', id: 'm1' },
          to: ['p1'],
          status: 'ativa',
          progress: { p1: { 0: '2026-11-17' } }
        },
  updatedAt: Date.now(),
  deleted: false
});
const write = (kind: string, teamId: string, id: string) =>
  ok(fs.setDoc(ref('club_workspace', ORG, 'records', `${kind}__${teamId}__${id}`), rec(kind, teamId, id)));
const read = (kind: string, teamId: string, id: string) =>
  ok(fs.getDoc(ref('club_workspace', ORG, 'records', `${kind}__${teamId}__${id}`)));

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, role, teams] of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@missoes.pt`, 'segredo123')).user.uid;
    await fs.setDoc(ref('users', uids[who]), {
      account: { id: uids[who], username: who, name: who, role: 'Treinador Principal', status: 'approved' }
    });
    await fs.setDoc(ref('organizations', ORG, 'members', uids[who]), {
      uid: uids[who],
      displayName: who,
      email: `${who}@missoes.pt`,
      role,
      teamIds: teams,
      status: 'active',
      addedBy: 'x',
      addedAt: 1
    });
  }
  uids.mae = (await fa.createUserWithEmailAndPassword(fb.auth, 'mae@missoes.pt', 'segredo123')).user.uid;
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: 'Clube Missões',
    status: 'active',
    ownerUid: 'x',
    createdAt: 1,
    createdBy: 'x',
    plan: null
  });
  await fs.setDoc(ref('club_workspace', ORG, 'records', 'club'), {
    kind: 'club',
    teamId: '_club',
    entityId: 'club',
    data: { myClubName: 'Clube Missões' },
    updatedAt: Date.now(),
    deleted: false
  });
  // A record of a kind this app does not know (as missions are to the app versions before MC1b)
  await fs.setDoc(ref('club_workspace', ORG, 'records', 'futuro__eqA__f1'), {
    kind: 'futuro',
    teamId: 'eqA',
    entityId: 'f1',
    data: { id: 'f1' },
    updatedAt: Date.now(),
    deleted: false
  });
  await setRules(RULES_NOW);
});

describe('MC1b — regras das missões e atribuições', () => {
  it("the team's coach and assistant write them; staff only reads; another team never", async () => {
    await signInAs('treinadorA');
    expect(await write('mission', 'eqA', 'm1')).toBe(true);
    expect(await write('assignment', 'eqA', 'a1')).toBe(true);
    await signInAs('adjuntoA');
    expect(await write('assignment', 'eqA', 'a2')).toBe(true);
    await signInAs('staffA');
    expect(await read('assignment', 'eqA', 'a1')).toBe(true);
    expect(await write('assignment', 'eqA', 'a3')).toBe(false);
    expect(await write('mission', 'eqA', 'm2')).toBe(false);
    await signInAs('treinadorB');
    expect(await read('assignment', 'eqA', 'a1')).toBe(false);
    expect(await read('mission', 'eqA', 'm1')).toBe(false);
    expect(await write('mission', 'eqA', 'm3')).toBe(false);
  });

  it('a guardian (not a member) reads none of it', async () => {
    await signInAs('mae');
    expect(await read('assignment', 'eqA', 'a1')).toBe(false);
    expect(await read('mission', 'eqA', 'm1')).toBe(false);
  });

  it('a kind the rules do not list is still refused', async () => {
    await signInAs('treinadorA');
    expect(await write('inventado', 'eqA', 'x1')).toBe(false);
  });
});

describe('MC1b — as versões anteriores da app nunca apagam os registos novos', () => {
  it('a record of an unknown kind is ignored when loading, and never deleted when saving', async () => {
    await signInAs('treinadorA');
    cloud.setTeamScope(ORG, ['eqA']);
    const local = await cloud.loadClubStateFromRecords(ORG);
    expect(JSON.stringify(local)).not.toContain('futuro');
    const synced: Record<string, string> = {};
    extractRecords(local!).forEach((r, id) => setSynced(synced, id, r.data));
    storage.set(`bcv-synced-records-${fb.auth.currentUser!.uid}-${ORG}`, JSON.stringify(synced));
    expect((await cloud.pushClubRecords(ORG, { ...local!, lastLocalMutationAt: Date.now() } as never)).success).toBe(
      true
    );
    const after = (await fs.getDoc(ref('club_workspace', ORG, 'records', 'futuro__eqA__f1'))).data();
    expect(after?.deleted).toBe(false);
  });
});
