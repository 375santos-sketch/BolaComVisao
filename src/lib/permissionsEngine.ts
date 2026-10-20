import { UserAccount, UserClubRole, SquadProfile } from '../types';
import { isStrictAdminEmail } from '../services/cloudAuthService';
import { MASTER_ADMIN_USERNAME } from './constants';

export type PermissionAction =
  | 'manage_club' // Criar/eliminar equipas, gerir épocas, configurações globais
  | 'manage_users' // Aprovar/suspender utilizadores, alterar funções globais
  | 'view_audit_logs' // Consultar histórico de auditoria
  | 'view_board_reports' // Aceder ao dashboard da direção e relatórios consolidados
  | 'compare_teams' // Comparar métricas entre diferentes escalões
  | 'manage_squad' // Criar, editar, eliminar jogadores do plantel
  | 'manage_matches' // Criar jogos, alterar convocatórias, gerir cronómetro e eventos
  | 'manage_tactics' // Criar e editar prancha tática e scouting
  | 'manage_trainings' // Criar e editar treinos
  | 'record_attendance' // Registar presenças/faltas nos treinos
  | 'view_team_data' // Consultar dados da equipa
  | 'export_reports' // Exportar PDF / Excel
  | 'view_team_database' // Consultar base de dados da equipa (Excel)
  | 'manage_team_database'; // Importar, editar, adicionar/apagar dados da base de dados da equipa

/**
 * Validates Club-level multi-tenant isolation
 * User -> Club
 */
export function canAccessClub(user: UserAccount | null | undefined, targetClubId?: string): boolean {
  if (!user || user.status !== 'approved') return false;

  const userEmail = (user.email || '').toLowerCase().trim();
  if (isStrictAdminEmail(userEmail) || user.role === 'Administrador' || user.username === MASTER_ADMIN_USERNAME) {
    return true;
  }

  // If no targetClubId is specified or user has no specific club isolation, allow within default club
  if (!targetClubId || !user.clubId) {
    return true;
  }

  return user.clubId === targetClubId;
}

/**
 * Validates Team-level multi-tenant isolation
 * User -> Club -> Team
 * Administrators have access to ALL teams.
 * Regular coaches only have access to their assigned teams (e.g. Sub-11, Infantis).
 */
