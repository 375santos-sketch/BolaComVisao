import { AppState } from '../types';
import { normalizeClubState } from './storage';

/**
 * Club backups (JSON file kept by the Administrator). A backup holds every team with all its records and the club
 * settings, and nothing device- or account-specific: no signed-in user, coaches' contacts, invitations or audit log.
 */

const BACKUP_FORMAT = 'bolacomvisao-backup';
const BACKUP_VERSION = 2;
export const BACKUP_INTERVAL_DAYS = 7;
const LAST_BACKUP_KEY = 'bcv-last-backup-at';

const NOT_IN_BACKUP = [
  'currentUser',
  'syncInfo',
  'notifications',
  'users',
  'invitations',
  'auditLogs',
  'activeTeamId',
  'updatedAt',
  'lastLocalMutationAt'
] as const;

/** Top-level copies of the active team's data: the teams themselves are restored, these are rebuilt from them. */
const ACTIVE_TEAM_COPIES = [
  'roster',
  'matches',
  'trainings',
  'schedule',
  'staffMessages',
  'opponentScouting',
  'staffMembers',
  'tactics',
  'tacticFormat',
  'exerciseLibrary',
  'clubEvents',
  'staffUnavailability',
  'lastTrainingNumber',
  'myClubName',
  'clubLogoUrl',
  'category',
  'season'
] as const;

interface ClubBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  club: Partial<AppState>;
}

export function buildBackup(state: AppState, now = new Date()): ClubBackup {
  const club: Record<string, unknown> = { ...normalizeClubState(state) };
  NOT_IN_BACKUP.forEach((f) => delete club[f]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    club: club as Partial<AppState>
  };
}

type ParsedBackup = { kind: 'full'; backup: ClubBackup } | { kind: 'legacy'; data: Partial<AppState> };

/** Reads a backup file: the full format, or an older file (the whole app state of one device). */
export function parseBackup(text: string): ParsedBackup {
  const parsed = JSON.parse(text);
  if (parsed && parsed.format === BACKUP_FORMAT && parsed.club && Array.isArray(parsed.club.teams)) {
    return { kind: 'full', backup: parsed as ClubBackup };
  }
  if (parsed && (Array.isArray(parsed.teams) || parsed.roster || parsed.matches)) {
    return { kind: 'legacy', data: parsed as Partial<AppState> };
  }
  throw new Error('Formato inválido');
}

/**
 * The club as saved in the backup, keeping this device's account data and, if it still exists, the team being
 * worked on.
 */
export function restoreFromBackup(club: Partial<AppState>, current: AppState): AppState {
  const raw: Record<string, unknown> = { ...club };
  ACTIVE_TEAM_COPIES.forEach((f) => delete raw[f]);
  NOT_IN_BACKUP.forEach((f) => delete raw[f]);
  const teams = (club.teams || []) as AppState['teams'];
  const activeTeamId = teams.some((t) => t.id === current.activeTeamId) ? current.activeTeamId : teams[0]?.id || '';
  return normalizeClubState({
    ...(raw as Partial<AppState>),
    teams,
    activeTeamId,
    currentUser: current.currentUser,
    users: current.users,
    invitations: current.invitations,
    auditLogs: current.auditLogs,
    syncInfo: current.syncInfo,
    notifications: current.notifications
  } as AppState);
}

// ---------- Reminder (per device: the file is on the device that downloaded it) ----------

export function getLastBackupAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setLastBackupAt(when = Date.now()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(when));
  } catch {
    // Storage unavailable: the reminder simply shows again.
  }
}

/** Days since the last backup on this device (null = never). */
export function daysSinceBackup(last: number | null, now = Date.now()): number | null {
  return last === null ? null : Math.floor((now - last) / 86_400_000);
}

export const isBackupDue = (last: number | null, now = Date.now()) => {
  const days = daysSinceBackup(last, now);
  return days === null || days >= BACKUP_INTERVAL_DAYS;
};
