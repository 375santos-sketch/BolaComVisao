import { withRosterIds } from './eventPlayers';
import { AppState, Match, Player } from '../types';
import { getMatchShots } from './matchShots';
import { getMatchSetPieces } from './matchSetPieces';
import { isSameOpponent } from './opponentReport';
import { getCalledUpPlayers, getMatchTotalMinutes, withPlayableDurations } from './playingTime';
import { calcPlayerMinutes, calculateMatchScore, isSeasonMatching, seasonFromDate } from './utils';
import { playerAbsences } from './trainingQuick';

/**
 * Data behind the statistics panel: which games count (one game, games against one opponent, one phase or round,
 * the season, or any period) and the figures for the team or for one athlete.
 */

export type PanelScope = 'epoca' | 'jogo' | 'confronto' | 'fase' | 'periodo';

export interface PanelFilter {
  scope: PanelScope;
  season?: string;
  matchId?: string;
  opponent?: string;
  phase?: string;
  from?: string;
  to?: string;
}

const seasonOf = (m: Match) => m.season || seasonFromDate(m.date);

/** Finished games that match the filter, oldest first (the order of the charts). */
export function panelMatches(matches: Match[], f: PanelFilter): Match[] {
  return (matches || [])
    .filter((m) => m && m.finished)
    .filter((m) => {
      switch (f.scope) {
        case 'jogo':
          return m.id === f.matchId;
        case 'confronto':
          return isSameOpponent(m.opponent, f.opponent);
        case 'fase':
          return isSeasonMatching(seasonOf(m), f.season) && (m.phase || '').trim() === (f.phase || '').trim();
        case 'periodo':
          return (!f.from || m.date >= f.from) && (!f.to || m.date <= f.to);
        default:
          return isSeasonMatching(seasonOf(m), f.season);
      }
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

/** Choices for the filter selectors. */
export function panelOptions(matches: Match[], season?: string) {
  const finished = (matches || []).filter((m) => m && m.finished);
  const opponents: string[] = [];
  finished.forEach((m) => {
    if (m.opponent && !opponents.some((o) => isSameOpponent(o, m.opponent))) opponents.push(m.opponent);
  });
  const phases = Array.from(
    new Set(
      finished
        .filter((m) => isSeasonMatching(seasonOf(m), season))
        .map((m) => (m.phase || '').trim())
        .filter(Boolean)
    )
  );
  return {
    matches: [...finished].sort((a, b) => b.date.localeCompare(a.date)),
    opponents: opponents.sort((a, b) => a.localeCompare(b, 'pt-PT')),
    phases: phases.sort((a, b) => a.localeCompare(b, 'pt-PT', { numeric: true }))
  };
}

export interface TeamGameRow {
  matchId: string;
  date: string;
  opponent: string;
  home: boolean;
  phase?: string;
  scored: number;
  conceded: number;
  shotsFor?: number;
  shotsAgainst?: number;
  cornersFor?: number;
  cornersAgainst?: number;
}

const sum = (a?: number, b?: number) => (a === undefined && b === undefined ? undefined : (a || 0) + (b || 0));

export function teamGameRow(m: Match): TeamGameRow {
  const { scored, conceded } = calculateMatchScore(m);
  const shots = getMatchShots(m);
  const sp = getMatchSetPieces(m);
  return {
    matchId: m.id,
    date: m.date,
    opponent: m.opponent,
    home: m.location !== 'fora',
    phase: m.phase || undefined,
    scored,
    conceded,
    shotsFor: sum(shots.inBoxFor, shots.outBoxFor),
    shotsAgainst: sum(shots.inBoxAgainst, shots.outBoxAgainst),
    cornersFor: sp.cornersFor,
    cornersAgainst: sp.cornersAgainst
  };
}

/** Goals by 15-minute block of the game (scored and conceded); goals without a minute are left out. */
export const GOAL_BLOCKS = ["0-15'", "16-30'", "31-45'", "46-60'", "61-75'", "76-90'+"];
const blockOf = (minute: string | number | null | undefined): number | null => {
  const n = typeof minute === 'number' ? minute : parseInt(String(minute ?? '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(GOAL_BLOCKS.length - 1, Math.floor((n - 1) / 15));
};

export interface TeamPanel {
  games: TeamGameRow[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  /** Totals over the games where the figure was recorded (with how many games). */
  shots: { for: number; against: number; games: number };
  corners: { for: number; against: number; games: number };
  goalsByBlock: { scored: number[]; conceded: number[] };
  scorers: { playerId: string; name: string; goals: number; assists: number }[];
}

export function teamPanel(rawMatches: Match[], roster: Player[]): TeamPanel {
  const matches = withRosterIds(rawMatches, roster);
  const games = matches.map(teamGameRow);
  const p: TeamPanel = {
    games,
    played: games.length,
    wins: games.filter((g) => g.scored > g.conceded).length,
    draws: games.filter((g) => g.scored === g.conceded).length,
    losses: games.filter((g) => g.scored < g.conceded).length,
    scored: games.reduce((n, g) => n + g.scored, 0),
    conceded: games.reduce((n, g) => n + g.conceded, 0),
    shots: { for: 0, against: 0, games: 0 },
    corners: { for: 0, against: 0, games: 0 },
    goalsByBlock: { scored: GOAL_BLOCKS.map(() => 0), conceded: GOAL_BLOCKS.map(() => 0) },
    scorers: []
  };
  games.forEach((g) => {
    if (g.shotsFor !== undefined || g.shotsAgainst !== undefined) {
      p.shots.for += g.shotsFor || 0;
      p.shots.against += g.shotsAgainst || 0;
      p.shots.games++;
    }
    if (g.cornersFor !== undefined || g.cornersAgainst !== undefined) {
      p.corners.for += g.cornersFor || 0;
      p.corners.against += g.cornersAgainst || 0;
      p.corners.games++;
    }
  });
  const byPlayer = new Map<string, { goals: number; assists: number }>();
  matches.forEach((m) =>
    (m.goals || []).forEach((g) => {
      const block = blockOf(g.minute);
      if (block !== null) (g.type === 'scored' ? p.goalsByBlock.scored : p.goalsByBlock.conceded)[block]++;
      if (g.type !== 'scored') return;
      if (g.scorerId) {
        const r = byPlayer.get(g.scorerId) || { goals: 0, assists: 0 };
        r.goals++;
        byPlayer.set(g.scorerId, r);
      }
      if (g.assistId) {
        const r = byPlayer.get(g.assistId) || { goals: 0, assists: 0 };
        r.assists++;
        byPlayer.set(g.assistId, r);
      }
    })
  );
  p.scorers = [...byPlayer]
    .map(([playerId, r]) => ({ playerId, name: roster.find((x) => x.id === playerId)?.name || '', ...r }))
    .filter((r) => r.name)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name, 'pt-PT'));
  return p;
}

export interface PlayerGameRow {
  matchId: string;
  date: string;
  opponent: string;
  calledUp: boolean;
  started: boolean;
  minutes: number;
  totalMinutes: number;
  goals: number;
  assists: number;
}

export interface PlayerPanel {
  games: PlayerGameRow[];
  calledUp: number;
  played: number;
  starts: number;
  minutes: number;
  availableMinutes: number;
  goals: number;
  assists: number;
  /** Trainings held in the same span of dates as the selected games. */
  trainings: { held: number; present: number; rate: number | null };
}

export function playerPanel(
  rawMatches: Match[],
  state: Pick<AppState, 'trainings' | 'category'> & { roster?: Player[] },
  playerId: string,
  span?: { from?: string; to?: string }
): PlayerPanel {
  const matches = withRosterIds(rawMatches, state.roster || []);
  const games: PlayerGameRow[] = matches.map((m) => {
    const calledUp = getCalledUpPlayers(m).includes(playerId);
    const total = getMatchTotalMinutes(m, state.category);
    return {
      matchId: m.id,
      date: m.date,
      opponent: m.opponent,
      calledUp,
      started: (m.lineup || []).includes(playerId),
      minutes: calcPlayerMinutes(withPlayableDurations(m, state.category), playerId),
      totalMinutes: calledUp ? total : 0,
      goals: (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === playerId).length,
      assists: (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === playerId).length
    };
  });
  const from = span?.from;
  const to = span?.to;
  const held = (state.trainings || []).filter(
    (t) => t && t.completed !== false && (!from || t.date >= from) && (!to || t.date <= to)
  );
  const missed = playerAbsences(held, playerId).length;
  return {
    games,
    calledUp: games.filter((g) => g.calledUp).length,
    played: games.filter((g) => g.minutes > 0).length,
    starts: games.filter((g) => g.started).length,
    minutes: games.reduce((n, g) => n + g.minutes, 0),
    availableMinutes: matches.reduce((n, m) => n + getMatchTotalMinutes(m, state.category), 0),
    goals: games.reduce((n, g) => n + g.goals, 0),
    assists: games.reduce((n, g) => n + g.assists, 0),
    trainings: {
      held: held.length,
      present: held.length - missed,
      rate: held.length > 0 ? Math.round(((held.length - missed) / held.length) * 100) : null
    }
  };
}

/** Dates covered by the filter, for the trainings shown next to the games. */
export function panelSpan(f: PanelFilter, games: Match[]): { from?: string; to?: string } {
  if (f.scope === 'periodo') return { from: f.from, to: f.to };
  if (f.scope === 'epoca' && f.season) {
    const start = parseInt(f.season.slice(0, 4), 10);
    if (Number.isFinite(start)) return { from: `${start}-07-01`, to: `${start + 1}-06-30` };
  }
  if (games.length === 0) return {};
  return { from: games[0].date, to: games[games.length - 1].date };
}
