import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildParentsMessage, scorersSummary } from '../lib/parentsShare';
import { AppState, Match, Player } from '../types';

const roster: Player[] = [
  { id: 'p1', name: 'Rui Silva', number: 9, positions: '', birthDate: null, active: true },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, positions: '', birthDate: null, active: true }
];
const goal = (type: 'scored' | 'conceded', scorerId: string | null, minute: string) =>
  ({ id: Math.random().toString(), type, scorerId, assistId: null, minute }) as any;
const match = (overrides: Partial<Match> = {}): Match =>
  ({
    id: 'm2',
    opponent: 'Tramagal SU',
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    phase: 'Jornada 2',
    location: 'fora',
    finished: true,
    goals: [
      goal('scored', 'p1', "12'"),
      goal('conceded', null, "30'"),
      goal('scored', 'p2', "40'"),
      goal('scored', 'p1', "55'")
    ],
    subs: [],
    lineup: [],
    capitao: null,
    ...overrides
  }) as Match;
const state = (overrides: Partial<AppState> = {}): AppState =>
  ({ myClubName: 'Dragões', roster, schedule: [], teams: [], ...overrides }) as unknown as AppState;

afterEach(() => vi.useRealTimers());

describe('Partilha para os pais', () => {
  it('writes an away result from the home team perspective, with scorers', () => {
    const msg = buildParentsMessage(match(), state(), { includeScorers: true });
    expect(msg).toContain('⚽ *Tramagal SU 1-3 Dragões*');
    expect(msg).toContain('Vitória · ');
    expect(msg).toContain('Fora · Campeonato – Jornada 2');
    expect(msg).toContain('🥅 Golos: Rui Silva (2), Tomás Gonçalves');
    expect(msg).toContain('Parabéns a todos os atletas');
  });

  it('can leave the (minor) players’ names out', () => {
    const msg = buildParentsMessage(match(), state(), { includeScorers: false });
    expect(msg).not.toContain('Rui Silva');
    expect(msg).not.toContain('Golos:');
  });

  it('home draw, own goal and next game', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    const m = match({ location: 'casa', goals: [goal('scored', 'autogolo', "5'"), goal('conceded', null, "20'")] });
    const msg = buildParentsMessage(
      m,
      state({
        schedule: [
          { id: 's0', opponent: 'Antigo', date: '2026-10-10', time: '10:00', location: 'casa' } as any,
          { id: 's2', opponent: 'Ouriense', date: '2026-10-31', time: '11:00', location: 'casa' } as any,
          { id: 's1', opponent: 'Esparteiros', date: '2026-10-24', time: '10:00', location: 'fora' } as any
        ]
      }),
      { includeScorers: true }
    );
    expect(msg).toContain('⚽ *Dragões 1-1 Tramagal SU*');
    expect(msg).toContain('Empate');
    expect(msg).toContain('Golos: autogolo');
    expect(msg).toMatch(/📅 Próximo jogo: .*24\/10, 10:00 vs Esparteiros \(Fora\)/);
  });

  it('ignores goals without an identified scorer in the scorers list', () => {
    const m = match({ goals: [goal('scored', null, "5'"), goal('scored', 'p2', "9'")] });
    expect(scorersSummary(m, roster)).toBe('Tomás Gonçalves');
  });
});
