/**
 * F1.2 — Organizations and members (pure logic, no Firestore here; reading and writing is in
 * services/organizations.ts). Not used by the screens yet: the rules that let anyone write these collections
 * come in F1.3, and the app starts reading them in M3.
 *
 * organizations/{orgId}                 the club or the individual coach (small: metadata only)
 * organizations/{orgId}/members/{uid}   who has access, with which role and which teams (source of truth)
 * organizations/{orgId}/audit/{id}      what was done (only appended; never edited nor deleted)
 *
 * The club's data stays where it is: club_workspace/{orgId}/records/…
 */

export type OrganizationType = 'individual' | 'club';
export type OrganizationStatus = 'pending' | 'active' | 'suspended';
export type OrgRole = 'owner' | 'admin' | 'diretor' | 'coordenador' | 'treinador' | 'adjunto' | 'staff';
export type MemberStatus = 'active' | 'suspended' | 'revoked';

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  shortName?: string;
  logoUrl?: string;
  status: OrganizationStatus;
  ownerUid: string;
  createdAt: number;
  createdBy: string;
  /** Reserved for a later phase (no payments now). */
  plan: null;
}

export interface OrgMember {
  uid: string;
  displayName: string;
  email: string;
  role: OrgRole;
  /** ['*'] = every team of the organization; otherwise the team ids (F1 stores it; F2 enforces it). */
  teamIds: string[];
  status: MemberStatus;
  addedBy: string;
  addedAt: number;
  revokedAt?: number;
  revokedBy?: string;
}

export type OrgAuditAction =
  'org.created' | 'org.status' | 'member.added' | 'member.role' | 'member.teams' | 'member.status';

export interface OrgAuditEntry {
  action: OrgAuditAction;
  actorUid: string;
  targetUid?: string;
  teamId?: string;
  at: number;
  details?: Record<string, string | number | boolean | null>;
}

/** From the most to the least powerful. */
export const ORG_ROLES: OrgRole[] = ['owner', 'admin', 'diretor', 'coordenador', 'treinador', 'adjunto', 'staff'];
export const ALL_TEAMS = '*';

/** Bigger = more power. */
export const roleRank = (role: OrgRole): number => ORG_ROLES.length - ORG_ROLES.indexOf(role);

/** Only the owner, an admin or a coordinator invite; never for a role above their own. Nobody invites an owner. */
export function canInvite(inviter: OrgRole, invited: OrgRole): boolean {
  if (!['owner', 'admin', 'coordenador'].includes(inviter)) return false;
  if (invited === 'owner') return false;
  return roleRank(invited) <= roleRank(inviter);
}

/** Who manages the members (approve, change role or teams, suspend, revoke). */
export const canManageMembers = (role: OrgRole): boolean => role === 'owner' || role === 'admin';

/** Today's roles in the accounts (users/{uid}.account.role) → the organization's roles. */
export function orgRoleFromLegacy(role: string | undefined, isOwner = false): OrgRole {
  if (isOwner) return 'owner';
  switch (role) {
    case 'Administrador':
      return 'admin';
    case 'Diretor':
    case 'Diretor Desportivo':
      return 'diretor';
    case 'Coordenador Técnico':
      return 'coordenador';
    case 'Treinador Principal':
      return 'treinador';
    case 'Treinador Adjunto':
      return 'adjunto';
    default:
      return 'staff';
  }
}

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const isText = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** Problems with an organization (empty = valid). The F1.3 rules will check the same. */
export function organizationProblems(org: Organization): string[] {
  const p: string[] = [];
  if (!SAFE_ID.test(org.id)) p.push('id inválido');
  if (!['individual', 'club'].includes(org.type)) p.push('tipo inválido');
  if (!isText(org.name, 120)) p.push('nome em falta ou demasiado longo');
  if (org.shortName !== undefined && !isText(org.shortName, 40)) p.push('nome curto inválido');
  if (!['pending', 'active', 'suspended'].includes(org.status)) p.push('estado inválido');
  if (!SAFE_ID.test(org.ownerUid)) p.push('dono inválido');
  if (!SAFE_ID.test(org.createdBy)) p.push('criador inválido');
  if (!(org.createdAt > 0)) p.push('data de criação inválida');
  if (org.plan !== null) p.push('plano reservado (tem de ser null)');
  return p;
}

