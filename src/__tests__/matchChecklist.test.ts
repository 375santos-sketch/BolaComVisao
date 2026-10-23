import { describe, it, expect } from 'vitest';
import { buildMatchChecklist, minutesBalance } from '../lib/matchChecklist';
import { homeFirstScore } from '../lib/utils';
import { Match } from '../types';

// 2 players a side, halves of 30' (60' a game): minutes must add up to 2 x 60' = 120'
const game = (overrides: Partial<Match> = {}): Match =>
  ({
    id: 'm1',
    opponent: 'Tramagal SU',
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    location: 'fora',
    finished: false,
    goals: [{ id: 'g1', type: 'scored', scorerId: 'a', assistId: null, minute: 5, goalType: 'Bola jogada' }],
    subs: [{ id: 's1', outId: 'b', inId: 'c', minute: '10', half: 1, minuteInHalf: 10 }],
    lineup: ['a', 'b'],
    lineupSize: 2,
    convocados: ['a', 'b', 'c'],
    capitao: null,
    timer: {
      isRunning: false,
      elapsedMs: 0,
      lastStartTs: null,
      half1DurationMs: 30 * 60000,
      half2DurationMs: 30 * 60000
    },
    ...overrides
  }) as Match;

const byId = (m: Match) => Object.fromEntries(buildMatchChecklist(m, 'Sub-11').map((c) => [c.id, c]));

describe('Verificação ao terminar o jogo', () => {
  it('all good: starters complete and the minutes add up', () => {
    expect(minutesBalance(game(), 'Sub-11')).toMatchObject({ total: 120, expected: 120, ok: true });
    const c = byId(game());
    expect(c.starters).toMatchObject({ ok: true, important: true });
    expect(c.minutes).toMatchObject({ ok: true, important: true });
    expect(c.scorers.ok).toBe(true);
  });

  it('flags missing starters and minutes that do not add up', () => {
    const c = byId(game({ lineup: ['a'] }));
    expect(c.starters).toMatchObject({ ok: false, details: expect.stringContaining('1 de 2') });
    expect(c.minutes.ok).toBe(false);
    expect(c.minutes.details).toContain("deviam somar 120'");
  });

  it('flags goals without scorer, minute or origin (not as important)', () => {
    const c = byId(
      game({ goals: [{ id: 'g1', type: 'scored', scorerId: null, assistId: null, minute: null }] as never })
    );
    expect(c.scorers).toMatchObject({ ok: false, important: false, details: '1 golo sem marcador' });
    expect(c.goalMinutes.details).toBe('1 sem minuto · 1 sem origem');
  });

  it('does not check the minutes after a sending-off', () => {
    const m = game({ lineup: ['a'], cards: [{ id: 'k', playerId: 'a', color: 'Vermelho', minute: 40 }] as never });
    expect(byId(m).minutes.ok).toBe(true);
  });
});

describe('Resultado com a equipa da casa primeiro', () => {
  it('reads like a scoreboard', () => {
    expect(homeFirstScore(10, 1, false)).toBe('1-10');
    expect(homeFirstScore(10, 1, true)).toBe('10-1');
    expect(homeFirstScore(2, 3, false, ' – ')).toBe('3 – 2');
  });
});
