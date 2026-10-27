import { CalendarEvent } from '../types';
import { MONTH_NAMES_PT } from '../constants';

/**
 * Agenda → Lista: what is coming first ("Esta semana", "Próxima semana", then one group per month) and what already
 * happened apart, most recent first, so the list opens on the next game or training instead of the oldest one.
 */

interface AgendaSection {
  key: string;
  label: string;
  events: CalendarEvent[];
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday of the week of a "YYYY-MM-DD" day. */
function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function agendaSections(
  events: CalendarEvent[],
  today: string
): { upcoming: AgendaSection[]; past: CalendarEvent[] } {
  const thisWeek = mondayOf(today);
  const nextWeek = addDays(thisWeek, 7);
  const afterNext = addDays(thisWeek, 14);
  const upcoming: AgendaSection[] = [];
  const past: CalendarEvent[] = [];
  const sorted = [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  sorted.forEach((ev) => {
    // Today's events stay in "Esta semana" even when done; earlier days go to the past
    if (ev.date < today) {
      past.push(ev);
      return;
    }
    let key: string;
    let label: string;
    if (ev.date < nextWeek) {
      key = 'esta';
      label = 'Esta semana';
    } else if (ev.date < afterNext) {
      key = 'proxima';
      label = 'Próxima semana';
    } else {
      key = ev.date.slice(0, 7);
      label = `${MONTH_NAMES_PT[Number(ev.date.slice(5, 7)) - 1] || ''} ${ev.date.slice(0, 4)}`;
    }
    const last = upcoming[upcoming.length - 1];
    if (last && last.key === key) last.events.push(ev);
    else upcoming.push({ key, label, events: [ev] });
  });

  return { upcoming, past: past.reverse() };
}
