/**
 * F2.3 — Rules v3a by team and by role, as a matrix (plan F2, section 7): owner, coordinator (all teams), coach of
 * team A, staff of team A, coach of team B, suspended member, and someone with no membership (old access) ×
 * reading and writing team records, the club record, the old single document and invitations.
 * Fictitious data only.
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

const ORG = 'orgF2';
const PEOPLE = ['dono', 'coord', 'treinadorA', 'staffA', 'treinadorB', 'suspenso', 'semInscricao'];
const uids: Record<string, string> = {};
const denied = { code: 'permission-denied' };
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const rec = (kind: string, teamId: string, id: string, extra: Record<string, unknown> = {}) => ({
  kind,
  teamId,
  entityId: id,
  data: { id, ...extra },
  updatedAt: Date.now(),
  deleted: false
});
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
};
const records = () => fs.collection(fb.db, 'club_workspace', ORG, 'records');
const read = (id: string) => fs.getDoc(ref('club_workspace', ORG, 'records', id));
const write = (id: string, data: Record<string, unknown>) => fs.setDoc(ref('club_workspace', ORG, 'records', id), data);
const listTeams = (teams: string[]) => fs.getDocs(fs.query(records(), fs.where('teamId', 'in', teams)));
const invite = (who: string, role: string, teamId: string) =>
  fs.setDoc(ref('invitations', `inv_${who}_${role.replace(/\W/g, '')}_${teamId}`), {
    id: `inv_${who}`,
    email: 'novo@teste.pt',
    clubId: ORG,
    teamId,
    teamName: teamId,
    role,
    inviteCode: 'x',
    invitedBy: uids[who],
    invitedByName: who,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86_400_000,
    status: 'pending'
  });

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const who of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123')).user.uid;
    // Everyone also has an approved account in this club (the OLD access): the membership must override it
    await fs.setDoc(ref('users', uids[who]), {
      account: { id: uids[who], username: who, name: who, role: 'Treinador Principal', status: 'approved', clubId: ORG }
    });
  }
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: 'Clube F2',
    status: 'active',
    ownerUid: uids.dono,
    createdAt: 1,
    createdBy: uids.dono,
    plan: null
  });
  const member = (who: string, role: string, teamIds: string[], status = 'active') =>
    fs.setDoc(ref('organizations', ORG, 'members', uids[who]), {
      uid: uids[who],
      displayName: who,
      email: `${who}@teste.pt`,
      role,
      teamIds,
      status,
      addedBy: uids.dono,
      addedAt: 1
    });
  await member('dono', 'owner', ['*']);
  await member('coord', 'coordenador', ['*']);
  await member('treinadorA', 'treinador', ['eqA']);
  await member('staffA', 'staff', ['eqA']);
  await member('treinadorB', 'treinador', ['eqB']);
  await member('suspenso', 'treinador', ['eqA'], 'suspended');
  await write('club', rec('club', '_club', 'club', { teams: [] }));
  await write('player__eqA__a1', rec('player', 'eqA', 'a1'));
  await write('player__eqB__b1', rec('player', 'eqB', 'b1'));
  await fs.setDoc(ref('club_workspace', ORG), { state: {}, updatedAt: Date.now() });
  await setRules(RULES_NOW);
});

describe('F2.3 — ler por equipa', () => {
  it("a coach reads their team and the club record, never another team's", async () => {
    await signInAs('treinadorA');
    await expect(read('player__eqA__a1')).resolves.toBeTruthy();
    await expect(read('club')).resolves.toBeTruthy();
    await expect(read('player__eqB__b1')).rejects.toMatchObject(denied);
    // The app's query (its teams + the club record) works; the whole collection is refused
    expect((await listTeams(['eqA', '_club'])).size).toBe(2);
    await expect(fs.getDocs(records())).rejects.toMatchObject(denied);
    await expect(listTeams(['eqA', 'eqB'])).rejects.toMatchObject(denied);
  });

  it('owner and coordinator (all teams) read every team', async () => {
    for (const who of ['dono', 'coord']) {
      await signInAs(who);
      expect((await fs.getDocs(records())).size).toBe(3);
    }
  });

  it('a suspended member gets nothing, not even through the old access', async () => {
    await signInAs('suspenso');
    await expect(read('player__eqA__a1')).rejects.toMatchObject(denied);
    await expect(read('club')).rejects.toMatchObject(denied);
  });
});

describe('F2.3 — escrever por equipa e papel', () => {
  it('a coach writes their team; not another team, not the club record, never moves a record to another team', async () => {
    await signInAs('treinadorA');
    await expect(write('player__eqA__a2', rec('player', 'eqA', 'a2'))).resolves.toBeUndefined();
    await expect(write('player__eqB__b2', rec('player', 'eqB', 'b2'))).rejects.toMatchObject(denied);
    await expect(write('club', rec('club', '_club', 'club', { teams: [1] }))).rejects.toMatchObject(denied);
    await expect(write('player__eqA__a1', rec('player', 'eqB', 'a1'))).rejects.toMatchObject(denied);
  });

  it('staff only reads', async () => {
    await signInAs('staffA');
    await expect(read('player__eqA__a1')).resolves.toBeTruthy();
    await expect(write('player__eqA__a3', rec('player', 'eqA', 'a3'))).rejects.toMatchObject(denied);
  });

  it('the coordinator writes every team but not the club record; the owner writes the club record', async () => {
    await signInAs('coord');
    await expect(write('player__eqB__b3', rec('player', 'eqB', 'b3'))).resolves.toBeUndefined();
    await expect(write('club', rec('club', '_club', 'club', { teams: [2] }))).rejects.toMatchObject(denied);
    await signInAs('dono');
    await expect(write('club', rec('club', '_club', 'club', { teams: [3] }))).resolves.toBeUndefined();
  });
});

describe('F2.3 — documento antigo e convites', () => {
  it('only who manages the club reads the old single document (it has every team)', async () => {
    await signInAs('dono');
    await expect(fs.getDoc(ref('club_workspace', ORG))).resolves.toBeTruthy();
    for (const who of ['treinadorA', 'coord', 'staffA']) {
      await signInAs(who);
      await expect(fs.getDoc(ref('club_workspace', ORG))).rejects.toMatchObject(denied);
    }
  });

  it('invitations by role and only for own teams (D3)', async () => {
    await signInAs('treinadorA');
    await expect(invite('treinadorA', 'Treinador Adjunto', 'eqA')).resolves.toBeUndefined();
    await expect(invite('treinadorA', 'Treinador Principal', 'eqA')).rejects.toMatchObject(denied);
    await expect(invite('treinadorA', 'Treinador Adjunto', 'eqB')).rejects.toMatchObject(denied);
    await signInAs('coord');
    await expect(invite('coord', 'Treinador Principal', 'eqB')).resolves.toBeUndefined();
    await expect(invite('coord', 'Diretor', 'eqB')).rejects.toMatchObject(denied);
    await signInAs('staffA');
    await expect(invite('staffA', 'Treinador Adjunto', 'eqA')).rejects.toMatchObject(denied);
  });
});

describe('F1.10 — quem não tem inscrição num clube que já é organização', () => {
  it('no longer gets in through the old access: nothing of the club, not even the old single document', async () => {
    await signInAs('semInscricao');
    await expect(fs.getDocs(records())).rejects.toMatchObject(denied);
    await expect(read('club')).rejects.toMatchObject(denied);
    await expect(read('player__eqA__a1')).rejects.toMatchObject(denied);
    await expect(fs.getDoc(ref('club_workspace', ORG))).rejects.toMatchObject(denied);
    await expect(write('player__eqA__x9', rec('player', 'eqA', 'x9'))).rejects.toMatchObject(denied);
  });
});
