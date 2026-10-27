import { afterEach, describe, expect, it, vi } from 'vitest';
import { cardAlerts, cardStatuses } from '../lib/cardSuspensions';
import { directionsUrl, townOfClub } from '../lib/gameMap';
import { describeWeather, forecastable, forecastText, getForecast } from '../lib/weather';
import { clubColorVars, inkFor, shade } from '../lib/clubColors';
import { DEFAULT_CLUB_COLOR, teamSettings, withTeamSettings } from '../lib/teamSettings';
import { AppState, Match, Player } from '../types';

const roster: Player[] = ['a', 'b', 'c'].map((id, i) => ({
  id,
  name: `Atleta ${id.toUpperCase()}`,
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));
let n = 0;
const game = (date: string, cards: [string, 'Amarelo' | 'Vermelho'][], extra: Partial<Match> = {}): Match =>
  ({
    id: `m${n++}`,
    opponent: 'Equipa X',
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: ['a', 'b', 'c'],
    convocados: ['a', 'b', 'c'],
    capitao: null,
    cards: cards.map(([playerId, color], i) => ({ id: `c${n}${i}`, playerId, color, minute: 10 })),
    ...extra
  }) as Match;

describe('Castigos por cartões', () => {
  it('every N yellows is one game out, served in the next official game without the athlete', () => {
    const matches = [
      game('2026-10-01', [['a', 'Amarelo']]),
      game('2026-10-08', [['a', 'Amarelo']]),
      game('2026-10-15', [
        ['a', 'Amarelo'],
        ['b', 'Amarelo']
      ]),
      game('2026-10-16', [['a', 'Amarelo']], { type: 'amigavel' }) // friendlies do not count
    ];
    let s = cardStatuses(matches, roster, '2026/2027', 3);
    const a = s.find((x) => x.playerId === 'a')!;
    expect(a).toMatchObject({ yellows: 3, pendingGames: 1, yellowsToBan: 3 });
    expect(a.reasons).toEqual(['3.º amarelo (15/10)']);
    expect(cardAlerts(s).suspended.map((x) => x.playerId)).toEqual(['a']);

    // Next official game without "a": served
    s = cardStatuses(
      [...matches, game('2026-10-22', [], { convocados: ['b', 'c'], lineup: ['b', 'c'] })],
      roster,
      '2026/2027',
      3
    );
    expect(s.find((x) => x.playerId === 'a')!.pendingGames).toBe(0);
    // Called up again while suspended: still to serve
    s = cardStatuses([...matches, game('2026-10-22', [])], roster, '2026/2027', 3);
    expect(s.find((x) => x.playerId === 'a')!.pendingGames).toBe(1);
  });

  it('a red card, or two yellows in one game, is one game out (and those yellows do not accumulate)', () => {
    const s = cardStatuses(
      [
        game('2026-10-01', [['b', 'Vermelho']]),
        game('2026-10-08', [
          ['c', 'Amarelo'],
          ['c', 'Amarelo']
        ])
      ],
      roster,
      '2026/2027',
      5
    );
    expect(s.find((x) => x.playerId === 'b')).toMatchObject({
      reds: 1,
      pendingGames: 1,
      reasons: ['vermelho (01/10)']
    });
    expect(s.find((x) => x.playerId === 'c')).toMatchObject({
      yellows: 2,
      reds: 1,
      pendingGames: 1,
      yellowsToBan: 5,
      reasons: ['dois amarelos no jogo (08/10)']
    });
  });

  it('warns one yellow before the suspension', () => {
    const s = cardStatuses(
      [game('2026-10-01', [['a', 'Amarelo']]), game('2026-10-08', [['a', 'Amarelo']])],
      roster,
      '2026/2027',
      3
    );
    expect(cardAlerts(s).atRisk.map((x) => x.playerId)).toEqual(['a']);
  });
});

describe('Como chegar', () => {
  it('uses the pitch, or the town of the opponent', () => {
    expect(townOfClub('AD Mação')).toBe('Mação');
    expect(townOfClub('Casa Povo Pego')).toBe('Pego');
    expect(townOfClub("S.Abrantes Benfica 'B'")).toBe('S Abrantes Benfica');
    expect(directionsUrl({ venue: 'Estádio Municipal de Abrantes', opponent: 'X' })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Est%C3%A1dio%20Municipal%20de%20Abrantes'
    );
    expect(directionsUrl({ opponent: 'GRD OS ESPARTEIROS' })).toContain(
      encodeURIComponent('campo de futebol ESPARTEIROS')
    );
  });
});

describe('Previsão do tempo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('describes the weather codes and only forecasts up to 14 days ahead', () => {
    expect(describeWeather(0).icon).toBe('☀️');
    expect(describeWeather(63)).toEqual({ icon: '🌧️', label: 'Chuva' });
    expect(describeWeather(95).label).toBe('Trovoada');
    expect(forecastable('2026-10-27', '2026-10-27')).toBe(true);
    expect(forecastable('2026-11-10', '2026-10-27')).toBe(true);
    expect(forecastable('2026-11-11', '2026-10-27')).toBe(false);
    expect(forecastable('2026-10-26', '2026-10-27')).toBe(false);
  });

  it('finds the place and reads the hour of the event; nothing without internet', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const hourly = (v: number) => Array.from({ length: 24 }, (_, h) => (h === 11 ? v : 0));
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('geocoding')
          ? url.includes('Lugar%20Inexistente')
            ? {}
            : { results: [{ latitude: 39.4, longitude: -8.2 }] }
          : {
              hourly: {
                temperature_2m: hourly(14.4),
                precipitation_probability: hourly(70),
                weather_code: hourly(61),
                wind_speed_10m: hourly(24.6)
              }
            }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const f = await getForecast(['Lugar Inexistente', 'Abrantes'], today, '11:00');
    expect(f).toMatchObject({ icon: '🌧️', temperature: 14.4, rain: 70 });
    expect(forecastText(f!)).toBe('🌧️ 14° · 💧70% · 💨25 km/h');
    expect(fetchMock.mock.calls.map((c) => c[0] as string).some((u) => u.includes('latitude=39.4'))).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline')))
    );
    expect(await getForecast(['Outra terra'], today, '18:00')).toBeNull();
  });
});