/** Problems with a member (empty = valid). */
export function memberProblems(m: OrgMember): string[] {
  const p: string[] = [];
  if (!SAFE_ID.test(m.uid)) p.push('uid inválido');
  if (typeof m.displayName !== 'string' || m.displayName.length > 120) p.push('nome inválido');
  if (typeof m.email !== 'string' || m.email.length > 254) p.push('email inválido');
  if (!ORG_ROLES.includes(m.role)) p.push('papel inválido');
  if (!Array.isArray(m.teamIds) || m.teamIds.length === 0 || m.teamIds.length > 50) p.push('equipas inválidas');
  else if (m.teamIds.includes(ALL_TEAMS) && m.teamIds.length > 1) p.push("'*' não se junta a outras equipas");
  else if (m.teamIds.some((t) => t !== ALL_TEAMS && !SAFE_ID.test(t))) p.push('id de equipa inválido');
  if (!['active', 'suspended', 'revoked'].includes(m.status)) p.push('estado inválido');
  if (m.status === 'revoked' && !(m.revokedAt && m.revokedBy)) p.push('revogação sem data ou autor');
  if (!SAFE_ID.test(m.addedBy) || !(m.addedAt > 0)) p.push('autor ou data em falta');
  return p;
}

/** A new organization waiting for approval (manual approval during the pilot), owned by whoever creates it. */
/** F1.7: the id of the own space of who registers without an invitation (one per account; never "main"). */
export const ownSpaceIdOf = (uid: string): string => `org-${uid}`;

export function newOrganization(input: {
  id: string;
  type: OrganizationType;
  name: string;
  ownerUid: string;
  now: number;
  shortName?: string;
}): Organization {
  return {
    id: input.id,
    type: input.type,
    name: input.name.trim(),
    ...(input.shortName ? { shortName: input.shortName.trim() } : {}),
    status: 'pending',
    ownerUid: input.ownerUid,
    createdAt: input.now,
    createdBy: input.ownerUid,
    plan: null
  };
}

export function newMember(input: {
  uid: string;
  displayName: string;
  email: string;
  role: OrgRole;
  teamIds: string[];
  addedBy: string;
  now: number;
}): OrgMember {
  const teams = [...new Set(input.teamIds)];
  return {
    uid: input.uid,
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    teamIds: teams.includes(ALL_TEAMS) || teams.length === 0 ? [ALL_TEAMS] : teams.sort(),
    status: 'active',
    addedBy: input.addedBy,
    addedAt: input.now
  };
}

/** A member with a new status (revoking keeps who and when). */
export function withMemberStatus(m: OrgMember, status: MemberStatus, actorUid: string, now: number): OrgMember {
  const next: OrgMember = { ...m, status };
  if (status === 'revoked') {
    next.revokedAt = now;
    next.revokedBy = actorUid;
  } else {
    delete next.revokedAt;
    delete next.revokedBy;
  }
  return next;
}

/** F1.7a: the membership of who registers with an invitation: the invitation's club, team and role (the rules check
 *  the same against the invitation). */
export function memberFromInvitation(input: {
  uid: string;
  name: string;
  email: string;
  invitation: { role: string; teamId: string };
  now: number;
}): OrgMember {
  return {
    uid: input.uid,
    displayName: (input.name || input.email || input.uid).slice(0, 120),
    email: (input.email || '').slice(0, 254),
    role: orgRoleFromLegacy(input.invitation.role),
    teamIds: [input.invitation.teamId],
    status: 'active',
    addedBy: input.uid,
    addedAt: input.now
  };
}

/** A member made from today's account (for the migration of "main", M2): the legacy teams and role. */
export function memberFromLegacyAccount(
  account: { id: string; name?: string; email?: string; role?: string; assignedTeams?: string[] },
  input: { ownerUid: string; addedBy: string; now: number }
): OrgMember {
  const teams = (account.assignedTeams || []).filter(Boolean);
  return newMember({
    uid: account.id,
    displayName: account.name || '',
    email: account.email || '',
    role: orgRoleFromLegacy(account.role, account.id === input.ownerUid),
    teamIds: teams.includes('all') ? [ALL_TEAMS] : teams,
    addedBy: input.addedBy,
    now: input.now
  });
}

/** Whether the member works with this team (status and teams; the F2 rules will enforce the same). */
export function memberCanSeeTeam(m: OrgMember | null | undefined, teamId: string): boolean {
  if (!m || m.status !== 'active') return false;
  return m.teamIds.includes(ALL_TEAMS) || m.teamIds.includes(teamId);
}

/** The organization to open: the saved one if still active for this person, otherwise the first active one. */
export function chooseActiveOrg(
  memberships: Array<{ orgId: string; member: OrgMember; org?: Pick<Organization, 'status'> }>,
  savedOrgId?: string | null
): string | null {
  const usable = memberships.filter((x) => x.member.status === 'active' && x.org?.status !== 'suspended');
  if (savedOrgId && usable.some((x) => x.orgId === savedOrgId)) return savedOrgId;
  return usable.sort((a, b) => a.orgId.localeCompare(b.orgId))[0]?.orgId ?? null;
}

/** The device cache is always per account AND organization (never shared between the two). */
export const orgCacheKey = (uid: string, orgId: string) => `bcv-org-cache:${uid}:${orgId}`;
