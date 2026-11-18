import { describe, expect, it } from 'vitest';
import {
  assignmentsForAthlete,
  athletesOf,
  cleanAssignment,
  cleanMission,
  doneSteps,
  isAssignmentOverdue,
  missionProblems,
  newAssignment,
  newMission,
  readyToReassess,
  sortAssignments,
  stepCount,
  stepsOf,
  withStepDone
} from '../lib/missions';
import { newSession } from '../lib/vjLibrary';
import { assembleState, extractRecords } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { familyViewOf } from '../lib/familyView';
import { Assignment, Mission, VjSession } from '../types';

// Fictitious data, only for this test
const NOW = '2026-11-17T10:00:00.000Z';
const challenge = (id: string, status: VjSession['status'] = 'publicado'): VjSession => ({
  ...newSession({ id, title: `Desafio ${id}`, now: NOW }),
  status
});
const challenges = [challenge('c1'), challenge('c2'), challenge('c3'), challenge('c4', 'rascunho')];
const mission = (patch: Partial<Mission> = {}): Mission => ({
  ...newMission({ id: 'm1', now: NOW }),
  title: 'Receção orientada',
  competencyId: 'rececao_orientada',
  steps: [{ challengeId: 'c1' }, { challengeId: 'c2' }, { challengeId: 'c3' }],
  ...patch
});
const roster = [
  { id: 'p1', active: true },
  { id: 'p2', active: true },
  { id: 'p3', active: false }
];

describe('MC1b — missões', () => {
  it('2 to 6 published challenges of the team, each once, in order', () => {
    expect(missionProblems(cleanMission(mission(), NOW), challenges)).toEqual([]);
    expect(missionProblems(cleanMission(mission({ steps: [{ challengeId: 'c1' }] }), NOW), challenges)).toContain(
      'Uma missão tem de 2 a 6 desafios.'
    );
    expect(
      missionProblems(cleanMission(mission({ steps: [{ challengeId: 'c1' }, { challengeId: 'c4' }] }), NOW), challenges)
    ).toContain('Todos os desafios da missão têm de estar publicados na equipa.');
    const repeated = cleanMission(
      mission({ steps: [{ challengeId: 'c1' }, { challengeId: 'c1' }, { challengeId: 'c2' }] }),
      NOW
    );
    expect(repeated.steps.map((s) => s.challengeId)).toEqual(['c1', 'c2']);
    const many = cleanMission(mission({ steps: Array.from({ length: 9 }, (_, i) => ({ challengeId: `x${i}` })) }), NOW);
    expect(many.steps).toHaveLength(6);
  });

  it('only a known competency, valid age groups and difficulty are kept', () => {
    const m = cleanMission(
      mission({ competencyId: 'inventada', ageGroups: ['Sub-11', 'Sub-99'], difficulty: 9 as never }),
      NOW
    );
    expect(m.competencyId).toBeUndefined();
    expect(m.ageGroups).toEqual(['Sub-11']);
    expect(m.difficulty).toBeUndefined();
  });

  it('a deleted challenge does not break the mission (the step says so)', () => {
    const steps = stepsOf(mission({ steps: [{ challengeId: 'c1' }, { challengeId: 'apagado' }] }), challenges);
    expect(steps[1].challenge).toBeNull();
  });
});

