import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_TEAMS,
  OrgMember,
  canInvite,
  canManageMembers,
  chooseActiveOrg,
  memberCanSeeTeam,
  memberFromLegacyAccount,
  memberProblems,
  newMember,
  newOrganization,
  orgCacheKey,
  orgRoleFromLegacy,
  organizationProblems,
  withMemberStatus
} from '../lib/organizations';

// Fictitious data, only for this test
const NOW = 1_800_000_000_000;
const member = (extra: Partial<OrgMember> = {}): OrgMember => ({
  ...newMember({
    uid: 'u2',
    displayName: 'Adulto Dois',
    email: 'Dois@Teste.pt',
    role: 'treinador',
    teamIds: ['sub11'],
    addedBy: 'u1',
    now: NOW
  }),
  ...extra
});

describe('F1.2 — organizações e membros (lógica)', () => {
  it('a new organization waits for approval and is owned by whoever creates it', () => {
    const org = newOrganization({ id: 'clubeA', type: 'club', name: ' Clube Teste ', ownerUid: 'u1', now: NOW });
    expect(org).toEqual({
      id: 'clubeA',
      type: 'club',
      name: 'Clube Teste',
      status: 'pending',
      ownerUid: 'u1',
      createdAt: NOW,
      createdBy: 'u1',
      plan: null
    });
    expect(organizationProblems(org)).toEqual([]);
    expect(organizationProblems({ ...org, id: 'com espaço', name: '', plan: 'pago' as never })).toEqual([
      'id inválido',
      'nome em falta ou demasiado longo',
      'plano reservado (tem de ser null)'
    ]);
  });

  it('members: email in lower case, teams sorted without repeats, "*" alone', () => {
    expect(member()).toMatchObject({ email: 'dois@teste.pt', teamIds: ['sub11'], status: 'active' });
    expect(newMember({ ...member(), teamIds: ['b', 'a', 'b'], addedBy: 'u1', now: NOW }).teamIds).toEqual(['a', 'b']);
    expect(newMember({ ...member(), teamIds: ['a', '*'], addedBy: 'u1', now: NOW }).teamIds).toEqual([ALL_TEAMS]);
    expect(newMember({ ...member(), teamIds: [], addedBy: 'u1', now: NOW }).teamIds).toEqual([ALL_TEAMS]);
    expect(memberProblems(member())).toEqual([]);
    expect(memberProblems(member({ teamIds: ['*', 'a'] }))).toContain("'*' não se junta a outras equipas");
    expect(memberProblems(member({ role: 'rei' as never }))).toContain('papel inválido');
    expect(memberProblems(member({ status: 'revoked' }))).toContain('revogação sem data ou autor');
  });

  it('invitations: only owner, admin or coordinator, never above their own role, never an owner', () => {
    expect(canInvite('owner', 'admin')).toBe(true);
    expect(canInvite('admin', 'admin')).toBe(true);
    expect(canInvite('coordenador', 'treinador')).toBe(true);
    expect(canInvite('coordenador', 'diretor')).toBe(false);
    expect(canInvite('treinador', 'adjunto')).toBe(false);
    expect(canInvite('owner', 'owner')).toBe(false);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('coordenador')).toBe(false);
  });

  it("today's account roles map to the organization's roles; the owner is the owner", () => {
    expect(orgRoleFromLegacy('Administrador')).toBe('admin');
    expect(orgRoleFromLegacy('Administrador', true)).toBe('owner');
    expect(orgRoleFromLegacy('Diretor Desportivo')).toBe('diretor');
    expect(orgRoleFromLegacy('Coordenador Técnico')).toBe('coordenador');
    expect(orgRoleFromLegacy('Treinador Principal')).toBe('treinador');
    expect(orgRoleFromLegacy('Treinador Adjunto')).toBe('adjunto');
    expect(orgRoleFromLegacy('Fisioterapeuta')).toBe('staff');
    expect(orgRoleFromLegacy(undefined)).toBe('staff');
  });

  it('a member from a legacy account keeps its teams ("all" becomes "*")', () => {
    const owner = memberFromLegacyAccount(
      { id: 'u1', name: 'Adulto Um', email: 'um@teste.pt', role: 'Administrador', assignedTeams: ['all'] },
      { ownerUid: 'u1', addedBy: 'migracao', now: NOW }
    );
    expect(owner).toMatchObject({ role: 'owner', teamIds: ['*'], addedBy: 'migracao' });
    const coach = memberFromLegacyAccount(
      { id: 'u3', name: 'Adulto Três', role: 'Treinador Principal', assignedTeams: ['5gdfweio'] },
      { ownerUid: 'u1', addedBy: 'migracao', now: NOW }
    );
    expect(coach).toMatchObject({ role: 'treinador', teamIds: ['5gdfweio'], email: '' });
  });

  it('revoking keeps who and when; reactivating clears it; only active members see a team', () => {
    const revoked = withMemberStatus(member(), 'revoked', 'u1', NOW + 1);
    expect(revoked).toMatchObject({ status: 'revoked', revokedAt: NOW + 1, revokedBy: 'u1' });
    expect(memberProblems(revoked)).toEqual([]);
    const back = withMemberStatus(revoked, 'active', 'u1', NOW + 2);
    expect(back.revokedAt).toBeUndefined();
    expect(memberCanSeeTeam(member(), 'sub11')).toBe(true);
    expect(memberCanSeeTeam(member(), 'sub13')).toBe(false);
    expect(memberCanSeeTeam(member({ teamIds: ['*'] }), 'sub13')).toBe(true);
    expect(memberCanSeeTeam(revoked, 'sub11')).toBe(false);
    expect(memberCanSeeTeam(null, 'sub11')).toBe(false);
  });

  it('the organization to open: the saved one if still usable, otherwise the first active one', () => {
    const active = member();
    const list = [
      { orgId: 'b', member: active, org: { status: 'active' as const } },
      { orgId: 'a', member: active, org: { status: 'suspended' as const } },
      { orgId: 'c', member: { ...active, status: 'revoked' as const } }
    ];
    expect(chooseActiveOrg(list, 'b')).toBe('b');
    expect(chooseActiveOrg(list, 'a')).toBe('b');
    expect(chooseActiveOrg(list, 'c')).toBe('b');
    expect(chooseActiveOrg([], 'x')).toBeNull();
    expect(orgCacheKey('u1', 'main')).toBe('bcv-org-cache:u1:main');
  });
});

