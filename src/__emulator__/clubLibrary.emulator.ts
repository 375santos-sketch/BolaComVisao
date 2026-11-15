/**
 * VJ3 — The club library of Visão de Jogo: a coach proposes a session (draft, review) in their own name; only who
 * publishes (owner, admin, director, or a coordinator the club allowed) publishes, returns, archives or removes it;
 * staff never writes; the permission is given only by who manages the members, never by oneself. Real rules.
 * Fictitious data only.
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

const ORG = 'orgBiblioteca';
// [who, role, teams, may publish in the club library]
const PEOPLE: Array<[string, string, string[], boolean]> = [
  ['dono', 'owner', ['*'], false],
  ['diretor', 'diretor', ['*'], false],
  ['coordAutorizado', 'coordenador', ['*'], true],
  ['coordSem', 'coordenador', ['*'], false],
  ['treinadorA', 'treinador', ['eqA'], false],
  ['treinadorB', 'treinador', ['eqB'], false],
  ['staffA', 'staff', ['eqA'], false]
];
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@biblioteca.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const docOf = (id: string) => ref('club_workspace', ORG, 'records', `clubchallenge___club__${id}`);
const session = (id: string, status: string, author: string, deleted = false) => ({
  kind: 'clubchallenge',
  teamId: '_club',
  entityId: id,
  data: { id, format: 'sessao', title: 'Sessão Exemplo', status, authorUid: uids[author] || author, items: [] },
  updatedAt: Date.now(),
  deleted
});
const write = (id: string, status: string, author: string, deleted = false) =>
  ok(fs.setDoc(docOf(id), session(id, status, author, deleted)));
const member = (who: string, role: string, teamIds: string[], publishes: boolean) => ({
  uid: uids[who],
  displayName: who,
  email: `${who}@biblioteca.pt`,
  role,
  teamIds,
  status: 'active',
  addedBy: 'x',
  addedAt: 1,
  ...(publishes ? { publishesLibrary: true } : {})
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, role, teams, publishes] of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@biblioteca.pt`, 'segredo123')).user.uid;
    await fs.setDoc(ref('users', uids[who]), {
      account: { id: uids[who], username: who, name: who, role: 'Treinador Principal', status: 'approved' }
    });
    await fs.setDoc(ref('organizations', ORG, 'members', uids[who]), member(who, role, teams, publishes));
  }
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: 'Clube Biblioteca',
    status: 'active',
    ownerUid: uids.dono,
    createdAt: 1,
    createdBy: uids.dono,
    plan: null
  });
  await fs.setDoc(docOf('publicada'), session('publicada', 'publicado', 'treinadorB'));
  await fs.setDoc(ref('club_workspace', ORG, 'records', 'club'), {
    kind: 'club',
    teamId: '_club',
    entityId: 'club',
    data: { myClubName: 'Clube Biblioteca' },
    updatedAt: Date.now(),
    deleted: false
  });
  await setRules(RULES_NOW);
});

describe('VJ3 — um treinador propõe', () => {
  it('creates a draft and sends it for review, in their own name', async () => {
    await signInAs('treinadorA');
    expect(await write('p1', 'rascunho', 'treinadorA')).toBe(true);
    expect(await write('p1', 'revisao', 'treinadorA')).toBe(true);
    expect(await write('p1', 'rascunho', 'treinadorA')).toBe(true);
  });

  it('never publishes, never in the name of another, never changes or removes what is not theirs', async () => {
    await signInAs('treinadorA');
    expect(await write('p1', 'publicado', 'treinadorA')).toBe(false);
    expect(await write('p2', 'publicado', 'treinadorA')).toBe(false);
    expect(await write('p3', 'rascunho', 'treinadorB')).toBe(false);
    expect(await write('publicada', 'rascunho', 'treinadorA')).toBe(false);
    expect(await write('publicada', 'publicado', 'treinadorB', true)).toBe(false);
    expect(await write('p1', 'rascunho', 'treinadorA', true)).toBe(false);
    // …nor turns the club record (or a team's record) into a library session
    expect(
      await ok(fs.setDoc(ref('club_workspace', ORG, 'records', 'club'), session('club', 'rascunho', 'treinadorA')))
    ).toBe(false);
  });

  it('every member reads the club library; staff never writes in it', async () => {
    await signInAs('staffA');
    expect(await ok(fs.getDoc(docOf('publicada')))).toBe(true);
    expect(await write('s1', 'rascunho', 'staffA')).toBe(false);
  });
});

describe('VJ3 — quem publica', () => {
  it('the allowed coordinator approves, returns and archives; the coordinator without permission does not', async () => {
    await signInAs('coordSem');
    expect(await write('p1', 'publicado', 'treinadorA')).toBe(false);
    expect(await write('p1', 'rascunho', 'treinadorA')).toBe(false);
    await signInAs('coordAutorizado');
    expect(await write('p1', 'publicado', 'treinadorA')).toBe(true);
    expect(await write('p1', 'arquivado', 'treinadorA')).toBe(true);
    expect(await write('p1', 'rascunho', 'treinadorA')).toBe(true);
    expect(await write('p1', 'rascunho', 'treinadorA', true)).toBe(true);
  });

  it('the owner and the director publish', async () => {
    await signInAs('diretor');
    expect(await write('d1', 'publicado', 'diretor')).toBe(true);
    await signInAs('dono');
    expect(await write('d1', 'arquivado', 'diretor')).toBe(true);
  });
});

describe('VJ3 — a permissão «publicar na biblioteca do clube»', () => {
  it('is given by who manages the members, and nobody gives it to themselves', async () => {
    const m = (who: string, publishes: boolean) => {
      const p = PEOPLE.find((x) => x[0] === who)!;
      return member(who, p[1], p[2], publishes);
    };
    await signInAs('coordSem');
    expect(await ok(fs.setDoc(ref('organizations', ORG, 'members', uids.coordSem), m('coordSem', true)))).toBe(false);
    await signInAs('dono');
    expect(await ok(fs.setDoc(ref('organizations', ORG, 'members', uids.coordSem), m('coordSem', true)))).toBe(true);
    await signInAs('coordSem');
    expect(await write('p4', 'publicado', 'coordSem')).toBe(true);
  });
});

describe('VJ3 — a app nunca envia o que as regras recusam', () => {
  it("a coach's device that changed a published club session still saves what it may, and the session stays as published", async () => {
    await signInAs('treinadorA');
    cloud.setTeamScope(ORG, ['eqA']);
    cloud.setLibraryPublisher(ORG, false);
    const local = await cloud.loadClubStateFromRecords(ORG);
    expect(local?.clubVjSessions?.some((x) => x.id === 'publicada')).toBe(true);
    const synced: Record<string, string> = {};
    extractRecords(local!).forEach((r, id) => setSynced(synced, id, r.data));
    storage.set(`bcv-synced-records-${fb.auth.currentUser!.uid}-${ORG}`, JSON.stringify(synced));
    const edited = {
      ...local!,
      // its own new proposal, a change it may not make (a published session of another coach), and a removal it
      // may not make
      clubVjSessions: [
        ...(local!.clubVjSessions || [])
          .filter((x) => x.id !== 'd1')
          .map((x) => (x.id === 'publicada' ? { ...x, title: 'Mudado sem permissão' } : x)),
        { ...session('nova', 'rascunho', 'treinadorA').data, competencies: [], createdAt: 'x', updatedAt: 'x' }
      ],
      lastLocalMutationAt: Date.now()
    };
    expect((await cloud.pushClubRecords(ORG, edited as never)).success).toBe(true);
    expect((await fs.getDoc(docOf('nova'))).data()?.data?.status).toBe('rascunho');
    expect((await fs.getDoc(docOf('publicada'))).data()?.data?.title).toBe('Sessão Exemplo');
    expect((await fs.getDoc(docOf('d1'))).data()?.deleted).toBe(false);
  });
});
