import { withRosterIds } from './eventPlayers';
import { AbsenceReason, AppState, Match, Training } from '../types';
import {
  computeSeasonPlayingTime,
  getCalledUpPlayers,
  getMatchTotalMinutes,
  withPlayableDurations
} from './playingTime';
import { calcPlayerMinutes, calculateMatchScore, isSeasonMatching, seasonFromDate } from './utils';
import { playerAbsences } from './trainingQuick';

/** How many of the latest games the athlete's sheet lists. */
const RECENT_PLAYER_GAMES = 5;

export interface PlayerGameLine {
  matchId: string;
  date: string;
  opponent: string;
  home: boolean;
  scored: number;
  conceded: number;
  calledUp: boolean;
  started: boolean;
  minutes: number;
  totalMinutes: number;
  goals: number;
  assists: number;
}

export interface PlayerSeason {
  season?: string;
  games: { calledUp: number; played: number; starts: number; minutes: number; availableMinutes: number; share: number };
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ratingAverage: number | null;
  trainings: { held: number; present: number; rate: number | null };
  absences: { date: string; trainingNumber?: number; reason?: AbsenceReason }[];
  recentGames: PlayerGameLine[];
  /** Season game by game (oldest first) and training attendance month by month, for the evolution charts. */
  evolution: {
    games: PlayerGameLine[];
    trainingMonths: { month: string; held: number; present: number }[];
  };
}

const inSeason = (date: string | undefined, explicit: string | undefined, season?: string) =>
  isSeasonMatching(explicit || (date ? seasonFromDate(date) : undefined), season);

/**
 * Everything about one athlete in a season, for the athlete's sheet and its PDF: games, minutes (same rules as the
 * playing-time table), goals, assists, cards, training attendance with the reasons for each absence, latest games.
 */
export function buildPlayerSeason(
  state: Pick<AppState, 'matches' | 'trainings' | 'roster' | 'category'>,
  playerId: string,
  season?: string
): PlayerSeason {
  const games = withRosterIds(
    (state.matches || []).filter((m) => m && m.finished && inSeason(m.date, m.season, season)),
    state.roster || []
  );
  const player = (state.roster || []).find((p) => p.id === playerId);
  const time = player ? computeSeasonPlayingTime(games, [player], state.category)[0] : undefined;

  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  const ratings: number[] = [];
  games.forEach((m) => {
    (m.goals || []).forEach((g) => {
      if (g.type !== 'scored') return;
      if (g.scorerId === playerId) goals++;
      if (g.assistId === playerId) assists++;
    });
    (m.cards || []).forEach((c) => {
      if (c.playerId !== playerId) return;
      if (c.color === 'Vermelho' || c.type === 'red') redCards++;
      else yellowCards++;
    });
    const r = m.ratings?.[playerId];
    if (typeof r === 'number' && r > 0) ratings.push(r);
  });

  const trainings = (state.trainings || []).filter(
    (t) => t && t.completed !== false && inSeason(t.date, t.season, season)
  );
  const absences = playerAbsences(trainings, playerId).map(({ date, trainingNumber, reason }) => ({
    date,
    trainingNumber,
    reason
  }));
  const held = trainings.length;

  const recentGames = [...games]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .filter((m) => isInvolved(m, playerId))
    .slice(0, RECENT_PLAYER_GAMES)
    .map((m) => gameLine(m, playerId, state.category));

  return {
    season,
    games: {
      calledUp: time?.matchesCalledUp || 0,
      played: time?.matchesPlayed || 0,
      starts: time?.starts || 0,
      minutes: time?.minutes || 0,
      availableMinutes: time?.availableMinutes || 0,
      share: time?.share || 0
    },
    goals,
    assists,
    yellowCards,
    redCards,
    ratingAverage: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    trainings: {
      held,
      present: held - absences.length,
      rate: held > 0 ? Math.round(((held - absences.length) / held) * 100) : null
    },
    absences,
    recentGames,
    evolution: {
      games: [...games]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map((m) => gameLine(m, playerId, state.category)),
      trainingMonths: trainingMonths(trainings, playerId)
    }
  };
}

/** Trainings held and attended per month ("2026-10"), oldest first. */
function trainingMonths(trainings: Training[], playerId: string) {
  const byMonth = new Map<string, { held: number; present: number }>();
  trainings.forEach((t) => {
    const month = (t.date || '').slice(0, 7);
    if (!month) return;
    const row = byMonth.get(month) || { held: 0, present: 0 };
    row.held++;
    if (!(t.absences || []).includes(playerId)) row.present++;
    byMonth.set(month, row);
  });
  return [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, r]) => ({ month, ...r }));
}

const isInvolved = (m: Match, playerId: string) =>
  getCalledUpPlayers(m).includes(playerId) ||
  (m.goals || []).some((g) => g.scorerId === playerId || g.assistId === playerId);

function gameLine(m: Match, playerId: string, category?: string): PlayerGameLine {
  const { scored, conceded } = calculateMatchScore(m);
  return {
    matchId: m.id,
    date: m.date,
    opponent: m.opponent,
    home: m.location !== 'fora',
    scored,
    conceded,
    calledUp: getCalledUpPlayers(m).includes(playerId),
    started: (m.lineup || []).includes(playerId),
    minutes: calcPlayerMinutes(withPlayableDurations(m, category), playerId),
    totalMinutes: getMatchTotalMinutes(m, category),
    goals: (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === playerId).length,
    assists: (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === playerId).length
  };
}
