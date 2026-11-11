import { describe, expect, it } from 'vitest';
import { Training } from '../types';
import {
  dayLabel,
  nextGame,
  nextTraining,
  periodSummary,
  seasonTotals,
  trainingStatus,
  weekSummary
} from '../lib/planningSummary';

const TODAY = '2026-11-11'; // a Wednesday
const tr = (p: Partial<Training> & { id: string; date: string }): Training => ({
  notes: '',
  absences: [],
  ...p
});

describe('planningSummary', () => {
  it('only counts trainings marked done, up to today, as realized', () => {
    expect(trainingStatus(tr({ id: 'a', date: '2026-11-10', completed: true }), TODAY)).toBe('realizado');
    expect(trainingStatus(tr({ id: 'b', date: '2026-11-10' }), TODAY)).toBe('realizado');
    expect(trainingStatus(tr({ id: 'c', date: '2026-11-10', completed: false }), TODAY)).toBe('por_fechar');
    expect(trainingStatus(tr({ id: 'd', date: '2026-11-12', completed: false }), TODAY)).toBe('agendado');
    expect(trainingStatus(tr({ id: 'e', date: '2026-11-11', completed: false }), TODAY)).toBe('agendado');
  });

  it('keeps planned and realized minutes apart and themes only from realized plans', () => {
    const trainings = [
      tr({
        id: 'a',
        date: '2026-11-09',
        completed: true,
        durationMinutes: 75,
        sessionPlan: {
          totalDurationMinutes: 75,
          blocks: [
            { id: '1', title: 'Rondo', durationMinutes: 15, category: 'aquecimento' },
            { id: '2', title: 'Saída', durationMinutes: 40, category: 'tatica' }
          ]
        }
      }),
      tr({ id: 'b', date: '2026-11-10', completed: false, durationMinutes: 60 }),
      tr({
        id: 'c',
        date: '2026-11-13',
        completed: false,
        durationMinutes: 90,
        sessionPlan: {
          totalDurationMinutes: 90,
          blocks: [{ id: '3', title: 'Jogo', durationMinutes: 30, category: 'jogo' }]
        }
      })
    ];
    const s = periodSummary(trainings, '2026-11-09', '2026-11-15', TODAY);
    expect(s.realized).toEqual({ count: 1, minutes: 75 });
    expect(s.unclosed).toEqual({ count: 1, minutes: 60 });
    expect(s.scheduled).toEqual({ count: 1, minutes: 90 });
    expect(s.themes).toEqual({ aquecimento: 15, tatica: 40 });
    expect(s.themedMinutes).toBe(55);
  });

  it('has nothing to show without trainings', () => {
    const w = weekSummary({ trainings: [], season: '2026/2027' }, TODAY);
    expect(w.start).toBe('2026-11-09');
    expect(w.end).toBe('2026-11-15');
    expect(w.realized.count + w.scheduled.count + w.unclosed.count).toBe(0);
    expect(
      seasonTotals({ trainings: undefined as unknown as Training[], season: '2026/2027' }, TODAY).season.realized
        .minutes
    ).toBe(0);
    expect(nextTraining([], TODAY)).toBeUndefined();
    expect(nextGame([], TODAY)).toBeUndefined();
  });

  it('finds the next training and game', () => {
    const next = nextTraining(
      [
        tr({ id: 'old', date: '2026-11-10', completed: false }),
        tr({ id: 'later', date: '2026-11-13', time: '18:30', completed: false }),
        tr({ id: 'soon', date: '2026-11-11', time: '19:00', completed: false }),
        tr({ id: 'done', date: '2026-11-11', time: '10:00', completed: true })
      ],
      TODAY
    );
    expect(next?.id).toBe('soon');
    expect(dayLabel('2026-11-11', TODAY)).toBe('Hoje');
    expect(dayLabel('2026-11-12', TODAY)).toBe('Amanhã');
    expect(dayLabel('2026-11-14', TODAY)).toBe('sábado, 14 nov');
  });
});
