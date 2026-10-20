import { Match } from '../types';
import { getLineupSize } from './constants';
import { parseMinuteOrder } from './utils';

/**
 * Older versions of the list-style Excel import invented data the file never had: scorers taken in turn from the
 * squad, minutes 20', 45', 70'… (scored) and 35', 65'… (conceded), origin "Bola jogada", the first 11 players as
 * starters and the first as captain. This recognises that exact signature (and only on matches never played
 * live: no clock, no timeline, no substitutions) and removes the invented parts, keeping the score.
 */

const minutesOf = (m: Match, type: 'scored' | 'conceded') =>
  (m.goals || []).filter((g) => g.type === type).map((g) => parseMinuteOrder(g.minute));

const isSeries = (values: number[], start: number, step: number) => values.every((v, i) => v === start + i * step);

export function hasInventedImportData(m: Match): boolean {
  if (!m || m.timer || m.timeline || (m.subs || []).length > 0 || (m.cards || []).length > 0) return false;

  const goals = m.goals || [];
  const inventedGoals =
    goals.length > 0 &&
    goals.every((g) => g.assistId == null && g.goalType === 'Bola jogada' && g.minute != null) &&
    goals.some((g) => g.type === 'scored' && g.scorerId) &&
    isSeries(minutesOf(m, 'scored'), 20, 25) &&
    isSeries(minutesOf(m, 'conceded'), 35, 30);

  const lineup = m.lineup || [];
  const inventedLineup = lineup.length === 11 && getLineupSize(m) < 11 && m.capitao === lineup[0];

  return inventedGoals || inventedLineup;
}

/** Same match without the invented scorers, minutes, origins, starters and captain (the score is kept). */
export function removeInventedImportData(m: Match): Match {
  const goals = m.goals || [];
  const inventedGoals = goals.length > 0 && goals.every((g) => g.goalType === 'Bola jogada' && g.assistId == null);
  return {
    ...m,
    goals: inventedGoals
      ? goals.map((g) => ({ id: g.id, type: g.type, scorerId: null, assistId: null, minute: null }))
      : goals,
    lineup: [],
    capitao: null
  };
}
