import { describe, expect, it } from 'vitest';
import { defaultPresentIds, runScore, vjStatLine, vjStatsFor, wasPresent } from '../lib/vjCompetencies';
import { newSession } from '../lib/vjLibrary';
import { VjSession } from '../types';

// Fictitious data, only for this test
const session = (id: string, competencies: string[], runs: VjSession['runs']): VjSession => ({
  ...newSession({ id, title: `Sessão ${id}`, now: '2026-11-15T10:00:00.000Z' }),
  status: 'publicado',
  competencies,
  items: [
    {
      id: 'v1',
      kind: 'video',
      youtubeId: 'dQw4w9WgXcQ',
      pauses: [
        {
          id: 'q1',
          at: 10,
          kind: 'escolha',
          question: 'Onde receber?',
          options: [
            { id: 'a', text: 'Entre linhas', correct: true },
            { id: 'b', text: 'Atrás', correct: false }
          ]
        },
        {
          id: 'q2',
          at: 20,
          kind: 'escolha',
          question: 'Para onde passar?',
          options: [
            { id: 'a', text: 'Frente', correct: true },
            { id: 'b', text: 'Trás', correct: false }
          ]
        },
        { id: 'q3', at: 30, kind: 'aberta', question: 'O que viste?' }
      ]
    }
  ] as never,
  runs
});
const trainings = [
  { date: '2026-11-05', absences: ['p3'] },
  { date: '2026-11-12', absences: [] }
];

describe('VJ5 — Visão de Jogo nas competências', () => {
  it("the group's score counts only multiple-choice questions it answered", () => {
    const s = session('s1', ['decisao'], []);
    expect(runScore(s, { id: 'r', date: '2026-11-12', answers: { q1: ['a'], q2: ['b'], q3: ['x'] } })).toEqual({
      asked: 2,
      right: 1
    });
  });

  it("who was in a session: the list kept, or (older sessions) who was at that day's training", () => {
    expect(wasPresent({ id: 'r', date: '2026-11-12', answers: {}, presentIds: ['p1'] }, trainings, 'p2')).toBe(false);
    expect(wasPresent({ id: 'r', date: '2026-11-05', answers: {} }, trainings, 'p1')).toBe(true);
    expect(wasPresent({ id: 'r', date: '2026-11-05', answers: {} }, trainings, 'p3')).toBe(false); // missed it
    expect(wasPresent({ id: 'r', date: '2026-11-01', answers: {} }, trainings, 'p1')).toBe(false); // no training
  });

  it("ticked at the end: today's training attendance, or every active athlete", () => {
    const roster = [
      { id: 'p1', active: true },
      { id: 'p3', active: true },
      { id: 'p9', active: false }
    ];
    expect(defaultPresentIds(roster, trainings, '2026-11-05')).toEqual(['p1']);
    expect(defaultPresentIds(roster, trainings, '2026-11-20')).toEqual(['p1', 'p3']);
  });

  it('by competency, only the sessions the athlete was in', () => {
    const sessions = [
      session(
        's1',
        ['decisao', 'rececao_orientada'],
        [
          { id: 'r1', date: '2026-11-05', answers: { q1: ['a'], q2: ['a'] } },
          { id: 'r2', date: '2026-11-12', answers: { q1: ['b'] }, presentIds: ['p1', 'p3'] }
        ]
      ),
      session('s2', ['comunicacao'], [{ id: 'r3', date: '2026-11-12', answers: { q3: ['x'] }, presentIds: ['p2'] }])
    ];
    const p1 = vjStatsFor('p1', sessions, trainings);
    expect(p1.decisao).toMatchObject({
      sessions: 2,
      asked: 3,
      right: 2,
      lastDate: '2026-11-12',
      lastTitle: 'Sessão s1'
    });
    expect(vjStatLine(p1.decisao)).toBe('esteve em 2 sessões · o grupo acertou 2 de 3 perguntas');
    const p3 = vjStatsFor('p3', sessions, trainings);
    expect(p3.decisao).toMatchObject({ sessions: 1, asked: 1, right: 0 });
    const p2 = vjStatsFor('p2', sessions, trainings);
    expect(vjStatLine(p2.comunicacao)).toBe('esteve em 1 sessão · perguntas conversadas em grupo');
    expect(p3.comunicacao).toBeUndefined();
  });
});
