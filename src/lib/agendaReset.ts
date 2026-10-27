import { AppState } from '../types';

/**
 * Definições → Limpar a agenda: the active team's scheduled games, trainings not yet done, meetings and staff
 * unavailability are removed; finished games and trainings already done stay.
 */
export function clearedAgenda(
  state: Pick<AppState, 'trainings' | 'teams' | 'activeTeamId'>
): Pick<AppState, 'schedule' | 'trainings' | 'clubEvents' | 'staffUnavailability' | 'teams'> {
  const trainings = (state.trainings || []).filter((tr) => tr.completed === true);
  const cleared = { schedule: [], trainings, clubEvents: [], staffUnavailability: [] };
  return {
    ...cleared,
    teams: (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, ...cleared } : t))
  };
}
