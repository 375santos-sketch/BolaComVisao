import { describe, expect, it } from 'vitest';
import { seasonWeeks, themesByMonth, weekStart } from '../lib/seasonPlan';
import { AppState } from '../types';

const state = {
  season: '2026/2027',
  trainings: [
    {
      id: 't1',
      trainingNumber: 1,
      date: '2026-10-06',
      notes: '',
      absences: [],
      completed: true,
      sessionPlan: {
        objective: 'Saída de bola',
        blocks: [
          { id: 'a', title: 'Aquecer', category: 'aquecimento', durationMinutes: 15 },
          { id: 'b', title: 'Rondo', category: 'tatica', durationMinutes: 30 },
          { id: 'c', title: 'Livre', durationMinutes: 10 }
        ]
      }
    },
    { id: 't2', date: '2026-10-22', notes: '', absences: [], completed: false }
  ],
  matches: [
    {
      id: 'm1',
      date: '2026-10-10',
      opponent: 'Equipa B',
      season: '2026/2027',
      location: 'fora',
      finished: true,
      goals: [{ id: 'g', type: 'scored' }],
      subs: [],
      lineup: []
    }
  ],
  schedule: [
    { id: 's1', date: '2026-10-10', opponent: 'equipa b', time: '10:00', location: 'fora', callup: [] },
    { id: 's2', date: '2026-10-24', opponent: 'Equipa C', time: '11:00', location: 'casa', callup: [] }
  ]
} as unknown as AppState;

describe('Treinos → Época', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
  });

  it('lists every week from the first to the last event, without the scheduled copy of a played game', () => {
    const weeks = seasonWeeks(state, '2026-10-20');
    expect(weeks.map((w) => w.start)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
    expect(weeks[0].trainings.map((t) => t.objective)).toEqual(['Saída de bola']);
    expect(weeks[0].games).toEqual([
      expect.objectContaining({ opponent: 'Equipa B', score: '1-0', result: 'V', home: false })
    ]);
    expect(weeks[1].trainings).toEqual([]);
    expect(weeks[2].current).toBe(true);
    expect(weeks[2].games.map((g) => [g.opponent, g.result])).toEqual([['Equipa C', undefined]]);
  });

  it('adds up the minutes per theme of the trainings done', () => {
    expect(themesByMonth(state, '2026-10-30')).toEqual([
      { month: '2026-10', total: 55, minutes: { aquecimento: 15, tatica: 30, outros: 10 } }
    ]);
  });
});
