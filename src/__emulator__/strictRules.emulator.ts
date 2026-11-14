/**
 * F1.10 — Strict rules: a club that is an organization opens ONLY through its memberships. An approved account
 * without a membership (like the empty accounts left out of the migration) gets nothing of "main"; an own space
 * (F1.7) never sees another club's people; an old club that is not an organization yet keeps working as before.
 * Real rules. Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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

const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@estritas.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const rec = (teamId: string, id: string) => ({
  kind: 'player',
  teamId,
  entityId: id,
  data: { id, name: 'Atleta Exemplo' },
  updatedAt: Date.now(),
  deleted: false
});
const org = (id: string, owner: string) => ({
  id,
  type: 'club',
  name: id,
  status: 'active',
  ownerUid: owner,
  createdAt: 1,
  createdBy: owner,
  plan: null
});
const member = (who: string, role: string, teamIds: string[]) => ({
  uid: uids[who],
  displayName: who,
  email: `${who}@estritas.pt`,
  role,
  teamIds,
  status: 'active',
  addedBy: 'x',
  addedAt: 1
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  // [who, account club, own space]
  const people: Array<[string, string | null, string | null]> = [
    ['treinadorMain', null, 'main'],
    ['adjuntoMain', null, 'main'],
    ['semInscricao', null, null], // approved, left out of the migration
    ['espacoProprio', 'org-proprio', 'org-proprio'],
    ['clubeVelho', 'clubeVelho', null] // an old club that is not an organization yet
  ];
  for (const [who, club, space] of people) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@estritas.pt`, 'segredo123')).user.uid;
    await fs.setDoc(ref('users', uids[who]), {
      account: {
        id: uids[who],
        username: who,
        name: who,
        role: 'Treinador Principal',
        status: 'approved',
        assignedTeams: ['all'],
        ...(club ? { clubId: club } : {}),
        ...(space ? { defaultOrgId: space } : {})
      }
    });
  }
  await fs.setDoc(ref('organizations', 'main'), org('main', 'x'));
  await fs.setDoc(
    ref('organizations', 'main', 'members', uids.treinadorMain),
    member('treinadorMain', 'treinador', ['eqM'])
  );
  await fs.setDoc(ref('organizations', 'main', 'members', uids.adjuntoMain), member('adjuntoMain', 'adjunto', ['eqM']));
  await fs.setDoc(ref('organizations', 'org-proprio'), org('org-proprio', uids.espacoProprio));
  await fs.setDoc(
    ref('organizations', 'org-proprio', 'members', uids.espacoProprio),
    member('espacoProprio', 'owner', ['*'])
  );
  await fs.setDoc(ref('club_workspace', 'main'), { state: {}, updatedAt: 1 });
  await fs.setDoc(ref('club_workspace', 'main', 'records', 'club'), rec('_club', 'club'));
  await fs.setDoc(ref('club_workspace', 'main', 'records', 'player__eqM__p1'), rec('eqM', 'p1'));
  await fs.setDoc(ref('club_workspace', 'clubeVelho', 'records', 'player__eqV__v1'), rec('eqV', 'v1'));
  await fs.setDoc(ref('team_databases', 'eqM'), { clubId: 'Sub-11', name: 'x', createdBy: 'x', updatedAt: 1 });
  await fs.setDoc(ref('team_databases', 'eqM', 'datasets', 'd1', 'rows', 'r1'), {
    data: { NOME: 'Atleta' },
    order: 0,
    updatedAt: 1,
    updatedBy: 'x'
  });
  await setRules(RULES_NOW);
});

describe('F1.10 — o «main» só abre pelas inscrições', () => {
  it('an approved account without a membership gets nothing of "main"', async () => {
    await signInAs('semInscricao');
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'player__eqM__p1')))).toBe(false);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'club')))).toBe(false);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main')))).toBe(false);
    expect(await ok(fs.setDoc(ref('club_workspace', 'main', 'records', 'player__eqM__x'), rec('eqM', 'x')))).toBe(
      false
    );
    expect(await ok(fs.getDocs(fs.collection(fb.db, 'team_databases', 'eqM', 'datasets', 'd1', 'rows')))).toBe(false);
    expect(await ok(fs.getDoc(ref('users', uids.treinadorMain)))).toBe(false);
  });

  it('the members keep working, and see each other', async () => {
    await signInAs('treinadorMain');
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'player__eqM__p1')))).toBe(true);
    expect(await ok(fs.getDocs(fs.collection(fb.db, 'team_databases', 'eqM', 'datasets', 'd1', 'rows')))).toBe(true);
    expect(await ok(fs.getDoc(ref('users', uids.adjuntoMain)))).toBe(true);
  });

  it('an own space never sees the people or the data of another club', async () => {
    await signInAs('espacoProprio');
    expect(await ok(fs.getDoc(ref('users', uids.treinadorMain)))).toBe(false);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'club')))).toBe(false);
    expect(await ok(fs.setDoc(ref('club_workspace', 'org-proprio', 'records', 'club'), rec('_club', 'club')))).toBe(
      true
    );
  });

  it('an old club that is not an organization yet keeps working as before', async () => {
    await signInAs('clubeVelho');
    expect(await ok(fs.getDoc(ref('club_workspace', 'clubeVelho', 'records', 'player__eqV__v1')))).toBe(true);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'club')))).toBe(false);
  });
});
