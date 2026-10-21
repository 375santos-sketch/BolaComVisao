import { describe, it, expect } from 'vitest';
import { parseMatchSheetRows } from '../lib/matchSheetImporter';
import { computeSeasonPlayingTime } from '../lib/playingTime';
import { Match, Player } from '../types';

// Sub-11: 7 on the pitch, two halves of 30'
const roster: Player[] = Array.from({ length: 10 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Atleta ${i + 1}`,
  number: i + 1,
  positions: '',
  birthDate: null,
  active: true
}));
const minutesOf = (m: Match) =>
  Object.fromEntries(computeSeasonPlayingTime([m], roster, 'Sub-11').map((p) => [p.playerId, p.minutes]));
const total = (mins: Record<string, number>) => Object.values(mins).reduce((a, b) => a + b, 0);

/** Rows as in a "Ficha de Jogo" exported by the app (only the rows the importer needs). */
const sheet = (opts: { starters?: number[]; subs: Array<[number, number, number]> }): unknown[][] => [
  ['DOCUMENTO:', 'FICHA DE JOGO VS ADVERSÁRIO TESTE'],
  ['CLUBE:', 'DRAGÕES - SUB11', 'ESCALÃO:', 'SUB-11', 'ÉPOCA:', '2026/2027'],
  ['TIPO:', 'CAMPEONATO', 'FASE / JORNADA:', '1ª JORNADA', 'ADVERSÁRIO:', 'ADVERSÁRIO TESTE'],
  ['TIPO DE REGISTO', 'DETALHE / EVENTO', 'ORIGEM / TIPO DE GOLO', 'MINUTO', 'ATLETA / INTERVENIENTES'],
  ['RESULTADO FINAL', 'DRAGÕES - SUB11 0 - 0 ADVERSÁRIO TESTE', '-', '-', 'DATA: 2026-10-10'],
  ...(opts.starters || []).map((n) => ['TITULAR 1.ª PARTE', `CAMISOLA ${n}`, '-', '-', `${n} - ATLETA ${n}`]),
  ...opts.subs.map(([out, inn, min]) => [
    'SUBSTITUIÇÃO',
    `SAIU: ${out} - ATLETA ${out}`,
    '-',
    min,
    `ENTROU: ${inn} - ATLETA ${inn}`
  ])
];
const parse = (rows: unknown[][]) => parseMatchSheetRows(rows, { roster, fallbackSeason: '2026/2027' });

describe('Minutos de jogo de fichas importadas', () => {
  // Starters 1–7; 8 replaces 1 at 15'; at half time (30') 9 replaces 2; at 45' (15' into the 2nd half) 1 replaces 8
  const subs: Array<[number, number, number]> = [
    [1, 8, 15],
    [2, 9, 30],
    [8, 1, 45]
  ];

  it('2nd-half substitutions count from the start of the 2nd half (was: everything in the 1st half)', () => {
    const mins = minutesOf({ ...parse(sheet({ starters: [1, 2, 3, 4, 5, 6, 7], subs })).match, finished: true });
    expect(mins.p1).toBe(15 + 15); // out at 15', back at 45' until the end
    expect(mins.p8).toBe(15 + 15); // in at 15', out at 45'
    expect(mins.p2).toBe(30);
    expect(mins.p9).toBe(30);
    expect(mins.p3).toBe(60);
    expect(mins.p10).toBe(0);
    expect(total(mins)).toBe(7 * 60); // never more minutes than were played
  });

  it('also fixes matches already saved from an import (no re-import needed)', () => {
    const saved = parse(sheet({ starters: [1, 2, 3, 4, 5, 6, 7], subs })).match;
    const asStored = JSON.parse(JSON.stringify({ ...saved, finished: true })) as Match;
    expect(total(minutesOf(asStored))).toBe(7 * 60);
  });

  it('a sheet without starters: they are deduced from the substitutions, with a warning', () => {
    const all: Array<[number, number, number]> = [
      [1, 8, 10],
      [2, 9, 10],
      [3, 10, 15],
      [4, 1, 20],
      [5, 2, 30],
      [6, 3, 40],
      [7, 4, 50]
    ];
    const res = parse(sheet({ subs: all }));
    expect(res.match.lineup).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
    expect(res.warnings.join(' ')).toMatch(/deduzidos das substituições/);
    expect(total(minutesOf({ ...res.match, finished: true }))).toBe(7 * 60);
  });

  it('does not guess when the substitutions do not reveal all 7 starters', () => {
    const res = parse(sheet({ subs: [[1, 8, 15]] }));
    expect(res.match.lineup).toEqual([]);
    expect(res.warnings.join(' ')).toMatch(/não foi possível deduzi-los/);
  });
});
