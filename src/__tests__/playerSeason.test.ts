import { describe, expect, it } from 'vitest';
import { buildPlayerSeason } from '../lib/playerSeason';
import { Match, Player, Training } from '../types';

const roster: Player[] = ['a', 'b', 'c'].map((id, i) => ({
  id,
  name: id.toUpperCase(),
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));

const game = (id: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent: `Adv ${id}`,
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

describe('Ficha do atleta (época)', () => {
  const state = {
    category: 'Sub-11',
    roster,
    matches: [
      game('m1', '2026-10-03', {
        goals: [
          { id: 'g1', type: 'scored', scorerId: 'a', assistId: 'b', minute: "5'" },
          { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: "20'" }
        ],
        cards: [{ id: 'c1', playerId: 'a', color: 'Amarelo', minute: "30'" }],
        ratings: { a: 4 }
      } as Partial<Match>),
      game('m2', '2026-10-10', {
        subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 10 }],
        ratings: { a: 5 }
      } as Partial<Match>),
      game('old', '2025-10-10', {
        season: '2025/2026',
        goals: [{ id: 'g', type: 'scored', scorerId: 'a', assistId: null, minute: "1'" }]
      } as Partial<Match>),
      game('live', '2026-10-17', {
        finished: false,
        goals: [{ id: 'g', type: 'scored', scorerId: 'a', assistId: null, minute: "1'" }]
      } as Partial<Match>)
    ],
    trainings: [
      training('t1', '2026-10-01', { absences: ['a'], absenceReasons: { a: 'escola' }, trainingNumber: 1 }),
      training('t2', '2026-10-08', { trainingNumber: 2 }),
      training('t3', '2026-10-15', { completed: false, absences: ['a'] }),
      training('t0', '2026-05-01', { absences: ['a'] })
    ]
  };

  it('counts only finished games and trainings held in the season', () => {
    const s = buildPlayerSeason(state, 'a', '2026/2027');
    expect(s.goals).toBe(1);
    expect(s.yellowCards).toBe(1);
    expect(s.ratingAverage).toBe(4.5);
    expect(s.games).toMatchObject({ calledUp: 2, played: 2, starts: 2, minutes: 120, availableMinutes: 120, share: 1 });
    expect(s.trainings).toEqual({ held: 2, present: 1, rate: 50 });
    expect(s.absences).toEqual([{ date: '2026-10-01', trainingNumber: 1, reason: 'escola' }]);
  });

  it('lists the latest games with minutes, goals and assists, newest first', () => {
    const b = buildPlayerSeason(state, 'b', '2026/2027');
    expect(b.assists).toBe(1);
    expect(b.recentGames.map((g) => [g.opponent, g.minutes, g.started, g.assists])).toEqual([
      ['Adv m2', 40, true, 0],
      ['Adv m1', 60, true, 1]
    ]);
    const c = buildPlayerSeason(state, 'c', '2026/2027');
    expect(c.recentGames[0]).toMatchObject({ minutes: 20, started: false, scored: 0, conceded: 0 });
    expect(c.games.share).toBeCloseTo(20 / 120);
  });
});

describe('PDF da ficha do atleta', () => {
  it('has the season, latest games and absences with the reason, without contacts or coach notes', async () => {
    const { buildPlayerProfilePDF } = await import('../lib/pdf/createPlayerReport');
    const { normalizeClubState } = await import('../lib/storage');
    const player = {
      ...roster[0],
      name: 'Rui Silva',
      phone: '912345678',
      coachNotes: 'Nota privada do treinador'
    } as Player;
    const state = normalizeClubState({
      myClubName: 'Dragões',
      season: '2026/2027',
      roster: [player],
      matches: [
        {
          id: 'm1',
          opponent: 'Tramagal SU',
          date: '2026-10-17',
          season: '2026/2027',
          type: 'campeonato',
          location: 'fora',
          finished: true,
          goals: [{ id: 'g1', type: 'scored', scorerId: 'a', assistId: null, minute: "12'" }],
          subs: [],
          lineup: ['a'],
          convocados: ['a'],
          capitao: null,
          halfDurationMinutes: 25
        }
      ],
      trainings: [
        { id: 't1', date: '2026-10-15', notes: '', absences: ['a'], absenceReasons: { a: 'doente' }, completed: true }
      ]
    } as never);
    const doc = await buildPlayerProfilePDF(player, state);
    const raw = doc.output() as string;
    expect(raw).toContain('Rui Silva');
    expect(raw).toContain('Tramagal SU');
    expect(raw).toContain('Doente');
    expect(raw).not.toContain('912345678');
    expect(raw).not.toContain('Nota privada');
    expect(raw).toContain('MINUTOS JOGO A JOGO');
  });
});

describe('Evolução do atleta', () => {
  it('lists every game of the season (oldest first) and training attendance per month', () => {
    const state = {
      category: 'Sub-11',
      roster,
      matches: [
        game('m2', '2026-11-07', { convocados: ['a', 'b'] } as Partial<Match>),
        game('m1', '2026-10-03', {
          goals: [{ id: 'g1', type: 'scored', scorerId: 'c', assistId: 'a', minute: "5'" }],
          subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 10 }]
        } as Partial<Match>)
      ],
      trainings: [
        training('t1', '2026-10-01', { absences: ['c'] }),
        training('t2', '2026-10-08'),
        training('t3', '2026-11-05', { absences: ['c'] })
      ]
    };
    const ev = buildPlayerSeason(state as never, 'c', '2026/2027').evolution;
    expect(ev.games.map((g) => [g.date, g.calledUp, g.minutes, g.totalMinutes, g.goals])).toEqual([
      ['2026-10-03', true, 20, 60, 1],
      ['2026-11-07', false, 0, 60, 0]
    ]);
    expect(ev.trainingMonths).toEqual([
      { month: '2026-10', held: 2, present: 1 },
      { month: '2026-11', held: 1, present: 0 }
    ]);
  });
});
