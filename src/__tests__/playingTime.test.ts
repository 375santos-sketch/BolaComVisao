import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeSeasonPlayingTime, getLiveMatchMinutes, getCalledUpPlayers } from '../lib/playingTime';
import { Match, Player } from '../types';

const roster: Player[] = ['a', 'b', 'c', 'd'].map((id, i) => ({
  id,
  name: id.toUpperCase(),
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));

const finishedMatch = (overrides: Partial<Match> = {}): Match =>
  ({
    id: 'm1',
    opponent: 'X',
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: ['a', 'b'],
    lineupSize: 2,
    capitao: null,
    convocados: ['a', 'b', 'c', 'd'],
    halfDurationMinutes: 30,
    ...overrides
  }) as Match;

afterEach(() => vi.useRealTimers());

describe('Minutos de jogo — resumo da época', () => {
  it('counts minutes, call-ups, games played and starts', () => {
    const m = finishedMatch({
      subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", minuteInHalf: 10, half: 2 }]
    });
    const byId = Object.fromEntries(computeSeasonPlayingTime([m], roster, 'Sub-11').map((p) => [p.playerId, p]));
    expect(byId.a).toMatchObject({
      minutes: 60,
      availableMinutes: 60,
      matchesPlayed: 1,
      starts: 1,
      belowTarget: false
    });
    expect(byId.b).toMatchObject({ minutes: 40, starts: 1, belowTarget: false });
    expect(byId.c).toMatchObject({ minutes: 20, matchesPlayed: 1, starts: 0, belowTarget: true });
    expect(byId.d).toMatchObject({ minutes: 0, matchesCalledUp: 1, matchesPlayed: 0, belowTarget: true });
  });

  it('lists the players who need minutes first', () => {
    const ordered = computeSeasonPlayingTime([finishedMatch()], roster, 'Sub-11').map((p) => p.playerId);
    expect(ordered.slice(0, 2).sort()).toEqual(['c', 'd']);
  });

  it('uses the category duration for imported matches without a clock', () => {
    const imported = finishedMatch({ halfDurationMinutes: undefined, timer: undefined });
    const a = computeSeasonPlayingTime([imported], roster, 'Sub-13').find((p) => p.playerId === 'a')!;
    expect(a.minutes).toBe(70); // 2 x 35' (Sub-13)
  });

  it('ignores unfinished matches; the share is over all the games, called up or not', () => {
    const m = finishedMatch({ convocados: ['a', 'b'] });
    const live = finishedMatch({ id: 'm2', finished: false });
    const rows = computeSeasonPlayingTime([m, live], roster, 'Sub-11');
    const total = rows.find((p) => p.playerId === 'a')!.availableMinutes;
    expect(total).toBeGreaterThan(0);
    const d = rows.find((p) => p.playerId === 'd')!;
    expect(d).toMatchObject({ matchesCalledUp: 0, minutes: 0, availableMinutes: total, share: 0, belowTarget: true });
  });

  it('takes the share over the minutes of all the games (called up for 1 of 2 games: 30 of 120 = 25%)', () => {
    const g1 = finishedMatch({
      convocados: ['a', 'b', 'c'],
      subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "30'", minuteInHalf: 0, half: 2, isHalftime: false }]
    });
    const g2 = finishedMatch({ id: 'm2', convocados: ['a', 'b', 'd'] });
    const byId = Object.fromEntries(computeSeasonPlayingTime([g1, g2], roster, 'Sub-11').map((p) => [p.playerId, p]));
    expect(byId.c).toMatchObject({ minutes: 30, availableMinutes: 120, share: 0.25, belowTarget: true });
    expect(byId.d).toMatchObject({ minutes: 0, availableMinutes: 120, share: 0, matchesCalledUp: 1 });
    expect(byId.a).toMatchObject({ minutes: 120, share: 1 });
    // The team's time on the pitch adds up: 2 players x 2 games x 60'
    expect(Object.values(byId).reduce((n, r) => n + r.minutes, 0)).toBe(240);
  });

  it('falls back to participants when the call-up list is empty', () => {
    const m = finishedMatch({
      convocados: [],
      subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", minuteInHalf: 10, half: 2 }]
    });
    expect(getCalledUpPlayers(m).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('Minutos de jogo — ao vivo', () => {
  it('counts minutes up to the current clock time in the 2nd half', () => {
    vi.useFakeTimers();
    const now = new Date('2026-10-17T10:00:00Z').getTime();
    vi.setSystemTime(now);
    const live = finishedMatch({
      finished: false,
      phase: 'parte2',
      matchPhase: 'parte2',
      // 30' first half + 12' of the second half running
      timer: { isRunning: true, elapsedMs: 40 * 60000, lastStartTs: now - 2 * 60000, half1DurationMs: 30 * 60000 },
      subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "35'", minuteInHalf: 5, half: 2 }]
    });
    const { played, elapsedMinutes } = getLiveMatchMinutes(live);
    expect(elapsedMinutes).toBe(42);
    expect(played).toEqual({ a: 42, b: 35, c: 7, d: 0 });
  });

  it('is zero for everyone before kick-off', () => {
    const { played } = getLiveMatchMinutes(finishedMatch({ finished: false, phase: 'nao_iniciado', timer: undefined }));
    expect(Object.values(played)).toEqual([0, 0, 0, 0]);
  });
});
