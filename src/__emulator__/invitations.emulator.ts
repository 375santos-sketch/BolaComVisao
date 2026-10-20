/**
 * Invitations end to end against the emulators with the real rules and the app's registration code.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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
const RULES_NOW = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const OPEN_RULES = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }`;

async function setRules(content: string) {
  const res = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
  });
  if (!res.ok) throw new Error(`rules upload failed: ${res.status}`);
}

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const svc = await import('../services/cloudAuthService');

const uids: Record<string, string> = {};
const denied = { code: 'permission-denied' };
const signInAs = async (email: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, email, 'segredo123');
};
const invitation = (code: string, overrides: Record<string, unknown> = {}) => ({
  id: `inv_${code}`,
  email: 'novo.adjunto@clube.pt',
  name: 'Novo Adjunto',
  clubId: 'clubA',
  teamId: 'sub11',
  teamName: 'Dragões (Sub-11)',
  role: 'Treinador Adjunto',
  inviteCode: code,
  invitedBy: uids.coachA,
  invitedByName: 'Coach A',
  createdAt: Date.now(),
  expiresAt: Date.now() + 7 * 86_400_000,
  status: 'pending',
  ...overrides
});
const userDoc = async (uid: string) => (await fs.getDoc(fs.doc(fb.db, 'users', uid))).data()?.account;

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, club] of [
    ['coachA', 'clubA'],
    ['coachB', 'clubB']
  ]) {
    const cred = await fa.createUserWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
    uids[who] = cred.user.uid;
    await fs.setDoc(fs.doc(fb.db, 'users', cred.user.uid), {
      account: {
        id: cred.user.uid,
        username: who,
        role: 'Treinador Principal',
        status: 'approved',
        clubId: club,
        assignedTeams: ['sub11']
      }
    });
  }
  await fa.signOut(fb.auth);
  await setRules(RULES_NOW);
});

describe('Criar e abrir convites', () => {
  it('a coach invites to their own club; strong codes are accepted', async () => {
    await signInAs('coachA@teste.pt');
    expect((await svc.createTeamInvitation(invitation('BCV-K7M2Q9XA') as any)).success).toBe(true);
    expect((await svc.createTeamInvitation(invitation('BCV-REUSE001') as any)).success).toBe(true);
    expect((await svc.createTeamInvitation(invitation('BCV-OTHERMAIL') as any)).success).toBe(true);
  });

  it('a coach cannot invite to another club, nor as Administrador, nor in someone else’s name', async () => {
    await signInAs('coachA@teste.pt');
    const ref = (c: string) => fs.doc(fb.db, 'invitations', c);
    await expect(fs.setDoc(ref('BCV-X1'), invitation('BCV-X1', { clubId: 'clubB' }))).rejects.toMatchObject(denied);
    await expect(fs.setDoc(ref('BCV-X2'), invitation('BCV-X2', { role: 'Administrador' }))).rejects.toMatchObject(
      denied
    );
    await expect(fs.setDoc(ref('BCV-X3'), invitation('BCV-X3', { invitedBy: uids.coachB }))).rejects.toMatchObject(
      denied
    );
  });

  it('a coach of another club cannot revoke the invitation', async () => {
    await signInAs('coachB@teste.pt');
    expect((await svc.revokeTeamInvitation('BCV-K7M2Q9XA')).success).toBe(false);
  });

  it('the invitation can be checked before having an account (registration form)', async () => {
    await fa.signOut(fb.auth);
    const res = await svc.lookupInvitationByCode('bcv-k7m2q9xa');
    expect(res.success).toBe(true);
    expect(res.invitation?.teamName).toBe('Dragões (Sub-11)');
  });
});

describe('Registar com convite', () => {
  it('registers an approved account with exactly what the invitation grants, and uses the invitation', async () => {
    await fa.signOut(fb.auth);
    const { invitation: inv } = await svc.lookupInvitationByCode('BCV-K7M2Q9XA');
    const res = await svc.registerCoachUser(
      'novo.adjunto',
      'segredo123',
      'Novo Adjunto',
      'Treinador Principal',
      'novo.adjunto@clube.pt',
      inv
    );
    expect(res.success).toBe(true);
    expect(res.isPending).toBeFalsy();
    const acc = await userDoc(fb.auth.currentUser!.uid);
    expect(acc).toMatchObject({
      status: 'approved',
      clubId: 'clubA',
      assignedTeams: ['sub11'],
      role: 'Treinador Adjunto'
    });
    await signInAs('coachA@teste.pt');
    expect((await fs.getDoc(fs.doc(fb.db, 'invitations', 'BCV-K7M2Q9XA'))).data()?.status).toBe('accepted');
  });

  it('a used invitation cannot be used again (second person is registered as pending)', async () => {
    await fa.signOut(fb.auth);
    const inv = invitation('BCV-K7M2Q9XA');
    const res = await svc.registerCoachUser(
      'outro',
      'segredo123',
      'Outro',
      'Treinador Principal',
      'novo.adjunto2@clube.pt',
      inv as any
    );
    expect(res.success).toBe(true);
    expect(res.isPending).toBe(true);
  });

  it('an invitation for another email does not approve the account', async () => {
    await fa.signOut(fb.auth);
    const { invitation: inv } = await svc.lookupInvitationByCode('BCV-OTHERMAIL');
    const res = await svc.registerCoachUser(
      'intruso',
      'segredo123',
      'Intruso',
      'Treinador Principal',
      'intruso@mail.pt',
      inv
    );
    expect(res.isPending).toBe(true);
  });

  it('nobody can create an approved account (or one with more teams) without a valid invitation', async () => {
    const cred = await fa.createUserWithEmailAndPassword(fb.auth, 'atacante@mail.pt', 'segredo123');
    const ref = fs.doc(fb.db, 'users', cred.user.uid);
    const base = {
      id: cred.user.uid,
      username: 'atacante',
      role: 'Treinador Principal',
      status: 'approved',
      clubId: 'clubA'
    };
    await expect(fs.setDoc(ref, { account: { ...base, assignedTeams: ['sub11'] } })).rejects.toMatchObject(denied);
    await expect(
      fs.setDoc(ref, { account: { ...base, assignedTeams: ['all'], inviteCode: 'BCV-REUSE001' } })
    ).rejects.toMatchObject(denied);
    await expect(
      fs.setDoc(ref, { account: { ...base, clubId: 'clubB', assignedTeams: ['sub11'], inviteCode: 'BCV-REUSE001' } })
    ).rejects.toMatchObject(denied);
  });
});
