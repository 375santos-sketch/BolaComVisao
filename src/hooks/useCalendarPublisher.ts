import { useEffect } from 'react';
import { AppState } from '../types';
import { buildCalendarEvents } from '../lib/calendarFeed';
import { hashData } from '../lib/recordSync';
import { publishCalendar } from '../services/publicCalendar';

/** Calendar name shown on the parents' phones ("Dragões Sub-11"). */
export const calendarTeamName = (state: Pick<AppState, 'myClubName' | 'category'>) =>
  [state.myClubName, state.category].filter(Boolean).join(' ').trim() || 'A nossa equipa';

/** Events of the parents' calendar: from 30 days ago on. */
export function calendarEventsOf(state: AppState, today = new Date()) {
  const from = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return buildCalendarEvents(state.myClubName || 'A nossa equipa', state.schedule || [], state.trainings || [], from);
}

/**
 * Keeps the parents' calendar up to date: whenever the Agenda or the trainings change (and the link is on), the
 * new list of games and trainings is published a few seconds later. Unchanged lists are not written again.
 */
export function useCalendarPublisher(state: AppState): void {
  const token = (state.teams || []).find((t) => t.id === state.activeTeamId)?.calendarToken;
  const clubId = state.currentUser?.clubId;
  const events = token ? calendarEventsOf(state) : [];
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
        .catch((err) => console.warn('Calendário para os pais: não foi possível atualizar.', err));
    }, 3000);
    return () => clearTimeout(timer);
    // events/teamName are summarised by hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clubId, state.activeTeamId, hash]);
}
