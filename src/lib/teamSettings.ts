import { AppState, SquadProfile } from '../types';

/**
 * Settings of the active team kept in the team (Definições → Clube), like the league tables: the club's main colour,
 * its town (for the weather of home games and trainings) and how many yellow cards make a suspension.
 */

export const DEFAULT_CLUB_COLOR = '#22c3ee';
export const DEFAULT_YELLOWS_FOR_BAN = 5;

type TeamState = Pick<AppState, 'teams' | 'activeTeamId'>;

const activeTeam = (state: TeamState) => (state.teams || []).find((t) => t.id === state.activeTeamId);

export function teamSettings(state: TeamState) {
  const team = activeTeam(state);
  return {
    clubColor: team?.clubColor || DEFAULT_CLUB_COLOR,
    clubTown: team?.clubTown?.trim() || '',
    yellowsForBan:
      team?.yellowsForBan && team.yellowsForBan > 0 ? Math.round(team.yellowsForBan) : DEFAULT_YELLOWS_FOR_BAN
  };
}

/** The team list with the active team's settings changed (null when there is no active team). */
export function withTeamSettings(
  state: TeamState,
  changes: Partial<Pick<SquadProfile, 'clubColor' | 'clubTown' | 'yellowsForBan'>>
): AppState['teams'] | null {
  if (!activeTeam(state)) return null;
  return (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, ...changes } : t));
}
