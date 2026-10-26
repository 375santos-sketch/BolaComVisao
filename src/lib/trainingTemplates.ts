import { AppState, SessionBlock, TrainingTemplate } from '../types';
import { uid } from './utils';

/**
 * Training templates (Treinos → Modelos): a session plan kept with a name to start new trainings from it. They live
 * in the team (like the league tables), so every coach of the team sees them.
 */

/** What a template keeps from the training form (date, number and attendance are left out). */
interface TemplateFields {
  type: string;
  time: string;
  location: string;
  durationMinutes: number;
  sessionObjective: string;
  notes: string;
  sessionBlocks: SessionBlock[];
}

export function templateFromForm(name: string, form: TemplateFields): TrainingTemplate {
  return {
    id: uid(),
    name: name.trim(),
    type: form.type || undefined,
    time: form.time || undefined,
    location: form.location || undefined,
    durationMinutes: form.durationMinutes || undefined,
    objective: form.sessionObjective?.trim() || undefined,
    notes: form.notes?.trim() || undefined,
    blocks: (form.sessionBlocks || []).map((b) => ({ ...b })),
    createdAt: new Date().toISOString()
  };
}

/** The form fields filled from a template (new block ids, so the same template can be used many times). */
export function formFromTemplate(t: TrainingTemplate): TemplateFields {
  return {
    type: t.type || '⚡ Tático',
    time: t.time || '',
    location: t.location || '',
    durationMinutes: t.durationMinutes || 90,
    sessionObjective: t.objective || '',
    notes: t.notes || '',
    sessionBlocks: (t.blocks || []).map((b) => ({ ...b, id: uid() }))
  };
}

/** Templates of the active team, by name. */
export function teamTemplates(state: Pick<AppState, 'teams' | 'activeTeamId'>): TrainingTemplate[] {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  return [...(team?.trainingTemplates || [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
}

/** The team list with the active team's templates replaced (null when there is no active team). */
export function withTeamTemplates(
  state: Pick<AppState, 'teams' | 'activeTeamId'>,
  templates: TrainingTemplate[]
): AppState['teams'] | null {
  if (!(state.teams || []).some((t) => t.id === state.activeTeamId)) return null;
  return (state.teams || []).map((t) => (t.id === state.activeTeamId ? { ...t, trainingTemplates: templates } : t));
}

interface ExerciseUsage {
  /** Trainings already held (today or before) that used the exercise. */
  times: number;
  /** Date of the latest of those trainings (YYYY-MM-DD). */
  lastDate?: string;
  /** Next planned training that uses it, if any. */
  nextDate?: string;
}

/** How often and when each library exercise was used in the season's trainings (by exercise id). */
export function exerciseUsage(
  trainings: AppState['trainings'],
  today = new Date().toISOString().slice(0, 10)
): Map<string, ExerciseUsage> {
  const usage = new Map<string, ExerciseUsage>();
  (trainings || []).forEach((t) => {
    const date = (t?.date || '').slice(0, 10);
    if (!date) return;
    const ids = new Set((t.sessionPlan?.blocks || []).map((b) => b.exerciseId).filter(Boolean) as string[]);
    ids.forEach((id) => {
      const u = usage.get(id) || { times: 0 };
      if (date <= today) {
        u.times++;
        if (!u.lastDate || date > u.lastDate) u.lastDate = date;
      } else if (!u.nextDate || date < u.nextDate) u.nextDate = date;
      usage.set(id, u);
    });
  });
  return usage;
}

/** "Usado 3× · último há 5 dias (21/10)" / "Ainda não usado" (+ " · planeado para 02/11"). */
export function usageLabel(u: ExerciseUsage | undefined, today = new Date().toISOString().slice(0, 10)): string {
  const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const parts: string[] = [];
  if (!u || u.times === 0) parts.push('Ainda não usado');
  else {
    const days = Math.round((Date.parse(today) - Date.parse(u.lastDate!)) / 86_400_000);
    const ago = days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
    parts.push(`Usado ${u.times}× · último ${ago} (${ddmm(u.lastDate!)})`);
  }
  if (u?.nextDate) parts.push(`planeado para ${ddmm(u.nextDate)}`);
  return parts.join(' · ');
}
