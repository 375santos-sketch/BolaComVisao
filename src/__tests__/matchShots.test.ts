import { describe, it, expect } from 'vitest';
import { computeShotStats, getMatchShots } from '../lib/matchShots';
import { Match } from '../types';

const goals = (scored: number, conceded: number) => [
  ...Array.from({ length: scored }, (_, i) => ({ id: `s${i}`, type: 'scored' })),
  ...Array.from({ length: conceded }, (_, i) => ({ id: `c${i}`, type: 'conceded' }))
];
const match = (id: string, extra: Partial<Match>, scored = 0, conceded = 0): Match =>
  ({ id, finished: true, goals: goals(scored, conceded), ...extra }) as unknown as Match;

describe('Remates na Análise', () => {
  // The two games of 10/10 and 17/10/2026 (shots and score from their Fichas de Jogo)
  const games = [
    match('a', { rematesDentroArea: 51, rematesForaArea: 9, rematesDentroAreaAdv: 1, rematesForaAreaAdv: 0 }, 37, 0),
    match('b', { rematesDentroArea: 15, rematesForaArea: 6, rematesDentroAreaAdv: 3, rematesForaAreaAdv: 2 }, 10, 1)
  ];

  it('totals, averages and finishing efficiency', () => {
    const s = computeShotStats(games);
    expect(s).toMatchObject({
      matchesCount: 2,
      shotsFor: 81,
      inBoxFor: 66,
      outBoxFor: 15,
      shotsAgainst: 6,
      avgShotsFor: 40.5,
      avgShotsAgainst: 3,
      conversionFor: 58, // 47 goals in 81 shots
      conversionAgainst: 17, // 1 goal in 6 shots
      shotsPerGoal: 1.7
    });
  });

  it('a game without shots recorded is left out, goals included (no inflated efficiency)', () => {
    const s = computeShotStats([...games, match('c', {}, 5, 0)]);
    expect(s.matchesCount).toBe(2);
    expect(s.goalsScored).toBe(47);
  });

  it('reads the older field names, the live ones win', () => {
    expect(getMatchShots(match('x', { shotsInBoxFor: 4 })).inBoxFor).toBe(4);
    expect(getMatchShots(match('y', { shotsInBoxFor: 4, rematesDentroArea: 7 })).inBoxFor).toBe(7);
  });

  it('no shots anywhere: nothing to show', () => {
    expect(computeShotStats([match('z', {}, 2, 1)])).toMatchObject({ matchesCount: 0, conversionFor: null });
  });
});
