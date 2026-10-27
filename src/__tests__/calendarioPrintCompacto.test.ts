import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanPrintFixtures } from '../lib/printJornada';
import { fixtureDrafts, fixtureTeams, guessOurName } from '../lib/fixtureImport';
import { applyCompact, loadBrand, loadCompact, saveBrand } from '../lib/clubBrand';
import { Match, ScheduledMatch } from '../types';

// Fictitious league
const raw = [
  { home: "CD Falcões 'A'", away: 'GD Ribeira', date: '01/11/2026', time: '10h00', round: 1, venue: 'Campo da Mata' },
  { home: 'UD Serra', away: 'AD Vale Novo', date: '01/11/2026', time: '11:00', round: 1 },
  { home: 'AD Vale Novo', away: "CD Falcões 'A'", date: '08/11/2026', time: '9.30', round: 2 },
  { home: 'GD Ribeira', away: 'UD Serra', date: '08/11/2026', round: 2 },
  { home: "CD Falcões 'A'", away: 'UD Serra', date: '15/11/2026', round: 3 }
];

describe('cleanPrintFixtures', () => {
  it('keeps the games with two different teams, tidies the time and drops repeats', () => {
    const out = cleanPrintFixtures({
      games: [
        ...raw,
        raw[0],
        { home: 'UD Serra', away: 'UD Serra', date: '01/11/2026' },
        { home: '', away: 'GD Ribeira' },
        null
      ]
    });
    expect(out).toHaveLength(5);
    expect(out[0]).toMatchObject({ home: "CD Falcões 'A'", time: '10:00', round: 1, venue: 'Campo da Mata' });
    expect(out[2].time).toBe('09:30');
    expect(out[3].time).toBeUndefined();
  });

  it('returns nothing for an answer that is not a list', () => {
    expect(cleanPrintFixtures('nada')).toEqual([]);
    expect(cleanPrintFixtures({ games: 'x' })).toEqual([]);
  });
});

describe('fixtureImport', () => {
  const fixtures = cleanPrintFixtures(raw);

  it('lists our team first (it plays every round)', () => {
    expect(fixtureTeams(fixtures)[0]).toBe("CD Falcões 'A'");
  });

  it('tells our team by the club name', () => {
    expect(guessOurName(fixtures, 'Falcões', 'CD Falcões')).toBe("CD Falcões 'A'");
  });

  it('turns our games into Agenda games, home or away, in date order', () => {
    const drafts = fixtureDrafts(fixtures, {
      ourAlias: "CD Falcões 'A'",
      season: '2026/2027',
      schedule: [],
      matches: []
    });
    expect(drafts.map((d) => [d.date, d.time, d.opponent, d.location, d.round])).toEqual([
      ['2026-11-01', '10:00', 'GD Ribeira', 'casa', 1],
      ['2026-11-08', '09:30', 'AD Vale Novo', 'fora', 2],
      ['2026-11-15', '', 'UD Serra', 'casa', 3]
    ]);
    expect(drafts[0].venue).toBe('Campo da Mata');
    expect(drafts.every((d) => !d.duplicate)).toBe(true);
  });

  it('uses the name the app already knows and flags games already in the Agenda', () => {
    const schedule = [
      { id: 's1', opponent: 'Vale Novo', date: '2026-11-08', time: '09:30', callup: [] } as unknown as ScheduledMatch
    ];
    const matches = [{ id: 'm1', opponent: 'G.D. Ribeira', date: '2026-10-01' } as unknown as Match];
    const drafts = fixtureDrafts(fixtures, { ourAlias: "CD Falcões 'A'", season: '2026/2027', schedule, matches });
    expect(drafts[0].opponent).toBe('G.D. Ribeira');
    expect(drafts[0].duplicate).toBe(false);
    expect(drafts[1].duplicate).toBe(true);
  });
});

describe('clubBrand', () => {
  const store = new Map<string, string>();
  const classes = new Set<string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  });
  vi.stubGlobal('document', {
    documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } }
  });
  afterEach(() => {
    store.clear();
    classes.clear();
  });

  it('keeps the club name and colour for the entrance screen', async () => {
    expect(loadBrand()).toEqual({ name: undefined, color: undefined, logo: undefined });
    await saveBrand({ name: '  CD Falcões ', color: '#16a34a' });
    expect(loadBrand()).toEqual({ name: 'CD Falcões', color: '#16a34a', logo: undefined });
  });

  it('ignores a stored symbol that is not an image', () => {
    store.set('bcv_club_brand_v1', JSON.stringify({ name: 'X', logo: 'javascript:alert(1)' }));
    expect(loadBrand().logo).toBeUndefined();
  });

  it('turns compact mode on and off on this phone', () => {
    expect(loadCompact()).toBe(false);
    applyCompact(true);
    expect(classes.has('compact')).toBe(true);
    expect(loadCompact()).toBe(true);
    applyCompact(false);
    expect(classes.has('compact')).toBe(false);
    expect(loadCompact()).toBe(false);
  });
});
