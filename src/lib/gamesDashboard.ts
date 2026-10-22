import { withRosterIds } from './eventPlayers';
import { AppState, Match, Player } from '../types';
import { normalizeEventTiming } from './gameAnalysis/timingUtils';
import { getNominalHalfDuration } from './matchPhaseUtils';
import { getMatchSetPieces } from './matchSetPieces';
import { getMatchShots } from './matchShots';
import { computeSeasonPlayingTime } from './playingTime';
import { teamPanel } from './statsPanel';

/**
 * Everything the "Painel de jogos" shows (on screen, in the PDF and in the Excel): headline figures, minutes per
 * athlete, how and when we score, the top 3 rankings, the squad table and the games. One source for all three.
 */

export interface RankRow {
  rank: number;
  name: string;
  value: number;
}

export interface SquadRow {
  playerId: string;
  number: number | string | null;
  name: string;
  minutes: number;
  share: number;
  started: boolean;
  calledUp: number;
  played: number;
  goals: number;
  assists: number;
}

export interface GamesDashboard {
  games: { matchId: string; date: string; opponent: string; home: boolean; scored: number; conceded: number }[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  shots: {
    games: number;
    for: number;
    inBoxFor: number;
    against: number;
    /** Goals per shot in the games where shots were recorded (null without shots). */
    efficacy: number | null;
    goalsInShotGames: number;
  };
  setPieces: {
    games: number;
    cornersFor: number;
    cornersAgainst: number;
    foulsCommitted: number;
    foulsSuffered: number;
  };
  /** Called-up athletes, most minutes first. */
  squad: SquadRow[];
  halfMinutes: number;
  /** Goals scored by origin, most first. */
  origins: { label: string; goals: number }[];
  /** Goals scored by 10-minute block of each half. */
  whenScored: { label: string; half: 1 | 2; goals: number }[];
  topGoals: RankRow[];
  topAssists: RankRow[];
  mostMinutes: RankRow[];
  leastMinutes: RankRow[];
}

/** Top 3 positions with ties sharing the place (1º, 2º, 2º, 4º…): every athlete within the first 3 places. */
export function top3(rows: { name: string; value: number }[], order: 'desc' | 'asc' = 'desc'): RankRow[] {
  const sorted = [...rows].sort((a, b) =>
    order === 'desc'
      ? b.value - a.value || a.name.localeCompare(b.name, 'pt-PT')
      : a.value - b.value || a.name.localeCompare(b.name, 'pt-PT')
  );
  const out: RankRow[] = [];
  let prevRank = 0;
  sorted.forEach((r, i) => {
    const rank = i > 0 && r.value === sorted[i - 1].value ? prevRank : i + 1;
    prevRank = rank;
    if (rank <= 3) out.push({ rank, name: r.name, value: r.value });
  });
  return out;
}

const mostCommon = (values: number[], fallback: number) => {
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
};

/** 10-minute blocks of each half: with 30' halves 1-10', 11-20', 21-30' | 31-40', 41-50', 51-60'. */
export function tenMinuteBlocks(halfMinutes: number): { label: string; half: 1 | 2; from: number; to: number }[] {
  const blocks: { label: string; half: 1 | 2; from: number; to: number }[] = [];
  ([1, 2] as const).forEach((half) => {
    const start = (half - 1) * halfMinutes;
    for (let from = start + 1; from <= start + halfMinutes; from += 10) {
      const to = Math.min(from + 9, start + halfMinutes);
      blocks.push({ label: `${from}-${to}'`, half, from, to });
    }
  });
  return blocks;
}

export function buildGamesDashboard(rawGames: Match[], state: Pick<AppState, 'roster' | 'category'>): GamesDashboard {
  const roster: Player[] = state.roster || [];
  const games = withRosterIds(rawGames, roster);
  const team = teamPanel(games, roster);

  const shotGames = games.filter((m) => {
    const s = getMatchShots(m);
    return [s.inBoxFor, s.outBoxFor, s.inBoxAgainst, s.outBoxAgainst].some((v) => v !== undefined);
  });
  const shots = shotGames.reduce(
    (acc, m) => {
      const s = getMatchShots(m);
      acc.for += (s.inBoxFor || 0) + (s.outBoxFor || 0);
      acc.inBoxFor += s.inBoxFor || 0;
      acc.against += (s.inBoxAgainst || 0) + (s.outBoxAgainst || 0);
      acc.goalsInShotGames += (m.goals || []).filter((g) => g.type === 'scored').length;
      return acc;
    },
    { for: 0, inBoxFor: 0, against: 0, goalsInShotGames: 0 }
  );

  const spGames = games.filter((m) => Object.values(getMatchSetPieces(m)).some((v) => v !== undefined));
  const setPieces = spGames.reduce(
    (acc, m) => {
      const sp = getMatchSetPieces(m);
      acc.cornersFor += sp.cornersFor || 0;
      acc.cornersAgainst += sp.cornersAgainst || 0;
      acc.foulsCommitted += sp.foulsCommitted || 0;
      acc.foulsSuffered += sp.foulsSuffered || 0;
      return acc;
    },
    { games: spGames.length, cornersFor: 0, cornersAgainst: 0, foulsCommitted: 0, foulsSuffered: 0 }
  );

  const scorerById = new Map(team.scorers.map((s) => [s.playerId, s]));
  const squad: SquadRow[] = computeSeasonPlayingTime(games, roster, state.category)
    .filter((r) => r.matchesCalledUp > 0)
    .map((r) => ({
      playerId: r.playerId,
      number: r.number ?? null,
      name: r.name,
      minutes: r.minutes,
      share: r.share,
      started: r.starts > 0,
      calledUp: r.matchesCalledUp,
      played: r.matchesPlayed,
      goals: scorerById.get(r.playerId)?.goals || 0,
      assists: scorerById.get(r.playerId)?.assists || 0
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'pt-PT'));

  const halfMinutes = mostCommon(
    games.map((m) => getNominalHalfDuration(m, state.category)),
    getNominalHalfDuration(null, state.category)
  );
  const blocks = tenMinuteBlocks(halfMinutes);
  const whenScored = blocks.map((b) => ({ label: b.label, half: b.half, goals: 0 }));
  const originCounts = new Map<string, number>();
  games.forEach((m) => {
    const d = getNominalHalfDuration(m, state.category);
    (m.goals || [])
      .filter((g) => g.type === 'scored')
      .forEach((g) => {
        const origin = (g.goalType || '').trim() || 'Sem origem registada';
        const label = origin.charAt(0).toUpperCase() + origin.slice(1);
        originCounts.set(label, (originCounts.get(label) || 0) + 1);

        const t = normalizeEventTiming(g.minute, g.half, typeof g.period === 'string' ? g.period : undefined, d);
        if (t.absoluteMinute === null || (t.half !== 1 && t.half !== 2)) return;
        // Same position in the half on the dashboard's scale (games of another length still land in the right block).
        const inHalf = t.absoluteMinute - (t.half - 1) * d;
        const scaled = Math.min(halfMinutes, Math.max(1, Math.ceil((inHalf / d) * halfMinutes)));
        const absolute = (t.half - 1) * halfMinutes + scaled;
        const idx = blocks.findIndex((b) => b.half === t.half && absolute >= b.from && absolute <= b.to);
        if (idx >= 0) whenScored[idx].goals++;
      });
  });

  return {
    games: team.games.map((g) => ({
      matchId: g.matchId,
      date: g.date,
      opponent: g.opponent,
      home: g.home,
      scored: g.scored,
      conceded: g.conceded
    })),
    played: team.played,
    wins: team.wins,
    draws: team.draws,
    losses: team.losses,
    scored: team.scored,
    conceded: team.conceded,
    shots: {
      games: shotGames.length,
      ...shots,
      efficacy: shots.for > 0 ? shots.goalsInShotGames / shots.for : null
    },
    setPieces,
    squad,
    halfMinutes,
    origins: [...originCounts].map(([label, goals]) => ({ label, goals })).sort((a, b) => b.goals - a.goals),
    whenScored,
    topGoals: top3(team.scorers.filter((s) => s.goals > 0).map((s) => ({ name: s.name, value: s.goals }))),
    topAssists: top3(team.scorers.filter((s) => s.assists > 0).map((s) => ({ name: s.name, value: s.assists }))),
    mostMinutes: top3(squad.map((s) => ({ name: s.name, value: s.minutes }))),
    leastMinutes: top3(
      squad.map((s) => ({ name: s.name, value: s.minutes })),
      'asc'
    )
  };
}
