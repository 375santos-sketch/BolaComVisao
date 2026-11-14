/**
 * F1.2 — Reading and writing organizations, members and their audit in Firestore. NOT used by the screens yet,
 * and the current rules refuse these collections: nothing here can change production until the F1.3 rules are
 * published and a screen calls it.
 *
 * Every change to a member also appends an audit entry, in the same batch (both or neither).
 */
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import {
  MemberStatus,
  OrgAuditEntry,
  OrgMember,
  OrgRole,
  Organization,
  chooseActiveOrg,
  memberProblems,
  organizationProblems,
  withMemberStatus
} from '../lib/organizations';

const orgRef = (orgId: string) => doc(db, 'organizations', orgId);
const memberRef = (orgId: string, uid: string) => doc(db, 'organizations', orgId, 'members', uid);
const newAuditRef = (orgId: string) => doc(collection(db, 'organizations', orgId, 'audit'));

/** Plain JSON for Firestore (no undefined). */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const snap = await getDoc(orgRef(orgId));
  return snap.exists() ? ({ ...(snap.data() as Organization), id: snap.id } as Organization) : null;
}

export async function getMember(orgId: string, uid: string): Promise<OrgMember | null> {
  const snap = await getDoc(memberRef(orgId, uid));
  return snap.exists() ? (snap.data() as OrgMember) : null;
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const snap = await getDocs(collection(db, 'organizations', orgId, 'members'));
  return snap.docs.map((d) => d.data() as OrgMember).sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt'));
}

/** Creates an organization with its owner as the first member (and the audit entries), all or nothing. */
export async function createOrganization(org: Organization, owner: OrgMember): Promise<void> {
  const problems = [...organizationProblems(org), ...memberProblems(owner)];
  if (owner.uid !== org.ownerUid || owner.role !== 'owner') problems.push('o primeiro membro tem de ser o dono');
  if (problems.length) throw new Error(`Organização inválida: ${problems.join(', ')}`);
  const batch = writeBatch(db);
  batch.set(orgRef(org.id), plain(org));
  batch.set(memberRef(org.id, owner.uid), plain(owner));
  const audit: OrgAuditEntry[] = [
    { action: 'org.created', actorUid: owner.uid, at: org.createdAt, details: { type: org.type } },
    { action: 'member.added', actorUid: owner.uid, targetUid: owner.uid, at: org.createdAt, details: { role: 'owner' } }
  ];
  audit.forEach((a) => batch.set(newAuditRef(org.id), plain(a)));
  await batch.commit();
}

/** Adds a member or replaces it (same uid = same document: running it twice does not duplicate). */
export async function putMember(orgId: string, member: OrgMember, actorUid: string, now: number): Promise<void> {
  const problems = memberProblems(member);
  if (problems.length) throw new Error(`Membro inválido: ${problems.join(', ')}`);
  const batch = writeBatch(db);
  batch.set(memberRef(orgId, member.uid), plain(member));
  batch.set(
    newAuditRef(orgId),
    plain<OrgAuditEntry>({
      action: 'member.added',
      actorUid,
      targetUid: member.uid,
      at: now,
      details: { role: member.role, teams: member.teamIds.join(',') }
    })
  );
  await batch.commit();
}

/** Changes the role or the teams of a member, with its audit entry. */
export async function updateMemberAccess(
  orgId: string,
  current: OrgMember,
  change: { role?: OrgRole; teamIds?: string[] },
  actorUid: string,
  now: number
): Promise<OrgMember> {
  const next: OrgMember = { ...current, ...(change.role ? { role: change.role } : {}) };
  if (change.teamIds) next.teamIds = change.teamIds;
  const problems = memberProblems(next);
  if (problems.length) throw new Error(`Membro inválido: ${problems.join(', ')}`);
  const batch = writeBatch(db);
  batch.set(memberRef(orgId, next.uid), plain(next));
  if (change.role && change.role !== current.role) {
    batch.set(
      newAuditRef(orgId),
      plain<OrgAuditEntry>({
        action: 'member.role',
        actorUid,
        targetUid: next.uid,
        at: now,
        details: { from: current.role, to: change.role }
      })
    );
  }
  if (change.teamIds) {
    batch.set(
      newAuditRef(orgId),
      plain<OrgAuditEntry>({
        action: 'member.teams',
        actorUid,
        targetUid: next.uid,
        at: now,
        details: { from: current.teamIds.join(','), to: next.teamIds.join(',') }
      })
    );
  }
  await batch.commit();
  return next;
}

/** Suspends, revokes or reactivates a member, with its audit entry. */
export async function setMemberStatus(
  orgId: string,
  current: OrgMember,
  status: MemberStatus,
  actorUid: string,
  now: number
): Promise<OrgMember> {
  const next = withMemberStatus(current, status, actorUid, now);
  const batch = writeBatch(db);
  batch.set(memberRef(orgId, next.uid), plain(next));
  batch.set(
    newAuditRef(orgId),
    plain<OrgAuditEntry>({
      action: 'member.status',
      actorUid,
      targetUid: next.uid,
      at: now,
      details: { from: current.status, to: status }
    })
  );
  await batch.commit();
  return next;
}

/**
 * F1.5 — The organization this account works in, confirmed by its membership (active member of an approved
 * organization). Candidates: the one in use on this device and the account's default one. Returns null when there
 * is none (e.g. before the migration of "main"): the app then keeps the old rule. Never throws: a refused or failed
 * read (rules not published yet, offline) just means "no organization confirmed".
 */
export async function resolveOrganizationForAccount(
  uid: string,
  candidates: Array<string | null | undefined>,
  savedOrgId?: string | null
): Promise<string | null> {
  return (await resolveMembershipForAccount(uid, candidates, savedOrgId))?.orgId ?? null;
}

/** F2.2 — Like resolveOrganizationForAccount, with the membership (role and teams) of that organization. */
export async function resolveMembershipForAccount(
  uid: string,
  candidates: Array<string | null | undefined>,
  savedOrgId?: string | null
): Promise<{ orgId: string; member: OrgMember } | null> {
  const r = await checkMembershipForAccount(uid, candidates, savedOrgId);
  return r.uncertain ? null : r.membership;
}

/**
 * F2.6 — Like resolveMembershipForAccount, saying when the answer is UNCERTAIN (no network, server unavailable): an
 * access is only taken as lost when the cloud really answered (membership revoked, suspended or gone).
 */
export async function checkMembershipForAccount(
  uid: string,
  candidates: Array<string | null | undefined>,
  savedOrgId?: string | null
): Promise<{ membership: { orgId: string; member: OrgMember } | null; uncertain: boolean }> {
  let uncertain = false;
  const ids = [...new Set(candidates.filter((c): c is string => typeof c === 'string' && c.trim().length > 0))];
  const memberships: Array<{ orgId: string; member: OrgMember; org?: Pick<Organization, 'status'> }> = [];
  for (const orgId of ids) {
    try {
      const member = await getMember(orgId, uid);
      if (!member) continue;
      const org = await getOrganization(orgId);
      if (!org || org.status !== 'active') continue;
      memberships.push({ orgId, member, org });
    } catch (err) {
      // Refused (not a member, rules): a real answer. Anything else (offline…): the answer is not known
      if ((err as { code?: string })?.code !== 'permission-denied') uncertain = true;
    }
  }
  const orgId = chooseActiveOrg(memberships, savedOrgId);
  const chosen = memberships.find((m) => m.orgId === orgId);
  return { membership: chosen ? { orgId: chosen.orgId, member: chosen.member } : null, uncertain };
}
