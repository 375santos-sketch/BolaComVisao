import { describe, expect, it } from 'vitest';
import {
  computeStandings,
  leagueGames,
  mergeLeagueGames,
  ownLeagueGames,
  parseResults,
  teamKey
} from '../lib/leagueTable';
import { LeagueGame, LeagueSetup, Match } from '../types';

const g = (home: string, hg: number, ag: number, away: string, extra: Partial<LeagueGame> = {}): LeagueGame => ({
  id: `${home}-${away}`,
  home,
  away,
  homeGoals: hg,
  awayGoals: ag,
  ...extra
});

const match = (id: string, opponent: string, location: 'casa' | 'fora', us: number, them: number, extra = {}) =>
  ({
    id,
    opponent,
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    location,
    finished: true,
    goals: [
      ...Array.from({ length: us }, (_, i) => ({
        id: `s${i}`,
        type: 'scored',
        scorerId: null,
        assistId: null,
        minute: "1'"
      })),
      ...Array.from({ length: them }, (_, i) => ({
        id: `c${i}`,
        type: 'conceded',
        scorerId: null,
        assistId: null,
        minute: "2'"
      }))
    ],
    subs: [],
    lineup: [],
    convocados: [],
    capitao: null,
    ...extra
  }) as unknown as Match;

describe('Classificação: jogos dos Dragões', () => {
  it('turns finished championship games into results with the home team first', () => {
    const games = ownLeagueGames(
      [
        match('m1', 'Tramagal SU', 'fora', 10, 1),
        match('m2', 'Mação', 'casa', 2, 2),
        match('f', 'Abrantes', 'casa', 5, 0, { type: 'amigavel' }),
        match('old', 'Mação', 'casa', 1, 0, { season: '2025/2026', date: '2025-10-01' }),
        match('live', 'Abrantes', 'casa', 1, 0, { finished: false })
      ],
      'Dragões',
      '2026/2027'
    );
    expect(games.map((x) => `${x.home} ${x.homeGoals}-${x.awayGoals} ${x.away}`)).toEqual([
      'Tramagal SU 1-10 Dragões',
      'Dragões 2-2 Mação'
    ]);
  });

  it('ignores games of our team typed by hand (the app ones count)', () => {
    const league: LeagueSetup = {
      id: 'l',
      season: '2026/2027',
      teams: [],
      games: [g('Tramagal SU', 1, 0, 'dragoes'), g('Mação', 3, 1, 'Abrantes')]
    };
    const all = leagueGames(league, [match('m1', 'Tramagal SU', 'fora', 10, 1)], 'Dragões');
    expect(all.map((x) => x.home)).toEqual(['Mação', 'Tramagal SU']);
  });

  it('a pasted game that repeats one of ours under another name is not counted twice', () => {
    const league: LeagueSetup = {
      id: 'l',
      season: '2026/2027',
      teams: [],
      games: [g('Tramagal SU', 1, 10, 'GD Alferrarede'), g('Tramagal SU', 2, 0, 'Mação')]
    };
    const all = leagueGames(league, [match('m1', 'Tramagal SU', 'fora', 10, 1)], 'Dragões');
    expect(all.map((x) => `${x.home} ${x.homeGoals}-${x.awayGoals} ${x.away}`)).toEqual([
      'Tramagal SU 2-0 Mação',
      'Tramagal SU 1-10 Dragões'
    ]);
  });
});

describe('Classificação: tabela', () => {
  it('3 points per win, 1 per draw, sorted by points and goal difference', () => {
    const table = computeStandings(
      [g('Dragões', 3, 0, 'Mação'), g('Abrantes', 1, 1, 'Dragões'), g('Mação', 2, 0, 'Abrantes')],
      ['Dragões', 'Mação', 'Abrantes', 'Tramagal SU'],
      'Dragões'
    );
    expect(table.map((r) => [r.position, r.team, r.played, r.won, r.drawn, r.lost, r.goalDiff, r.points])).toEqual([
      [1, 'Dragões', 2, 1, 1, 0, 3, 4],
      [2, 'Mação', 2, 1, 0, 1, -1, 3],
      [3, 'Abrantes', 2, 0, 1, 1, -2, 1],
      [4, 'Tramagal SU', 0, 0, 0, 0, 0, 0]
    ]);
    expect(table.find((r) => r.ours)?.team).toBe('Dragões');
  });

  it('three teams level on points and on the games between them: goal difference decides', () => {
    const table = computeStandings([g('A', 1, 0, 'B'), g('B', 9, 0, 'C'), g('C', 1, 0, 'A')], [], 'X');
    expect(table.map((r) => [r.team, r.points, r.goalDiff])).toEqual([
      ['B', 3, 8],
      ['A', 3, 0],
      ['C', 3, -8]
    ]);
  });

  it('two teams level on points: the one that won the game between them is ahead, despite worse goal difference', () => {
    const table = computeStandings(
      [g('A', 1, 0, 'B'), g('B', 9, 0, 'C'), g('A', 0, 1, 'D'), g('C', 0, 0, 'D')],
      [],
      'X'
    );
    const a = table.findIndex((r) => r.team === 'A');
    const b = table.findIndex((r) => r.team === 'B');
    expect(table[a].points).toBe(table[b].points);
    expect(a).toBeLessThan(b);
  });

  it('matches names ignoring accents, case and dots', () => {
    expect(teamKey('C.D. Mação ')).toBe(teamKey('cd macao'));
    const table = computeStandings([g('Mação', 1, 0, 'Abrantes')], ['MACAO', 'Abrantes'], 'X');
    expect(table).toHaveLength(2);
  });
});

