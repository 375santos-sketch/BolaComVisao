import { describe, expect, it } from 'vitest';
import { cleanSession, duplicateSession, filterSessions, newSession, teamActions, withSession } from '../lib/vjLibrary';
import { assembleState, extractRecords } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { VjSession } from '../types';

// Fictitious data, only for this test
const NOW = '2026-11-15T10:00:00.000Z';
const session = (id: string, patch: Partial<VjSession> = {}): VjSession => ({
  ...newSession({ id, title: `Sessão ${id}`, now: NOW }),
  ...patch
});

describe('Visão de Jogo — biblioteca da equipa (VJ1)', () => {
  it('states: the team coach publishes, archives and reopens', () => {
    expect(teamActions('rascunho').map((a) => a.to)).toEqual(['publicado']);
    expect(teamActions('publicado').map((a) => a.to)).toEqual(['rascunho', 'arquivado']);
    expect(teamActions('arquivado').map((a) => a.to)).toEqual(['rascunho']);
  });

  it('only valid YouTube videos, no repeated competencies, a title always', () => {
    const s = cleanSession(
      session('s1', {
        title: '  ',
        competencies: ['decisao', 'decisao', 'passe'],
        items: [
          { id: 'v1', kind: 'video', youtubeId: 'dQw4w9WgXcQ' },
          { id: 'v2', kind: 'video', youtubeId: 'não é um id' }
        ]
      }),
      NOW
    );
    expect(s.title).toBe('Sessão sem título');
    expect(s.competencies).toEqual(['decisao', 'passe']);
    expect(s.items.map((i) => i.id)).toEqual(['v1']);
  });

  it('filters: archived ones hidden unless asked; favourites first; by competency', () => {
    const list = [
      session('a', { status: 'publicado', competencies: ['passe'], updatedAt: '2026-11-10' }),
      session('b', { status: 'arquivado', competencies: ['passe'] }),
      session('c', { favorite: true, competencies: ['decisao'], updatedAt: '2026-11-01' })
    ];
    expect(filterSessions(list, {}).map((s) => s.id)).toEqual(['c', 'a']);
    expect(filterSessions(list, { status: 'arquivado' }).map((s) => s.id)).toEqual(['b']);
    expect(filterSessions(list, { competency: 'passe' }).map((s) => s.id)).toEqual(['a']);
    expect(filterSessions(list, { favorites: true }).map((s) => s.id)).toEqual(['c']);
  });

  it('duplicating makes a new draft that remembers where it came from', () => {
    const copy = duplicateSession(session('a', { status: 'publicado', favorite: true }), 'z', NOW);
    expect(copy).toMatchObject({ id: 'z', status: 'rascunho', favorite: false, copiedFrom: 'a' });
    expect(withSession([session('a')], copy).map((s) => s.id)).toEqual(['a', 'z']);
  });

  it("each session is its own record of the team (synced and protected like the team's other data)", () => {
    const state = normalizeClubState({
      activeTeamId: 'eq1',
      teams: [
        {
          id: 'eq1',
          clubName: 'Clube Exemplo',
          category: 'Sub-11',
          season: '2026/2027',
          roster: [],
          matches: [],
          trainings: [],
          schedule: [],
          tactics: [],
          tacticFormat: 7,
          vjSessions: [session('s1', { status: 'publicado' })]
        }
      ]
    } as never);
    const records = extractRecords(state);
    expect(records.get('challenge__eq1__s1')).toMatchObject({ kind: 'challenge', teamId: 'eq1' });
    expect(JSON.stringify(records.get('club')?.data)).not.toContain('vjSessions');
    const back = assembleState(records, { ...state, teams: [] } as never);
    expect(back.teams.find((t) => t.id === 'eq1')?.vjSessions?.[0]).toMatchObject({ id: 's1', status: 'publicado' });
  });
});
