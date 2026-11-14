/**
 * F1.8 — Migration M2 of "main" against the emulator with the real rules, on data shaped like the production
 * inventory (fictitious names): it only ADDS documents, the club records stay identical, the chosen accounts become
 * members (and enter through the organization), the others do not, and a second run changes nothing.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});
// The migration only runs against the emulator (it stays blocked in production)
vi.stubEnv('VITE_FIREBASE_EMULATORS', 'true');

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
const mig = await import('../lib/mainMigration');
const svc = await import('../services/mainMigration');

const uids: Record<string, string> = {};
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const NOW = Date.now();

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  // Shaped like the production inventory: 5 approved accounts without a club + 2 empty documents + 1 pending
  const people: Array<[string, string, string, string[]]> = [
    ['dono', 'Administrador', 'approved', ['all']],
    ['coord', 'Coordenador Técnico', 'approved', ['eq1']],
    ['diretor', 'Diretor Desportivo', 'approved', ['eq1']],
    ['treinadorA', 'Treinador Principal', 'approved', ['eq1']],
    ['treinadorB', 'Treinador Principal', 'approved', ['eq1']],
    ['pendente', 'Treinador Adjunto', 'pending', []]
  ];
  for (const who of [...people.map((p) => p[0]), 'vazio1', 'vazio2']) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123')).user.uid;
  }
  await fs.setDoc(ref('admins', uids.dono), { uid: uids.dono });
  for (const [who, role, status, teams] of people) {
    await fs.setDoc(ref('users', uids[who]), {
      account: { id: uids[who], username: who, name: who, email: `${who}@teste.pt`, role, status, assignedTeams: teams }
    });
  }
  await fs.setDoc(ref('users', uids.vazio1), { lastActiveAt: 1 });
  await fs.setDoc(ref('users', uids.vazio2), {});
  // The club data in "main": records of several kinds, some deleted (tombstones)
  const rec = (kind: string, id: string, deleted = false) =>
    fs.setDoc(ref('club_workspace', 'main', 'records', `${kind}__eq1__${id}`), {
      kind,
      teamId: 'eq1',
      entityId: id,
      data: { id },
      updatedAt: NOW,
      deleted
    });
  for (let i = 0; i < 6; i++) await rec('player', `p${i}`);
  for (let i = 0; i < 4; i++) await rec('training', `t${i}`);
  await rec('match', 'm1');
  await rec('match', 'm0', true);
  await fs.setDoc(ref('club_workspace', 'main', 'records', 'club'), {
    kind: 'club',
    teamId: '_club',
    entityId: 'club',
    data: { teams: [] },
    updatedAt: NOW,
    deleted: false
  });
  await setRules(RULES_NOW);
});

const loadAccounts = async () => {
  const snap = await fs.getDocs(fs.collection(fb.db, 'users'));
  return mig.migrationAccountsFrom(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
};
const choices = () => ({
  [uids.dono]: 'membro' as const,
  [uids.coord]: 'membro' as const,
  [uids.diretor]: 'membro' as const,
  [uids.treinadorA]: 'membro' as const
  // treinadorB, pendente and the empty documents stay out
});

describe('F1.8 — migração de «main» (emulador)', () => {
  it('stays blocked unless running against the emulator', () => {
    expect(svc.MAIN_MIGRATION_ENABLED).toBe(true); // only because this test switched the emulator mode on
  });

  it('refuses a plan with problems before writing anything', async () => {
    await signInAs('dono');
    const accounts = await loadAccounts();
    const bad = mig.planMainMigration({
      orgName: 'Clube Teste',
      ownerUid: uids.dono,
      actorUid: uids.dono,
      accounts,
      choices: { ...choices(), [uids.vazio1]: 'membro', [uids.pendente]: 'membro' },
      now: NOW
    });
    expect(bad.problems).toHaveLength(2);
    await expect(svc.runMainMigration(bad)).rejects.toThrow(/problemas/);
    expect((await fs.getDoc(ref('organizations', 'main'))).exists()).toBe(false);
  });

  it('only adds: organization, chosen members, audit and defaultOrgId; the club records stay identical', async () => {
    await signInAs('dono');
    const plan = mig.planMainMigration({
      orgName: 'Clube Teste',
      ownerUid: uids.dono,
      actorUid: uids.dono,
      accounts: await loadAccounts(),
      choices: choices(),
      now: NOW
    });
    expect(plan.problems).toEqual([]);
    const report = await svc.runMainMigration(plan);
    expect(report.checks.filter((c) => !c.ok)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.after).toEqual(report.before);
    expect(report.before).toEqual({ club: 1, match: 1, 'match (apagado)': 1, player: 6, training: 4 });
    const members = await fs.getDocs(fs.collection(fb.db, 'organizations/main/members'));
    expect(members.docs.map((d) => d.data().role).sort()).toEqual(['coordenador', 'diretor', 'owner', 'treinador']);
    expect((await fs.getDoc(ref('users', uids.coord))).data()?.account.defaultOrgId).toBe('main');
    expect((await fs.getDoc(ref('users', uids.treinadorB))).data()?.account.defaultOrgId).toBeUndefined();
  });

  it('running it again changes nothing (no duplicates, no overwrite of later changes)', async () => {
    await signInAs('dono');
    // A later change by the owner: the coordinator was suspended — a second run must not undo it
    await fs.updateDoc(ref('organizations', 'main', 'members', uids.coord), { status: 'suspended' });
    const plan = mig.planMainMigration({
      orgName: 'Clube Teste',
      ownerUid: uids.dono,
      actorUid: uids.dono,
      accounts: await loadAccounts(),
      choices: choices(),
      now: NOW + 1000
    });
    const report = await svc.runMainMigration(plan);
    expect(report.ok).toBe(true);
    expect((await fs.getDocs(fs.collection(fb.db, 'organizations/main/members'))).size).toBe(4);
    expect((await fs.getDocs(fs.collection(fb.db, 'organizations/main/audit'))).size).toBe(4);
    expect((await fs.getDoc(ref('organizations', 'main', 'members', uids.coord))).data()?.status).toBe('suspended');
  });

  it('a chosen member reads the club through the organization; nobody else can run the migration', async () => {
    await signInAs('treinadorA');
    await expect(fs.getDoc(ref('organizations', 'main', 'members', uids.treinadorA))).resolves.toBeTruthy();
    // F2: after the migration the coach reads their team (eq1) and the club record, as the app asks; not the rest
    const records = fs.collection(fb.db, 'club_workspace/main/records');
    await expect(fs.getDocs(fs.query(records, fs.where('teamId', 'in', ['eq1', '_club'])))).resolves.toBeTruthy();
    await expect(fs.getDocs(records)).rejects.toMatchObject({ code: 'permission-denied' });
    // A coach (not the platform Administrator) cannot write the organization nor add members
    await expect(
      fs.setDoc(ref('organizations', 'main', 'members', uids.treinadorB), { uid: uids.treinadorB })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
