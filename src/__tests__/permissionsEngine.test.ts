import { describe, it, expect } from 'vitest';
import {
  canAccessClub,
  canAccessTeam,
  hasPermission,
  getUserAccessibleTeams,
  isAdminAccount,
  resolveTeamContext,
  isActiveTeamRevoked
} from '../lib/permissionsEngine';
import { UserAccount, SquadProfile } from '../types';
import { MASTER_ADMIN_EMAIL } from '../lib/constants';

describe('permissionsEngine & Multi-Tenant Security Scenarios', () => {
  const CLUB_A = 'club_a';
  const CLUB_B = 'club_b';

  const mockTeams: SquadProfile[] = [
    {
      id: 'team_sub11',
      clubName: 'FC Porto Salvo',
      category: 'Sub-11',
      season: '2025/2026',
      createdAt: '',
      roster: [],
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: 11
    },
    {
      id: 'team_infantis',
      clubName: 'FC Porto Salvo',
      category: 'Infantis',
      season: '2025/2026',
      createdAt: '',
      roster: [],
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: 11
    },
    {
      id: 'team_sub13',
      clubName: 'FC Porto Salvo',
      category: 'Sub-13',
      season: '2025/2026',
      createdAt: '',
      roster: [],
      matches: [],
      trainings: [],
      schedule: [],
      tactics: [],
      tacticFormat: 11
    }
  ];

  const adminUser: UserAccount = {
    id: 'admin',
    username: 'admin',
    name: 'Administrador Geral',
    email: MASTER_ADMIN_EMAIL,
    role: 'Administrador',
    status: 'approved',
    clubId: CLUB_A,
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const coachX: UserAccount = {
    id: 'coachx',
    username: 'coachx',
    name: 'Treinador X',
    email: 'coachx@test.com',
    role: 'Treinador Principal',
    status: 'approved',
    clubId: CLUB_A,
    assignedTeams: ['team_sub11'],
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const coachY: UserAccount = {
    id: 'coachy',
    username: 'coachy',
    name: 'Treinador Y',
    email: 'coachy@test.com',
    role: 'Treinador Principal',
    status: 'approved',
    clubId: CLUB_A,
    assignedTeams: ['team_infantis'],
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const coachZ: UserAccount = {
    id: 'coachz',
    username: 'coachz',
    name: 'Treinador Z (Sem Equipa)',
    email: 'coachz@test.com',
    role: 'Treinador Principal',
    status: 'approved',
    clubId: CLUB_A,
    assignedTeams: [],
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const pendingUser: UserAccount = {
    id: 'pendente',
    username: 'pendente',
    name: 'Utilizador Pendente',
    email: 'pendente@test.com',
    role: 'Treinador Principal',
    status: 'pending',
    clubId: CLUB_A,
    assignedTeams: ['team_sub11'], // even if set, pending status denies all
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  describe('10 Cenários de Segurança Obrigatórios (Spec Compliance)', () => {
    it('Cenário 1 — Treinador X lê Sub-11 → PERMITIDO', () => {
      expect(canAccessTeam(coachX, 'team_sub11', CLUB_A)).toBe(true);
      expect(hasPermission(coachX, 'view_team_data', 'team_sub11', CLUB_A)).toBe(true);
    });

    it('Cenário 2 — Treinador X lê Infantis → BLOQUEADO', () => {
      expect(canAccessTeam(coachX, 'team_infantis', CLUB_A)).toBe(false);
      expect(hasPermission(coachX, 'view_team_data', 'team_infantis', CLUB_A)).toBe(false);
    });

    it('Cenário 3 — Treinador X tenta escrever em Infantis → BLOQUEADO', () => {
      expect(hasPermission(coachX, 'manage_squad', 'team_infantis', CLUB_A)).toBe(false);
      expect(hasPermission(coachX, 'manage_matches', 'team_infantis', CLUB_A)).toBe(false);
      expect(hasPermission(coachX, 'manage_trainings', 'team_infantis', CLUB_A)).toBe(false);
      expect(hasPermission(coachX, 'export_reports', 'team_infantis', CLUB_A)).toBe(false);
    });

    it('Cenário 4 — Treinador X tenta alterar teamIds → BLOQUEADO', () => {
      expect(hasPermission(coachX, 'manage_users')).toBe(false);
      expect(hasPermission(coachX, 'manage_club')).toBe(false);
    });

    it('Cenário 5 — Treinador X tenta tornar-se admin → BLOQUEADO', () => {
      expect(isAdminAccount(coachX)).toBe(false);
      expect(hasPermission(coachX, 'manage_users')).toBe(false);
    });

    it('Cenário 6 — Treinador X altera manualmente o teamId no frontend → BLOQUEADO', () => {
      // If client attempts to query or switch to team_sub13 or team_infantis
      expect(canAccessTeam(coachX, 'team_sub13', CLUB_A)).toBe(false);
      expect(isActiveTeamRevoked(coachX, 'team_sub13', mockTeams)).toBe(true);
      expect(isActiveTeamRevoked(coachX, 'team_infantis', mockTeams)).toBe(true);
      expect(isActiveTeamRevoked(coachX, 'team_sub11', mockTeams)).toBe(false);
    });

    it('Cenário 7 — Utilizador pendente tenta entrar numa equipa → BLOQUEADO', () => {
      expect(canAccessTeam(pendingUser, 'team_sub11', CLUB_A)).toBe(false);
      expect(canAccessClub(pendingUser, CLUB_A)).toBe(false);
      expect(getUserAccessibleTeams(pendingUser, mockTeams)).toEqual([]);
      expect(resolveTeamContext(pendingUser, mockTeams)).toBe('');
    });

    it('Cenário 8 — Administrador consulta Sub-11 → PERMITIDO', () => {
      expect(canAccessTeam(adminUser, 'team_sub11', CLUB_A)).toBe(true);
      expect(hasPermission(adminUser, 'view_team_data', 'team_sub11', CLUB_A)).toBe(true);
      expect(hasPermission(adminUser, 'manage_squad', 'team_sub11', CLUB_A)).toBe(true);
    });

    it('Cenário 9 — Administrador consulta Infantis → PERMITIDO', () => {
      expect(canAccessTeam(adminUser, 'team_infantis', CLUB_A)).toBe(true);
      expect(hasPermission(adminUser, 'view_team_data', 'team_infantis', CLUB_A)).toBe(true);
      expect(hasPermission(adminUser, 'manage_squad', 'team_infantis', CLUB_A)).toBe(true);
    });

    it('Cenário 10 — Treinador Y tenta aceder à Sub-11 → BLOQUEADO', () => {
      expect(canAccessTeam(coachY, 'team_sub11', CLUB_A)).toBe(false);
      expect(hasPermission(coachY, 'view_team_data', 'team_sub11', CLUB_A)).toBe(false);
      expect(hasPermission(coachY, 'manage_squad', 'team_sub11', CLUB_A)).toBe(false);
      // But Coach Y has access to Infantis:
      expect(canAccessTeam(coachY, 'team_infantis', CLUB_A)).toBe(true);
    });
  });

  describe('Multi-Tenant Access Matrix & Context Resolution', () => {
    it('Treinador Z (sem equipas) não tem acesso a nenhuma equipa', () => {
      expect(getUserAccessibleTeams(coachZ, mockTeams)).toEqual([]);
      expect(canAccessTeam(coachZ, 'team_sub11', CLUB_A)).toBe(false);
      expect(canAccessTeam(coachZ, 'team_infantis', CLUB_A)).toBe(false);
      expect(resolveTeamContext(coachZ, mockTeams)).toBe('');
    });

    it('Treinador X com 1 equipa auto-seleciona diretamente essa equipa', () => {
      const accessible = getUserAccessibleTeams(coachX, mockTeams);
      expect(accessible.length).toBe(1);
      expect(accessible[0].id).toBe('team_sub11');
      expect(resolveTeamContext(coachX, mockTeams)).toBe('team_sub11');
    });

    it('Administrador vê todas as equipas', () => {
      const accessible = getUserAccessibleTeams(adminUser, mockTeams);
      expect(accessible.length).toBe(3);
      expect(accessible.map((t) => t.id)).toEqual(['team_sub11', 'team_infantis', 'team_sub13']);
    });

    it('Multi-Clube: Utilizador de clube diferente não pode aceder a equipas de outro clube', () => {
      const coachForeign: UserAccount = {
        ...coachX,
        id: 'foreign-coach',
        clubId: CLUB_B,
        assignedTeams: ['team_sub11']
      };
      expect(canAccessClub(coachForeign, CLUB_A)).toBe(false);
      expect(canAccessTeam(coachForeign, 'team_sub11', CLUB_A)).toBe(false);
    });
  });
});
