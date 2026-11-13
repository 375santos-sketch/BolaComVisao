/**
 * F1.8 — Migration M2 of "main" (plan F1, section 6.3): create the organization "main" and its members from the
 * accounts the platform Administrator chooses. It ONLY ADDS documents: the club data (club_workspace/main) is not
 * touched, and running it twice gives the same result (deterministic ids).
 *
 * Pure planning here; writing and checking is in services/mainMigration.ts. BLOCKED in production until F2 is done
 * and validated and the empty accounts are decided (see MAIN_MIGRATION_ENABLED in the service).
 */
import {
  OrgAuditEntry,
  OrgMember,
  Organization,
  memberFromLegacyAccount,
  memberProblems,
  organizationProblems
} from './organizations';

export const MAIN_ORG_ID = 'main';

/** What the Administrator decides for each account. */
export type MigrationChoice = 'membro' | 'fora';

/** An account as read from users/{uid} (only what the migration needs). */
export interface MigrationAccount {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  assignedTeams: string[];
  /** The account has no account data (an empty or old-format document): it can never be made a member. */
  empty: boolean;
}

export interface MigrationPlan {
  org: Organization;
  members: OrgMember[];
  /** users/{uid}.account.defaultOrgId to write for each member. */
  defaultOrgFor: string[];
  /** One entry per member created (deterministic ids: running twice does not duplicate). */
  audit: Array<{ id: string; entry: OrgAuditEntry }>;
  /** Accounts left out, with the reason (shown to the Administrator). */
  leftOut: Array<{ uid: string; reason: string }>;
  problems: string[];
}

/** users/{uid} documents → accounts for the migration screen. */
export function migrationAccountsFrom(users: Array<{ id: string; data: Record<string, unknown> }>): MigrationAccount[] {
  return users
    .map(({ id, data }) => {
      const a = (data.account && typeof data.account === 'object' ? data.account : {}) as Record<string, unknown>;
      const text = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '');
      return {
        uid: id,
        name: text('name'),
        email: text('email'),
        role: text('role'),
        status: text('status'),
        assignedTeams: Array.isArray(a.assignedTeams)
          ? (a.assignedTeams as unknown[]).filter((t): t is string => typeof t === 'string')
          : [],
        empty: !text('role') && !text('status') && !text('email')
      };
    })
    .sort((x, y) => Number(x.empty) - Number(y.empty) || x.name.localeCompare(y.name, 'pt'));
}

/** The plan for the chosen accounts. `problems` must be empty before anything is written. */
export function planMainMigration(input: {
  orgName: string;
  ownerUid: string;
  actorUid: string;
  accounts: MigrationAccount[];
  choices: Record<string, MigrationChoice>;
  now: number;
}): MigrationPlan {
  const problems: string[] = [];
  const org: Organization = {
    id: MAIN_ORG_ID,
    type: 'club',
    name: input.orgName.trim(),
    status: 'active',
    ownerUid: input.ownerUid,
    createdAt: input.now,
    createdBy: input.actorUid,
    plan: null
  };
  problems.push(...organizationProblems(org));

  const members: OrgMember[] = [];
  const leftOut: MigrationPlan['leftOut'] = [];
  for (const a of input.accounts) {
    const choice = input.choices[a.uid] || 'fora';
    if (choice !== 'membro') {
      leftOut.push({ uid: a.uid, reason: a.empty ? 'documento sem dados de conta' : 'escolhida para ficar de fora' });
      continue;
    }
    if (a.empty) {
      problems.push(`${a.uid}: documento sem dados de conta não pode ser membro`);
      continue;
    }
    if (a.status !== 'approved') {
      problems.push(`${a.name || a.uid}: só contas aprovadas podem ser membros`);
      continue;
    }
    const m = memberFromLegacyAccount(
      { id: a.uid, name: a.name, email: a.email, role: a.role, assignedTeams: a.assignedTeams },
      { ownerUid: input.ownerUid, addedBy: input.actorUid, now: input.now }
    );
    const p = memberProblems(m);
    if (p.length) problems.push(`${a.name || a.uid}: ${p.join(', ')}`);
    else members.push(m);
  }
  if (!members.some((m) => m.uid === input.ownerUid && m.role === 'owner')) {
    problems.push('o dono do clube tem de estar entre os membros escolhidos');
  }

  return {
    org,
    members,
    defaultOrgFor: members.map((m) => m.uid),
    audit: members.map((m) => ({
      id: `migracao-m2-${m.uid}`,
      entry: {
        action: 'member.added',
        actorUid: input.actorUid,
        targetUid: m.uid,
        at: input.now,
        details: { role: m.role, teams: m.teamIds.join(','), via: 'migracao-m2' }
      }
    })),
    leftOut,
    problems
  };
}

/** Counts of the club records by kind (live and deleted): must be IDENTICAL before and after the migration. */
export function recordCountsByKind(records: Array<{ data: Record<string, unknown> }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of records) {
    const key = `${typeof r.data.kind === 'string' ? r.data.kind : '?'}${r.data.deleted === true ? ' (apagado)' : ''}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
