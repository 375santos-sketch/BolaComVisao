import { describe, expect, it } from 'vitest';
import { Training } from '../types';
import {
  datePT,
  dayLabel,
  longDatePT,
  timePT,
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

  it('counts a training marked done today, and never one with a future date', () => {
    expect(trainingStatus(tr({ id: 'today', date: TODAY, completed: true }), TODAY)).toBe('realizado');
    expect(trainingStatus(tr({ id: 'past', date: '2026-10-01', completed: true }), TODAY)).toBe('realizado');
    expect(trainingStatus(tr({ id: 'future', date: '2026-11-20', completed: true }), TODAY)).toBe('agendado');
    const s = periodSummary(
      [
        tr({ id: 'today', date: TODAY, completed: true, durationMinutes: 60 }),
        tr({ id: 'future', date: '2026-11-13', completed: true, durationMinutes: 90 })
      ],
      '2026-11-09',
      '2026-11-15',
      TODAY
    );
    expect(s.realized).toEqual({ count: 1, minutes: 60 });
    expect(s.scheduled).toEqual({ count: 1, minutes: 90 });
  });

  it('keeps the total duration apart from the minutes per theme (trainings without a plan)', () => {
    const s = periodSummary(
      [
        tr({ id: 'noplan', date: '2026-11-10', completed: true, durationMinutes: 90 }),
        tr({
          id: 'plan',
          date: '2026-11-09',
          completed: true,
          durationMinutes: 75,
          sessionPlan: {
            totalDurationMinutes: 75,
            blocks: [
              { id: '1', title: 'A', durationMinutes: 20, category: 'tecnica' },
              { id: '2', title: 'B', durationMinutes: 25, category: 'tecnica' },
              { id: '3', title: 'C', durationMinutes: 10 },
              { id: '4', title: 'D', durationMinutes: 0, category: 'jogo' }
            ]
          }
        })
      ],
      '2026-11-09',
      '2026-11-15',
      TODAY
    );
    expect(s.realized).toEqual({ count: 2, minutes: 165 });
    expect(s.themes).toEqual({ tecnica: 45, outros: 10 });
    expect(s.themedMinutes).toBe(55);
  });

  it('keeps trainings left open on past days out of the realized minutes', () => {
    const s = periodSummary(
      [tr({ id: 'open', date: '2026-11-05', completed: false, durationMinutes: 75 })],
      '2026-11-01',
      '2026-11-30',
      TODAY
    );
    expect(s.realized.minutes).toBe(0);
    expect(s.unclosed).toEqual({ count: 1, minutes: 75 });
  });

  it('writes dates and times the Portuguese way, from the saved values', () => {
    expect(datePT('2026-11-12')).toBe('12/11/2026');
    expect(datePT('2026-03-04T10:00:00Z')).toBe('04/03/2026');
    expect(datePT('')).toBe('');
    expect(timePT('18:30')).toBe('18:30');
    expect(timePT('9:05')).toBe('09:05');
    expect(timePT(undefined)).toBe('');
    expect(longDatePT('2026-11-12')).toBe('quinta-feira, 12/11/2026');
  });
});
