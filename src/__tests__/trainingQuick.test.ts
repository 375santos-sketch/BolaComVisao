import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  playerAbsences,
  repeatTraining,
  trainingForToday,
  trainingsInListOrder,
  withAttendance
} from '../lib/trainingQuick';
import { Training } from '../types';

const tr = (id: string, date: string, extra: Partial<Training> = {}): Training => ({
  id,
  date,
  notes: '',
  absences: [],
  completed: true,
  ...extra
});

describe('Treino de hoje', () => {
  it('opens the training already planned for today', () => {
    const planned = tr('t3', '2026-10-22', { completed: false, trainingNumber: 3 });
    const { training, isNew } = trainingForToday([tr('t1', '2026-10-20'), planned], 2, '2026-10-22');
    expect(isNew).toBe(false);
    expect(training).toBe(planned);
  });

  it('otherwise creates one with the usual time, place and focus, everyone present, next number', () => {
    const last = tr('t2', '2026-10-20', { time: '18:15', location: 'Sintético', type: '⚡ Tático', trainingNumber: 2 });
    const { training, isNew } = trainingForToday([tr('t1', '2026-10-15', { time: '19:00' }), last], 2, '2026-10-22');
    expect(isNew).toBe(true);
    expect(training).toMatchObject({
      date: '2026-10-22',
      time: '18:15',
      location: 'Sintético',
      type: '⚡ Tático',
      trainingNumber: 3,
      absences: [],
      completed: true
    });
  });
});

describe('Presenças com motivo', () => {
  it('keeps only the reasons of players who missed', () => {
    const next = withAttendance(tr('t', '2026-10-22'), ['p1'], { p1: 'doente', p2: 'escola' });
    expect(next.absences).toEqual(['p1']);
    expect(next.absenceReasons).toEqual({ p1: 'doente' });
  });

  it('removes the reasons when nobody missed', () => {
    const next = withAttendance(tr('t', '2026-10-22', { absences: ['p1'], absenceReasons: { p1: 'doente' } }), []);
    expect(next.absenceReasons).toBeUndefined();
  });
});

describe('Repetir treino', () => {
  it('copies the session to the same weekday next week, planned and with everyone present', () => {
    const source = tr('t1', '2026-10-20', {
      time: '18:15',
      location: 'Sintético',
      type: '⚽ Técnico / Finalização',
      absences: ['p1'],
      absenceReasons: { p1: 'doente' },
      trainingNumber: 5,
      sessionPlan: {
        objective: 'Finalização',
        totalDurationMinutes: 75,
        blocks: [{ id: 'b1', title: 'Rondo', durationMinutes: 15 }]
      }
    });
    const copy = repeatTraining(source, [source], 5);
    expect(copy).toMatchObject({
      date: '2026-10-27',
      time: '18:15',
      location: 'Sintético',
      type: '⚽ Técnico / Finalização',
      trainingNumber: 6,
      absences: [],
      completed: false
    });
    expect(copy.absenceReasons).toBeUndefined();
    expect(copy.id).not.toBe(source.id);
    expect(copy.sessionPlan?.blocks[0].title).toBe('Rondo');
    expect(copy.sessionPlan?.blocks[0].id).not.toBe('b1');
  });

  it('adds days across months', () => {
    expect(addDaysISO('2026-10-28', 7)).toBe('2026-11-04');
  });
});

describe('Faltas por atleta', () => {
  it('lists the trainings held that the player missed, newest first, with the reason', () => {
    const list = [
      tr('t1', '2026-10-13', { absences: ['p1'], trainingNumber: 1 }),
      tr('t2', '2026-10-15', { absences: ['p1'], absenceReasons: { p1: 'escola' }, trainingNumber: 2 }),
      tr('t3', '2026-10-17', { absences: [] }),
      tr('t4', '2026-10-29', { absences: ['p1'], completed: false })
    ];
    expect(playerAbsences(list, 'p1')).toEqual([
      { trainingId: 't2', trainingNumber: 2, date: '2026-10-15', reason: 'escola' },
      { trainingId: 't1', trainingNumber: 1, date: '2026-10-13', reason: undefined }
    ]);
  });
});

describe('Ordem da lista', () => {
  it('shows what is coming first (soonest first), then the rest newest first', () => {
    const list = [
      tr('held-old', '2026-10-13'),
      tr('next-far', '2026-10-29', { completed: false }),
      tr('held-new', '2026-10-20'),
      tr('next-today', '2026-10-22', { completed: false }),
      tr('missed-close', '2026-10-21', { completed: false })
    ];
    expect(trainingsInListOrder(list, '2026-10-22').map((t) => t.id)).toEqual([
      'next-today',
      'next-far',
      'missed-close',
      'held-new',
      'held-old'
    ]);
  });
});
