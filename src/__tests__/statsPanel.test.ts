import { describe, expect, it } from 'vitest';
import { panelMatches, panelOptions, panelSpan, playerPanel, teamPanel } from '../lib/statsPanel';
import { Match, Player, Training } from '../types';

const roster: Player[] = [
  { id: 'a', name: 'Rui', number: 9, positions: '', birthDate: null, active: true },
  { id: 'b', name: 'Tomás', number: 7, positions: '', birthDate: null, active: true },
  { id: 'c', name: 'André', number: 10, positions: '', birthDate: null, active: true }
] as Player[];

const goal = (
  type: 'scored' | 'conceded',
  minute: string,
  scorerId: string | null = null,
  assistId: string | null = null
) => ({
  id: `${type}${minute}${scorerId}`,
  type,
  scorerId,
  assistId,
  minute
});

const game = (id: string, date: string, opponent: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent,
    date,
    season: '2026/2027',
    type: 'campeonato',
    phase: 'Jornada 1',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: ['a', 'b'],
    lineupSize: 2,
    capitao: null,
    convocados: ['a', 'b', 'c'],
    halfDurationMinutes: 30,
    ...extra
  }) as Match;

const matches = [
  game('m1', '2026-09-20', 'GRD Os Esparteiros', {
    goals: [goal('scored', "5'", 'a', 'b'), goal('conceded', "40'")],
    rematesDentroArea: 6,
    rematesForaArea: 2,
    cantos: 3,
    cantosAdv: 1
  } as Partial<Match>),
  game('m2', '2026-10-04', 'Tramagal SU', {
    phase: 'Jornada 2',
    goals: [goal('scored', "20'", 'a'), goal('scored', "50'", 'b', 'a')],
    subs: [{ id: 's', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 10 }]
  } as Partial<Match>),
  game('m3', '2027-03-14', 'Esparteiros', { phase: 'Jornada 1', goals: [goal('conceded', "12'")] }),
  game('old', '2025-10-10', 'Esparteiros', { season: '2025/2026' }),
  game('live', '2026-10-22', 'Abrantes', { finished: false })
];

describe('Painel: que jogos contam', () => {
  it('season, one game, head-to-head (same opponent written differently), phase and period', () => {
    const ids = (f: Parameters<typeof panelMatches>[1]) => panelMatches(matches, f).map((m) => m.id);
    expect(ids({ scope: 'epoca', season: '2026/2027' })).toEqual(['m1', 'm2', 'm3']);
    expect(ids({ scope: 'jogo', matchId: 'm2' })).toEqual(['m2']);
    expect(ids({ scope: 'confronto', opponent: 'Esparteiros' })).toEqual(['old', 'm1', 'm3']);
    expect(ids({ scope: 'fase', season: '2026/2027', phase: 'Jornada 1' })).toEqual(['m1', 'm3']);
    expect(ids({ scope: 'periodo', from: '2026-10-01', to: '2026-12-31' })).toEqual(['m2']);
  });

  it('offers each opponent once and the phases of the season', () => {
    const o = panelOptions(matches, '2026/2027');
    expect(o.opponents).toEqual(['GRD Os Esparteiros', 'Tramagal SU']);
    expect(o.phases).toEqual(['Jornada 1', 'Jornada 2']);
    expect(o.matches.map((m) => m.id)).not.toContain('live');
  });

  it('dates of the season, of a period or of the selected games', () => {
    expect(panelSpan({ scope: 'epoca', season: '2026/2027' }, [])).toEqual({ from: '2026-07-01', to: '2027-06-30' });
    expect(panelSpan({ scope: 'periodo', from: '2026-10-01' }, [])).toEqual({ from: '2026-10-01', to: undefined });
    expect(panelSpan({ scope: 'jogo' }, [matches[1]])).toEqual({ from: '2026-10-04', to: '2026-10-04' });
  });
});

describe('Painel: equipa', () => {
  it('results, goals by 15-minute block, shots and corners only where recorded, scorers', () => {
    const p = teamPanel(panelMatches(matches, { scope: 'epoca', season: '2026/2027' }), roster);
    expect(p).toMatchObject({ played: 3, wins: 1, draws: 1, losses: 1, scored: 3, conceded: 2 });
    expect(p.shots).toEqual({ for: 8, against: 0, games: 1 });
    expect(p.corners).toEqual({ for: 3, against: 1, games: 1 });
    expect(p.goalsByBlock.scored).toEqual([1, 1, 0, 1, 0, 0]);
    expect(p.goalsByBlock.conceded).toEqual([1, 0, 1, 0, 0, 0]);
    expect(p.scorers.map((s) => [s.name, s.goals, s.assists])).toEqual([
      ['Rui', 2, 1],
      ['Tomás', 1, 1]
    ]);
    expect(p.games[1]).toMatchObject({ opponent: 'Tramagal SU', scored: 2, conceded: 0, shotsFor: undefined });
  });
});

describe('Painel: atleta', () => {
  it('game by game minutes, goals and the trainings of the same dates', () => {
    const trainings: Training[] = [
      { id: 't1', date: '2026-10-01', notes: '', absences: ['c'], completed: true },
      { id: 't2', date: '2026-10-03', notes: '', absences: [], completed: true },
      { id: 't0', date: '2026-08-01', notes: '', absences: ['c'], completed: true }
    ];
    const games = panelMatches(matches, { scope: 'periodo', from: '2026-10-01', to: '2026-10-31' });
    const c = playerPanel(games, { trainings, category: 'Sub-11' }, 'c', { from: '2026-10-01', to: '2026-10-31' });
    expect(c).toMatchObject({ calledUp: 1, played: 1, starts: 0, minutes: 20, availableMinutes: 60, goals: 0 });
    expect(c.trainings).toEqual({ held: 2, present: 1, rate: 50 });
    const a = playerPanel(games, { trainings, category: 'Sub-11' }, 'a');
    expect(a.games[0]).toMatchObject({ minutes: 60, started: true, goals: 1, assists: 1 });
  });
});

describe('Exportação para Power BI', () => {
  it('one table per subject, linked by ids, without personal data', async () => {
    const { buildPowerBiTables } = await import('../lib/powerBiExport');
    const t = buildPowerBiTables({
      category: 'Sub-11',
      roster: [
        { ...roster[0], phone: '912345678', birthDate: '2016-01-01', coachNotes: 'privado' } as Player,
        roster[2]
      ],
      matches,
      trainings: [
        { id: 't1', date: '2026-10-01', notes: '', absences: ['c'], absenceReasons: { c: 'doente' }, completed: true }
      ]
    });
    expect(Object.keys(t)).toEqual(['Atletas', 'Jogos', 'Golos', 'MinutosPorJogo', 'Cartoes', 'Treinos', 'Presencas']);
    expect(t.Jogos).toHaveLength(1 + 4); // header + finished games
    expect(t.Jogos[1]).toEqual(expect.arrayContaining(['m1', 'GRD Os Esparteiros', 'Casa', 1, 1, 'E', 8]));
    expect(t.MinutosPorJogo).toContainEqual(['m2', 'c', '2026-10-04', 'Sim', 'Não', 20, 60, 0, 0]);
    expect(t.Presencas).toContainEqual(['t1', 'c', '2026-10-01', 'Não', 'Doente']);
    const all = JSON.stringify(t);
    expect(all).not.toContain('912345678');
    expect(all).not.toContain('2016-01-01');
    expect(all).not.toContain('privado');
  });
});
