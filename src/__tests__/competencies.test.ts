import { describe, expect, it } from 'vitest';
import {
  competencyArea,
  competencyEvaluationsOf,
  competencyLabel,
  currentLevels,
  customCompetencyId,
  withCompetencyEvaluation,
  withoutCompetencyEvaluation
} from '../lib/competencies';
import { evaluationsOf } from '../lib/playerEvolution';
import { Player } from '../types';

// Fictitious data, only for this test
const base = {
  id: 'p1',
  name: 'Atleta Exemplo',
  number: 7,
  positions: 'Médio',
  birthDate: null,
  active: true,
  evaluations: [
    { id: 'old', date: '2026-09-01', scores: { tecnica: 3, tatica: 2, fisica: 4, psicologica: 3, jogo: 3 } }
  ]
} as unknown as Player;

describe('D1 — avaliação por competência', () => {
  it('only the competencies chosen, who evaluated and when; levels outside 1–4 are ignored', () => {
    let p = withCompetencyEvaluation(base, {
      id: 'e1',
      date: '2026-10-10',
      evaluatorName: 'Treinador Exemplo',
      levels: { rececao_orientada: 2, pe_nao_dominante: 2, decisao: 7 as never }
    });
    expect(competencyEvaluationsOf(p)[0]).toMatchObject({
      evaluatorName: 'Treinador Exemplo',
      levels: { rececao_orientada: 2, pe_nao_dominante: 2 }
    });
    // An evaluation with nothing chosen is not saved
    expect(withCompetencyEvaluation(p, { id: 'e0', date: '2026-10-11', levels: {} })).toBe(p);
    p = withCompetencyEvaluation(p, { id: 'e2', date: '2026-11-14', levels: { rececao_orientada: 3 } });
    const now = currentLevels(p);
    expect(now.find((c) => c.id === 'rececao_orientada')).toMatchObject({
      level: 3,
      date: '2026-11-14',
      previous: { level: 2, date: '2026-10-10' }
    });
    expect(now.find((c) => c.id === 'pe_nao_dominante')).toMatchObject({ level: 2 });
    expect(now.find((c) => c.id === 'pe_nao_dominante')?.previous).toBeUndefined();
    expect(competencyEvaluationsOf(withoutCompetencyEvaluation(p, 'e2')).map((e) => e.id)).toEqual(['e1']);
  });

  it("the coach's own competencies, and the older 1–5 evaluations stay exactly as they were", () => {
    const own = customCompetencyId('  Jogo aéreo ');
    expect(competencyLabel(own)).toBe('Jogo aéreo');
    expect(competencyArea(own)).toBe('outras');
    expect(competencyLabel('rececao_orientada')).toBe('Receção orientada');
    const p = withCompetencyEvaluation(base, { id: 'e1', date: '2026-11-14', levels: { [own]: 4 } });
    expect(evaluationsOf(p)).toEqual(evaluationsOf(base)); // never converted into levels
  });
});
