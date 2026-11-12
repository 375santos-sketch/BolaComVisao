import { Match } from '../types';

export interface GameLine {
  id: string;
  date: string;
  opponent: string;
  ours: number;
  theirs: number;
  result: 'V' | 'E' | 'D';
}

export interface AnalysisOverview {
  games: GameLine[];
  scored: number;
  conceded: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  /** Goals out of shots, only over games where shots were recorded (null: no shots recorded). */
  efficiency: { goals: number; shots: number } | null;
}

const shotsOf = (m: Match) =>
  (m.rematesDentroArea ?? m.shotsInBoxFor ?? 0) + (m.rematesForaArea ?? m.shotsOutBoxFor ?? 0);

/**
 * Análise → Visão geral: the finished games of the filter, oldest first, and the figures on top (goals, results,
 * points, efficiency). Only counts what the games hold; nothing estimated.
 */
export function analysisOverview(matches: Match[]): AnalysisOverview {
  const games: GameLine[] = matches
    .filter((m) => m && m.finished)
    .map((m) => {
      const ours = (m.goals || []).filter((g) => g.type === 'scored').length;
      const theirs = (m.goals || []).filter((g) => g.type === 'conceded').length;
      return {
        id: m.id,
        date: (m.date || '').slice(0, 10),
        opponent: m.opponent || 'Adversário',
        ours,
        theirs,
        result: (ours > theirs ? 'V' : ours === theirs ? 'E' : 'D') as GameLine['result']
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const wins = games.filter((g) => g.result === 'V').length;
  const draws = games.filter((g) => g.result === 'E').length;
  const withShots = matches.filter((m) => m && m.finished && shotsOf(m) > 0);
  const shots = withShots.reduce((n, m) => n + shotsOf(m), 0);
  const shotGoals = withShots.reduce((n, m) => n + (m.goals || []).filter((g) => g.type === 'scored').length, 0);
  return {
    games,
    scored: games.reduce((n, g) => n + g.ours, 0),
    conceded: games.reduce((n, g) => n + g.theirs, 0),
    wins,
    draws,
    losses: games.length - wins - draws,
    points: wins * 3 + draws,
    efficiency: shots ? { goals: shotGoals, shots } : null
  };
}
