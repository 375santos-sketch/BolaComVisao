/**
 * F1.7 — Who registers without an invitation gets their OWN space (a coach on their own, or a club), pending until
 * the platform Administrator approves the account; approving the account approves the space. An account without a
 * space (e.g. Google sign-in) is approved into the shared club "main" as a member, as before. Real rules and the
 * app's own registration and approval. Fictitious data only.
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
  if (!res.ok) throw new Error(`rules upload failed: ${res.status} ${await res.text()}`);
}

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const authService = await import('../services/cloudAuthService');
const { ownSpaceIdOf } = await import('../lib/organizations');

const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
let adminUid = '';
const signInAs = async (email: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, email, 'segredo123');
};
const record = (teamId: string, id: string) => ({
  kind: 'player',
  teamId,
  entityId: id,
  data: { id, name: 'Atleta Exemplo' },
  updatedAt: Date.now(),
  deleted: false
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  adminUid = (await fa.createUserWithEmailAndPassword(fb.auth, 'admin.plataforma@teste.pt', 'segredo123')).user.uid;
  await fs.setDoc(ref('admins', adminUid), { uid: adminUid });
  await fs.setDoc(ref('users', adminUid), {
    account: { id: adminUid, username: 'admin', role: 'Administrador', status: 'approved' }
  });
  // The shared club "main", already migrated (F1.8)
  await fs.setDoc(ref('organizations', 'main'), {
    id: 'main',
    type: 'club',
    name: 'Clube',
    status: 'active',
    ownerUid: adminUid,
    createdAt: 1,
    createdBy: adminUid,
    plan: null
  });
  await fs.setDoc(ref('club_workspace', 'main', 'records', 'player__eqMain__p1'), record('eqMain', 'p1'));
  await fa.signOut(fb.auth);
  await setRules(RULES_NOW);
});

describe('F1.7 — contas novas com espaço próprio', () => {
  let uid = '';

  it('registering without an invitation creates a pending own space; nothing is reachable yet', async () => {
    const res = await authService.registerCoachUser(
      'clube.novo',
      'segredo123',
      'Ana Exemplo',
      'Treinador Principal',
      'clube.novo@teste.pt',
      undefined,
      { type: 'club', name: 'Clube Desportivo Exemplo' }
    );
    expect(res).toMatchObject({ success: true, isPending: true });
    uid = res.user!.id;
    expect(res.user!.defaultOrgId).toBe(ownSpaceIdOf(uid));
    await signInAs('clube.novo@teste.pt');
    const org = (await fs.getDoc(ref('organizations', ownSpaceIdOf(uid)))).data();
    expect(org).toMatchObject({ type: 'club', name: 'Clube Desportivo Exemplo', status: 'pending', ownerUid: uid });
    // Not approved yet: the space does not open, and "main" is never theirs
    expect(
      await ok(fs.setDoc(ref('club_workspace', ownSpaceIdOf(uid), 'records', 'club'), record('_club', 'club')))
    ).toBe(false);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'player__eqMain__p1')))).toBe(false);
  });

  it('approving the account approves the space: its owner works there, and still never in "main"', async () => {
    await signInAs('admin.plataforma@teste.pt');
    expect((await authService.approveCoachUser(uid, 'Admin')).success).toBe(true);
    expect((await fs.getDoc(ref('organizations', ownSpaceIdOf(uid)))).data()?.status).toBe('active');
    await signInAs('clube.novo@teste.pt');
    expect(
      await ok(fs.setDoc(ref('club_workspace', ownSpaceIdOf(uid), 'records', 'club'), record('_club', 'club')))
    ).toBe(true);
    expect(await ok(fs.getDoc(ref('club_workspace', 'main', 'records', 'player__eqMain__p1')))).toBe(false);
  });

  it('an account without its own space (e.g. Google sign-in) is approved into "main" as a member, with its teams', async () => {
    const other = (await fa.createUserWithEmailAndPassword(fb.auth, 'google.conta@teste.pt', 'segredo123')).user.uid;
    await fs.setDoc(ref('users', other), {
      account: {
        id: other,
        username: 'google.conta',
        name: 'Conta Google',
        email: 'google.conta@teste.pt',
        role: 'Treinador Principal',
        status: 'pending'
      }
    });
    await signInAs('admin.plataforma@teste.pt');
    expect((await authService.approveCoachUser(other, 'Admin', 'Treinador Principal', ['eqMain'])).success).toBe(true);
    const m = (await fs.getDoc(ref('organizations', 'main', 'members', other))).data();
    expect(m).toMatchObject({ role: 'treinador', teamIds: ['eqMain'], status: 'active' });
  });
});
