import { describe, expect, it } from 'vitest';
import { minutesBehind, recentForm } from '../lib/homeSummary';
import { Match, Player } from '../types';

const game = (id: string, date: string, scored: number, conceded: number, finished = true) =>
  ({
    id,
    date,
    opponent: `Equipa ${id}`,
    season: '2026/2027',
    finished,
    location: 'casa',
    goals: [
      ...Array.from({ length: scored }, (_, i) => ({ id: `${id}s${i}`, type: 'scored' })),
      ...Array.from({ length: conceded }, (_, i) => ({ id: `${id}c${i}`, type: 'conceded' }))
    ],
    subs: [],
    lineup: ['a'],
    convocados: ['a', 'b'],
    halfDurationMinutes: 25
  }) as unknown as Match;

describe('Início: últimos jogos e minutos', () => {
  it('lists the last finished games of the season, oldest first', () => {
    const matches = [
      game('m2', '2026-10-17', 3, 1),
      game('m1', '2026-10-10', 0, 0),
      game('m3', '2026-10-24', 1, 2, false)
    ];
    const form = recentForm({ matches, season: '2026/2027' });
    expect(form.map((g) => [g.id, g.scored, g.conceded])).toEqual([
      ['m1', 0, 0],
      ['m2', 3, 1]
    ]);
  });

  it('counts the athletes below the minutes target', () => {
    const roster = [
      { id: 'a', name: 'Atleta A', active: true },
      { id: 'b', name: 'Atleta B', active: true }
    ] as Player[];
    const r = minutesBehind({
      matches: [game('m1', '2026-10-10', 1, 0)],
      season: '2026/2027',
      roster,
      category: 'Sub-11'
    });
    expect(r.total).toBe(2);
    expect(r.behind.map((p) => p.name)).toEqual(['Atleta B']);
  });
});
