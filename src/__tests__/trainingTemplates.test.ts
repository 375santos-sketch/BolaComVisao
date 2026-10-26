import { describe, expect, it } from 'vitest';
import {
  exerciseUsage,
  formFromTemplate,
  teamTemplates,
  templateFromForm,
  usageLabel,
  withTeamTemplates
} from '../lib/trainingTemplates';
import { AppState, Training } from '../types';

const form = {
  type: '⚡ Tático',
  time: '19:00',
  location: 'Campo 2',
  durationMinutes: 75,
  sessionObjective: ' Reação à perda ',
  notes: '',
  sessionBlocks: [{ id: 'b1', exerciseId: 'ex1', title: 'Rondo', durationMinutes: 15, notes: 'Dois toques' }]
};

describe('Modelos de treino', () => {
  it('keeps the plan without date or attendance, and fills a new form with fresh block ids', () => {
    const tpl = templateFromForm(' Terça técnica ', form);
    expect(tpl).toMatchObject({
      name: 'Terça técnica',
      type: '⚡ Tático',
      time: '19:00',
      location: 'Campo 2',
      durationMinutes: 75,
      objective: 'Reação à perda',
      blocks: [{ exerciseId: 'ex1', title: 'Rondo' }]
    });
    expect(tpl).not.toHaveProperty('date');
    const filled = formFromTemplate(tpl);
    expect(filled.sessionBlocks[0]).toMatchObject({ exerciseId: 'ex1', title: 'Rondo', notes: 'Dois toques' });
    expect(filled.sessionBlocks[0].id).not.toBe('b1');
    expect(formFromTemplate(tpl).sessionBlocks[0].id).not.toBe(filled.sessionBlocks[0].id);
  });

  it('are kept in the active team only', () => {
    const state = {
      activeTeamId: 't1',
      teams: [
        { id: 't1', clubName: 'Lobos', category: 'Sub-11' },
        { id: 't2', clubName: 'Lobos', category: 'Sub-13' }
      ]
    } as unknown as AppState;
    const b = templateFromForm('B treino', form);
    const a = templateFromForm('A treino', form);
    const teams = withTeamTemplates(state, [b, a])!;
    expect(teams[0].trainingTemplates).toHaveLength(2);
    expect(teams[1].trainingTemplates).toBeUndefined();
    expect(teamTemplates({ ...state, teams }).map((t) => t.name)).toEqual(['A treino', 'B treino']);
    expect(withTeamTemplates({ ...state, activeTeamId: 'x' }, [])).toBeNull();
  });
});

describe('Uso dos exercícios', () => {
  const tr = (date: string, ids: string[]): Training => ({
    id: date,
    date,
    notes: '',
    absences: [],
    sessionPlan: {
      blocks: ids.map((exerciseId, i) => ({ id: `${date}${i}`, exerciseId, title: 'x', durationMinutes: 10 }))
    }
  });
  const trainings = [tr('2026-10-06', ['ex1', 'ex2']), tr('2026-10-20', ['ex1', 'ex1']), tr('2026-10-30', ['ex2'])];

  it('counts the trainings held, the last date and the next planned one', () => {
    const u = exerciseUsage(trainings, '2026-10-26');
    expect(u.get('ex1')).toEqual({ times: 2, lastDate: '2026-10-20' });
    expect(u.get('ex2')).toEqual({ times: 1, lastDate: '2026-10-06', nextDate: '2026-10-30' });
    expect(u.get('ex3')).toBeUndefined();
  });

  it('describes it in words', () => {
    const u = exerciseUsage(trainings, '2026-10-26');
    expect(usageLabel(u.get('ex1'), '2026-10-26')).toBe('Usado 2× · último há 6 dias (20/10)');
    expect(usageLabel(u.get('ex2'), '2026-10-26')).toBe('Usado 1× · último há 20 dias (06/10) · planeado para 30/10');
    expect(usageLabel(undefined, '2026-10-26')).toBe('Ainda não usado');
    expect(usageLabel({ times: 1, lastDate: '2026-10-26' }, '2026-10-26')).toBe('Usado 1× · último hoje (26/10)');
  });
});