export function canAccessTeam(user: UserAccount | null | undefined, teamId?: string, targetClubId?: string): boolean {
  if (!user || user.status !== 'approved') return false;

  // 1. Verify Club Isolation first
  if (!canAccessClub(user, targetClubId)) {
    return false;
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  // Administrator has unrestricted access to all teams
  if (isStrictAdminEmail(userEmail) || user.role === 'Administrador' || user.username === MASTER_ADMIN_USERNAME) {
    return true;
  }

  // Director has access to all teams within their club
  if (user.role === 'Diretor') {
    return true;
  }

  // If assigned teams is explicitly set to 'all'
  if (user.assignedTeams && user.assignedTeams.includes('all')) {
    return true;
  }

  // 2. If no specific team is queried, check if user has access to at least one team
  if (!teamId) {
    return Boolean(
      (user.assignedTeams && user.assignedTeams.length > 0) || (user.teamRoles && user.teamRoles.length > 0)
    );
  }

  // 3. Check assigned teams list
  if (user.assignedTeams && user.assignedTeams.length > 0) {
    if (user.assignedTeams.includes(teamId)) {
      return true;
    }
  }

  // 4. Check granular team roles
  if (user.teamRoles && user.teamRoles.some((tr) => tr.teamId === teamId)) {
    return true;
  }

  return false;
}

/**
 * Returns the list of teams from `teams` that the user has permission to access.
 * Administrators receive all teams. Coaches receive only their assigned team(s).
 */
export function getUserAccessibleTeams(
  user: UserAccount | null | undefined,
  teams: SquadProfile[] = []
): SquadProfile[] {
  if (!user || user.status !== 'approved') return [];

  const userEmail = (user.email || '').toLowerCase().trim();
  if (
    isStrictAdminEmail(userEmail) ||
    user.role === 'Administrador' ||
    user.username === MASTER_ADMIN_USERNAME ||
    (user.assignedTeams && user.assignedTeams.includes('all'))
  ) {
    return teams;
  }

  return teams.filter((t) => canAccessTeam(user, t.id, user.clubId));
}

/**
 * Gets effective role of a user for a specific team context
 * User -> Club -> Team -> Role
 */
export function getEffectiveTeamRole(
  user: UserAccount | null | undefined,
  teamId?: string,
  targetClubId?: string
): UserClubRole | string {
  if (!user || user.status !== 'approved') return 'Convidado';

  const userEmail = (user.email || '').toLowerCase().trim();
  if (isStrictAdminEmail(userEmail) || user.role === 'Administrador' || user.username === MASTER_ADMIN_USERNAME) {
    return 'Administrador';
  }

  if (!canAccessTeam(user, teamId, targetClubId)) {
    return 'Sem Acesso';
  }

  // Check granular team assignment
  if (teamId && user.teamRoles && user.teamRoles.length > 0) {
    const specific = user.teamRoles.find((tr) => tr.teamId === teamId);
    if (specific) {
      return specific.role;
    }
  }

  return user.role || 'Treinador Principal';
}

/**
 * Validates whether the user has permission to perform an action within a team/club context
 * User -> Club -> Team -> Action Permission
 */
export function hasPermission(
  user: UserAccount | null | undefined,
  action: PermissionAction,
  teamId?: string,
  targetClubId?: string
): boolean {
  if (!user || user.status !== 'approved') return false;

  // Verify Team access first
  if (!canAccessTeam(user, teamId, targetClubId)) {
    return false;
  }

  const role = getEffectiveTeamRole(user, teamId, targetClubId);

  // 1. Administrador has full access to everything
  if (role === 'Administrador') {
    return true;
  }

  // 2. Diretor / Coordenador
  if (role === 'Diretor' || user.role === 'Diretor') {
    switch (action) {
      case 'view_board_reports':
      case 'compare_teams':
      case 'view_audit_logs':
      case 'view_team_data':
      case 'export_reports':
      case 'manage_trainings':
      case 'record_attendance':
      case 'view_team_database':
        return true;
      case 'manage_club':
      case 'manage_users':
      case 'manage_squad':
      case 'manage_matches':
      case 'manage_tactics':
      case 'manage_team_database':
        return false;
    }
  }

  // 3. Treinador Principal
  if (role === 'Treinador Principal') {
    switch (action) {
      case 'manage_squad':
      case 'manage_matches':
      case 'manage_tactics':
      case 'manage_trainings':
      case 'record_attendance':
      case 'view_team_data':
      case 'export_reports':
      case 'view_team_database':
      case 'manage_team_database':
        return true;
      case 'view_board_reports':
      case 'compare_teams':
      case 'view_audit_logs':
      case 'manage_club':
      case 'manage_users':
        return false;
    }
  }

  // 4. Treinador Adjunto
  if (role === 'Treinador Adjunto') {
    switch (action) {
      case 'record_attendance':
      case 'view_team_data':
      case 'export_reports':
      case 'manage_trainings':
      case 'manage_matches':
      case 'view_team_database':
      case 'manage_team_database':
        return true;
      case 'manage_squad':
      case 'manage_tactics':
      case 'view_board_reports':
      case 'compare_teams':
      case 'view_audit_logs':
      case 'manage_club':
      case 'manage_users':
        return false;
    }
  }

  // 5. Treinador de Guarda-Redes / Preparador Físico / Analista / Fisioterapeuta
  if (
    role === 'Treinador de Guarda-Redes' ||
    role === 'Preparador Físico' ||
    role === 'Analista' ||
    role === 'Fisioterapeuta'
  ) {
    switch (action) {
      case 'record_attendance':
      case 'view_team_data':
      case 'export_reports':
      case 'view_team_database':
        return true;
      default:
        return false;
    }
  }

  return false;
}

/**
 * Checks if a user has read access to a specific team's database.
 * Requirement: Any approved member of the team (or Administrator).
 */
export function canViewTeamDatabase(
  user: UserAccount | null | undefined,
  teamId?: string,
  targetClubId?: string
): boolean {
  return canAccessTeam(user, teamId, targetClubId);
}

/**
 * Checks if a user has edit/import/delete access to a specific team's database.
 * Requirement: Administrador, Treinador Principal, or Treinador Adjunto.
 */
export function canManageTeamDatabase(
  user: UserAccount | null | undefined,
  teamId?: string,
  targetClubId?: string
): boolean {
  if (!user || user.status !== 'approved') return false;
  if (!canAccessTeam(user, teamId, targetClubId)) return false;

  const role = getEffectiveTeamRole(user, teamId, targetClubId);
  return role === 'Administrador' || role === 'Treinador Principal' || role === 'Treinador Adjunto';
}

/**
 * Checks if user is an Administrator account
 */
export function isAdminAccount(user: UserAccount | null | undefined): boolean {
  if (!user || user.status !== 'approved') return false;
  const userEmail = (user.email || '').toLowerCase().trim();
  return isStrictAdminEmail(userEmail) || user.role === 'Administrador' || user.username === MASTER_ADMIN_USERNAME;
}

/**
 * Checks if user is eligible to see the Director / Board workspace
 */
export function canAccessBoardReports(user: UserAccount | null | undefined): boolean {
  if (!user || user.status !== 'approved') return false;
  const userEmail = (user.email || '').toLowerCase().trim();
  if (isStrictAdminEmail(userEmail) || user.role === 'Administrador' || user.role === 'Diretor') {
    return true;
  }
  return false;
}

/**
 * Resolves active team context based on user authorizations:
 * - Administrator: keeps selected team or defaults to first available
 * - Coach with 1 assigned team: auto-selects that team
 * - Coach with multiple assigned teams: keeps current if allowed, or defaults to first allowed
 * - Coach with 0 assigned teams: returns empty string (shows no-team state)
 */
export function resolveTeamContext(
  user: UserAccount | null | undefined,
  teams: SquadProfile[] = [],
  currentActiveTeamId?: string
): string {
  if (!user || user.status !== 'approved') return '';
  const accessible = getUserAccessibleTeams(user, teams);
  if (accessible.length === 0) return '';

  if (isAdminAccount(user)) {
    if (currentActiveTeamId && accessible.some((t) => t.id === currentActiveTeamId)) {
      return currentActiveTeamId;
    }
    return accessible[0]?.id || '';
  }

  // Regular coach
  if (accessible.length === 1) {
    return accessible[0].id;
  }

  if (currentActiveTeamId && accessible.some((t) => t.id === currentActiveTeamId)) {
    return currentActiveTeamId;
  }

  return accessible[0]?.id || '';
}

/**
 * Checks if the currently active team is no longer accessible to the user
 */
export function isActiveTeamRevoked(
  user: UserAccount | null | undefined,
  activeTeamId?: string,
  teams: SquadProfile[] = []
): boolean {
  if (!user || !activeTeamId) return false;
  if (isAdminAccount(user)) return false;
  const accessible = getUserAccessibleTeams(user, teams);
  return !accessible.some((t) => t.id === activeTeamId);
}
