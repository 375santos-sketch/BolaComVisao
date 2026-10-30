import { describe, expect, it } from 'vitest';
import {
  evolutionMessage,
  FITNESS_TESTS,
  formatResult,
  parseResult,
  playerEvolution,
  roundKey,
  roundOf,
  withResult
} from '../lib/fitnessTests';
import { Player } from '../types';

const sprint = FITNESS_TESTS.find((t) => t.id === 'sprint20')!;
const jump = FITNESS_TESTS.find((t) => t.id === 'salto')!;
const touches = FITNESS_TESTS.find((t) => t.id === 'toques30')!;
// Fictitious athlete
const rui = { id: 'p1', name: 'Rui Silva', number: 9, positions: 'Avançado', active: true, birthDate: null } as Player;
const S = '2026/2027';

describe('bateria de testes', () => {
  it('knows the round of a date', () => {
    expect(roundOf(new Date('2026-10-30'))).toBe('set');
    expect(roundOf(new Date('2027-01-20'))).toBe('jan');
    expect(roundOf(new Date('2027-05-10'))).toBe('mai');
  });

  it('reads and shows results in the test unit', () => {
    expect(parseResult(sprint, '3,94')).toBe(3.94);
    expect(parseResult(sprint, '3.9')).toBe(3.9);
    expect(parseResult(sprint, '40')).toBeNull();
    expect(parseResult(jump, '151,4')).toBe(151);
    expect(parseResult(touches, '')).toBeNull();
    expect(formatResult(sprint, 3.9)).toBe('3,90 s');
    expect(formatResult(jump, 151)).toBe('151 cm');
    expect(formatResult(touches, 34)).toBe('34');
    expect(formatResult(touches, undefined)).toBe('—');
  });

  it('keeps each result in its round and removes it when cleared', () => {
    let p = withResult(rui, roundKey(S, 'set'), 'sprint20', 4);
    p = withResult(p, roundKey(S, 'jan'), 'sprint20', 3.8);
    expect(p.fitnessTests).toEqual({ '2026/2027-set': { sprint20: 4 }, '2026/2027-jan': { sprint20: 3.8 } });
    expect(withResult(p, roundKey(S, 'jan'), 'sprint20', null).fitnessTests).toEqual({
      '2026/2027-set': { sprint20: 4 }
    });
  });

  it("shows the athlete's own evolution: lower is better for times, higher for the rest", () => {
    const p = {
      ...rui,
      fitnessTests: {
        '2026/2027-set': { sprint20: 4.0, salto: 142, toques30: 21, passe30: 17 },
        '2026/2027-jan': { sprint20: 3.94, salto: 151, toques30: 34, passe30: 16 },
        '2025/2026-mai': { sprint20: 5 }
      }
    };
    const ev = Object.fromEntries(playerEvolution(p, S).map((e) => [e.test.id, e]));
    expect(ev.sprint20).toMatchObject({ first: 4, last: 3.94, trend: 'melhor', big: false });
    expect(ev.salto).toMatchObject({ trend: 'melhor', big: true });
    expect(ev.toques30).toMatchObject({ trend: 'melhor', big: true });
    expect(ev.passe30).toMatchObject({ trend: 'pior' });
    expect(ev.slalom).toMatchObject({ trend: null, last: undefined });

    const text = evolutionMessage(p, S, 'Dragões');
    expect(text).toContain('📏 Testes de Rui · Dragões · 2026/2027');
    expect(text).toContain('⚡ Sprint 20 m: 4,00 s → 3,94 s ▲');
    expect(text).toContain('⚽ Toques em 30 s: 21 → 34 🚀');
    expect(text).toContain('Melhorou em 3 de 4 testes 💪');
    expect(text).not.toContain('Slalom');
  });
});