describe('MC1b — atribuições', () => {
  const a = (patch: Partial<Assignment> = {}) =>
    ({
      ...newAssignment({ id: 'a1', target: { kind: 'missao', id: 'm1' }, to: 'equipa', now: NOW }),
      ...patch
    }) as Assignment;

  it('to the whole team (active athletes) or to chosen athletes', () => {
    expect(athletesOf(a(), roster)).toEqual(['p1', 'p2']);
    expect(athletesOf(a({ to: ['p2', 'naoexiste'] }), roster)).toEqual(['p2']);
  });

  it('the goal only for one athlete', () => {
    const one = newAssignment({
      id: 'a2',
      target: { kind: 'desafio', id: 'c1' },
      to: ['p1'],
      goal: { athleteId: 'p1', goalId: 'g1' },
      now: NOW
    });
    expect(one.goal).toEqual({ athleteId: 'p1', goalId: 'g1' });
    const two = newAssignment({
      id: 'a3',
      target: { kind: 'desafio', id: 'c1' },
      to: ['p1', 'p2'],
      goal: { athleteId: 'p1', goalId: 'g1' },
      now: NOW
    });
    expect(two.goal).toBeUndefined();
  });

  it('the coach ticks and unticks each step with the day; progress only of its athletes', () => {
    let x = withStepDone(a(), 'p1', 0, '2026-11-17', NOW);
    x = withStepDone(x, 'p1', 1, '2026-11-18', NOW);
    expect(doneSteps(x, 'p1')).toBe(2);
    x = withStepDone(x, 'p1', 1, null, NOW);
    expect(doneSteps(x, 'p1')).toBe(1);
    const limited = cleanAssignment(
      { ...a({ to: ['p1'] }), progress: { p1: { 0: '2026-11-17' }, p2: { 0: '2026-11-17' } } },
      NOW
    );
    expect(Object.keys(limited.progress || {})).toEqual(['p1']);
  });

  it('a single challenge counts as one step; deadlines and order', () => {
    expect(stepCount(a({ target: { kind: 'desafio', id: 'c1' } }), [])).toBe(1);
    expect(stepCount(a(), [mission()])).toBe(3);
    expect(isAssignmentOverdue(a({ dueDate: '2026-11-10' }), '2026-11-17')).toBe(true);
    expect(isAssignmentOverdue(a({ dueDate: '2026-11-10', status: 'concluida' }), '2026-11-17')).toBe(false);
    const sorted = sortAssignments([
      a({ id: 'x', dueDate: '2026-12-01' }),
      a({ id: 'y', priority: true }),
      a({ id: 'z', status: 'concluida' }),
      a({ id: 'w', dueDate: '2026-11-20' })
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['y', 'w', 'x', 'z']);
  });

  it('finishing every step only suggests reassessing: no evaluation is changed', () => {
    let x = a();
    for (const step of [0, 1, 2]) x = withStepDone(x, 'p1', step, '2026-11-17', NOW);
    expect(readyToReassess(x, [mission()], roster)).toEqual(['p1']);
    expect(x).not.toHaveProperty('levels');
    expect(assignmentsForAthlete([x, a({ id: 'c', status: 'cancelada' })], 'p1', roster).map((s) => s.id)).toEqual([
      'a1'
    ]);
  });
});

describe('MC1b — dados e compatibilidade', () => {
  const state = normalizeClubState({
    activeTeamId: 'eq1',
    teams: [
      {
        id: 'eq1',
        clubName: 'Clube Exemplo',
        category: 'Sub-11',
        season: '2026/2027',
        roster: [{ id: 'p1', name: 'Atleta Um', number: 7, positions: '', birthDate: null, active: true }],
        missions: [cleanMission(mission(), NOW)],
        assignments: [newAssignment({ id: 'a1', target: { kind: 'missao', id: 'm1' }, to: ['p1'], now: NOW })]
      }
    ]
  } as never);

  it('missions and assignments are their own records of the team, and come back the same', () => {
    const records = extractRecords(state);
    const kinds = [...records.values()].map((r) => r.kind);
    expect(kinds).toContain('mission');
    expect(kinds).toContain('assignment');
    expect(records.get('mission__eq1__m1')?.teamId).toBe('eq1');
    const back = assembleState(records, { ...state, teams: [] } as never);
    const team = back.teams.find((t) => t.id === 'eq1');
    expect(team?.missions?.[0].steps).toHaveLength(3);
    expect(team?.assignments?.[0].to).toEqual(['p1']);
    // never inside the Visão de Jogo sessions (the MC1a envelope stays as it is)
    expect(team?.vjSessions || []).toEqual([]);
  });

  it('nothing of it reaches the family page', () => {
    const raw = JSON.stringify(familyViewOf(state, state.roster[0], new Date('2026-11-17T10:00:00Z')));
    expect(raw).not.toMatch(/Receção orientada|missions|assignments|progress/);
  });
});
