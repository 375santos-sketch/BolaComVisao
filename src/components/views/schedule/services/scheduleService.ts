import { AppState, ScheduledMatch, Match, Training, StaffUnavailability, ClubEvent, Player } from '../../../../types';
import { CalendarEvent, EventFilterType } from '../types';

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

export const WEEKDAY_NAMES_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAY_SHORT_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Returns array of YYYY-MM-DD strings between start and end (inclusive)
 */
export function getDatesInRange(startDateStr: string, endDateStr?: string): string[] {
  if (!endDateStr || endDateStr <= startDateStr) {
    return [startDateStr];
  }
  const dates: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let safetyCount = 0;
  while (curr <= end && safetyCount < 365) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
    safetyCount++;
  }
  return dates.length > 0 ? dates : [startDateStr];
}

/**
 * Computes unified calendar events from AppState
 */
export function computeUnifiedEvents(state: AppState, todayStr: string, eligiblePlayers: Player[]): CalendarEvent[] {
  const list: CalendarEvent[] = [];

  // 1. Scheduled Matches
  (state.schedule || []).forEach((s) => {
    list.push({
      id: `sch-${s.id}`,
      date: s.date || todayStr,
      time: s.time || '09:00',
      title: s.opponent ? `${s.opponent} (${s.location === 'casa' ? 'Casa' : 'Fora'})` : 'Jogo Agendado',
      category: 'match',
      isCompleted: false,
      location: s.location === 'casa' ? 'Em Casa 🏟️' : 'Fora ✈️',
      matchType: s.type,
      tournamentName: s.tournamentName,
      phase: s.phase,
      notes: s.callupNotes || '',
      rawScheduledMatch: s,
      callupCount: (s.callup || []).length
    });
  });

  // 2. Finished / Played Matches
  (state.matches || []).forEach((m) => {
    const goalsScored = (m.goals || []).filter((g) => g.type === 'scored').length;
    const goalsConceded = (m.goals || []).filter((g) => g.type === 'conceded').length;
    list.push({
      id: `mat-${m.id}`,
      date: m.date || todayStr,
      time: m.originalSchedule?.time || '10:00',
      title: `${m.opponent} (${goalsScored}-${goalsConceded})`,
      category: 'match',
      isCompleted: m.finished,
      location: m.location === 'casa' ? 'Em Casa 🏟️' : 'Fora ✈️',
      matchType: m.type,
      tournamentName: m.tournamentName,
      phase: m.phase,
      notes: m.notes || '',
      rawFinishedMatch: m,
      callupCount: (m.lineup || []).length
    });
  });

  // 3. Trainings (both Scheduled & Completed)
  (state.trainings || []).forEach((tr) => {
    const absences = tr.absences || [];
    const totalEligible = eligiblePlayers.length;
    const presences = Math.max(0, totalEligible - absences.length);

    const title = tr.trainingNumber
      ? `Treino ${tr.trainingNumber}${tr.type ? ` (${tr.type})` : ''}`
      : tr.type
        ? `${tr.type} (${tr.location || 'Campo'})`
        : 'Treino';

    list.push({
      id: `tr-${tr.id}`,
      date: tr.date || todayStr,
      time: tr.time || '19:00',
      title,
      category: 'training',
      isCompleted: tr.completed === true,
      location: tr.location || 'Campo de Treinos',
      trainingType: tr.type || '⚡ Geral',
      notes: tr.notes || '',
      rawTraining: tr,
      presencesCount: presences,
      absencesCount: absences.length
    });
  });

  // 4. Staff Unavailabilities
  (state.staffUnavailability || []).forEach((u) => {
    const dates = getDatesInRange(u.date, u.endDate);
    dates.forEach((d) => {
      list.push({
        id: `unavail-${u.id}-${d}`,
        date: d,
        time: '00:00',
        title: `🚫 ${u.name} (Indisponível)`,
        category: 'staff_unavailability',
        isCompleted: false,
        notes: u.reason || '',
        rawStaffUnavailability: u
      });
    });
  });

  // 5. Club Events
  (state.clubEvents || []).forEach((ev) => {
    const dates = getDatesInRange(ev.date, ev.endDate);
    const icon = ev.type === 'formacao' ? '🎓' : ev.type === 'estagio' ? '🏕️' : ev.type === 'outro' ? '📌' : '👥';
    dates.forEach((d) => {
      list.push({
        id: `clubevent-${ev.id}-${d}`,
        date: d,
        time: ev.time || '19:30',
        endTime: ev.endTime,
        title: `${icon} ${ev.title}`,
        category: 'club_event',
        isCompleted: ev.isCompleted === true,
        location: ev.location || 'Clube',
        notes: ev.notes || '',
        clubEventType: ev.type,
        attendees: ev.attendees,
        rawClubEvent: ev
      });
    });
  });

  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '00:00').localeCompare(b.time || '00:00');
  });
}

/**
 * Filter unified events according to category filter
 */
export function filterEvents(events: CalendarEvent[], filter: EventFilterType): CalendarEvent[] {
  if (filter === 'all') return events;
  if (filter === 'matches') return events.filter((e) => e.category === 'match');
  if (filter === 'trainings') return events.filter((e) => e.category === 'training');
  if (filter === 'unavailability') return events.filter((e) => e.category === 'staff_unavailability');
  if (filter === 'events') return events.filter((e) => e.category === 'club_event');
  return events;
}
