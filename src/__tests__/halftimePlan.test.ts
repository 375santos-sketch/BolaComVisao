import { describe, it, expect } from 'vitest';
import { halftimePlan } from '../lib/halftimePlan';
import { Match, Player } from '../types';

// 4 called up, 2 a side, 2 x 30'. Season so far: one game where a and b played everything.
const roster = [
  { id: 'a', name: 'Afonso', number: 1, positions: 'Guarda-Redes', birthDate: null, active: true },
  { id: 'b', name: 'Bruno', number: 2, positions: 'Médio', birthDate: null, active: true },
  { id: 'c', name: 'Carlos', number: 3, positions: 'Médio', birthDate: null, active: true },
  { id: 'd', name: 'Duarte', number: 4, positions: 'Avançado', birthDate: null, active: true }
] as Player[];

const base = {
  opponent: 'X',
  season: '2026/2027',
  type: 'campeonato',
  location: 'casa',
  goals: [],
  subs: [],
  lineupSize: 2,
  capitao: null,
  convocados: ['a', 'b', 'c', 'd'],
  halfDurationMinutes: 30
};
const played = { ...base, id: 'm1', date: '2026-10-03', finished: true, lineup: ['a', 'b'] } as unknown as Match;
// Live game at halftime: a and c played the first half (30')
const live = {
  ...base,
  id: 'm2',
  date: '2026-10-10',
  finished: false,
  matchPhase: 'intervalo',
  lineup: ['a', 'c'],
  timer: { isRunning: false, elapsedMs: 1800000, lastStartTs: null, half1DurationMs: 1800000 }
} as unknown as Match;

describe('Intervalo: minutos na época e sugestão para a 2.ª parte', () => {
  const plan = halftimePlan(live, [played, live], roster, 'Sub-11');
  const byId = Object.fromEntries(plan.rows.map((r) => [r.playerId, r]));

  it('season share counting the first half (of 60 + 60 minutes)', () => {
    expect(byId.d).toMatchObject({ firstHalf: 0, shareIfBenched: 0, shareIfPlays: 0.25 });
    expect(byId.c).toMatchObject({ firstHalf: 30, shareIfBenched: 0.25, shareIfPlays: 0.5 });
    expect(byId.b).toMatchObject({ firstHalf: 0, shareIfBenched: 0.5 });
    expect(byId.a).toMatchObject({ firstHalf: 30, shareIfBenched: 0.75 });
  });

  it('suggests whoever is furthest behind, keeping a goalkeeper', () => {
    // d and c are furthest behind, but a is the only goalkeeper: he replaces the last outfield pick
    expect(plan.suggested.sort()).toEqual(['a', 'd']);
    expect(plan.rows[0].playerId).toBe('d');
  });

  it('leaves out a player sent off', () => {
    const red = { ...live, cards: [{ id: 'k', playerId: 'd', color: 'Vermelho', minute: 10 }] } as unknown as Match;
    expect(halftimePlan(red, [played, red], roster, 'Sub-11').rows.map((r) => r.playerId)).not.toContain('d');
  });
});
