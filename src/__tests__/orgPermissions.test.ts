import { describe, expect, it } from 'vitest';
import { canEditClubSettings, invitableRoles, isReadOnlyRole } from '../lib/orgPermissions';

describe('F2.5 — permissões na app (iguais às regras, D1–D4)', () => {
  it('staff only reads; nobody else is read-only; without an organization nothing changes', () => {
    expect(isReadOnlyRole({ orgId: 'o', orgRole: 'staff' })).toBe(true);
    expect(isReadOnlyRole({ orgId: 'o', orgRole: 'treinador' })).toBe(false);
    expect(isReadOnlyRole({ orgRole: 'staff' })).toBe(false);
    expect(isReadOnlyRole(null)).toBe(false);
  });

  it("the club's settings only for owner and admin (and as today without an organization)", () => {
    expect(canEditClubSettings({ orgId: 'o', orgRole: 'owner' })).toBe(true);
    expect(canEditClubSettings({ orgId: 'o', orgRole: 'admin' })).toBe(true);
    expect(canEditClubSettings({ orgId: 'o', orgRole: 'diretor' })).toBe(false);
    expect(canEditClubSettings({ orgId: 'o', orgRole: 'coordenador' })).toBe(false);
    expect(canEditClubSettings(null)).toBe(true);
  });

  it('who invites whom (D3)', () => {
    expect(invitableRoles({ orgId: 'o', orgRole: 'coordenador' })).toEqual([
      'Treinador Principal',
      'Treinador Adjunto'
    ]);
    expect(invitableRoles({ orgId: 'o', orgRole: 'treinador' })).not.toContain('Treinador Principal');
    expect(invitableRoles({ orgId: 'o', orgRole: 'treinador' })).toContain('Treinador Adjunto');
    expect(invitableRoles({ orgId: 'o', orgRole: 'staff' })).toEqual([]);
    expect(invitableRoles({ orgId: 'o', orgRole: 'adjunto' })).toEqual([]);
    expect(invitableRoles({ orgId: 'o', orgRole: 'owner' })).not.toContain('Administrador');
  });
});
