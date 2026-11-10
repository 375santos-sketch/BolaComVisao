import { AppState, ExerciseCategory } from '../types';
import { addDaysISO, localDateISO } from './trainingQuick';
import { calculateMatchScore, isSeasonMatching, seasonFromDate } from './utils';

/**
 * 🗓️ Treinos → Época: the season week by week (trainings and games side by side) and the minutes of training per
 * theme in each month, from the session plans. Only reads what is already saved.
 */

export type ThemeKey = ExerciseCategory | 'outros';

export const THEME_LABELS: Record<ThemeKey, string> = {
  aquecimento: 'Aquecimento',
  tecnica: 'Técnica',
  tatica: 'Tática',
  fisico: 'Físico',
  jogo: 'Jogo',
  bolas_paradas: 'Bolas paradas',
  calma: 'Retorno à calma',
  outros: 'Sem tema'
};

export interface WeekTraining {
  id: string;
  date: string;
  time?: string;
  number?: number;
  objective?: string;
  minutes: number;
  done: boolean;
}

export interface WeekGame {
  id: string;
  date: string;
  time?: string;
  opponent: string;
  home: boolean;
  /** "3-1" (ours first) once played. */
  score?: string;
  result?: 'V' | 'E' | 'D';
}

export interface SeasonWeek {
  /** Monday of the week (YYYY-MM-DD). */
  start: string;
  end: string;
  current: boolean;
  trainings: WeekTraining[];
  games: WeekGame[];
}

type PlanState = Pick<AppState, 'trainings' | 'matches' | 'schedule' | 'season'>;

const inSeason = (date: string, season: string | undefined, current: string) =>
  isSeasonMatching(season || seasonFromDate(date), current);

/** Monday of the week of a day. */
export function weekStart(iso: string): string {
  const day = new Date(`${iso.slice(0, 10)}T12:00:00`).getDay(); // 0 = Sunday
  return addDaysISO(iso.slice(0, 10), day === 0 ? -6 : 1 - day);
}

const sameGame = (a: { date: string; opponent: string }, b: { date: string; opponent: string }) =>
  a.date.slice(0, 10) === b.date.slice(0, 10) && a.opponent.trim().toLowerCase() === b.opponent.trim().toLowerCase();

/** Every week from the first to the last training or game of the season, with what happens in each. */
export function seasonWeeks(state: PlanState, today: string = localDateISO()): SeasonWeek[] {
  const trainings: WeekTraining[] = (state.trainings || [])
    .filter((t) => t && /^\d{4}-\d{2}-\d{2}/.test(t.date || '') && inSeason(t.date, t.season, state.season))
    .map((t) => ({
      id: t.id,
      date: t.date.slice(0, 10),
      time: t.time,
      number: t.trainingNumber,
      objective: t.sessionPlan?.objective?.trim() || undefined,
      minutes: t.durationMinutes || t.sessionPlan?.totalDurationMinutes || 0,
      done: t.completed !== false && t.date.slice(0, 10) <= today
    }));
  const played = (state.matches || []).filter(
    (m) => m && m.finished && /^\d{4}-\d{2}-\d{2}/.test(m.date || '') && inSeason(m.date, m.season, state.season)
  );
  const games: WeekGame[] = played.map((m) => {
    const { scored, conceded } = calculateMatchScore(m);
    return {
      id: m.id,
      date: m.date.slice(0, 10),
      opponent: m.opponent,
      home: (m.location || 'casa') === 'casa',
      score: `${scored}-${conceded}`,
      result: scored > conceded ? 'V' : scored === conceded ? 'E' : 'D'
    };
  });
  (state.schedule || [])
    .filter((s) => s && /^\d{4}-\d{2}-\d{2}/.test(s.date || '') && inSeason(s.date, s.season, state.season))
    .filter((s) => !played.some((m) => sameGame(m, s)))
    .forEach((s) =>
      games.push({
        id: s.id,
        date: s.date.slice(0, 10),
        time: s.time,
        opponent: s.opponent,
        home: s.location === 'casa'
      })
    );

  const days = [...trainings.map((t) => t.date), ...games.map((g) => g.date)].sort();
  if (days.length === 0) return [];
  const weeks: SeasonWeek[] = [];
  const thisWeek = weekStart(today);
  for (let start = weekStart(days[0]); start <= days[days.length - 1]; start = addDaysISO(start, 7)) {
    const end = addDaysISO(start, 6);
    const inWeek = (d: string) => d >= start && d <= end;
    const byTime = (a: { date: string; time?: string }, b: { date: string; time?: string }) =>
      `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`);
    weeks.push({
      start,
      end,
      current: start === thisWeek,
      trainings: trainings.filter((t) => inWeek(t.date)).sort(byTime),
      games: games.filter((g) => inWeek(g.date)).sort(byTime)
    });
  }
  return weeks;
}

export interface MonthThemes {
  /** YYYY-MM */
  month: string;
  total: number;
  minutes: Partial<Record<ThemeKey, number>>;
}

/** Minutes of planned exercises per theme in each month of the season (trainings already done). */
export function themesByMonth(state: PlanState, today: string = localDateISO()): MonthThemes[] {
  const months = new Map<string, MonthThemes>();
  (state.trainings || [])
    .filter(
      (t) =>
        t &&
        /^\d{4}-\d{2}-\d{2}/.test(t.date || '') &&
        t.date.slice(0, 10) <= today &&
        t.completed !== false &&
        inSeason(t.date, t.season, state.season)
    )
    .forEach((t) => {
      (t.sessionPlan?.blocks || []).forEach((b) => {
        const minutes = Number(b.durationMinutes) || 0;
        if (minutes <= 0) return;
        const month = t.date.slice(0, 7);
        const row = months.get(month) || { month, total: 0, minutes: {} };
        const key: ThemeKey = b.category && b.category in THEME_LABELS ? b.category : 'outros';
        row.minutes[key] = (row.minutes[key] || 0) + minutes;
        row.total += minutes;
        months.set(month, row);
      });
    });
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** The months of the season shown in Época (the months of its weeks), in order. */
export function seasonMonths(weeks: SeasonWeek[]): string[] {
  return [...new Set(weeks.map((w) => w.start.slice(0, 7)))];
}

/** Objectives typed one per line → a clean list (at most 5, each up to 120 characters). */
export function objectivesFromText(text: string): string[] {
  return text
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
        .trim()
        .slice(0, 120)
    )
    .filter(Boolean)
    .slice(0, 5);
}

/** The objectives with one month changed; an empty list removes the month. */
export function withMonthObjectives(
  current: Record<string, string[]> | undefined,
  month: string,
  objectives: string[]
): Record<string, string[]> {
  const next = { ...(current || {}) };
  if (objectives.length) next[month] = objectives;
  else delete next[month];
  return next;
}
