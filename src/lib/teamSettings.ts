import { AppState, SquadProfile } from '../types';

/**
 * Settings of the active team kept in the team (Definições → Clube), like the league tables: the club's main colour,
 * its town (for the weather of home games and trainings) and how many yellow cards make a suspension.
 */

export const DEFAULT_CLUB_COLOR = '#22c3ee';
export const DEFAULT_YELLOWS_FOR_BAN = 5;
const DEFAULT_TRAINING_MINUTES = 75;
/** Mondays at 19:15 and Thursdays at 18:15 until the coach sets the team's own days. */
const DEFAULT_TRAINING_TIMES: Record<string, string> = { '1': '19:15', '4': '18:15' };

type TeamState = Pick<AppState, 'teams' | 'activeTeamId'>;

const activeTeam = (state: TeamState) => (state.teams || []).find((t) => t.id === state.activeTeamId);

export function teamSettings(state: TeamState) {
  const team = activeTeam(state);
  return {
    clubColor: team?.clubColor || DEFAULT_CLUB_COLOR,
    clubTown: team?.clubTown?.trim() || '',
    yellowsForBan:
      team?.yellowsForBan && team.yellowsForBan > 0 ? Math.round(team.yellowsForBan) : DEFAULT_YELLOWS_FOR_BAN,
    trainingMinutes:
      team?.trainingMinutes && team.trainingMinutes > 0 ? Math.round(team.trainingMinutes) : DEFAULT_TRAINING_MINUTES,
    trainingTimes: team?.trainingTimes || DEFAULT_TRAINING_TIMES
  };
}

/** The team list with the active team's settings changed (null when there is no active team). */
export function withTeamSettings(
  state: TeamState,
  changes: Partial<Pick<SquadProfile, 'clubColor' | 'clubTown' | 'yellowsForBan' | 'trainingMinutes' | 'trainingTimes'>>
): AppState['teams'] | null {
  if (!activeTeam(state)) return null;
  return (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, ...changes } : t));
}

/**
 * When a training on this day starts and how long it lasts: the team's time for that weekday (none on a day that is
 * not a training day, so the usual time is kept) and its usual length.
 */
export function trainingSlot(
  settings: { trainingTimes: Record<string, string>; trainingMinutes: number },
  date: string
): { time?: string; durationMinutes: number } {
  const time = settings.trainingTimes[String(new Date(`${date}T12:00:00`).getDay())];
  return { ...(time ? { time } : {}), durationMinutes: settings.trainingMinutes };
}

/** The team's first training time of the week (for a training on a day that is not one of its days). */
export const firstTrainingTime = (settings: { trainingTimes: Record<string, string> }) =>
  Object.keys(settings.trainingTimes)
    .sort((a, b) => ((Number(a) + 6) % 7) - ((Number(b) + 6) % 7))
    .map((d) => settings.trainingTimes[d])[0] || '18:15';
