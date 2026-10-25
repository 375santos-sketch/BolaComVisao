import { describe, expect, it } from 'vitest';
import { cleanPrintGames, geminiErrorKind, parseModelJson, printToLeagueGames } from '../lib/printJornada';
import {
  harmonizeTeams,
  leagueGames,
  looseDate,
  phaseLabel,
  phaseRange,
  seasonPhases,
  withoutOurGames
} from '../lib/leagueTable';
import { LeagueSetup, Match } from '../types';

describe('leitura do print da jornada', () => {
  it('fica só com jogos bem formados e sem repetidos', () => {
    const games = cleanPrintGames({
      games: [
        { home: ' Equipa Azul ', away: 'Equipa Verde', homeGoals: 3, awayGoals: 7, date: '24 OUT' },
        { home: 'Equipa Azul', away: 'Equipa Verde', homeGoals: 3, awayGoals: 7 },
        { home: 'Equipa Rosa', away: 'Equipa Rosa', homeGoals: 1, awayGoals: 0 },
        { home: 'Equipa Lilás', away: 'Equipa Cinza', homeGoals: -1, awayGoals: 0 },
        { home: 'Equipa Lilás', away: '', homeGoals: 1, awayGoals: 0 },
        { home: 'Equipa <b>Ouro</b>', away: 'Equipa Prata', homeGoals: '2', awayGoals: 2, round: 3 },
        'lixo'
      ]
    });
    expect(games).toEqual([
      { home: 'Equipa Azul', away: 'Equipa Verde', homeGoals: 3, awayGoals: 7, date: '24 OUT', round: undefined },
      { home: 'Equipa Ouro', away: 'Equipa Prata', homeGoals: 2, awayGoals: 2, date: undefined, round: 3 }
    ]);
    expect(cleanPrintGames(null)).toEqual([]);
  });

  it('converte as datas para a época', () => {
    const [g] = printToLeagueGames(
      [{ home: 'Equipa Azul', away: 'Equipa Verde', homeGoals: 1, awayGoals: 0, date: '24 OUT' }],
      '2026/2027'
    );
    expect(g.date).toBe('2026-10-24');
    expect(looseDate('3 fev.', '2026/2027')).toBe('2027-02-03');
    expect(looseDate('24/10', '2026/2027')).toBe('2026-10-24');
    expect(looseDate('2026-11-02', '2026/2027')).toBe('2026-11-02');
    expect(looseDate('', '2026/2027')).toBeUndefined();
  });

  it('deixa de fora o nosso jogo (vem da app, não pode duplicar)', () => {
    const read = printToLeagueGames(
      [
        { home: 'Cdr Lobos Teste', away: 'Equipa Verde', homeGoals: 7, awayGoals: 3 },
        { home: 'Equipa Azul', away: 'Equipa Rosa', homeGoals: 1, awayGoals: 1 }
      ],
      '2026/2027'
    );
    const { games } = harmonizeTeams(read, { ourName: 'Lobos', clubName: 'Lobos Teste', known: [] });
    const kept = withoutOurGames(games, 'Lobos');
    expect(kept.map((g) => g.home)).toEqual(['Equipa Azul']);
  });
});

describe('resposta do Gemini', () => {
  it('lê o JSON mesmo dentro de um bloco de código ou com texto à volta', () => {
    expect(parseModelJson('{"games":[]}')).toEqual({ games: [] });
    expect(parseModelJson('```json\n{"games":[1]}\n```')).toEqual({ games: [1] });
    expect(parseModelJson('Aqui está: {"games":[2]} fim')).toEqual({ games: [2] });
    expect(parseModelJson('nada')).toEqual([]);
    expect(parseModelJson(undefined)).toEqual([]);
  });

  it('distingue os erros: chave, limite, modelo inexistente, sem acesso', () => {
    expect(geminiErrorKind({ status: 400, message: 'API key not valid. Please pass a valid API key.' })).toBe('key');
    expect(geminiErrorKind({ status: 429, message: 'RESOURCE_EXHAUSTED' })).toBe('quota');
    expect(geminiErrorKind({ status: 404, message: 'models/gemini-x is not found' })).toBe('model');
    expect(geminiErrorKind({ status: 403, message: 'PERMISSION_DENIED' })).toBe('blocked');
    expect(geminiErrorKind(new Error('fetch failed'))).toBe('other');
  });
});

