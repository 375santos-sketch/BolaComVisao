import { describe, expect, it } from 'vitest';
import { homeNotices, seasonSummary } from '../lib/homeSummary';
import { Match, Player, ScheduledMatch, Training } from '../types';

const TODAY = '2026-10-22';

const roster: Player[] = [
  { id: 'a', name: 'Rui', number: 9, positions: '', birthDate: '2016-10-24', active: true },
  { id: 'b', name: 'Tomás', number: 7, positions: '', birthDate: '2016-03-01', active: true },
  { id: 'c', name: 'André', number: 10, positions: '', birthDate: null, active: true },
  { id: 'd', name: 'Duarte', number: 1, positions: '', birthDate: null, active: true, status: 'lesionado' }
] as Player[];

const game = (id: string, date: string, goals: [number, number], extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: `Adv ${id}`,
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [
      ...Array.from({ length: goals[0] }, (_, i) => ({
        id: `s${i}`,
        type: 'scored',
        scorerId: 'a',
        assistId: null,
        minute: "1'"
      })),
      ...Array.from({ length: goals[1] }, (_, i) => ({
        id: `c${i}`,
        type: 'conceded',
        scorerId: null,
        assistId: null,
        minute: "2'"
      }))
    ],
    subs: [],
    lineup: ['a', 'b'],
    lineupSize: 2,
    capitao: null,
    convocados: ['a', 'b', 'c'],
    halfDurationMinutes: 30,
    ...extra
  }) as Match;

const tr = (id: string, date: string, absences: string[] = []): Training => ({
  id,
  date,
  notes: '',
  absences,
  completed: true
});

const base = {
  season: '2026/2027',
  category: 'Sub-11',
  roster,
  staffMembers: [],
  matches: [
    game('m1', '2026-10-10', [2, 1]),
    game('m2', '2026-10-17', [0, 0]),
    game('old', '2025-10-10', [5, 0], { season: '2025/2026' })
  ],
  trainings: [tr('t1', '2026-10-13', ['c', 'd']), tr('t2', '2026-10-15', ['c', 'd']), tr('t3', '2026-10-20', ['d'])],
  schedule: [
    { id: 's1', opponent: 'Constância', date: '2026-10-25', time: '11:00', callup: [] } as unknown as ScheduledMatch
  ]
};

describe('Início: avisos', () => {
  it('lists the open call-up, players short of minutes and low attendance, at most 3', () => {
    const notices = homeNotices(base, TODAY);
    expect(notices.map((n) => n.id)).toEqual(['convocatoria', 'minutos', 'assiduidade']);
    expect(notices[0]).toMatchObject({ tab: 'convocatoria', targetId: 's1' });
    expect(notices[0].text).toContain('Constância');
    expect(notices[1].text).toContain('André (0%)');
    expect(notices[2].text).toContain('André (33%)');
    expect(notices[2].text).not.toContain('Duarte'); // injured: expected to miss
  });

  it('shows birthdays this week when there is room, and nothing when all is fine', () => {
    const calm = { ...base, schedule: [], trainings: [], matches: [] };
    const notices = homeNotices(calm, TODAY);
    expect(notices.map((n) => n.id)).toEqual(['aniversarios']);
    expect(notices[0].text).toContain('Rui');
    expect(homeNotices({ ...calm, roster: roster.slice(1) }, TODAY)).toEqual([]);
  });

  it('does not ask for a call-up already finalized or a game more than a week away', () => {
    const finalized = { ...base, schedule: [{ ...base.schedule[0], callupFinalized: true }] };
    expect(homeNotices(finalized, TODAY).map((n) => n.id)).not.toContain('convocatoria');
    const far = { ...base, schedule: [{ ...base.schedule[0], date: '2026-11-15' }] };
    expect(homeNotices(far, TODAY).map((n) => n.id)).not.toContain('convocatoria');
  });
});

describe('Início: resumo da época', () => {
  it('counts the season results and the team attendance', () => {
    expect(seasonSummary(base, TODAY)).toEqual({
      played: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      scored: 2,
      conceded: 1,
      attendance: Math.round(((12 - 5) / 12) * 100)
    });
  });
});
