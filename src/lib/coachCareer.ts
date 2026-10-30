import { AppState, CoachCareer, CoachCourse } from '../types';

/**
 * 🎓 A minha carreira: the coach's title (and when it expires) and the continuing-education courses that count for its
 * renewal. The number of credits needed is the coach's to set, because the rules change; the app only adds up and
 * warns in time (6 months before the title expires, and when credits are still missing).
 */

const WARN_MONTHS = 6;

const emptyCareer = (): CoachCareer => ({ courses: [] });

export const careerOf = (state: Pick<AppState, 'coachCareers' | 'currentUser'>): CoachCareer =>
  (state.currentUser?.id && state.coachCareers?.[state.currentUser.id]) || emptyCareer();

/** The state with this user's career replaced (other coaches' careers stay). */
export function withCareer(state: Pick<AppState, 'coachCareers' | 'currentUser'>, career: CoachCareer) {
  const id = state.currentUser?.id;
  if (!id) return {};
  return { coachCareers: { ...(state.coachCareers || {}), [id]: career } };
}

/** Whole months from `today` to `date` (negative when it already passed). */
export function monthsUntil(date: string, today: string): number {
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = date.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

interface CareerStatus {
  credits: number;
  missing: number;
  monthsLeft: number | null;
  expired: boolean;
  /** Short warnings, most urgent first (empty when all is well). */
  warnings: string[];
}

/** Credits registered, what is missing for the renewal, and the warnings. */
export function careerStatus(career: CoachCareer, today: string): CareerStatus {
  const credits = (career.courses || []).reduce((s, c) => s + (Number(c.credits) || 0), 0);
  const missing = Math.max(0, (career.creditsNeeded || 0) - credits);
  const monthsLeft = career.validUntil ? monthsUntil(career.validUntil, today) : null;
  const expired = Boolean(career.validUntil && career.validUntil < today);
  const warnings: string[] = [];
  if (expired) warnings.push('O título de treinador caducou: trate da renovação.');
  else if (monthsLeft !== null && monthsLeft < WARN_MONTHS)
    warnings.push(
      monthsLeft <= 0
        ? 'O título caduca este mês.'
        : `O título caduca em ${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'}.`
    );
  if (missing > 0 && monthsLeft !== null && monthsLeft < 12 && !expired)
    warnings.push(`Faltam ${missing} ${missing === 1 ? 'crédito' : 'créditos'} de formação para renovar.`);
  return { credits, missing, monthsLeft, expired, warnings };
}

export const sortCourses = (courses: CoachCourse[]) =>
  [...(courses || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

export const dateLabel = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