describe('fases da classificação', () => {
  const first: LeagueSetup = { id: 'f1', season: '2026/2027', teams: ['Equipa Azul'], games: [] };
  const second: LeagueSetup = {
    id: 'f2',
    season: '2026/2027',
    name: 'Fase de apuramento',
    startDate: '2027-01-10',
    teams: ['Equipa Rosa'],
    games: []
  };
  const other: LeagueSetup = { id: 'x', season: '2025/2026', teams: [], games: [] };
  const leagues = [second, other, first];

  it('ordena as fases da época e calcula as datas de cada uma', () => {
    expect(seasonPhases(leagues, '2026/2027').map((l) => l.id)).toEqual(['f1', 'f2']);
    expect(phaseRange(leagues, first)).toEqual({ from: undefined, to: '2027-01-10' });
    expect(phaseRange(leagues, second)).toEqual({ from: '2027-01-10', to: undefined });
    const phases = seasonPhases(leagues, '2026/2027');
    expect(phaseLabel(phases, first)).toBe('1.ª fase');
    expect(phaseLabel(phases, second)).toBe('Fase de apuramento');
  });

  it('cada jogo da app conta só para a fase em que foi jogado', () => {
    const match = (id: string, date: string, opponent: string) =>
      ({
        id,
        date,
        season: '2026/2027',
        opponent,
        type: 'campeonato',
        location: 'casa',
        finished: true,
        events: []
      }) as unknown as Match;
    const matches = [match('a', '2026-11-08', 'Equipa Azul'), match('b', '2027-01-17', 'Equipa Rosa')];
    const g1 = leagueGames(first, matches, 'Lobos', phaseRange(leagues, first));
    const g2 = leagueGames(second, matches, 'Lobos', phaseRange(leagues, second));
    expect(g1.map((g) => g.away)).toEqual(['Equipa Azul']);
    expect(g2.map((g) => g.away)).toEqual(['Equipa Rosa']);
  });
});

describe('nomes das equipas (não multiplicar equipas)', () => {
  const calendar = ['GRD OS ESPARTEIROS', 'AD Mação', 'SAB "B"', 'CP Pego', 'Tramagal SU', 'Benfica'];

  it('usa o nome do calendário para cada equipa lida do print', async () => {
    const { canonicalTeam } = await import('../lib/leagueTable');
    const pairs: [string, string][] = [
      ['Gdr Os Esparteiros', 'GRD OS ESPARTEIROS'],
      ['Ad Mação', 'AD Mação'],
      ["S.Abrantes Benfica 'B'", 'SAB "B"'],
      ['Casa Povo Pego', 'CP Pego'],
      ['Tramagal Su', 'Tramagal SU']
    ];
    pairs.forEach(([read, app]) => expect(canonicalTeam(read, calendar)).toBe(app));
    // An unknown team keeps its name; a different letter is a different team
    expect(canonicalTeam('Equipa Nova', calendar)).toBe('Equipa Nova');
    expect(canonicalTeam("S.Abrantes Benfica 'A'", calendar)).toBe("S.Abrantes Benfica 'A'");
  });

  it('junta na tabela as equipas já importadas com outro nome', async () => {
    const { normalizeLeagueGames, computeStandings } = await import('../lib/leagueTable');
    const games = normalizeLeagueGames(
      [
        { id: '1', date: '2026-10-10', home: 'Ad Mação', away: "S.Abrantes Benfica 'B'", homeGoals: 2, awayGoals: 4 },
        { id: '2', date: '2026-10-10', home: 'AD Mação', away: 'SAB "B"', homeGoals: 2, awayGoals: 4 },
        { id: '3', date: '2026-10-17', home: 'Gdr Os Esparteiros', away: 'Ad Mação', homeGoals: 1, awayGoals: 13 }
      ],
      [calendar],
      'Lobos'
    );
    expect(games).toHaveLength(2);
    const table = computeStandings(games, ['Lobos', ...calendar.slice(0, 5)], 'Lobos');
    expect(table.map((r) => r.team).sort()).toEqual(
      ['AD Mação', 'CP Pego', 'GRD OS ESPARTEIROS', 'Lobos', 'SAB "B"', 'Tramagal SU'].sort()
    );
  });
});
