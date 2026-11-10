import { describe, expect, it } from 'vitest';
import { Match, OpponentFile, ScheduledMatch } from '../types';
import { fileOf, opponentsOf, withFile } from './opponents';

const game = (opponent: string, date: string, ours: number, theirs: number) =>
  ({
    id: `${opponent}${date}`,
    opponent,
    date,
    finished: true,
    goals: [
      ...Array.from({ length: ours }, (_, i) => ({ id: `s${i}`, type: 'scored' })),
      ...Array.from({ length: theirs }, (_, i) => ({ id: `c${i}`, type: 'conceded' }))
    ]
  }) as unknown as Match;

describe('Adversários', () => {
  it('one line per opponent (same name rules as the reports), the next ones first', () => {
    const matches = [
      game('Esparteiros', '2026-10-01', 2, 1),
      game('GRD Os Esparteiros', '2026-10-20', 0, 0),
      game('Tramagal SU', '2026-10-10', 1, 3)
    ];
    const schedule = [
      { id: 's1', opponent: 'Tramagal', date: '2026-11-20', time: '10:00', location: 'casa' },
      { id: 's0', opponent: 'Antigo', date: '2026-10-01', time: '10:00', location: 'casa' }
    ] as ScheduledMatch[];
    const list = opponentsOf(matches, schedule, [], '2026-11-10');
    expect(list.map((o) => o.name)).toEqual(['Tramagal SU', 'GRD Os Esparteiros']);
    expect(list[0]).toMatchObject({ played: 1, losses: 1, goalsFor: 1, goalsAgainst: 3, next: { date: '2026-11-20' } });
    expect(list[1]).toMatchObject({
      played: 2,
      wins: 1,
      draws: 1,
      goalsFor: 2,
      goalsAgainst: 1,
      lastDate: '2026-10-20'
    });
  });

  it('the staff file: saved clean, found by name, removed when empty', () => {
    const f: OpponentFile = {
      id: 'f1',
      name: ' Os Leões ',
      formation: '3-2-1',
      strengths: ['Jogo aéreo', ' '],
      weaknesses: [],
      notes: '',
      strategy: 'Pressionar a saída',
      updatedAt: 1
    };
    const files = withFile([], f);
    expect(files).toEqual([
      {
        id: 'f1',
        name: 'Os Leões',
        formation: '3-2-1',
        strengths: ['Jogo aéreo'],
        strategy: 'Pressionar a saída',
        updatedAt: 1
      }
    ]);
    expect(fileOf(files, 'CD Os Leões')?.id).toBe('f1');
    expect(opponentsOf([], [], files, '2026-11-10')[0].file?.id).toBe('f1');
    expect(withFile(files, { id: 'f1', name: 'Os Leões', updatedAt: 2 })).toEqual([]);
  });
});
