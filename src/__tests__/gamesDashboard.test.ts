import { describe, expect, it } from 'vitest';
import { buildGamesDashboard, tenMinuteBlocks, top3 } from '../lib/gamesDashboard';
import { Match, Player } from '../types';

const roster: Player[] = [
  { id: 'a', name: 'Afonso', number: 18, positions: '', birthDate: null, active: true },
  { id: 'b', name: 'Diego', number: 19, positions: '', birthDate: null, active: true },
  { id: 'c', name: 'Vieira', number: 21, positions: '', birthDate: null, active: true }
] as Player[];

const g = (
  id: string,
  minute: string,
  goalType: string,
  scorerId = 'a',
  assistId: string | null = 'b',
  half?: 1 | 2
) => ({
  id,
  type: 'scored' as const,
  scorerId,
  assistId,
  minute,
  goalType,
  half
});

const game = (id: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: `Adv ${id}`,
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: ['a', 'b'],
    lineupSize: 2,
    capitao: null,
    convocados: ['a', 'b', 'c'],
    halfDurationMinutes: 30,
    ...extra
  }) as Match;

describe('Painel de jogos', () => {
  it('ranks the top 3 with ties sharing the place', () => {
    expect(
      top3([
        { name: 'Afonso', value: 10 },
        { name: 'Miguel', value: 8 },
        { name: 'Oliveira', value: 8 },
        { name: 'Garcia', value: 5 }
      ]).map((r) => `${r.rank}º ${r.name}`)
    ).toEqual(['1º Afonso', '2º Miguel', '2º Oliveira']);
    expect(
      top3([
        { name: 'Diego', value: 10 },
        { name: 'Afonso', value: 6 },
        { name: 'Garcia', value: 5 },
        { name: 'Miguel', value: 5 }
      ]).map((r) => r.rank)
    ).toEqual([1, 2, 3, 3]);
  });

  it('makes 10-minute blocks per half from the half length', () => {
    expect(tenMinuteBlocks(30).map((b) => b.label)).toEqual([
      "1-10'",
      "11-20'",
      "21-30'",
      "31-40'",
      "41-50'",
      "51-60'"
    ]);
    expect(tenMinuteBlocks(25).map((b) => b.label)).toEqual([
      "1-10'",
      "11-20'",
      "21-25'",
      "26-35'",
      "36-45'",
      "46-50'"
    ]);
  });

  it('counts headline figures, how and when we score, minutes and rankings', () => {
    const d = buildGamesDashboard(
      [
        game('m1', '2026-10-10', {
          goals: [
            g('g1', "5'", 'Bola jogada'),
            g('g2', "12'", 'Recuperação de bola', 'b', 'a'),
            g('g3', '3', 'Penálti', 'a', null, 2), // 3rd minute of the 2nd half = 33'
            { id: 'c1', type: 'conceded', scorerId: null, assistId: null, minute: "40'" }
          ],
          rematesDentroArea: 5,
          rematesForaArea: 1,
          cantos: 4,
          cantosAdv: 2,
          faltas: 1
        } as Partial<Match>),
        game('m2', '2026-10-17', {
          location: 'fora',
          goals: [g('g4', "58'", 'Bola jogada')],
          subs: [{ id: 's', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 10 }]
        } as Partial<Match>)
      ],
      { roster, category: 'Sub-11' }
    );
    expect(d).toMatchObject({ played: 2, wins: 2, scored: 4, conceded: 1, halfMinutes: 30 });
    expect(d.shots).toMatchObject({ games: 1, for: 6, inBoxFor: 5, goalsInShotGames: 3 });
    expect(d.shots.efficacy).toBeCloseTo(0.5);
    expect(d.setPieces).toMatchObject({ games: 1, cornersFor: 4, cornersAgainst: 2, foulsCommitted: 1 });
    expect(d.origins).toEqual([
      { label: 'Bola jogada', goals: 2 },
      { label: 'Recuperação de bola', goals: 1 },
      { label: 'Penálti', goals: 1 }
    ]);
    expect(d.whenScored.map((b) => b.goals)).toEqual([1, 1, 0, 1, 0, 1]);
    expect(d.squad.map((s) => [s.name, s.minutes, s.started, s.goals, s.assists])).toEqual([
      ['Afonso', 120, true, 3, 1],
      ['Diego', 100, true, 1, 2],
      ['Vieira', 20, false, 0, 0]
    ]);
    expect(d.topGoals.map((r) => [r.name, r.value])).toEqual([
      ['Afonso', 3],
      ['Diego', 1]
    ]);
    expect(d.leastMinutes[0]).toMatchObject({ rank: 1, name: 'Vieira', value: 20 });
  });
});

describe('Top 3 com muitos atletas', () => {
  it('stops after the 3rd place even with many athletes', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, i) => ({ name, value: 10 - i }));
    expect(top3(rows).map((r) => r.name)).toEqual(['A', 'B', 'C']);
    expect(top3([...rows, { name: 'G', value: 8 }]).map((r) => r.rank)).toEqual([1, 2, 3, 3]);
  });
});