describe('Classificação: colar resultados', () => {
  it('reads text, dates, rounds and Excel columns; reports what it could not read', () => {
    const { games, skipped } = parseResults(
      [
        'Jornada 3',
        'Mação 2-2 Abrantes',
        '12/10 Torres Novas 0 x 4 Riachense',
        '2.ª Jornada',
        '05/10/2026\tFátima\t1\t3\tAtalaia',
        'texto sem resultado'
      ].join('\n'),
      '2026/2027'
    );
    expect(games.map((x) => [x.round, x.date, x.home, x.homeGoals, x.awayGoals, x.away])).toEqual([
      [3, undefined, 'Mação', 2, 2, 'Abrantes'],
      [3, '2026-10-12', 'Torres Novas', 0, 4, 'Riachense'],
      [2, '2026-10-05', 'Fátima', 1, 3, 'Atalaia']
    ]);
    expect(skipped).toEqual(['texto sem resultado']);
  });

  it('January to July belong to the second year of the season', () => {
    expect(parseResults('15/02 A 1-0 B', '2026/2027').games[0].date).toBe('2027-02-15');
  });

  it('pasting the same results twice does not duplicate them (the new score wins)', () => {
    const first = parseResults('Jornada 1\nMação 2-2 Abrantes').games;
    const again = parseResults('Jornada 1\nMacao 3-2 Abrantes').games;
    const merged = mergeLeagueGames(first, again);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ homeGoals: 3, id: first[0].id });
    expect(mergeLeagueGames(merged, parseResults('Jornada 2\nAbrantes 1-0 Mação').games)).toHaveLength(2);
  });
});

describe('Classificação: página da FPF colada', () => {
  // Text exactly as copied from resultados.fpf.pt (Série 10, jornada 3)
  const page = [
    'SÉRIE 10',
    ' ',
    'JORNADAS',
    '12345',
    'Ad Mação\t3 - 7',
    '24 OUT',
    'Casa Povo Pego',
    'C Mun A P Carreira',
    "Cdr Alferrarede 'A'\t7 - 3",
    '24 OUT',
    "S.Abrantes Benfica 'B'",
    'Campo Cuf',
    'Gdr Os Esparteiros\t1 - 21',
    '24 OUT',
    'Tramagal Su',
    'Campo Da Lameira Redonda'
  ].join('\n');

  it('reads every game of the round, with the date in the season, ignoring headers and pitches', () => {
    const { games, skipped } = parseResults(page, '2026/2027');
    expect(games.map((g) => [g.date, g.home, g.homeGoals, g.awayGoals, g.away])).toEqual([
      ['2026-10-24', 'Ad Mação', 3, 7, 'Casa Povo Pego'],
      ['2026-10-24', "Cdr Alferrarede 'A'", 7, 3, "S.Abrantes Benfica 'B'"],
      ['2026-10-24', 'Gdr Os Esparteiros', 1, 21, 'Tramagal Su']
    ]);
    expect(skipped).toEqual([]);
    // A game not played yet (time instead of score) is ignored
    expect(parseResults('Ad Mação\t11:00\n31 OUT\nTramagal Su\nCampo X', '2026/2027').games).toEqual([]);
  });

  it('recognises our team and the names the app already uses', async () => {
    const { harmonizeTeams } = await import('../lib/leagueTable');
    const { games, ourAlias } = harmonizeTeams(parseResults(page, '2026/2027').games, {
      ourName: 'Dragões de Alferrarede - Sub11',
      clubName: 'Dragões de Alferrarede - Sub11',
      known: ['Esparteiros', 'Tramagal SU', 'Mação']
    });
    expect(ourAlias).toBe("Cdr Alferrarede 'A'");
    expect(games.map((g) => `${g.home} ${g.homeGoals}-${g.awayGoals} ${g.away}`)).toEqual([
      'Mação 3-7 Casa Povo Pego',
      "Dragões de Alferrarede - Sub11 7-3 S.Abrantes Benfica 'B'",
      'Esparteiros 1-21 Tramagal SU'
    ]);
  });

  it('our pasted game counts when the app does not have it, and is not doubled when it does', () => {
    const ourName = 'Dragões';
    const pasted = {
      id: 'x',
      date: '2026-10-24',
      home: 'Dragões',
      away: "S.Abrantes Benfica 'B'",
      homeGoals: 7,
      awayGoals: 3
    };
    const league: LeagueSetup = { id: 'l', season: '2026/2027', teams: [], games: [pasted] };
    expect(leagueGames(league, [], ourName)).toHaveLength(1);
    const appGame = match('m9', "S.Abrantes Benfica 'B'", 'casa', 7, 3, { date: '2026-10-24' });
    const both = leagueGames(league, [appGame], ourName);
    expect(both).toHaveLength(1);
    expect(both[0].fromApp).toBe(true);
  });
});
