import { describe, expect, it } from 'vitest';
import { Player } from '../types';
import {
  averageOf,
  evaluationsOf,
  formatScore,
  goalsOf,
  toggledGoal,
  withEvaluation,
  withGoal,
  withoutEvaluation
} from './playerEvolution';

const base = { id: 'p1', name: 'Atleta Teste', number: 7, positions: 'Médio', active: true } as Player;
const scores = (t: number, ta: number, f: number, p: number, j: number) => ({
  tecnica: t,
  tatica: ta,
  fisica: f,
  psicologica: p,
  jogo: j
});

describe('Evolução do atleta', () => {
  it('keeps the evaluations most recent first, one per day, with scores from 1 to 5', () => {
    let p = withEvaluation(base, { id: 'e1', date: '2026-09-20', scores: scores(3, 2, 3, 3, 2) });
    p = withEvaluation(p, { id: 'e2', date: '2026-11-12', scores: scores(4, 3, 3, 4, 9), note: '  Boa evolução  ' });
    // Same day again: replaces it
    p = withEvaluation(p, { id: 'e3', date: '2026-11-12', scores: scores(4, 3, 3, 4, 3) });
    const list = evaluationsOf(p);
    expect(list.map((e) => e.id)).toEqual(['e3', 'e1']);
    expect(formatScore(averageOf(list[0]))).toBe('3,4');
    expect(formatScore(averageOf(list[1]))).toBe('2,6');
    expect(
      withEvaluation(base, { id: 'x', date: '2026-11-12', scores: scores(9, 0, 3, 3, 3), note: ' ok ' }).evaluations![0]
    ).toEqual({
      id: 'x',
      date: '2026-11-12',
      scores: scores(5, 1, 3, 3, 3),
      note: 'ok'
    });
    expect(evaluationsOf(withoutEvaluation(p, 'e1')).map((e) => e.id)).toEqual(['e3']);
  });

  it('individual goals: open ones first, reached ones with the day they were reached', () => {
    let p = withGoal(base, { id: 'g1', text: 'Receber orientado', area: 'tecnica', createdAt: '2026-11-01' });
    p = withGoal(p, { id: 'g2', text: 'Falar na pressão', createdAt: '2026-11-05' });
    p = withGoal(p, { id: 'g3', text: '   ', createdAt: '2026-11-05' });
    p = toggledGoal(p, 'g1', '2026-11-10');
    expect(goalsOf(p).map((g) => [g.id, g.doneAt])).toEqual([
      ['g2', undefined],
      ['g1', '2026-11-10']
    ]);
    expect(goalsOf(toggledGoal(p, 'g1', '2026-11-11')).map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('athletes without evaluations or goals', () => {
    expect(evaluationsOf(base)).toEqual([]);
    expect(goalsOf(base)).toEqual([]);
  });
});
