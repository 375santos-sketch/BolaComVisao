import { describe, it, expect } from 'vitest';
import { normalizeClubState } from '../lib/storage';
import { Match } from '../types';

const m = (id: string, teamId?: string): Match =>
  ({ id, teamId, opponent: id, date: '2026-10-01', goals: [], subs: [], lineup: [] }) as unknown as Match;

const ids = (list: Match[]) => list.map((x) => x.id).sort();

describe('Jogos separados por equipa', () => {
  it('does not give the active team the matches of other teams', () => {
    const state = normalizeClubState({
      activeTeamId: 'sub11',
      matches: [m('a1', 'sub11')],
      teams: [{ id: 'sub11', matches: [m('a1', 'sub11')] } as any, { id: 'sub13', matches: [m('b1', 'sub13')] } as any]
    });
    expect(ids(state.matches)).toEqual(['a1']);
    expect(ids(state.teams.find((t) => t.id === 'sub13')!.matches)).toEqual(['b1']);
  });

  it('keeps a team without matches empty instead of copying everyone else’s', () => {
    const state = normalizeClubState({
      activeTeamId: 'sub11',
      matches: [m('a1', 'sub11')],
      teams: [{ id: 'sub11', matches: [m('a1', 'sub11')] } as any, { id: 'nova', matches: [] } as any]
    });
    expect(state.teams.find((t) => t.id === 'nova')!.matches).toEqual([]);
  });

  it('switching to an empty team shows no matches', () => {
    const state = normalizeClubState({
      activeTeamId: 'nova',
      matches: [],
      teams: [{ id: 'sub11', matches: [m('a1', 'sub11')] } as any, { id: 'nova', matches: [] } as any]
    });
    expect(state.matches).toEqual([]);
    expect(ids(state.teams.find((t) => t.id === 'sub11')!.matches)).toEqual(['a1']);
  });

  it('moves matches tagged with another team back to that team', () => {
    // Data mixed up by older versions: Sub-13 match sitting in the Sub-11 lists
    const state = normalizeClubState({
      activeTeamId: 'sub11',
      matches: [m('a1', 'sub11'), m('b1', 'sub13')],
      teams: [
        { id: 'sub11', matches: [m('a1', 'sub11'), m('b1', 'sub13')] } as any,
        { id: 'sub13', matches: [] } as any
      ]
    });
    expect(ids(state.matches)).toEqual(['a1']);
    expect(ids(state.teams.find((t) => t.id === 'sub11')!.matches)).toEqual(['a1']);
    expect(ids(state.teams.find((t) => t.id === 'sub13')!.matches)).toEqual(['b1']);
  });

  it('keeps untagged matches in the team where they are, and the active edit wins', () => {
    const edited = { ...m('x1'), opponent: 'Editado' } as Match;
    const state = normalizeClubState({
      activeTeamId: 'sub11',
      matches: [edited],
      teams: [{ id: 'sub11', matches: [m('x1')] } as any, { id: 'sub13', matches: [m('y1')] } as any]
    });
    expect(state.matches).toHaveLength(1);
    expect(state.matches[0].opponent).toBe('Editado');
    expect(ids(state.teams.find((t) => t.id === 'sub13')!.matches)).toEqual(['y1']);
  });

  it('a match deleted in the active team does not come back', () => {
    const state = normalizeClubState({
      activeTeamId: 'sub11',
      matches: [m('a1', 'sub11')],
      teams: [{ id: 'sub11', matches: [m('a1', 'sub11')] } as any, { id: 'sub13', matches: [m('b1', 'sub13')] } as any]
    });
    const afterDelete = normalizeClubState({
      ...state,
      matches: [],
      teams: state.teams.map((t) => (t.id === 'sub11' ? { ...t, matches: [] } : t))
    });
    expect(afterDelete.matches).toEqual([]);
  });
});