// ---------- The Firestore service, with Firestore simulated ----------

const writes: Array<{ path: string; data: unknown }> = [];
let commits = 0;
vi.mock('../services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => {
  let n = 0;
  return {
    doc: (_db: unknown, ...parts: string[]) => {
      // doc(collectionRef) → a new auto id inside that collection
      if (parts.length === 0 && (_db as { path?: string }).path)
        return { path: `${(_db as { path: string }).path}/auto${++n}` };
      return { path: parts.join('/') };
    },
    collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: () => {
      const pending: Array<{ path: string; data: unknown }> = [];
      return {
        set: (ref: { path: string }, data: unknown) => pending.push({ path: ref.path, data }),
        commit: async () => {
          commits++;
          writes.push(...pending);
        }
      };
    }
  };
});

describe('F1.2 — serviço das organizações (Firestore simulado)', () => {
  beforeEach(() => {
    writes.length = 0;
    commits = 0;
  });

  it('creates the organization, its owner and the audit in ONE batch', async () => {
    const { createOrganization } = await import('../services/organizations');
    const org = newOrganization({ id: 'clubeA', type: 'club', name: 'Clube Teste', ownerUid: 'u1', now: NOW });
    const owner = newMember({
      uid: 'u1',
      displayName: 'Adulto Um',
      email: 'um@teste.pt',
      role: 'owner',
      teamIds: ['*'],
      addedBy: 'u1',
      now: NOW
    });
    await createOrganization(org, owner);
    expect(commits).toBe(1);
    expect(writes.map((w) => w.path)).toEqual([
      'organizations/clubeA',
      'organizations/clubeA/members/u1',
      'organizations/clubeA/audit/auto1',
      'organizations/clubeA/audit/auto2'
    ]);
    expect((writes[2].data as { action: string }).action).toBe('org.created');
  });

  it('refuses invalid data before writing anything', async () => {
    const { createOrganization, putMember } = await import('../services/organizations');
    const org = newOrganization({ id: 'clubeA', type: 'club', name: 'Clube Teste', ownerUid: 'u1', now: NOW });
    await expect(createOrganization(org, member())).rejects.toThrow(/dono/);
    await expect(putMember('clubeA', member({ teamIds: [] }), 'u1', NOW)).rejects.toThrow(/equipas/);
    expect(commits).toBe(0);
  });

  it('every member change goes with its audit entry (role, teams, status)', async () => {
    const { putMember, updateMemberAccess, setMemberStatus } = await import('../services/organizations');
    await putMember('clubeA', member(), 'u1', NOW);
    const changed = await updateMemberAccess('clubeA', member(), { role: 'adjunto', teamIds: ['sub9'] }, 'u1', NOW);
    expect(changed).toMatchObject({ role: 'adjunto', teamIds: ['sub9'] });
    const revoked = await setMemberStatus('clubeA', changed, 'revoked', 'u1', NOW);
    expect(revoked).toMatchObject({ status: 'revoked', revokedBy: 'u1' });
    expect(commits).toBe(3);
    const actions = writes.filter((w) => w.path.includes('/audit/')).map((w) => (w.data as { action: string }).action);
    expect(actions).toEqual(['member.added', 'member.role', 'member.teams', 'member.status']);
    expect(JSON.stringify(writes)).not.toContain('undefined');
  });
});
