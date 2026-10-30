import { describe, expect, it } from 'vitest';
import { cleanPrintExercise } from '../lib/printExercise';
import { nextTraining, planFromRestDocument, renderPlanPage, sharedPlanOf } from '../lib/coachPlan';
import { Exercise, Training } from '../types';

describe('exercício a partir de uma foto', () => {
  it('keeps what was read and the drawing box', () => {
    expect(
      cleanPrintExercise({
        name: ' Rondo 4x2 ',
        category: 'Técnica',
        durationMinutes: 15,
        objective: 'Circulação sob pressão',
        description: '4 fora, 2 dentro.',
        drawing: { x: 0.5, y: 0.3, w: 0.4, h: 0.6 }
      })
    ).toEqual({
      name: 'Rondo 4x2',
      category: 'tecnica',
      durationMinutes: 15,
      objective: 'Circulação sob pressão',
      description: '4 fora, 2 dentro.',
      drawing: { x: 0.5, y: 0.3, w: 0.4, h: 0.6 }
    });
  });

  it('leaves out a missing drawing, a strange duration and an unknown category', () => {
    const r = cleanPrintExercise({
      name: 'Jogo',
      category: 'xpto',
      durationMinutes: 900,
      drawing: { x: 0, y: 0, w: 0, h: 0 }
    });
    expect(r).toEqual({ name: 'Jogo', category: 'tecnica' });
    expect(cleanPrintExercise({ category: 'jogo' })).toBeNull();
    expect(cleanPrintExercise('nada')).toBeNull();
  });
});

describe('plano para o adjunto', () => {
  const image = 'data:image/jpeg;base64,' + 'A'.repeat(400_000);
  const exercises = [
    { id: 'e1', name: 'Rondo', category: 'tecnica', durationMinutes: 20, image, description: 'Dois toques.' },
    { id: 'e2', name: 'Jogo', category: 'jogo', durationMinutes: 25, image }
  ] as Exercise[];
  const trainings = [
    { id: 't1', date: '2026-10-29', time: '18:15', absences: ['p1'], notes: 'Rui esteve mal', completed: true },
    {
      id: 't2',
      date: '2026-11-02',
      time: '19:15',
      trainingNumber: 4,
      durationMinutes: 75,
      absences: ['p2'],
      notes: 'nota privada',
      completed: false,
      sessionPlan: {
        objective: 'Pressão alta',
        blocks: [
          { id: 'b1', title: 'Rondo 4x2', exerciseId: 'e1', category: 'tecnica', durationMinutes: 20 },
          {
            id: 'b2',
            title: 'Jogo 5x5',
            exerciseId: 'e2',
            category: 'jogo',
            durationMinutes: 25,
            notes: 'Golo a dobrar'
          }
        ]
      }
    }
  ] as Training[];

  it('shows today’s training, or the next one', () => {
    expect(nextTraining(trainings, '2026-10-29')?.id).toBe('t1');
    expect(nextTraining(trainings, '2026-10-30')?.id).toBe('t2');
    expect(nextTraining(trainings, '2026-11-03')).toBeUndefined();
  });

  it('carries only the plan (no absences or notes) and keeps the drawings within the size limit', () => {
    const plan = sharedPlanOf({ trainings, exerciseLibrary: exercises }, '2026-10-30')!;
    expect(JSON.stringify(plan)).not.toMatch(/nota privada|p2|absences/);
    expect(plan).toMatchObject({ date: '2026-11-02', time: '19:15', number: 4, objective: 'Pressão alta' });
    expect(plan.blocks.map((b) => [b.title, b.notes, Boolean(b.image)])).toEqual([
      ['Rondo 4x2', 'Dois toques.', true],
      ['Jogo 5x5', 'Golo a dobrar', false]
    ]);
  });

  it('page: the plan, escaped text, the live block and the note when the training is over', () => {
    const doc = {
      fields: {
        teamName: { stringValue: 'Dragões <b>Sub-11</b>' },
        color: { stringValue: '#d6332f' },
        plan: {
          mapValue: {
            fields: {
              date: { stringValue: '2026-11-02' },
              time: { stringValue: '19:15' },
              blocks: {
                arrayValue: {
                  values: [
                    {
                      mapValue: {
                        fields: {
                          title: { stringValue: 'Rondo <script>alert(1)</script>' },
                          durationMinutes: { integerValue: '20' },
                          image: { stringValue: 'javascript:alert(1)' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    };
    const page = planFromRestDocument(doc)!;
    expect(page.plan?.blocks[0].image).toBeUndefined();
    const html = renderPlanPage(page, '2026-11-01');
    expect(html).toContain('Rondo &lt;script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('Dragões &lt;b&gt;Sub-11&lt;/b&gt;');
    expect(html).toContain('0–20');
    expect(html).not.toContain('já passou');
    expect(renderPlanPage(page, '2026-11-05')).toContain('Este treino já passou');
    expect(renderPlanPage({ ...page, plan: null })).toContain('Ainda não há um próximo treino');
  });
});