describe('Cores do clube', () => {
  it('builds the palette from the colour, with readable text, and leaves the default palette alone', () => {
    expect(clubColorVars(DEFAULT_CLUB_COLOR)).toEqual({});
    expect(clubColorVars('não é cor')).toEqual({});
    const red = clubColorVars('#e23b3b');
    expect(red['--color-cyan-500']).toBe('#e23b3b');
    expect(red['--color-ui-brand']).toBe('#e23b3b');
    expect(red['--color-cyan-50']).toBe(shade('#e23b3b', 0.9));
    expect(Object.keys(red).filter((k) => k.startsWith('--color-cyan-'))).toHaveLength(11);
    expect(inkFor('#f5c518')).toBe('#03131f'); // dark text on yellow
    expect(inkFor('#1e3a8a')).toBe('#ffffff'); // white text on navy
    expect(shade('#000000', 0.5)).toBe('#808080');
  });

  it('are kept in the active team', () => {
    const state = { activeTeamId: 't1', teams: [{ id: 't1' }, { id: 't2' }] } as unknown as AppState;
    expect(teamSettings(state)).toEqual({ clubColor: DEFAULT_CLUB_COLOR, clubTown: '', yellowsForBan: 5 });
    const teams = withTeamSettings(state, { clubColor: '#e23b3b', clubTown: 'Abrantes', yellowsForBan: 4 })!;
    expect(teamSettings({ ...state, teams })).toEqual({ clubColor: '#e23b3b', clubTown: 'Abrantes', yellowsForBan: 4 });
    expect(teams[1]).toEqual({ id: 't2' });
  });
});
