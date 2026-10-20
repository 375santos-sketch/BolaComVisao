import { describe, it, expect } from 'vitest';
import { parseMinuteToNumber } from '../lib/gameAnalysisUtils';
import { Match, SubEvent } from '../types';

describe('Match Mode Goal Minutes and Remates validation', () => {
  it('correctly parses minutes with apostrophes and stoppage time', () => {
    expect(parseMinuteToNumber("25'")).toBe(25);
    expect(parseMinuteToNumber('25')).toBe(25);
    expect(parseMinuteToNumber(25)).toBe(25);
    expect(parseMinuteToNumber("45+2'")).toBe(47);
    expect(parseMinuteToNumber('90+4')).toBe(94);
    expect(parseMinuteToNumber(null)).toBeNull();
    expect(parseMinuteToNumber('')).toBeNull();
  });

  it('handles simultaneous substitutions array', () => {
    const subs: SubEvent[] = [
      { id: 'sub-1', outId: 'p1', inId: 'p2', minute: "45'", period: 'Intervalo', isHalftime: true },
      { id: 'sub-2', outId: 'p3', inId: 'p4', minute: "45'", period: 'Intervalo', isHalftime: true }
    ];

    expect(subs.length).toBe(2);
    expect(subs[0].outId).not.toBe(subs[1].outId);
    expect(subs[0].inId).not.toBe(subs[1].inId);
  });

  it('validates remates fields inside a match object', () => {
    const match: Match = {
      id: 'test-1',
      opponent: 'Adversário FC',
      date: '2026-10-10',
      type: 'campeonato',
      season: '2026/2027',
      location: 'casa',
      finished: true,
      goals: [
        { id: 'g1', type: 'scored', minute: "23'", scorerId: 'p1' },
        { id: 'g2', type: 'conceded', minute: "60'" }
      ],
      subs: [],
      lineup: [],
      capitao: null,
      rematesDentroArea: 6,
      rematesForaArea: 4,
      rematesDentroAreaAdv: 2,
      rematesForaAreaAdv: 3,
      cantos: 5,
      cantosAdv: 2,
      faltas: 8,
      faltasAdv: 10
    };

    const totalFor = (match.rematesDentroArea ?? 0) + (match.rematesForaArea ?? 0);
    const totalAdv = (match.rematesDentroAreaAdv ?? 0) + (match.rematesForaAreaAdv ?? 0);

    expect(totalFor).toBe(10);
    expect(totalAdv).toBe(5);
    expect(match.rematesDentroArea).toBe(6);
    expect(match.rematesForaArea).toBe(4);
    expect(match.rematesDentroAreaAdv).toBe(2);
    expect(match.rematesForaAreaAdv).toBe(3);
  });

  it('validates goalType (origem/tipo de golo) for scored and conceded goals', () => {
    const match: Match = {
      id: 'test-2',
      opponent: 'Sporting B',
      date: '2026-10-12',
      type: 'campeonato',
      location: 'fora',
      finished: true,
      goals: [
        { id: 'g1', type: 'scored', minute: "15'", scorerId: 'p1', goalType: 'Canto' },
        { id: 'g2', type: 'scored', minute: "40'", scorerId: 'p2', goalType: 'Bola jogada' },
        { id: 'g3', type: 'conceded', minute: "75'", goalType: 'Penálti' }
      ],
      subs: [],
      lineup: [],
      capitao: null
    };

    expect(match.goals[0].goalType).toBe('Canto');
    expect(match.goals[1].goalType).toBe('Bola jogada');
    expect(match.goals[2].goalType).toBe('Penálti');

    const origins = match.goals.map((g) => g.goalType || 'Bola jogada');
    expect(origins).toEqual(['Canto', 'Bola jogada', 'Penálti']);
  });
});
