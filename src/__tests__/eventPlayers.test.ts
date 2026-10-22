import { describe, expect, it } from 'vitest';
import { withRosterIds } from '../lib/eventPlayers';
import { buildGamesDashboard } from '../lib/gamesDashboard';
import { Match, Player } from '../types';

const roster = [
  { id: 'a', name: 'Afonso Silva', nickname: 'Afonsinho', number: 18, positions: '', birthDate: null, active: true },
  { id: 'b', name: 'Bernardo', number: 7, positions: '', birthDate: null, active: true }
] as Player[];

// Goals from older versions and imports: the athlete is named, not pointed to by id.
const legacy = {
  id: 'm1',
  opponent: 'Adversário FC',
  date: '2026-10-10',
  season: '2026/2027',
  type: 'campeonato',
  location: 'casa',
  finished: true,
  goals: [
    { id: 'g1', type: 'scored', scorerId: 'afonso silva', assistId: null, assist: 'Bernardo', minute: 5 },
    { id: 'g2', type: 'scored', scorerId: null, scorer: '7 - Bernardo', assistId: null, minute: 40 },
    { id: 'g3', type: 'scored', scorerId: null, player: 'Afonsinho', assistant: 'b', assistId: null, minute: 50 },
    { id: 'g4', type: 'scored', scorerId: 'autogolo', assistId: null, minute: 55 },
    { id: 'g5', type: 'conceded', scorerId: null, assistId: null, minute: 20 }
  ],
  cards: [{ id: 'c1', playerId: '', player: 'Bernardo', color: 'Amarelo', minute: 10 }],
  subs: [],
  lineup: ['a', 'b'],
  convocados: ['a', 'b'],
  capitao: null,
  halfDurationMinutes: 30
} as unknown as Match;

describe('athletes named in goals and cards', () => {
  it('points scorers, assists and cards to the roster ids', () => {
    const [m] = withRosterIds([legacy], roster);
    expect(m.goals.map((g) => [g.scorerId, g.assistId])).toEqual([
      ['a', 'b'],
      ['b', null],
      ['a', 'b'],
      ['autogolo', null],
      [null, null]
    ]);
    expect(m.cards?.[0].playerId).toBe('b');
  });

  it('counts those goals in the dashboard', () => {
    const d = buildGamesDashboard([legacy], { roster, category: 'Sub-11' });
    expect(d.scored).toBe(4);
    expect(d.topGoals).toEqual([
      { rank: 1, name: 'Afonso Silva', value: 2 },
      { rank: 2, name: 'Bernardo', value: 1 }
    ]);
    expect(d.squad.find((s) => s.playerId === 'b')).toMatchObject({ goals: 1, assists: 2 });
  });
});
