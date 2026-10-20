import { Player, Training } from '../types';

/**
 * Attendance patterns worth a coach's attention beyond the season percentage: absences in a row, and a player
 * whose attendance dropped recently even if the season average still looks fine.
 */

export const ABSENCE_STREAK_ALERT = 3;
export const RECENT_WINDOW_DAYS = 30;

/** Trainings that already happened, most recent first. */
export function pastTrainings(trainings: Training[], today = new Date().toISOString().slice(0, 10)): Training[] {
  return trainings
    .filter((t) => t && t.completed !== false && t.date && t.date.slice(0, 10) <= today)
    .sort((a, b) => `${b.date}${b.time || ''}`.localeCompare(`${a.date}${a.time || ''}`));
}

/** Absences in a row, counting back from the most recent training. */
export function absenceStreak(playerId: string, recentFirst: Training[]): number {
  let streak = 0;
  for (const t of recentFirst) {
    if (!(t.absences || []).includes(playerId)) break;
    streak++;
  }
  return streak;
}

/** Attendance in the last `days` days (trainings that already happened). */
export function recentAttendance(
  playerId: string,
  recentFirst: Training[],
  days = RECENT_WINDOW_DAYS,
  today = new Date()
): { presences: number; total: number; pct: number } {
  const since = new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const window = recentFirst.filter((t) => t.date.slice(0, 10) >= since);
  const absences = window.filter((t) => (t.absences || []).includes(playerId)).length;
  const total = window.length;
  return { presences: total - absences, total, pct: total > 0 ? Math.round(((total - absences) / total) * 100) : 100 };
}

/** Injured, suspended or inactive players are expected to miss trainings. */
export const isExpectedToMiss = (p: Player) =>
  p.status === 'lesionado' || p.status === 'suspenso' || p.status === 'inativo';
