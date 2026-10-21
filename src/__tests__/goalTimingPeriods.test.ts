import { describe, it, expect } from 'vitest';
import { computeGameAnalysis } from '../lib/gameAnalysis/aggregationService';
import type { AnalysisFilters } from '../lib/gameAnalysis/types';
import { Match } from '../types';

const filters: AnalysisFilters = {
  matchId: 'todos',
  month: 'todos',
  season: 'todas',
  opponent: 'todos',
  matchType: 'todos',
  location: 'todos',
  eventType: 'todos',
  halfDurationMinutes: 30
};

const goal = (id: string, type: 'scored' | 'conceded', minute: string | null) => ({
  id,
  type,
  scorerId: type === 'scored' ? 'p1' : null,
  assistId: null,
  minute,
  goalType: 'Bola jogada'
});

const match = (id: string, goals: ReturnType<typeof goal>[]): Match =>
  ({
    id,
    date: '2026-10-10',
    season: '2026/2027',
    opponent: 'Esparteiros',
    type: 'campeonato',
    location: 'fora',
    lineup: [],
    subs: [],
    capitao: null,
    finished: true,
    goals
  }) as unknown as Match;

describe('Quando marcamos: golos por período', () => {
  const analysis = computeGameAnalysis(
    [
      match('m1', [goal('a', 'scored', '4'), goal('b', 'scored', '50'), goal('c', 'scored', '55')]),
      match('m2', [goal('d', 'scored', '48'), goal('e', 'conceded', '20'), goal('f', 'scored', null)])
    ],
    filters,
    'Sub-11'
  );
  const byKey = Object.fromEntries(analysis.timePeriodList.map((p) => [p.key, p]));

  it('the chart list has the goals (it was always 0 while the "peak" showed them)', () => {
    expect(byKey['0-15'].scored).toBe(1);
    expect(byKey['16-30'].conceded).toBe(1);
    expect(byKey['46-60'].scored).toBe(3);
    expect(analysis.timingWindows.mostScoredPeriod).toMatchObject({ periodKey: '46-60', count: 3 });
  });

  it('half totals add up to the goals with a minute', () => {
    const sum = (half: number, f: 'scored' | 'conceded') =>
      analysis.timePeriodList.filter((p) => (half === 1 ? p.half === 1 : p.half !== 1)).reduce((n, p) => n + p[f], 0);
    expect(sum(1, 'scored')).toBe(1);
    expect(sum(2, 'scored')).toBe(3);
    expect(sum(1, 'conceded') + sum(2, 'conceded')).toBe(1);
  });

  it('a goal without minute is not placed in any period, and is reported', () => {
    const counted = analysis.timePeriodList.reduce((n, p) => n + p.scored, 0);
    expect(analysis.goalsScored).toBe(5);
    expect(counted).toBe(4);
    expect(analysis.goalsWithoutMinuteCount).toBe(1);
  });
});
