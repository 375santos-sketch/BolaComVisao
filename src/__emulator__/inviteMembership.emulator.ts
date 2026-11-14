/**
 * F1.7a — Who registers with an invitation also becomes a member of the club, with exactly the invitation's team
 * and role (and nothing more), while the invitation is still pending. Real rules. Fictitious data only.
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
const { putMember } = await import('../services/organizations');
const { memberFromInvitation } = await import('../lib/organizations');

const ORG = 'orgConvite';
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const invitation = (code: string, extra: Record<string, unknown> = {}) => ({
  id: code,
  email: '',
  clubId: ORG,
  teamId: 'eqA',
  teamName: 'Sub-11',
  role: 'Treinador Adjunto',
  inviteCode: code,
  invitedBy: 'dono',
  invitedByName: 'Dono',
  createdAt: Date.now(),
  expiresAt: Date.now() + 86_400_000,
  status: 'pending',
  ...extra
});

/** A new account registered with the invitation `code` (as the app does), signed in. */
async function registerWith(who: string, code: string) {
  const uid = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@convite.pt`, 'segredo123')).user.uid;
  const account = {
    id: uid,
    username: who,
    name: who,
    email: `${who}@convite.pt`,
    role: 'Treinador Adjunto',
    status: 'approved',
    clubId: ORG,
    assignedTeams: ['eqA'],
    inviteCode: code,
    createdAt: '2026-11-14T00:00:00Z'
  };
  try {
    await fs.setDoc(ref('users', uid), { account });
  } catch {
    // The rules refuse an approved account with an unusable invitation: the app then registers it as pending
    await fs.setDoc(ref('users', uid), {
      account: { ...account, status: 'pending', clubId: null, assignedTeams: [] }
    });
  }
  return uid;
}
const joinAs = (uid: string, change: Record<string, unknown> = {}) => {
  const m = {
    ...memberFromInvitation({
      uid,
      name: 'Novo',
      email: 'novo@convite.pt',
      invitation: { role: 'Treinador Adjunto', teamId: 'eqA' },
      now: Date.now()
    }),
    ...change
  };
  return putMember(ORG, m as never, uid, Date.now()).then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
};

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: 'Clube Convite',
    status: 'active',
    ownerUid: 'dono',
    createdAt: 1,
    createdBy: 'dono',
    plan: null
  });
  for (const code of ['CONV1', 'CONV2', 'CONV3', 'USADO']) await fs.setDoc(ref('invitations', code), invitation(code));
  await fs.setDoc(ref('invitations', 'USADO'), { status: 'accepted' }, { merge: true });
  await setRules(RULES_NOW);
});

describe('F1.7a — o convite cria a inscrição no clube', () => {
  it("registering with an invitation makes a member with the invitation's team and role", async () => {
    const uid = await registerWith('adjunto1', 'CONV1');
    expect(await joinAs(uid)).toBe(true);
    const m = (await fs.getDoc(ref('organizations', ORG, 'members', uid))).data();
    expect(m).toMatchObject({ role: 'adjunto', teamIds: ['eqA'], status: 'active' });
  });

  it('never more than the invitation: another role, another team or every team is refused', async () => {
    const uid = await registerWith('adjunto2', 'CONV2');
    expect(await joinAs(uid, { role: 'treinador' })).toBe(false);
    expect(await joinAs(uid, { role: 'coordenador' })).toBe(false);
    expect(await joinAs(uid, { teamIds: ['eqB'] })).toBe(false);
    expect(await joinAs(uid, { teamIds: ['*'] })).toBe(false);
    expect(await joinAs(uid)).toBe(true);
  });

  it('a used invitation, or no invitation, gives no membership', async () => {
    expect(await joinAs(await registerWith('tarde', 'USADO'))).toBe(false);
    expect(await joinAs(await registerWith('semConvite', 'NAOEXISTE'))).toBe(false);
  });
});
