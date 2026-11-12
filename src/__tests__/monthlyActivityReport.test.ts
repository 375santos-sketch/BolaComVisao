import { describe, expect, it } from 'vitest';
import {
  buildMonthlyActivityReport,
  emptyReportRecord,
  nextMonthOf,
  reportRecordId,
  reportTimeline,
  seasonMonths,
  teamCoachName
} from '../lib/monthlyActivityReport';
import { canAccessTeam, canReviewReports, isCoordinator } from '../lib/permissionsEngine';
import { Match, Player, Training, UserAccount } from '../types';

// Fictitious data, only for this test
const player = (id: string, number: number, positions = 'MC'): Player => ({
  id,
  name: `Atleta ${number}`,
  number,
  positions,
  birthDate: null,
  active: true
});
const roster = [player('a', 1, 'GR'), player('b', 2), player('c', 3), player('d', 4, 'PL')];

const training = (id: string, date: string, extra: Partial<Training> = {}): Training => ({
  id,
  date,
  notes: '',
  absences: [],
  completed: true,
  durationMinutes: 60,
  season: '2026/2027',
  ...extra
});

const trainings: Training[] = [
  training('t1', '2026-10-05', {
    trainingNumber: 1,
    absences: ['b'],
    absenceReasons: { b: 'escola' },
    sessionPlan: {
      objective: 'Saída de bola',
      blocks: [
        { id: 'x1', title: 'Rondo', category: 'tecnica', durationMinutes: 20 },
        { id: 'x2', title: 'Saída', category: 'tatica', durationMinutes: 30 }
      ]
    }
  }),
  training('t2', '2026-10-12', { trainingNumber: 2, absences: ['b', 'c'], absenceReasons: { c: 'injustificada' } }),
  training('t3', '2026-10-20', { trainingNumber: 3, completed: false, absences: ['a'] }),
  training('t4', '2026-11-02', { trainingNumber: 4 })
];

const match = (extra: Partial<Match>): Match => ({
  id: 'm1',
  opponent: 'Equipa Teste',
  date: '2026-10-10',
  type: 'campeonato',
  season: '2026/2027',
  location: 'casa',
  finished: true,
  goals: [],
  subs: [],
  lineup: [],
  capitao: null,
  ...extra
});

const matches: Match[] = [
  match({
    id: 'm1',
    lineup: ['a', 'b', 'c'],
    lineupSize: 3,
    convocados: ['a', 'b', 'c', 'd'],
    subs: [{ id: 's1', outId: 'c', inId: 'd', half: 2, minute: 30, minuteInHalf: 5 }],
    goals: [
      { id: 'g1', type: 'scored', scorerId: 'd', assistId: 'b', minute: 32 },
      { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: 40 }
    ],
    cards: [{ id: 'k1', playerId: 'b', color: 'Amarelo', minute: 15 }],
    timer: {
      isRunning: false,
      elapsedMs: 0,
      lastStartTs: null,
      half1DurationMs: 25 * 60000,
      half2DurationMs: 25 * 60000
    },
    cantos: 3,
    cantosAdv: 1,
    notes: 'Boa reação à perda.',
    originalSchedule: {
      id: 'sch1',
      opponent: 'Equipa Teste',
      date: '2026-10-10',
      time: '10:00',
      type: 'campeonato',
      location: 'casa',
      callup: [],
      preMatchPlan: { system: '2-3-1' }
    }
  }),
  // No clock recorded and no stats: minutes estimated, stats "not recorded"
  match({
    id: 'm2',
    date: '2026-10-24',
    opponent: 'Equipa Dois',
    lineup: ['a', 'b', 'd'],
    lineupSize: 3,
    convocados: ['a', 'b', 'd']
  })
];

const state = {
  roster,
  trainings,
  matches,
  category: 'Sub-11',
  season: '2026/2027',
  myClubName: 'Clube Teste',
  activeTeamId: 'sub11',
  schedule: [
    {
      id: 'n1',
      opponent: 'Próximo',
      date: '2026-11-08',
      time: '10:00',
      type: 'campeonato' as const,
      location: 'casa' as const,
      callup: []
    }
  ],
  teams: [
    {
      id: 'sub11',
      monthObjectives: { '2026-11': ['Largura no último terço', ''] }
    } as never
  ]
};

const report = buildMonthlyActivityReport(state, '2026-10', '2026-10-31');

