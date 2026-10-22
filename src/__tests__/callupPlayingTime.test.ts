import { describe, expect, it } from 'vitest';
import { callupPlayingTime, playersNeedingMinutes } from '../lib/callupPlayingTime';
import { Match, Player } from '../types';

const roster: Player[] = ['a', 'b', 'c', 'd'].map((id, i) => ({
  id,
  name: id.toUpperCase(),
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));

const game = (id: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: 'X',
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

describe('Minutos na convocatória', () => {
  const matches = [
    game('m1', '2026-10-03'),
    game('m2', '2026-10-10'),
    game('m3', '2026-10-17', { convocados: ['a', 'b', 'd'] }),
    game('old', '2025-10-17', { season: '2025/2026', convocados: ['d'], lineup: ['d'] })
  ];

  it('counts only the season and how often each player was left out of the last 3 games', () => {
    const rows = callupPlayingTime(matches, roster, '2026/2027', 'Sub-11');
    expect(rows.get('a')).toMatchObject({ minutes: 180, leftOutRecently: 0, belowTarget: false });
    expect(rows.get('c')).toMatchObject({ minutes: 0, matchesCalledUp: 2, leftOutRecently: 1, belowTarget: true });
    expect(rows.get('d')).toMatchObject({ minutes: 0, matchesCalledUp: 1, leftOutRecently: 2 });
  });

  it('lists who needs minutes, fewest first', () => {
    const need = playersNeedingMinutes(callupPlayingTime(matches, roster, '2026/2027', 'Sub-11')).map(
      (r) => r.playerId
    );
    expect(need.sort()).toEqual(['c', 'd']);
    expect(need).not.toContain('a');
  });
});
