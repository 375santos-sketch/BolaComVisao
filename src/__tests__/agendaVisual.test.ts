import { describe, expect, it } from 'vitest';
import { agendaSections } from '../components/views/schedule/services/agendaSections';
import { clearedAgenda } from '../lib/agendaReset';
import { CalendarEvent } from '../components/views/schedule/types';
import { AppState } from '../types';

const ev = (id: string, date: string, time = '10:00'): CalendarEvent => ({
  id,
  date,
  time,
  title: id,
  category: 'training'
});

describe('agendaSections', () => {
  // Tuesday 27/10/2026: this week runs Monday 26/10 to Sunday 01/11
  const today = '2026-10-27';
  const { upcoming, past } = agendaSections(
    [
      ev('mes', '2026-12-05'),
      ev('ontem', '2026-10-26'),
      ev('hoje-tarde', '2026-10-27', '18:15'),
      ev('domingo', '2026-11-01'),
      ev('proxima', '2026-11-03'),
      ev('hoje-manha', '2026-10-27', '09:00'),
      ev('antigo', '2026-10-10')
    ],
    today
  );

  it('opens on what is coming, by week and then by month', () => {
    expect(upcoming.map((s) => [s.label, s.events.map((e) => e.id)])).toEqual([
      ['Esta semana', ['hoje-manha', 'hoje-tarde', 'domingo']],
      ['Próxima semana', ['proxima']],
      ['Dezembro 2026', ['mes']]
    ]);
  });

  it('keeps what already happened apart, most recent first', () => {
    expect(past.map((e) => e.id)).toEqual(['ontem', 'antigo']);
  });
});

describe('clearedAgenda', () => {
  it('empties the active team agenda but keeps the trainings already done', () => {
    const state = {
      activeTeamId: 'a',
      trainings: [
        { id: 't1', completed: true },
        { id: 't2', completed: false }
      ],
      teams: [
        { id: 'a', schedule: [{ id: 's' }] },
        { id: 'b', schedule: [{ id: 'x' }] }
      ]
    } as unknown as AppState;
    const next = clearedAgenda(state);
    expect(next.schedule).toEqual([]);
    expect(next.trainings.map((t) => t.id)).toEqual(['t1']);
    expect((next.teams[0] as any).schedule).toEqual([]);
    expect((next.teams[1] as any).schedule).toEqual([{ id: 'x' }]);
  });
});