describe('relatório mensal de atividade', () => {
  it('separates realized, unclosed and next-month trainings; only realized ones count', () => {
    expect(report.trainings.map((t) => [t.id, t.status])).toEqual([
      ['t1', 'realizado'],
      ['t2', 'realizado'],
      ['t3', 'por_fechar']
    ]);
    expect(report.summary.trainingsHeld).toBe(2);
    expect(report.summary.trainingsUnclosed).toBe(1);
    expect(report.summary.trainingMinutes).toBe(120);
    expect(report.trainings[0].present).toBe(3);
    expect(report.trainings[2].present).toBeNull();
  });

  it('counts justified, unjustified and absences without a reason apart', () => {
    const b = report.athletes.find((a) => a.id === 'b')!;
    expect(b.trainingsPresent).toBe(0);
    expect(b.justified).toBe(1);
    expect(b.noReason).toBe(1);
    const c = report.athletes.find((a) => a.id === 'c')!;
    expect(c.unjustified).toBe(1);
    expect(c.attendance).toBe(50);
    // the athlete absent only from the unclosed training is not marked absent
    expect(report.athletes.find((a) => a.id === 'a')!.attendance).toBe(100);
  });

  it('minutes from the line-up and substitutions; called up ≠ used ≠ starter', () => {
    const d = report.athletes.find((a) => a.id === 'd')!;
    expect(d.calledUp).toBe(2);
    expect(d.starts).toBe(1);
    expect(d.subIn).toBe(1);
    expect(d.goals).toBe(1);
    const c = report.athletes.find((a) => a.id === 'c')!;
    expect(c.minutes).toBe(30); // 25 + 5 minutes of the 2nd half
    const g1 = report.games[0];
    expect(g1.system).toBe('2-3-1');
    expect(g1.benchUsed.map((x) => [x.id, x.minutes])).toEqual([['d', 20]]);
    expect(g1.benchUnused).toBe(0);
    expect(g1.result).toBe('E');
  });

  it('a game without a clock is flagged as estimated; statistics not recorded stay null, never 0', () => {
    const g2 = report.games[1];
    expect(g2.estimatedMinutes).toBe(true);
    expect(g2.shots).toBeNull();
    expect(g2.corners).toBeNull();
    expect(report.games[0].corners).toEqual({ for: 3, against: 1 });
    const corners = report.collective.find((c) => c.label === 'Cantos')!;
    expect(corners).toMatchObject({ for: 3, against: 1, recorded: 1, perGame: 3 });
    const shots = report.collective.find((c) => c.label === 'Remates')!;
    expect(shots).toMatchObject({ for: null, recorded: 0 });
  });

  it('themes come from the session plans; trainings without a plan are counted apart', () => {
    expect(report.themes.rows.map((r) => [r.key, r.minutes])).toEqual([
      ['tatica', 30],
      ['tecnica', 20]
    ]);
    expect(report.themes.noPlanCount).toBe(1);
  });

  it('lists what is missing and the next month from the Agenda and Época', () => {
    const text = report.missing.map((m) => m.text).join('\n');
    expect(text).toMatch(/por fechar/);
    expect(text).toMatch(/sem relógio/);
    expect(text).toMatch(/Equipa Dois sem sistema tático/);
    expect(text).toMatch(/falta\(s\) sem motivo/);
    expect(report.nextMonth.objectives).toEqual(['Largura no último terço']);
    expect(report.nextMonth.games.map((g) => g.opponent)).toEqual(['Próximo']);
  });

  it('record ids and months', () => {
    expect(reportRecordId('2026-10')).toBe('relatorio-2026-10');
    expect(emptyReportRecord('2026-10')).toMatchObject({ status: 'rascunho', month: '2026-10' });
    expect(nextMonthOf('2026-12')).toBe('2027-01');
  });
});

describe('coordenação dos relatórios', () => {
  const user = (role: string, extra: Partial<UserAccount> = {}) =>
    ({
      id: 'u',
      username: 'u',
      email: 'u@clube.pt',
      name: 'U',
      role,
      status: 'approved',
      clubId: 'c1',
      assignedTeams: [],
      ...extra
    }) as UserAccount;

  it('the coordinator sees every team and reviews reports; a coach does not review', () => {
    const coord = user('Coordenador Técnico');
    expect(isCoordinator(coord)).toBe(true);
    expect(canAccessTeam(coord, 'qualquer', 'c1')).toBe(true);
    expect(canReviewReports(coord)).toBe(true);
    expect(canReviewReports(user('Treinador Principal', { assignedTeams: ['all'] }))).toBe(false);
    expect(canReviewReports(user('Coordenador Técnico', { status: 'pending' }))).toBe(false);
    expect(canAccessTeam(user('Treinador Principal', { assignedTeams: ['sub9'] }), 'sub11', 'c1')).toBe(false);
  });

  it('season months, timeline and the head coach', () => {
    expect(seasonMonths('2026/2027')).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06'
    ]);
    const t = reportTimeline({
      id: 'r',
      month: '2026-10',
      status: 'devolvido',
      createdAt: '2026-10-28T10:00:00Z',
      validatedAt: '2026-11-02T10:00:00Z',
      validatedBy: 'Treinador A',
      deliveredAt: '2026-11-03T10:00:00Z',
      returnedAt: '2026-11-04T10:00:00Z',
      returnedBy: 'Coordenador C'
    }).map((e) => e.text);
    expect(t).toEqual([
      'Rascunho criado',
      'Validado pelo treinador (Treinador A)',
      'Entregue ao coordenador',
      'Devolvido ao treinador por Coordenador C'
    ]);
    expect(
      teamCoachName({
        staffMembers: [
          { id: '1', name: 'Adjunto X', role: 'Treinador Adjunto' },
          { id: '2', name: 'Principal Y', role: 'Treinador Principal' }
        ]
      } as never)
    ).toBe('Principal Y');
  });
});
