import { describe, it, expect } from 'vitest';
import { calculatePlayerEvolution } from '../lib/intelligenceEngine';
import { AppState, Player } from '../types';

describe('intelligenceEngine', () => {
  const player: Player = {
    id: 'p1',
    name: 'Bernardo Silva',
    positions: 'Médio Ofensivo',
    birthDate: '2000-08-10',
    number: 10,
    active: true
  };

  const baseState: Partial<AppState> = {
    roster: [player],
    matches: [
      {
        id: 'm1',
        season: '2025/2026',
        type: 'campeonato',
        location: 'casa',
        date: '2026-05-01',
        opponent: 'Benfica',
        finished: true,
        lineup: ['p1'],
        subs: [],
        goals: [{ id: 'g1', type: 'scored', scorerId: 'p1', assistId: null, minute: 23, half: 1 }],
        cards: [],
        ratings: { p1: 8 },
        capitao: 'p1',
        timer: { isRunning: false, elapsedMs: 5400000, lastStartTs: null },
        timeline: {
          kickoff: '15:00',
          halftime: '15:45',
          secondHalfStart: '16:00',
          fullTime: '16:45'
        }
      },
      {
        id: 'm2',
        season: '2025/2026',
        type: 'campeonato',
        location: 'fora',
        date: '2026-05-08',
        opponent: 'Porto',
        finished: true,
        lineup: ['p1'],
        subs: [],
        goals: [{ id: 'g2', type: 'scored', scorerId: 'p1', assistId: null, minute: 88, half: 2 }],
        cards: [],
        ratings: { p1: 9 },
        capitao: 'p1',
        timer: { isRunning: false, elapsedMs: 5400000, lastStartTs: null },
        timeline: {
          kickoff: '15:00',
          halftime: '15:45',
          secondHalfStart: '16:00',
          fullTime: '16:45'
        }
      }
    ],
    trainings: [
      { id: 't1', date: '2026-05-02', notes: 'Treino tático', absences: [] },
      { id: 't2', date: '2026-05-04', notes: 'Treino de finalização', absences: [] }
    ],
    trackSubs: true
  };

  it('computes player evolution metrics', () => {
    const evo = calculatePlayerEvolution(player, baseState as AppState);
    expect(evo).not.toBeNull();
    if (evo) {
      expect(evo.totalMatches).toBe(2);
      expect(evo.goals).toBe(2);
      expect(evo.attendanceRate).toBe(100);
      expect(evo.avgRating).toBe(8.5);
      expect(evo.summaryText).toBeTruthy();
    }
  });

  it('ignores scheduled/uncompleted trainings when calculating attendance', () => {
    const testState: Partial<AppState> = {
      ...baseState,
      trainings: [
        { id: 't1', date: '2026-05-02', notes: 'Treino concluído', absences: ['p1'], completed: true },
        { id: 't2', date: '2026-05-04', notes: 'Treino concluído', absences: [], completed: true },
        // Scheduled future training where player might be marked absent in planning, but not completed yet
        { id: 't3', date: '2026-05-10', notes: 'Treino agendado', absences: ['p1'], completed: false }
      ]
    };
    const evo = calculatePlayerEvolution(player, testState as AppState);
    expect(evo).not.toBeNull();
    if (evo) {
      // Out of 2 completed trainings: 1 presence, 1 absence = 50%
      // The 3rd scheduled training MUST NOT be counted!
      expect(evo.totalTrainings).toBe(2);
      expect(evo.attendancePresences).toBe(1);
      expect(evo.attendanceAbsences).toBe(1);
      expect(evo.attendanceRate).toBe(50);
    }
  });

  it('returns 0 attendance when there are no completed trainings', () => {
    const testState: Partial<AppState> = {
      ...baseState,
      trainings: [{ id: 't1', date: '2026-05-10', notes: 'Treino agendado', absences: [], completed: false }]
    };
    const evo = calculatePlayerEvolution(player, testState as AppState);
    expect(evo).not.toBeNull();
    if (evo) {
      expect(evo.totalTrainings).toBe(0);
      expect(evo.attendanceRate).toBe(0);
    }
  });
});
