import { describe, expect, it } from 'vitest';
import { buildMonthlyReport, monthLabel, reportMonths } from '../lib/monthlyReport';
import { buildMonthlyReportPDF } from '../lib/pdf/createMonthlyReport';
import { AppState, Match, Player, ScheduledMatch, Training } from '../types';

const roster: Player[] = ['a', 'b', 'c'].map((id, i) => ({
  id,
  name: `Atleta ${id.toUpperCase()}`,
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));

const game = (id: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: `Equipa ${id}`,
    date,
    season: '2026/2027',
    type: 'campeonato',
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

const training = (id: string, date: string, extra: Partial<Training> = {}): Training => ({
  id,
  date,
  notes: '',
  absences: [],
  completed: true,
  ...extra
});

const state = {
  myClubName: 'Lobos',
  category: 'Sub-11',
  season: '2026/2027',
  roster,
  matches: [
    game('m1', '2026-10-03', {
      goals: [
        { id: 'g1', type: 'scored', scorerId: 'a', assistId: 'b', minute: "5'" },
        { id: 'g2', type: 'scored', scorerId: 'a', assistId: null, minute: "15'" },
        { id: 'g3', type: 'conceded', scorerId: null, assistId: null, minute: "20'" }
      ]
    } as Partial<Match>),
    game('m2', '2026-10-17', {
      location: 'fora',
      goals: [{ id: 'g4', type: 'conceded', scorerId: null, assistId: null, minute: "9'" }]
    } as Partial<Match>),
    game('nov', '2026-11-07'),
    game('live', '2026-10-24', { finished: false })
  ],
  trainings: [
    training('t1', '2026-10-01', {
      absences: ['c'],
      trainingNumber: 1,
      sessionPlan: { objective: 'Saída de bola', blocks: [] }
    }),
    training('t2', '2026-10-08', { trainingNumber: 2, sessionPlan: { objective: 'saída de bola', blocks: [] } }),
    training('t3', '2026-10-29', {
      completed: false,
      trainingNumber: 3,
      sessionPlan: { objective: 'Pressão alta', blocks: [] }
    }),
    training('t4', '2026-11-05', { absences: ['a'] })
  ],
  schedule: [
    {
      id: 's1',
      opponent: 'Equipa m2',
      date: '2026-10-17',
      time: '10:00',
      type: 'campeonato',
      location: 'fora',
      callup: [],
      preMatchPlan: { objectives: ['Ganhar as segundas bolas', ''] }
    } as ScheduledMatch
  ]
} as unknown as AppState;

describe('Relatório mensal', () => {
  it('lists the months with activity, latest first', () => {
    expect(reportMonths(state)).toEqual(['2026-11', '2026-10']);
    expect(monthLabel('2026-10')).toBe('outubro de 2026');
  });

  it('games, results, attendance, minutes and objectives of the month only', () => {
    const r = buildMonthlyReport(state, '2026-10');
    expect(r.games.map((g) => `${g.date} ${g.opponent} ${g.scored}-${g.conceded} ${g.result}`)).toEqual([
      '2026-10-03 Equipa m1 2-1 V',
      '2026-10-17 Equipa m2 0-1 D'
    ]);
    expect(r.record).toEqual({ won: 1, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 2 });
    // The planned (not done) training does not count for attendance
    expect(r.trainings).toEqual({ held: 2, planned: 3, attendance: 83 });
    const a = r.players.find((p) => p.name === 'Atleta A')!;
    expect(a).toMatchObject({
      trainingsPresent: 2,
      trainingsHeld: 2,
      attendance: 100,
      calledUp: 2,
      starts: 2,
      goals: 2,
      minutes: 120,
      share: 100
    });
    const c = r.players.find((p) => p.name === 'Atleta C')!;
    expect(c).toMatchObject({ trainingsPresent: 1, attendance: 50, starts: 0, minutes: 0 });
    expect(r.players.find((p) => p.name === 'Atleta B')!.assists).toBe(1);
    expect(r.objectives).toEqual([
      { date: '2026-10-01', source: 'Treino nº 1 · Treino nº 2', text: 'Saída de bola' },
      { date: '2026-10-17', source: 'Jogo vs Equipa m2', text: 'Ganhar as segundas bolas' },
      { date: '2026-10-29', source: 'Treino nº 3', text: 'Pressão alta' }
    ]);
  });

  it('builds the PDF with the games, the athletes, the objectives and the notes', async () => {
    const r = buildMonthlyReport(state, '2026-10');
    const { doc, filename } = await buildMonthlyReportPDF(r, state, 'Boa evolução na saída de bola.');
    const raw = doc.output() as string;
    expect(filename).toBe('Relatorio_Mensal_Lobos_2026-10.pdf');
    ['RELATÓRIO MENSAL', 'Equipa m1', 'Atleta C', 'Ganhar as segundas bolas', 'Boa evolução na saída de bola.'].forEach(
      (t) => expect(raw, t).toContain(t)
    );
  });
});
