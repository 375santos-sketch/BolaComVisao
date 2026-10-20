import { describe, it, expect } from 'vitest';
import { hasInventedImportData, removeInventedImportData } from '../lib/inventedImportCleanup';
import { Match } from '../types';

const roster = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);

/** What the old list-style Excel import produced for a 2-1 game. */
const oldImport = (): Match =>
  ({
    id: 'imp1',
    opponent: 'Esparteiros',
    date: '2026-09-20',
    season: '2026/2027',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [
      { id: 'g1', type: 'scored', minute: 20, scorerId: 'p1', assistId: null, goalType: 'Bola jogada' },
      { id: 'g2', type: 'scored', minute: 45, scorerId: 'p2', assistId: null, goalType: 'Bola jogada' },
      { id: 'g3', type: 'conceded', minute: 35, scorerId: null, assistId: null, goalType: 'Bola jogada' }
    ],
    subs: [],
    lineup: roster.slice(0, 11),
    capitao: 'p1',
    finalScore: { scored: 2, conceded: 1 }
  }) as Match;

describe('Limpeza de dados inventados em importações antigas', () => {
  it('recognises the old import signature and removes only the invented parts', () => {
    const m = oldImport();
    expect(hasInventedImportData(m)).toBe(true);
    const clean = removeInventedImportData(m);
    expect(clean.goals.map((g) => [g.type, g.scorerId, g.minute, g.goalType])).toEqual([
      ['scored', null, null, undefined],
      ['scored', null, null, undefined],
      ['conceded', null, null, undefined]
    ]);
    expect(clean.lineup).toEqual([]);
    expect(clean.capitao).toBeNull();
    expect(clean.finalScore).toEqual({ scored: 2, conceded: 1 });
    expect(hasInventedImportData(clean)).toBe(false);
  });

  it('recognises a 0-0 import by its 11 starters in a 7-a-side game', () => {
    expect(hasInventedImportData({ ...oldImport(), goals: [] })).toBe(true);
  });

  it('never touches a match played live or recorded with real details', () => {
    const live = { ...oldImport(), timer: { isRunning: false, elapsedMs: 3_600_000, lastStartTs: null } } as Match;
    expect(hasInventedImportData(live)).toBe(false);
    const withSubs = { ...oldImport(), subs: [{ id: 's', outId: 'p1', inId: 'p12', minute: "40'" }] } as Match;
    expect(hasInventedImportData(withSubs)).toBe(false);
    const realGoals = {
      ...oldImport(),
      lineup: roster.slice(0, 7),
      capitao: 'p3',
      goals: [
        { id: 'g1', type: 'scored', minute: "12'", scorerId: 'p5', assistId: 'p2', goalType: 'Canto' },
        { id: 'g2', type: 'scored', minute: "45'", scorerId: 'p2', assistId: null, goalType: 'Bola jogada' }
      ]
    } as Match;
    expect(hasInventedImportData(realGoals)).toBe(false);
  });

  it('does not flag a coherent match that just happens to have a goal at 20’', () => {
    const coincidence = {
      ...oldImport(),
      lineup: roster.slice(0, 7),
      capitao: 'p4',
      goals: [{ id: 'g1', type: 'scored', minute: 20, scorerId: 'p1', assistId: 'p3', goalType: 'Bola jogada' }]
    } as Match;
    expect(hasInventedImportData(coincidence)).toBe(false);
  });
});
