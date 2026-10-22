import { describe, expect, it } from 'vitest';
import { normalizeClubState, withMatchRoundsRestored } from '../lib/storage';
import { getMatchPhase, getMatchSquad } from '../lib/matchPhaseUtils';
import { extractRecords, hashData } from '../lib/recordSync';
import { AppState, Match, Player, ScheduledMatch } from '../types';

const match = (id: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: 'Abrantes',
    date: '2026-10-18',
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: [],
    capitao: null,
    ...extra
  }) as Match;

const state = (matches: Match[]): AppState =>
  normalizeClubState({
    myClubName: 'Dragões',
    activeTeamId: 't1',
    teams: [{ id: 't1', name: 'Sub-11', matches, schedule: [], roster: [] }],
    matches
  } as unknown as AppState);

describe('Jornada dos jogos registados ao vivo', () => {
  it('restores the round that the live clock overwrote, keeping the clock state in matchPhase', () => {
    const broken = match('m1', {
      phase: 'parte2',
      originalSchedule: { id: 's1', phase: 'Jornada 5' } as ScheduledMatch
    });
    const fixed = withMatchRoundsRestored(state([broken])).matches[0];
    expect(fixed.phase).toBe('Jornada 5');
    expect(fixed.matchPhase).toBe('parte2');
    expect(getMatchPhase(fixed)).toBe('parte2');
  });

  it('leaves the round empty when the Agenda had none', () => {
    const fixed = withMatchRoundsRestored(state([match('m1', { phase: 'intervalo', finished: false })])).matches[0];
    expect(fixed.phase).toBe('');
    expect(getMatchPhase(fixed)).toBe('intervalo');
  });

  it('does not touch real rounds and is idempotent (no endless re-saving)', () => {
    const once = state([match('m1', { phase: 'Jornada 3' }), match('m2', { phase: 'parte1', matchPhase: 'parte1' })]);
    expect(once.matches.find((m) => m.id === 'm1')?.phase).toBe('Jornada 3');
    const twice = normalizeClubState(once);
    expect(hashData([...extractRecords(twice).values()].map((r) => r.data))).toBe(
      hashData([...extractRecords(once).values()].map((r) => r.data))
    );
  });
});

describe('Jogadores disponíveis no jogo em direto', () => {
  const roster = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'x'].map((id) => ({ id, name: id }) as Player);
  const called = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('offers only the players called up', () => {
    const ids = getMatchSquad(roster, match('m', { finished: false, convocados: called })).map((p) => p.id);
    expect(ids).toEqual(called);
  });

  it('uses the Agenda call-up for matches started without it, and keeps players already used', () => {
    const m = match('m', {
      finished: false,
      originalSchedule: { id: 's1', callup: called } as ScheduledMatch,
      subs: [{ id: 's', outId: 'a', inId: 'x', minute: "10'" } as Match['subs'][number]]
    });
    expect(getMatchSquad(roster, m).map((p) => p.id)).toContain('x');
    expect(getMatchSquad(roster, m)).toHaveLength(9);
  });

  it('offers the whole squad when the call-up is too short for a lineup', () => {
    expect(getMatchSquad(roster, match('m', { finished: false, convocados: ['a'] }))).toHaveLength(9);
  });
});
