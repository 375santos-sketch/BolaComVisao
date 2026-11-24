import { describe, it, expect } from 'vitest';
import { normalizeClubState } from '../lib/storage';
import { switchTeam, teamCounts } from '../lib/teamSwitch';
import { AppState, Match, Player, ScheduledMatch, SquadProfile } from '../types';

/**
 * P0-02 — Troca de equipa e agenda por equipa. Two age groups of the SAME club (same club name, as in real clubs) and
 * a club whose name contains "drag": nothing of one team may appear in another. Fictitious data only.
 */
const CLUB = 'Clube Fictício';
const player = (id: string): Player => ({
  id,
  name: `Atleta ${id}`,
  number: 1,
  positions: '',
  birthDate: null,
  active: true
});
const match = (id: string, teamId?: string): Match =>
  ({
    id,
    teamId,
    teamName: CLUB,
    opponent: `Adv ${id}`,
    date: '2026-10-01',
    goals: [],
    subs: [],
    lineup: [],
    finished: true
  }) as unknown as Match;
const game = (id: string, teamId?: string, teamName = CLUB): ScheduledMatch =>
  ({
    id,
    teamId,
    teamName,
    opponent: `Adv ${id}`,
    date: '2026-12-01',
    time: '10:00',
    location: 'casa'
  }) as unknown as ScheduledMatch;
const team = (id: string, extra: Partial<SquadProfile> = {}): SquadProfile =>
  ({
    id,
    clubName: CLUB,
    category: id,
    season: '2026/2027',
    roster: [],
    matches: [],
    trainings: [],
    schedule: [],
    ...extra
  }) as SquadProfile;
const ids = (list: Array<{ id: string }> | undefined) => (list || []).map((x) => x.id).sort();
const teamOf = (s: AppState, id: string) => s.teams.find((t) => t.id === id)!;

describe('P0-02 · agenda por equipa (normalizeClubState)', () => {
  it('os jogos agendados de um escalão não passam para outro escalão do mesmo clube', () => {
    const s = normalizeClubState({
      activeTeamId: 'sub11',
      schedule: [game('g1', 'sub11'), game('g2')],
      teams: [
        team('sub11', { schedule: [game('g1', 'sub11'), game('g2')] }),
        team('sub13', { schedule: [game('h1', 'sub13')] })
      ]
    });
    expect(ids(teamOf(s, 'sub13').schedule)).toEqual(['h1']);
    expect(ids(teamOf(s, 'sub11').schedule)).toEqual(['g1', 'g2']);
    expect(ids(s.schedule)).toEqual(['g1', 'g2']);
  });

  it('um clube com "drag" no nome não recebe a agenda sem equipa dos outros', () => {
    const s = normalizeClubState({
      activeTeamId: 'sub11',
      schedule: [game('g1'), game('g2', undefined, 'Outro Clube')],
      teams: [
        team('sub11', { schedule: [game('g1'), game('g2', undefined, 'Outro Clube')] }),
        team('drag', { clubName: 'Dragões Fictícios', schedule: [] })
      ]
    });
    expect(teamOf(s, 'drag').schedule).toEqual([]);
  });

  it('não apaga nada que já esteja na lista de uma equipa (sem alterar dados guardados)', () => {
    const s = normalizeClubState({
      activeTeamId: 'sub11',
      schedule: [game('g1', 'sub11')],
      teams: [
        team('sub11', { schedule: [game('g1', 'sub11')] }),
        team('sub13', { schedule: [game('h1', 'sub13'), game('antigo')] })
      ]
    });
    expect(ids(teamOf(s, 'sub13').schedule)).toEqual(['antigo', 'h1']);
  });

  it('normalizar duas vezes dá o mesmo resultado (sem crescer a cada gravação)', () => {
    const raw = {
      activeTeamId: 'sub11',
      schedule: [game('g1', 'sub11')],
      teams: [team('sub11', { schedule: [game('g1', 'sub11')] }), team('sub13')]
    };
    const once = normalizeClubState(raw);
    const twice = normalizeClubState(once);
    expect(ids(teamOf(twice, 'sub13').schedule)).toEqual(ids(teamOf(once, 'sub13').schedule));
    expect(ids(teamOf(twice, 'sub13').schedule)).toEqual([]);
  });
});

