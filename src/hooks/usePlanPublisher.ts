import { useEffect } from 'react';
import { AppState } from '../types';
import { hashData } from '../lib/recordSync';
import { sharedPlanOf } from '../lib/coachPlan';
import { localDateISO } from '../lib/trainingQuick';
import { teamSettings } from '../lib/teamSettings';
import { calendarTeamName } from './useCalendarPublisher';
import { publishPlan } from '../services/publicPlan';

/** What the assistant coach's link shows now (team, colour and the plan of today's or the next training). */
export function planPayloadOf(state: AppState, today = localDateISO()) {
  return {
    teamName: calendarTeamName(state),
    color: teamSettings(state).clubColor,
    plan: sharedPlanOf(state, today)
  };
}

/**
 * Keeps the assistant coach's link up to date: when the next training's plan changes (or a new day starts and the
 * next training is another one) and the link is on, it is published again a few seconds later.
 */
export function usePlanPublisher(state: AppState): void {
  const token = (state.teams || []).find((t) => t.id === state.activeTeamId)?.planToken;
  const clubId = state.currentUser?.id ? state.currentUser.clubId || 'main' : undefined;
  const payload = token ? planPayloadOf(state) : null;
  const hash = payload ? hashData(payload) : '';

  useEffect(() => {
    if (!token || !clubId || !state.activeTeamId || !payload) return;
    const key = `bcv_plan_${token}`;
    const saved = (() => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    })();
    if (saved === hash) return;
    const timer = setTimeout(() => {
      publishPlan(token, { clubId, teamId: state.activeTeamId, ...payload })
        .then(() => {
          try {
            localStorage.setItem(key, hash);
          } catch {
            /* the next change publishes again */
          }
        })
        .catch((err) => console.warn('Plano para o adjunto: não foi possível atualizar.', err));
    }, 3000);
    return () => clearTimeout(timer);
    // payload is summarised by hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clubId, state.activeTeamId, hash]);
}
