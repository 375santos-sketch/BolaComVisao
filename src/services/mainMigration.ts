/**
 * F1.8 — Runs the migration M2 of "main" (only the platform Administrator; the rules refuse anyone else) and checks
 * it automatically. ONLY ADDS: organizations/main, its members, their audit entries and users/{uid}.account.
 * defaultOrgId. The club data is read before and after to prove it did not change.
 *
 * BLOCKED in production: only runs against the emulator until F2 is done and validated and the empty accounts are
 * decided. Enabling it in production is a separate change that needs the Administrator's explicit authorization.
 */
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { MAIN_ORG_ID, MigrationPlan, recordCountsByKind } from '../lib/mainMigration';
import { canonicalJson } from '../lib/recordSync';

/** Production stays blocked: only the emulator (tests and local trials) can run the migration. */
export const MAIN_MIGRATION_ENABLED =
  import.meta.env.DEV === true && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

async function readRecordCounts(): Promise<{ counts: Record<string, number>; total: number }> {
  const snap = await getDocs(collection(db, 'club_workspace', MAIN_ORG_ID, 'records'));
  const records = snap.docs.map((d) => ({ data: d.data() as Record<string, unknown> }));
  return { counts: recordCountsByKind(records), total: records.length };
}

export interface MigrationReport {
  ok: boolean;
  before: Record<string, number>;
  after: Record<string, number>;
  membersWritten: number;
  checks: Array<{ label: string; ok: boolean }>;
}

export async function runMainMigration(plan: MigrationPlan): Promise<MigrationReport> {
  if (!MAIN_MIGRATION_ENABLED) {
    throw new Error('Migração bloqueada na produção até a F2 estar concluída e validada.');
  }
  if (plan.problems.length) throw new Error(`Plano com problemas: ${plan.problems.join(' · ')}`);

  const before = await readRecordCounts();

  // The organization: created once; if it already exists (second run), its status and dates are kept
  const existing = await getDoc(doc(db, 'organizations', MAIN_ORG_ID));
  const batch = writeBatch(db);
  if (!existing.exists()) batch.set(doc(db, 'organizations', MAIN_ORG_ID), plain(plan.org));
  for (const m of plan.members) {
    const ref = doc(db, 'organizations', MAIN_ORG_ID, 'members', m.uid);
    const current = await getDoc(ref);
    // Never overwrite a member that already exists (a later change of role or a revocation is kept)
    if (!current.exists()) batch.set(ref, plain(m));
  }
  for (const a of plan.audit) {
    const ref = doc(db, 'organizations', MAIN_ORG_ID, 'audit', a.id);
    if (!(await getDoc(ref)).exists()) batch.set(ref, plain(a.entry));
  }
  for (const uid of plan.defaultOrgFor) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const data = snap.data() as { account?: Record<string, unknown> } | undefined;
    if (data?.account && data.account.defaultOrgId !== MAIN_ORG_ID) {
      batch.set(ref, { account: { ...data.account, defaultOrgId: MAIN_ORG_ID } }, { merge: true });
    }
  }
  await batch.commit();

  // Automatic checks after writing
  const after = await readRecordCounts();
  const org = await getDoc(doc(db, 'organizations', MAIN_ORG_ID));
  const members = await getDocs(collection(db, 'organizations', MAIN_ORG_ID, 'members'));
  const memberIds = new Set(members.docs.map((d) => d.id));
  const audit = await getDocs(collection(db, 'organizations', MAIN_ORG_ID, 'audit'));
  const checks = [
    {
      label: 'Registos do clube iguais antes e depois',
      ok: before.total === after.total && canonicalJson(before.counts) === canonicalJson(after.counts)
    },
    { label: 'Organização «main» criada e aprovada', ok: org.exists() && org.data()?.status === 'active' },
    { label: 'Todos os membros escolhidos existem', ok: plan.members.every((m) => memberIds.has(m.uid)) },
    { label: 'O dono é membro', ok: memberIds.has(plan.org.ownerUid) },
    {
      label: 'Uma entrada de auditoria por membro criado',
      ok: plan.audit.every((a) => audit.docs.some((d) => d.id === a.id))
    },
    {
      label: 'Contas que ficaram de fora não são membros',
      ok: plan.leftOut.every((l) => !memberIds.has(l.uid))
    }
  ];
  return {
    ok: checks.every((c) => c.ok),
    before: before.counts,
    after: after.counts,
    membersWritten: plan.members.length,
    checks
  };
}
