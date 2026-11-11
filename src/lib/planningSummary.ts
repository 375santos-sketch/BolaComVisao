import { AppState, ScheduledMatch, Training } from '../types';
import { THEME_LABELS, ThemeKey, weekStart } from './seasonPlan';
import { addDaysISO, localDateISO } from './trainingQuick';
import { isSeasonMatching, seasonFromDate } from './utils';

/**
 * 🗓️ Planeamento: what the Agenda, Treinos and Época screens show at the top. Only reads what is already saved.
 *
 * The rule for minutes (never mixes what was planned with what was done):
 * - **Realizado**: a training marked as done ("Concluído", or older trainings with no state) on a day up to today.
 *   Only these count as work done.
 * - **Agendado**: a training still marked "Agendado" for today or later. It is planned, not done.
 * - **Por fechar**: a training still marked "Agendado" on a day already past. It may have happened or been
 *   cancelled: it does not count as done until the coach closes it.
 * - Minutes of a training = its duration (or the length of its plan when there is no duration).
 * - Minutes per theme = the minutes of the exercises of the plan, by their category, of realized trainings only.
 *   A realized training without a plan adds to the total, not to any theme.
 */

type TrainingStatus = 'realizado' | 'agendado' | 'por_fechar';

type DatedState = Pick<AppState, 'trainings' | 'season'>;

const hasDate = (t: { date?: string } | undefined): t is { date: string } =>
  Boolean(t && /^\d{4}-\d{2}-\d{2}/.test(t.date || ''));

export const trainingMinutes = (t: Training): number => t.durationMinutes || t.sessionPlan?.totalDurationMinutes || 0;

export function trainingStatus(t: Training, today: string = localDateISO()): TrainingStatus {
  const day = t.date.slice(0, 10);
  if (t.completed === false) return day < today ? 'por_fechar' : 'agendado';
  return day <= today ? 'realizado' : 'agendado';
}

const inCurrentSeason = (t: Training, season: string | undefined) =>
  isSeasonMatching(t.season || seasonFromDate(t.date), season);

export interface PeriodSummary {
  realized: { count: number; minutes: number };
  scheduled: { count: number; minutes: number };
  unclosed: { count: number; minutes: number };
  /** Minutes per theme of the realized trainings (from their plans). */
  themes: Partial<Record<ThemeKey, number>>;
  /** Realized minutes that carry a theme (the rest are trainings without a plan). */
  themedMinutes: number;
}

/** The trainings between two days (both included), split by the rule above. */
export function periodSummary(
  trainings: Training[],
  from: string,
  to: string,
  today: string = localDateISO()
): PeriodSummary {
  const out: PeriodSummary = {
    realized: { count: 0, minutes: 0 },
    scheduled: { count: 0, minutes: 0 },
    unclosed: { count: 0, minutes: 0 },
    themes: {},
    themedMinutes: 0
  };
  trainings
    .filter((t) => hasDate(t) && t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to)
    .forEach((t) => {
      const status = trainingStatus(t, today);
      const bucket = status === 'realizado' ? out.realized : status === 'agendado' ? out.scheduled : out.unclosed;
      bucket.count += 1;
      bucket.minutes += trainingMinutes(t);
      if (status !== 'realizado') return;
      (t.sessionPlan?.blocks || []).forEach((b) => {
        const minutes = Number(b.durationMinutes) || 0;
        if (minutes <= 0) return;
        const key: ThemeKey = b.category && b.category in THEME_LABELS ? b.category : 'outros';
        out.themes[key] = (out.themes[key] || 0) + minutes;
        out.themedMinutes += minutes;
      });
    });
  return out;
}

/** This week (Monday to Sunday) of the season's trainings. */
export function weekSummary(state: DatedState, today: string = localDateISO()) {
  const start = weekStart(today);
  const end = addDaysISO(start, 6);
  const trainings = (state.trainings || []).filter((t) => hasDate(t) && inCurrentSeason(t, state.season));
  return { start, end, ...periodSummary(trainings, start, end, today) };
}

/** The whole season so far, and the month of `today`. */
export function seasonTotals(state: DatedState, today: string = localDateISO()) {
  const trainings = (state.trainings || []).filter((t) => hasDate(t) && inCurrentSeason(t, state.season));
  const month = today.slice(0, 7);
  return {
    season: periodSummary(trainings, '0000-01-01', '9999-12-31', today),
    month: periodSummary(trainings, `${month}-01`, `${month}-31`, today)
  };
}

/** The next training still to happen: today or later, not yet closed. */
export function nextTraining(trainings: Training[], today: string = localDateISO()): Training | undefined {
  return trainings
    .filter((t) => hasDate(t) && trainingStatus(t, today) === 'agendado')
    .sort((a, b) => `${a.date.slice(0, 10)}${a.time || ''}`.localeCompare(`${b.date.slice(0, 10)}${b.time || ''}`))[0];
}

/** The next game on the calendar (today or later). */
export function nextGame(schedule: ScheduledMatch[], today: string = localDateISO()): ScheduledMatch | undefined {
  return schedule
    .filter((s) => hasDate(s) && s.date.slice(0, 10) >= today)
    .sort((a, b) => `${a.date.slice(0, 10)}${a.time || ''}`.localeCompare(`${b.date.slice(0, 10)}${b.time || ''}`))[0];
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Hoje", "Amanhã" or "quinta, 13 nov". */
export function dayLabel(iso: string, today: string = localDateISO()): string {
  const day = iso.slice(0, 10);
  if (day === today) return 'Hoje';
  if (day === addDaysISO(today, 1)) return 'Amanhã';
  const d = new Date(`${day}T12:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export interface WeekLoad {
  /** Monday (YYYY-MM-DD). */
  start: string;
  current: boolean;
  summary: PeriodSummary;
}

/** The last `count` weeks of the season up to this one, plus the next `ahead`, each split by the rule above. */
export function weeklyLoad(state: DatedState, today: string = localDateISO(), count = 8, ahead = 2): WeekLoad[] {
  const trainings = (state.trainings || []).filter((t) => hasDate(t) && inCurrentSeason(t, state.season));
  if (trainings.length === 0) return [];
  const first = weekStart(trainings.map((t) => t.date.slice(0, 10)).sort()[0]);
  const thisWeek = weekStart(today);
  const weeks: WeekLoad[] = [];
  for (let i = -(count - 1); i <= ahead; i++) {
    const start = addDaysISO(thisWeek, i * 7);
    if (start < first) continue;
    weeks.push({
      start,
      current: start === thisWeek,
      summary: periodSummary(trainings, start, addDaysISO(start, 6), today)
    });
  }
  return weeks;
}

const WEEKDAYS_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado'
];

/**
 * Dates and times as written in Portugal, whatever the language of the phone: "12/11/2026" and "18:30" (24 h).
 * They read the saved values (YYYY-MM-DD and HH:MM), which never change with the device's language.
 */
export function datePT(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function timePT(hhmm: string | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** "quinta-feira, 12/11/2026" */
export function longDatePT(iso: string): string {
  const d = datePT(iso);
  return d ? `${WEEKDAYS_LONG[new Date(`${iso.slice(0, 10)}T12:00:00`).getDay()]}, ${d}` : '';
}