/** A club with two age groups, Sub-11 active, after the app's own normalization (as on the device). */
const twoTeams = (sub13: Partial<SquadProfile> = {}) =>
  normalizeClubState({
    activeTeamId: 'sub11',
    roster: [player('a1'), player('a2')],
    matches: [match('m1', 'sub11'), match('m2')],
    schedule: [game('g1', 'sub11'), game('g2')],
    teams: [
      team('sub11', {
        roster: [player('a1'), player('a2')],
        matches: [match('m1', 'sub11'), match('m2')],
        schedule: [game('g1', 'sub11'), game('g2')]
      }),
      team('sub13', sub13)
    ]
  });

describe('P0-02 · trocar de equipa (switchTeam)', () => {
  it('trocar para uma equipa vazia mostra 0 atletas, 0 jogos e agenda vazia', () => {
    const change = switchTeam(twoTeams(), 'sub13')!;
    expect(change.activeTeamId).toBe('sub13');
    expect(change.roster).toEqual([]);
    expect(change.matches).toEqual([]);
    expect(change.schedule).toEqual([]);
    expect(change.trainings).toEqual([]);
  });

  it('os jogos sem equipa da equipa que se deixa não passam para a nova', () => {
    const change = switchTeam(twoTeams({ matches: [match('n1', 'sub13')] }), 'sub13')!;
    expect(ids(change.matches)).toEqual(['n1']);
  });

  it('a equipa que se deixa guarda o que estava a ser editado', () => {
    const s = twoTeams();
    const edited = { ...s, roster: [...s.roster, player('a3')], matches: [...s.matches, match('m3', 'sub11')] };
    const change = switchTeam(edited, 'sub13')!;
    const left = change.teams!.find((t) => t.id === 'sub11')!;
    expect(ids(left.roster)).toEqual(['a1', 'a2', 'a3']);
    expect(ids(left.matches)).toEqual(['m1', 'm2', 'm3']);
  });

  it('ir e voltar deixa as duas equipas como estavam', () => {
    const start = twoTeams({
      roster: [player('b1')],
      matches: [match('n1', 'sub13')],
      schedule: [game('h1', 'sub13')]
    });
    const there = normalizeClubState({ ...start, ...switchTeam(start, 'sub13')! });
    const back = normalizeClubState({ ...there, ...switchTeam(there, 'sub11')! });
    for (const id of ['sub11', 'sub13']) {
      expect(ids(teamOf(back, id).roster), id).toEqual(ids(teamOf(start, id).roster));
      expect(ids(teamOf(back, id).matches), id).toEqual(ids(teamOf(start, id).matches));
      expect(ids(teamOf(back, id).schedule), id).toEqual(ids(teamOf(start, id).schedule));
    }
    expect(ids(back.roster)).toEqual(['a1', 'a2']);
  });

  it('um clube com "drag" no nome não recebe nada da outra equipa', () => {
    const s = twoTeams({ clubName: 'Dragões Fictícios' });
    const change = switchTeam(s, 'sub13')!;
    expect(change.matches).toEqual([]);
    expect(change.schedule).toEqual([]);
    expect(change.myClubName).toBe('Dragões Fictícios');
  });

  it('uma equipa que não existe não muda nada', () => {
    expect(switchTeam(twoTeams(), 'nao-existe')).toBeNull();
  });
});

describe('P0-02 · números do cartão de cada equipa (teamCounts)', () => {
  it('cada cartão conta só os dados da sua equipa', () => {
    const s = twoTeams({ roster: [player('b1')], matches: [match('n1', 'sub13')], schedule: [game('h1', 'sub13')] });
    expect(teamCounts(s, teamOf(s, 'sub11'))).toEqual({
      athletes: 2,
      trainings: 0,
      played: 2,
      scheduled: 2,
      totalGames: 4
    });
    expect(teamCounts(s, teamOf(s, 'sub13'))).toEqual({
      athletes: 1,
      trainings: 0,
      played: 1,
      scheduled: 1,
      totalGames: 2
    });
  });

  it('um jogo agendado que já foi jogado conta uma vez; atletas inativos não contam', () => {
    const s = twoTeams({
      roster: [player('b1'), { ...player('b2'), active: false }],
      matches: [match('h1', 'sub13')],
      schedule: [game('h1', 'sub13')]
    });
    expect(teamCounts(s, teamOf(s, 'sub13'))).toEqual({
      athletes: 1,
      trainings: 0,
      played: 1,
      scheduled: 0,
      totalGames: 1
    });
  });
});
