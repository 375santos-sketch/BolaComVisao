import { AbsenceReason, Training } from '../types';
import { getNextTrainingNumber } from './trainingNumbering';
import { uid } from './utils';

export const ABSENCE_REASONS: { id: AbsenceReason; label: string }[] = [
  { id: 'doente', label: 'Doente' },
  { id: 'lesionado', label: 'Lesionado' },
  { id: 'escola', label: 'Escola' },
  { id: 'familia', label: 'Família' },
  { id: 'injustificada', label: 'Sem justificação' }
];

export const absenceReasonLabel = (reason?: AbsenceReason): string =>
  ABSENCE_REASONS.find((r) => r.id === reason)?.label || 'Sem motivo indicado';

/** Today's date (YYYY-MM-DD) on this device's clock, not UTC. */
export function localDateISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDateISO(new Date(y, m - 1, d + days));
}

const isCompleted = (tr: Training) => tr.completed !== false;

/** The team's usual training: time, place, focus and duration of the latest training that took place. */
function usualTraining(trainings: Training[]): Partial<Training> {
  const latest = [...trainings].filter(isCompleted).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  if (!latest) return {};
  return {
    time: latest.time,
    location: latest.location,
    type: latest.type,
    durationMinutes: latest.durationMinutes
  };
}

/**
 * "Treino de hoje": today's training when there is one (e.g. planned with the season generator), otherwise a new
 * one with the usual time and place. Everyone starts present.
 */
export function trainingForToday(
  trainings: Training[],
  lastTrainingNumber: number | undefined,
  today: string = localDateISO()
): { training: Training; isNew: boolean } {
  const existing = trainings.find((tr) => tr.date === today);
  if (existing) return { training: existing, isNew: false };
  return {
    isNew: true,
    training: {
      ...usualTraining(trainings),
      id: uid(),
      trainingNumber: getNextTrainingNumber(trainings, lastTrainingNumber),
      date: today,
      notes: '',
      absences: [],
      completed: true
    }
  };
}

/** Sets who missed the training and why; reasons of players who are no longer absent are dropped. */
export function withAttendance(
  training: Training,
  absences: string[],
  reasons: Partial<Record<string, AbsenceReason>> = {}
): Training {
  const absenceReasons: Record<string, AbsenceReason> = {};
  for (const id of absences) {
    const reason = reasons[id];
    if (reason) absenceReasons[id] = reason;
  }
  const next: Training = { ...training, absences: [...absences] };
  if (Object.keys(absenceReasons).length > 0) next.absenceReasons = absenceReasons;
  else delete next.absenceReasons;
  return next;
}

/** Same session one week later (or on the given date): planned, everyone present, a new number. */
export function repeatTraining(
  source: Training,
  trainings: Training[],
  lastTrainingNumber: number | undefined,
  date: string = addDaysISO(source.date, 7)
): Training {
  return {
    id: uid(),
    trainingNumber: getNextTrainingNumber(trainings, lastTrainingNumber),
    date,
    time: source.time,
    location: source.location,
    type: source.type,
    durationMinutes: source.durationMinutes,
    notes: source.notes || '',
    sessionPlan: source.sessionPlan
      ? {
          ...source.sessionPlan,
          blocks: (source.sessionPlan.blocks || []).map((b) => ({ ...b, id: uid() }))
        }
      : undefined,
    absences: [],
    completed: false
  };
}

export interface PlayerAbsence {
  trainingId: string;
  trainingNumber?: number;
  date: string;
  reason?: AbsenceReason;
}

/** Trainings that took place and the player missed, newest first. */
export function playerAbsences(trainings: Training[], playerId: string): PlayerAbsence[] {
  return trainings
    .filter((tr) => isCompleted(tr) && (tr.absences || []).includes(playerId))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((tr) => ({
      trainingId: tr.id,
      trainingNumber: tr.trainingNumber,
      date: tr.date,
      reason: tr.absenceReasons?.[playerId]
    }));
}

/**
 * List order when opening the screen: what's coming (today onwards, soonest first), then everything else, newest
 * first (trainings already held and planned ones whose day has passed).
 */
export function trainingsInListOrder(trainings: Training[], today: string = localDateISO()): Training[] {
  const upcoming = trainings
    .filter((tr) => !isCompleted(tr) && tr.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  const rest = trainings
    .filter((tr) => !(!isCompleted(tr) && tr.date >= today))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.trainingNumber || 0) - (a.trainingNumber || 0));
  return [...upcoming, ...rest];
}
