import { describe, it, expect } from 'vitest';
import { seasonFromDate, buildDefaultSeasons } from '../lib/utils';
import { normalizeClubState } from '../lib/storage';
import { Match } from '../types';

const m = (id: string, date: string, season = '2025/2026'): Match =>
  ({ id, teamId: 't1', opponent: id, date, season, goals: [], subs: [], lineup: [] }) as unknown as Match;

describe('Épocas calculadas pela data', () => {
  it('maps dates to July–June seasons', () => {
    expect(seasonFromDate('2026-10-17')).toBe('2026/2027');
    expect(seasonFromDate('2026-07-01')).toBe('2026/2027');
    expect(seasonFromDate('2026-06-30')).toBe('2025/2026');
    expect(seasonFromDate('2027-01-05')).toBe('2026/2027');
  });

  it('builds previous/current/next seasons around the given one', () => {
    const seasons = buildDefaultSeasons('2026/2027');
    expect(seasons.map((s) => s.name)).toEqual(['2026/2027', '2025/2026', '2027/2028']);
    expect(seasons.filter((s) => s.isCurrent).map((s) => s.name)).toEqual(['2026/2027']);
  });
});

describe('Correção única das épocas (dados antigos)', () => {
  const legacy = {
    activeTeamId: 't1',
    season: '2025/2026',
    matches: [m('tramagal', '2026-10-17'), m('antigo', '2026-03-01')],
    teams: [
      {
        id: 't1',
        season: '2025/2026',
        matches: [m('tramagal', '2026-10-17'), m('antigo', '2026-03-01')],
        schedule: []
      } as any
    ]
  };

  it('gives each match the season of its date and moves the team to its latest season', () => {
    const state = normalizeClubState(legacy);
    const byId = Object.fromEntries(state.matches.map((x) => [x.id, x.season]));
    expect(byId).toEqual({ tramagal: '2026/2027', antigo: '2025/2026' });
    expect(state.teams[0].season).toBe('2026/2027');
    expect(state.season).toBe('2026/2027');
    expect(state.seasons?.find((s) => s.isCurrent)?.name).toBe('2026/2027');
    expect(state.version).toBeGreaterThanOrEqual(2); // later one-off migrations bump it further
  });

  it('runs only once, so a season picked by the coach afterwards is kept', () => {
    const migrated = normalizeClubState(legacy);
    const picked = normalizeClubState({
      ...migrated,
      season: '2025/2026',
      teams: migrated.teams.map((t) => ({ ...t, season: '2025/2026' }))
    });
    expect(picked.season).toBe('2025/2026');
  });

  it('does not move an archived team whose games are all from an old season', () => {
    const state = normalizeClubState({
      activeTeamId: 't1',
      teams: [{ id: 't1', season: '2024/2025', matches: [m('velho', '2025-03-01', '2024/2025')] } as any]
    });
    expect(state.season).toBe('2024/2025');
  });
});
