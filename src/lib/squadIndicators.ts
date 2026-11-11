import { AppState } from '../types';
import { computeSeasonPlayingTime } from './playingTime';
import { isSeasonMatching, seasonFromDate } from './utils';

/**
 * Equipa → Plantel: two small figures per athlete, from the season shown (`state.season`). The same rules as the
 * athlete's sheet and the playing-time table, so the numbers never disagree:
 *
 * - **% conv. (minutos quando convocado)** = minutes played ÷ minutes of the finished games the athlete was called up
 *   for (`computeSeasonPlayingTime().callupShare`). Never called up in a finished game → `null` ("—", no data), not 0%.
 * - **% treinos (presenças)** = (trainings held − absences) ÷ trainings held, where "held" are the season's
 *   trainings not marked as "por fazer" (`completed !== false`), as in the sheet. No training held → `null` ("—").
 *
 * Only the team's active athletes are counted.
 */
interface SquadIndicator {
  callupShare: number | null;
  attendance: number | null;
}

export function squadIndicators(
  state: Pick<AppState, 'matches' | 'trainings' | 'roster' | 'season' | 'category'>
): Map<string, SquadIndicator> {
  const inSeason = (date: string | undefined, explicit: string | undefined) =>
    isSeasonMatching(explicit || (date ? seasonFromDate(date) : undefined), state.season);
  const games = (state.matches || []).filter((m) => m && m.finished && inSeason(m.date, m.season));
  const time = new Map(
    computeSeasonPlayingTime(games, state.roster || [], state.category).map((r) => [
      r.playerId,
      r.matchesCalledUp > 0 && r.calledUpMinutes > 0 ? r.callupShare : null
    ])
  );
  const held = (state.trainings || []).filter((t) => t && t.completed !== false && inSeason(t.date, t.season));
  const out = new Map<string, SquadIndicator>();
  (state.roster || [])
    .filter((p) => p && p.active !== false)
    .forEach((p) => {
      const absences = held.filter((t) => (t.absences || []).includes(p.id)).length;
      out.set(p.id, {
        callupShare: time.get(p.id) ?? null,
        attendance: held.length ? (held.length - absences) / held.length : null
      });
    });
  return out;
}

/** "74%" or "—" when there is no data. */
export const pctLabel = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
