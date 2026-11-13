import { useEffect } from 'react';
import { workspaceIdOf } from '../lib/deviceCache';
import { AppState } from '../types';
import { buildCalendarEvents, buildStaffEvents, newCalendarToken } from '../lib/calendarFeed';
import { hashData } from '../lib/recordSync';
import { publishCalendar } from '../services/publicCalendar';

/** Calendar name shown on the parents' phones ("Dragões Sub-11"). */
export const calendarTeamName = (state: Pick<AppState, 'myClubName' | 'category'>) =>
  [state.myClubName, state.category].filter(Boolean).join(' ').trim() || 'A nossa equipa';

/** Events of the parents' calendar: from 30 days ago on. */
export function calendarEventsOf(state: AppState, today = new Date()) {
  const from = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return buildCalendarEvents(
    state.myClubName || 'A nossa equipa',
    state.schedule || [],
    state.trainings || [],
    from,
    state.matches || []
  );
}

/**
 * Events of the coaches' own calendar (private link, never given to the parents): the same games and trainings,
 * plus the meetings and courses and the staff's unavailabilities of the Agenda.
 */
export function coachCalendarEventsOf(state: AppState, today = new Date()) {
  const from = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return [
    ...calendarEventsOf(state, today),
    ...buildStaffEvents(state.clubEvents || [], state.staffUnavailability || [], from)
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
}

type Which = 'pais' | 'treinador';
const TOKEN_FIELD = { pais: 'calendarToken', treinador: 'coachCalendarToken' } as const;
const eventsFor = (which: Which, state: AppState) =>
  which === 'pais' ? calendarEventsOf(state) : coachCalendarEventsOf(state);
/** Same club workspace as the cloud sync (accounts without a club code use the default "main" club). */
const clubOf = (state: AppState) => (state.currentUser?.id ? workspaceIdOf(state.currentUser) : undefined);

/**
 * Creates a calendar link of the team: the parents' one (games and trainings) or the coaches' own (everything in the
 * Agenda). Publishes it under a new secret token and returns the teams with that token saved on the active team.
 */
export async function createTeamCalendar(
  state: AppState,
  which: Which = 'pais'
): Promise<NonNullable<AppState['teams']>> {
  const clubId = clubOf(state);
  if (!clubId || !state.activeTeamId) throw new Error('Precisa de ter sessão iniciada na nuvem.');
  const token = newCalendarToken();
  await publishCalendar(token, {
    clubId,
    teamId: state.activeTeamId,
    teamName: calendarTeamName(state),
    events: eventsFor(which, state)
  });
  return (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, [TOKEN_FIELD[which]]: token } : t));
}

/** Publishes one calendar again a few seconds after its events change (unchanged lists are not written again). */
function usePublish(state: AppState, which: Which) {
  const token = (state.teams || []).find((t) => t.id === state.activeTeamId)?.[TOKEN_FIELD[which]];
  const clubId = clubOf(state);
  const events = token ? eventsFor(which, state) : [];
  const teamName = calendarTeamName(state);
  const hash = token ? hashData({ events, teamName }) : '';

  useEffect(() => {
    if (!token || !clubId || !state.activeTeamId) return;
    const key = `bcv_cal_${token}`;
    const saved = (() => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    })();
    if (saved === hash) return;
    const timer = setTimeout(() => {
      publishCalendar(token, { clubId, teamId: state.activeTeamId, teamName, events })
        .then(() => {
          try {
            localStorage.setItem(key, hash);
          } catch {
            /* the next change publishes again */
          }
        })
        .catch((err) => console.warn('Calendário: não foi possível atualizar.', err));
    }, 3000);
    return () => clearTimeout(timer);
    // events/teamName are summarised by hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clubId, state.activeTeamId, hash]);
}

/**
 * Keeps the team's calendars up to date: whenever the Agenda or the trainings change (and the link is on), the new
 * list is published a few seconds later. The parents' calendar and the coaches' own one are kept apart.
 */
export function useCalendarPublisher(state: AppState): void {
  usePublish(state, 'pais');
  usePublish(state, 'treinador');
}
