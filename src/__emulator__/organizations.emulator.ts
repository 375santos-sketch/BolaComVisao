/**
 * F1.3 — Rules v2 "compatible" for organizations and members, as a matrix (plan F1, section 9): active,
 * suspended and revoked members and non-members × reading and writing the club data; organization A vs B; pending
 * organizations; who manages members and with which roles; the append-only audit; and the old access (clubId and
 * the "main" fallback) still working. Uses the app's own service (services/organizations.ts) where it can.
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
  if (!res.ok) throw new Error(`rules upload failed: ${res.status}`);
}

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });
const org = await import('../lib/organizations');
const svc = await import('../services/organizations');

const NOW = 1_800_000_000_000;
const PEOPLE = ['admin', 'dono', 'gestor', 'coord', 'treinador', 'suspenso', 'revogado', 'estranho', 'donoY', 'legado'];
const uids: Record<string, string> = {};
const denied = { code: 'permission-denied' };
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
};
const ref = (...path: string[]) => fs.doc(fb.db, path.join('/'));
const record = (n: number) => ({
  kind: 'player',
  teamId: 'sub11',
  entityId: `p${n}`,
  data: { n },
  updatedAt: Date.now(),
  deleted: false
});
const member = (who: string, role: string, extra: Record<string, unknown> = {}) => ({
  ...org.newMember({
    uid: uids[who],
    displayName: who,
    email: `${who}@teste.pt`,
    role: role as never,
    teamIds: ['*'],
    addedBy: uids.dono,
    now: NOW
  }),
  ...extra
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const who of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123')).user.uid;
  }
  await fs.setDoc(ref('admins', uids.admin), { uid: uids.admin });
  // Organization X (approved) with its members; Y (approved) with only its owner; P (pending, waiting approval)
  const orgDoc = (id: string, owner: string, status: string) => ({
    ...org.newOrganization({ id, type: 'club', name: `Clube ${id}`, ownerUid: uids[owner], now: NOW }),
    status
  });
  await fs.setDoc(ref('organizations', 'orgX'), orgDoc('orgX', 'dono', 'active'));
  await fs.setDoc(ref('organizations', 'orgY'), orgDoc('orgY', 'donoY', 'active'));
  await fs.setDoc(ref('organizations', 'orgP'), orgDoc('orgP', 'estranho', 'pending'));
  const put = (o: string, who: string, role: string, extra: Record<string, unknown> = {}) =>
    fs.setDoc(ref('organizations', o, 'members', uids[who]), member(who, role, extra));
  await put('orgX', 'dono', 'owner');
  await put('orgX', 'gestor', 'admin');
  await put('orgX', 'coord', 'coordenador');
  await put('orgX', 'treinador', 'treinador', { teamIds: ['sub11'] });
  await put('orgX', 'suspenso', 'treinador', { status: 'suspended' });
  await put('orgX', 'revogado', 'treinador', { status: 'revoked', revokedAt: NOW, revokedBy: uids.dono });
  await put('orgY', 'donoY', 'owner');
  await put('orgP', 'estranho', 'owner');
  for (const ws of ['orgX', 'orgY', 'orgP', 'main']) {
    await fs.setDoc(ref('club_workspace', ws, 'records', 'player__sub11__p1'), record(1));
  }
  // The old access: an approved account without a club still works in "main" (kept until the strict rules v3)
  await fs.setDoc(ref('users', uids.legado), {
    account: { id: uids.legado, username: 'legado', name: 'legado', role: 'Treinador Principal', status: 'approved' }
  });
  await setRules(RULES_NOW);
});

const canRead = (path: string[]) => fs.getDoc(ref(...path));
const canWrite = (path: string[], n = 2) => fs.setDoc(ref(...path), record(n));

describe('F1.3 — dados do clube por membros da organização', () => {
  it('an active member reads and writes the data of their organization', async () => {
    await signInAs('treinador');
    await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).resolves.toBeTruthy();
    await expect(canWrite(['club_workspace', 'orgX', 'records', 'player__sub11__p2'])).resolves.toBeUndefined();
    await expect(fs.getDocs(fs.collection(fb.db, 'club_workspace/orgX/records'))).resolves.toBeTruthy();
  });

  it('suspended, revoked and non-members get nothing', async () => {
    for (const who of ['suspenso', 'revogado', 'estranho', 'donoY']) {
      await signInAs(who);
      await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
      await expect(canWrite(['club_workspace', 'orgX', 'records', 'player__sub11__p3'])).rejects.toMatchObject(denied);
    }
  });

  it('organization A does not see organization B (and B does not see A)', async () => {
    await signInAs('dono');
    await expect(canRead(['club_workspace', 'orgY', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
    await signInAs('donoY');
    await expect(canRead(['club_workspace', 'orgY', 'records', 'player__sub11__p1'])).resolves.toBeTruthy();
    await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
  });

  it('a PENDING organization gives no access yet, not even to its owner (manual approval first)', async () => {
    await signInAs('estranho');
    await expect(canRead(['club_workspace', 'orgP', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
    await expect(canRead(['organizations', 'orgP'])).resolves.toBeTruthy(); // the owner sees it is pending
  });

  it('the old access keeps working (an approved account without a club in "main"); the Administrator reads all', async () => {
    await signInAs('legado');
    await expect(canRead(['club_workspace', 'main', 'records', 'player__sub11__p1'])).resolves.toBeTruthy();
    await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
    await signInAs('admin');
    await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).resolves.toBeTruthy();
    await expect(fs.getDocs(fs.collection(fb.db, 'organizations'))).resolves.toBeTruthy();
  });
});

describe('F1.3 — criar organizações', () => {
  it('anyone signed in creates their OWN organization, pending, with themselves as owner (app service)', async () => {
    await signInAs('treinador');
    const o = org.newOrganization({
      id: 'orgNova',
      type: 'individual',
      name: 'Equipa Nova',
      ownerUid: uids.treinador,
      now: NOW
    });
    const owner = org.newMember({
      uid: uids.treinador,
      displayName: 'treinador',
      email: 'treinador@teste.pt',
      role: 'owner',
      teamIds: ['*'],
      addedBy: uids.treinador,
      now: NOW
    });
    await expect(svc.createOrganization(o, owner)).resolves.toBeUndefined();
    // …but it gives no access to data until the platform approves it
    await expect(canWrite(['club_workspace', 'orgNova', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
  });

  it('refused: in the name of someone else, already active, the id "main" or the id of a club with data', async () => {
    await signInAs('estranho');
    const base = { type: 'club' as const, name: 'Tentativa', ownerUid: uids.estranho, now: NOW };
    const create = (o: object) => fs.setDoc(ref('organizations', (o as { id: string }).id), o);
    await expect(
      create({ ...org.newOrganization({ ...base, id: 'orgA1' }), ownerUid: uids.dono })
    ).rejects.toMatchObject(denied);
    await expect(create({ ...org.newOrganization({ ...base, id: 'orgA2' }), status: 'active' })).rejects.toMatchObject(
      denied
    );
    await expect(create(org.newOrganization({ ...base, id: 'main' }))).rejects.toMatchObject(denied);
    await fa.signOut(fb.auth);
    await signInAs('admin');
    await fs.setDoc(ref('club_workspace', 'clubeComDados'), { state: {}, updatedAt: Date.now() });
    await signInAs('estranho');
    await expect(create(org.newOrganization({ ...base, id: 'clubeComDados' }))).rejects.toMatchObject(denied);
    // and nobody makes themselves owner of an organization that already exists
    await expect(
      fs.setDoc(
        ref('organizations', 'orgX', 'members', uids.estranho),
        member('estranho', 'owner', { addedBy: uids.estranho })
      )
    ).rejects.toMatchObject(denied);
  });

  it('the Administrator approves; the owner only changes the name (not the status)', async () => {
    await signInAs('dono');
    await expect(fs.updateDoc(ref('organizations', 'orgX'), { name: 'Clube X Novo' })).resolves.toBeUndefined();
    await expect(fs.updateDoc(ref('organizations', 'orgX'), { status: 'suspended' })).rejects.toMatchObject(denied);
    await signInAs('estranho');
    await expect(fs.updateDoc(ref('organizations', 'orgP'), { status: 'active' })).rejects.toMatchObject(denied);
    await signInAs('admin');
    await expect(fs.updateDoc(ref('organizations', 'orgNova'), { status: 'active' })).resolves.toBeUndefined();
  });
});

describe('F1.3 — gerir membros', () => {
  it('owner and admin add members up to their own role, never an owner (app service)', async () => {
    await signInAs('gestor');
    const add = (who: string, role: string) =>
      svc.putMember('orgX', member(who, role, { addedBy: uids.gestor }) as never, uids.gestor, NOW);
    await expect(add('estranho', 'treinador')).resolves.toBeUndefined();
    await expect(add('donoY', 'admin')).resolves.toBeUndefined();
    await expect(add('legado', 'owner')).rejects.toMatchObject(denied);
  });

  it('coordinators, coaches and outsiders do not add members', async () => {
    for (const who of ['coord', 'treinador', 'revogado']) {
      await signInAs(who);
      await expect(
        svc.putMember('orgX', member('legado', 'adjunto', { addedBy: uids[who] }) as never, uids[who], NOW)
      ).rejects.toMatchObject(denied);
    }
  });

  it('a manager revokes and changes the others, never the owner nor themselves; nobody deletes a member', async () => {
    await signInAs('gestor');
    const coach = (await fs.getDoc(ref('organizations', 'orgX', 'members', uids.treinador))).data() as never;
    await expect(svc.setMemberStatus('orgX', coach, 'revoked', uids.gestor, NOW)).resolves.toMatchObject({
      status: 'revoked'
    });
    const owner = (await fs.getDoc(ref('organizations', 'orgX', 'members', uids.dono))).data() as never;
    await expect(svc.setMemberStatus('orgX', owner, 'suspended', uids.gestor, NOW)).rejects.toMatchObject(denied);
    const me = (await fs.getDoc(ref('organizations', 'orgX', 'members', uids.gestor))).data() as never;
    await expect(svc.updateMemberAccess('orgX', me, { role: 'owner' }, uids.gestor, NOW)).rejects.toMatchObject(denied);
    await expect(fs.deleteDoc(ref('organizations', 'orgX', 'members', uids.coord))).rejects.toMatchObject(denied);
    // the revoked coach lost access at once
    await signInAs('treinador');
    await expect(canRead(['club_workspace', 'orgX', 'records', 'player__sub11__p1'])).rejects.toMatchObject(denied);
  });

  it('members see the member list of their organization; others do not', async () => {
    await signInAs('coord');
    await expect(fs.getDocs(fs.collection(fb.db, 'organizations/orgX/members'))).resolves.toBeTruthy();
    await signInAs('donoY');
    // donoY was made admin of orgX above, so use someone who is not a member at all
    await signInAs('suspenso');
    await expect(fs.getDocs(fs.collection(fb.db, 'organizations/orgX/members'))).rejects.toMatchObject(denied);
    // …but everyone reads their own membership (to know where they belong)
    await expect(canRead(['organizations', 'orgX', 'members', uids.suspenso])).resolves.toBeTruthy();
  });
});

describe('F1.3 — auditoria (só acrescentar)', () => {
  it('an active member appends in their own name; never in the name of another; never changed nor deleted', async () => {
    await signInAs('coord');
    const entry = (actor: string) => ({ action: 'member.added', actorUid: uids[actor], at: NOW });
    const added = await fs.addDoc(fs.collection(fb.db, 'organizations/orgX/audit'), entry('coord'));
    await expect(fs.addDoc(fs.collection(fb.db, 'organizations/orgX/audit'), entry('dono'))).rejects.toMatchObject(
      denied
    );
    await signInAs('dono');
    await expect(fs.updateDoc(added, { action: 'outra' })).rejects.toMatchObject(denied);
    await expect(fs.deleteDoc(added)).rejects.toMatchObject(denied);
    await signInAs('estranho');
    await expect(fs.addDoc(fs.collection(fb.db, 'organizations/orgX/audit'), entry('estranho'))).resolves.toBeTruthy();
  });

  it('only owner/admin (and the Administrator) read the audit', async () => {
    await signInAs('dono');
    await expect(fs.getDocs(fs.collection(fb.db, 'organizations/orgX/audit'))).resolves.toBeTruthy();
    await signInAs('coord');
    await expect(fs.getDocs(fs.collection(fb.db, 'organizations/orgX/audit'))).rejects.toMatchObject(denied);
  });
});
