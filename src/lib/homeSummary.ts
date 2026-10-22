import { AppState } from '../types';
import { callupPlayingTime, playersNeedingMinutes } from './callupPlayingTime';
import { absenceStreak, ABSENCE_STREAK_ALERT, isExpectedToMiss, pastTrainings } from './attendanceAlerts';
import { getAllBirthdays } from './birthdayUtils';
import { upcomingGames } from './preMatchPlan';
import { addDaysISO, localDateISO } from './trainingQuick';
import { calculateMatchScore, isSeasonMatching, seasonFromDate } from './utils';

/** Season attendance below this (with enough trainings) is worth a notice on the home screen. */
export const LOW_ATTENDANCE = 70;
const MIN_TRAININGS_FOR_ATTENDANCE = 3;
export const MAX_HOME_NOTICES = 3;

export interface HomeNotice {
  id: 'convocatoria' | 'minutos' | 'assiduidade' | 'aniversarios';
  icon: string;
  text: string;
  tab: 'convocatoria' | 'treinos' | 'plantel';
  targetId?: string;
}

const names = (list: string[], max = 3) =>
  list.length <= max ? list.join(', ') : `${list.slice(0, max).join(', ')} e mais ${list.length - max}`;

const weekday = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '')} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

type SummaryState = Pick<
  AppState,
  'schedule' | 'matches' | 'trainings' | 'roster' | 'season' | 'category' | 'staffMembers'
>;

/**
 * What needs the coach's attention, most urgent first (at most MAX_HOME_NOTICES): a call-up still open for a game in
 * the next 7 days, players short of minutes, low training attendance, birthdays this week.
 */
export function homeNotices(state: SummaryState, today: string = localDateISO()): HomeNotice[] {
  const notices: HomeNotice[] = [];
  const roster = (state.roster || []).filter((p) => p && p.active !== false);

  const nextGame = upcomingGames(state.schedule || [], today)[0];
  if (nextGame && nextGame.date <= addDaysISO(today, 7) && !nextGame.callupFinalized) {
    notices.push({
      id: 'convocatoria',
      icon: '📋',
      text: `Convocatória por fechar: vs ${nextGame.opponent} (${weekday(nextGame.date)})`,
      tab: 'convocatoria',
      targetId: nextGame.id
    });
  }

  const shortOfMinutes = playersNeedingMinutes(
    callupPlayingTime(state.matches || [], roster, state.season, state.category)
  ).filter((r) => r.belowTarget);
  if (shortOfMinutes.length > 0) {
    notices.push({
      id: 'minutos',
      icon: '⚖️',
      text: `Precisam de minutos: ${names(shortOfMinutes.map((r) => `${r.name} (${Math.round(r.share * 100)}%)`))}`,
      tab: 'convocatoria'
    });
  }

  const held = pastTrainings(state.trainings || [], today).filter((t) =>
    isSeasonMatching(t.season || seasonFromDate(t.date), state.season)
  );
  if (held.length >= MIN_TRAININGS_FOR_ATTENDANCE) {
    const low = roster
      .filter((p) => !isExpectedToMiss(p))
      .map((p) => {
        const missed = held.filter((t) => (t.absences || []).includes(p.id)).length;
        return { p, rate: Math.round(((held.length - missed) / held.length) * 100), streak: absenceStreak(p.id, held) };
      })
      .filter((r) => r.rate < LOW_ATTENDANCE || r.streak >= ABSENCE_STREAK_ALERT)
      .sort((a, b) => a.rate - b.rate);
    if (low.length > 0) {
      notices.push({
        id: 'assiduidade',
        icon: '⚠️',
        text: `Assiduidade baixa: ${names(low.map((r) => `${r.p.name} (${r.streak >= ABSENCE_STREAK_ALERT ? `${r.streak} faltas seguidas` : `${r.rate}%`})`))}`,
        tab: 'treinos'
      });
    }
  }

  const birthdays = getAllBirthdays(roster, state.staffMembers || [], new Date(`${today}T12:00:00`)).filter(
    (b) => b.daysUntil <= 7
  );
  if (birthdays.length > 0) {
    notices.push({
      id: 'aniversarios',
      icon: '🎂',
      text: `Aniversários: ${names(birthdays.map((b) => `${b.name} (${b.isToday ? 'hoje' : weekday(addDaysISO(today, b.daysUntil))})`))}`,
      tab: 'plantel'
    });
  }

  return notices.slice(0, MAX_HOME_NOTICES);
}

export interface SeasonSummary {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  /** Team attendance in the trainings held this season, or null without trainings. */
  attendance: number | null;
}

export function seasonSummary(state: SummaryState, today: string = localDateISO()): SeasonSummary {
  const games = (state.matches || []).filter(
    (m) => m && m.finished && isSeasonMatching(m.season || seasonFromDate(m.date), state.season)
  );
  const s: SeasonSummary = {
    played: games.length,
    wins: 0,
    draws: 0,
    losses: 0,
    scored: 0,
    conceded: 0,
    attendance: null
  };
  games.forEach((m) => {
    const { scored, conceded } = calculateMatchScore(m);
    s.scored += scored;
    s.conceded += conceded;
    if (scored > conceded) s.wins++;
    else if (scored === conceded) s.draws++;
    else s.losses++;
  });

  const roster = (state.roster || []).filter((p) => p && p.active !== false);
  const held = pastTrainings(state.trainings || [], today).filter((t) =>
    isSeasonMatching(t.season || seasonFromDate(t.date), state.season)
  );
  if (held.length > 0 && roster.length > 0) {
    const ids = new Set(roster.map((p) => p.id));
    const absences = held.reduce((n, t) => n + (t.absences || []).filter((id) => ids.has(id)).length, 0);
    const possible = held.length * roster.length;
    s.attendance = Math.round(((possible - absences) / possible) * 100);
  }
  return s;
}
