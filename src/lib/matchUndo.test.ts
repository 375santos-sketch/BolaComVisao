import { describe, expect, it } from 'vitest';
import { Match } from '../types';
import { describeMatchChange, undoMatch } from './matchUndo';

const base = {
  id: 'm1',
  goals: [],
  subs: [],
  cards: [],
  lineup: ['p1'],
  capitao: null,
  matchPhase: 'parte1',
  timer: { isRunning: true, elapsedMs: 600000, lastStartTs: 1 }
} as unknown as Match;

describe('Desfazer no Modo Jogo', () => {
  it('names each change worth undoing', () => {
    const goal = { ...base, goals: [{ id: 'g1', type: 'scored' }] } as unknown as Match;
    expect(describeMatchChange(base, goal)).toBe('Golo marcado');
    expect(describeMatchChange(base, { ...base, goals: [{ id: 'g', type: 'conceded' }] } as unknown as Match)).toBe(
      'Golo sofrido'
    );
    expect(describeMatchChange(goal, base)).toBe('Golo apagado');
    expect(describeMatchChange(base, { ...base, cantosAdv: 1 })).toBe('Canto contra');
    expect(describeMatchChange(base, { ...base, rematesDentroArea: 1, shotsInBoxFor: 1 })).toBe(
      'Remate nosso dentro da área'
    );
    expect(describeMatchChange({ ...base, faltas: 2 }, { ...base, faltas: 1 })).toBe('Falta nossa (retirado)');
    expect(describeMatchChange(base, { ...base, subs: [{ id: 's1' }] } as unknown as Match)).toBe('Substituição');
  });

  it('the clock and the phase are not changes to undo, nor taken back', () => {
    const later = { ...base, timer: { isRunning: false, elapsedMs: 700000, lastStartTs: null } } as Match;
    expect(describeMatchChange(base, later)).toBeNull();
    const before = { ...base, cantos: 0 };
    const now = { ...base, cantos: 1, matchPhase: 'intervalo', timer: later.timer } as Match;
    expect(undoMatch(before, now)).toMatchObject({ cantos: 0, matchPhase: 'intervalo', timer: later.timer });
  });
});
