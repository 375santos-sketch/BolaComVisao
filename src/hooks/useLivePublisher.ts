import { useEffect } from 'react';
import { AppState } from '../types';
import { hashData } from '../lib/recordSync';
import { liveMatchOf } from '../lib/liveFollow';
import { parentsLiveOf } from '../lib/parentsLive';
import { localDateISO } from '../lib/trainingQuick';
import { teamSettings } from '../lib/teamSettings';
import { calendarTeamName } from './useCalendarPublisher';
import { publishLive } from '../services/publicLive';

/** What the parents' link shows now (team, colour, the game being played or the last one, and the next game). */
export function livePayloadOf(state: AppState, today = localDateISO()) {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  return {
    teamName: calendarTeamName(state),
    color: teamSettings(state).clubColor,
    ...parentsLiveOf(state, Boolean(team?.liveShowCards), today)
  };
}

/**
 * Keeps the parents' link up to date. During a game only the phone recording it publishes (about a second after
 * each change), so a phone that is only watching never sends an older copy; otherwise any coach's phone does.
 */
export function useLivePublisher(state: AppState): void {
  const token = (state.teams || []).find((t) => t.id === state.activeTeamId)?.liveToken;
  const clubId = state.currentUser?.id ? state.currentUser.clubId || 'main' : undefined;
  const live = liveMatchOf(state.matches);
  const recordingElsewhere = Boolean(live?.liveBy && live.liveBy !== state.currentUser?.name);
  const payload = token && !recordingElsewhere ? livePayloadOf(state) : null;
  const hash = payload ? hashData(payload) : '';

  useEffect(() => {
    if (!token || !clubId || !state.activeTeamId || !payload) return;
    const key = `bcv_live_${token}`;
    const saved = (() => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    })();
    if (saved === hash) return;
    const timer = setTimeout(
      () => {
        publishLive(token, { clubId, teamId: state.activeTeamId, ...payload })
          .then(() => {
            try {
              localStorage.setItem(key, hash);
            } catch {
              /* the next change publishes again */
            }
          })
          .catch((err) => console.warn('Link para os pais: não foi possível atualizar.', err));
      },
      live ? 1000 : 3000
    );
    return () => clearTimeout(timer);
    // payload is summarised by hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clubId, state.activeTeamId, hash]);
}
