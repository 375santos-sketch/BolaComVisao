import { AppState } from '../types';

/**
 * 📣 Comunicação → "Aviso de alteração": a short message for the parents' group about a change to a training or a
 * game (new time, new place, cancelled, or a reminder). Only the event and the change: never contacts, birth dates
 * or notes.
 */

export type ChangeKind = 'hora' | 'local' | 'cancelado' | 'lembrete';

interface UpcomingEvent {
  id: string;
  kind: 'treino' | 'jogo';
  date: string;
  time?: string;
  place?: string;
  /** "Treino" or "Jogo vs Abrantes" */
  title: string;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

/** The trainings and games of the next `days` days (today included), soonest first. */
export function upcomingEvents(
  state: Pick<AppState, 'trainings' | 'schedule'>,
  today: string,
  days = 14
): UpcomingEvent[] {
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + days);
  const last = end.toISOString().slice(0, 10);
  const inRange = (d?: string) => Boolean(d && d >= today && d <= last);
  const list: UpcomingEvent[] = [
    ...(state.trainings || [])
      .filter((t) => t && inRange(t.date) && !t.completed)
      .map((t) => ({
        id: t.id,
        kind: 'treino' as const,
        date: t.date,
        time: t.time,
        place: t.location,
        title: t.trainingNumber ? `Treino nº ${t.trainingNumber}` : 'Treino'
      })),
    ...(state.schedule || [])
      .filter((s) => s && inRange(s.date))
      .map((s) => ({
        id: s.id,
        kind: 'jogo' as const,
        date: s.date,
        time: s.time,
        place: s.venue,
        title: `Jogo vs ${s.opponent || 'Adversário'}`
      }))
  ];
  return list.sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
}

/** The message for the parents' group. */
export function changeMessage(team: string, e: UpcomingEvent, kind: ChangeKind, value: string): string {
  const when = `${dayLabel(e.date)}${e.time ? ` às ${e.time}` : ''}`;
  const head = `⚽ ${team}`;
  const v = value.trim();
  switch (kind) {
    case 'hora':
      return `${head}\n🕒 Alteração de horário: ${e.title} de ${dayLabel(e.date)} passa ${e.time ? `das ${e.time} ` : ''}para as ${v || '__:__'}.`;
    case 'local':
      return `${head}\n📍 Alteração de local: ${e.title} de ${when} passa a ser em ${v || '…'}.`;
    case 'cancelado':
      return `${head}\n❌ ${e.title} de ${when} foi cancelado${v ? `: ${v}` : '.'}`;
    default:
      return `${head}\n🔔 Lembrete: ${e.title} ${when}${e.place ? ` · ${e.place}` : ''}.${v ? `\n${v}` : ''}`;
  }
}
