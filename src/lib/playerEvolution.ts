import { EvaluationArea, GoalStatus, Player, PlayerEvaluation, PlayerGoal } from '../types';

/**
 * 📈 Evolução do atleta: an evaluation from 1 to 5 in five areas every few weeks, and individual goals. Only for the
 * coaches: it is never put in a report for the family, a share or a comparison between team-mates.
 */

export const EVALUATION_AREAS: Array<{ key: EvaluationArea; label: string; short: string }> = [
  { key: 'tecnica', label: 'Técnica', short: 'Técnica' },
  { key: 'tatica', label: 'Tática', short: 'Tática' },
  { key: 'fisica', label: 'Física', short: 'Física' },
  { key: 'psicologica', label: 'Psicológica e comportamental', short: 'Psicológica' },
  { key: 'jogo', label: 'Compreensão do jogo', short: 'Compreensão' }
];

const clampScore = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
};

/** The evaluations of the athlete, the most recent first (anything malformed left out). */
export function evaluationsOf(player: Pick<Player, 'evaluations'>): PlayerEvaluation[] {
  return (Array.isArray(player.evaluations) ? player.evaluations : [])
    .filter((e) => e && typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.scores)
    .map((e) => ({
      ...e,
      scores: Object.fromEntries(EVALUATION_AREAS.map((a) => [a.key, clampScore(e.scores[a.key])])) as Record<
        EvaluationArea,
        number
      >
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export const averageOf = (e: PlayerEvaluation) =>
  EVALUATION_AREAS.reduce((s, a) => s + e.scores[a.key], 0) / EVALUATION_AREAS.length;

/** "3,4" */
export const formatScore = (n: number) => n.toFixed(1).replace('.', ',');

/** The athlete with one more evaluation (or the same day's evaluation replaced). */
export function withEvaluation(player: Player, evaluation: PlayerEvaluation): Player {
  const others = (player.evaluations || []).filter((e) => e.id !== evaluation.id && e.date !== evaluation.date);
  const note = evaluation.note?.trim();
  return {
    ...player,
    evaluations: [
      ...others,
      {
        id: evaluation.id,
        date: evaluation.date,
        scores: Object.fromEntries(
          EVALUATION_AREAS.map((a) => [a.key, clampScore(evaluation.scores[a.key])])
        ) as Record<EvaluationArea, number>,
        ...(note ? { note: note.slice(0, 500) } : {})
      }
    ]
  };
}

export function withoutEvaluation(player: Player, id: string): Player {
  return { ...player, evaluations: (player.evaluations || []).filter((e) => e.id !== id) };
}

/** D2: the state of a goal (older goals have none: reached when they have the day they were reached). */
export const statusOf = (g: Pick<PlayerGoal, 'status' | 'doneAt'>): GoalStatus =>
  g.status || (g.doneAt ? 'alcancado' : 'em_curso');

/** D2: an open goal whose deadline has passed. */
export const isOverdue = (g: PlayerGoal, today: string): boolean =>
  statusOf(g) === 'em_curso' && Boolean(g.dueDate) && (g.dueDate as string) < today;

/**
 * Open goals first (nearest deadline first, then oldest), then the reached ones (most recent first), then the
 * reformulated ones (most recent first).
 */
export function goalsOf(player: Pick<Player, 'individualGoals'>): PlayerGoal[] {
  const list = (Array.isArray(player.individualGoals) ? player.individualGoals : []).filter(
    (g) => g && typeof g.id === 'string' && typeof g.text === 'string' && g.text.trim()
  );
  const open = list
    .filter((g) => statusOf(g) === 'em_curso')
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.createdAt.localeCompare(b.createdAt));
  const done = list
    .filter((g) => statusOf(g) === 'alcancado')
    .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const reformulated = list
    .filter((g) => statusOf(g) === 'reformulado')
    .sort((a, b) => (b.reformulatedAt || '').localeCompare(a.reformulatedAt || ''));
  return [...open, ...done, ...reformulated];
}

export function withGoal(player: Player, goal: PlayerGoal): Player {
  const text = goal.text.trim().slice(0, 140);
  if (!text) return player;
  const previous = (player.individualGoals || []).find((g) => g.id === goal.id);
  return {
    ...player,
    individualGoals: [
      ...(player.individualGoals || []).filter((g) => g.id !== goal.id),
      {
        ...(previous || {}),
        id: goal.id,
        text,
        createdAt: goal.createdAt,
        ...(goal.area ? { area: goal.area } : {}),
        ...(goal.dueDate ? { dueDate: goal.dueDate } : {}),
        status: statusOf(goal)
      }
    ]
  };
}

const mapGoal = (player: Player, id: string, change: (g: PlayerGoal) => PlayerGoal): Player => ({
  ...player,
  individualGoals: (player.individualGoals || []).map((g) => (g.id === id ? change(g) : g))
});

/** Marks a goal as reached today, or opens it again. */
export function toggledGoal(player: Player, id: string, today: string): Player {
  return mapGoal(player, id, (g) => {
    if (statusOf(g) === 'alcancado') {
      const rest = { ...g, status: 'em_curso' as const };
      delete rest.doneAt;
      return rest;
    }
    return { ...g, status: 'alcancado', doneAt: today };
  });
}

/** D2: the latest progress note of a goal (empty text removes it). */
export function withGoalNote(player: Player, id: string, text: string, today: string): Player {
  const clean = text.trim().slice(0, 200);
  return mapGoal(player, id, (g) => {
    const rest = { ...g };
    delete rest.note;
    delete rest.noteAt;
    return clean ? { ...rest, note: clean, noteAt: today } : rest;
  });
}

/** D2: reformulates a goal: the old one stays (reformulated, linked to the new one) and the new one starts. */
export function reformulatedGoal(player: Player, id: string, next: PlayerGoal, today: string): Player {
  if (!next.text.trim()) return player;
  const withOld = mapGoal(player, id, (g) => ({
    ...g,
    status: 'reformulado',
    reformulatedAt: today,
    replacedBy: next.id
  }));
  return withGoal(withOld, { ...next, status: 'em_curso' });
}

export function withoutGoal(player: Player, id: string): Player {
  return { ...player, individualGoals: (player.individualGoals || []).filter((g) => g.id !== id) };
}

/**
 * Strengths and points to improve of an evaluation: the areas with the highest and the lowest score of that
 * evaluation (ties all listed). When every area has the same score there is nothing to single out.
 */
export function strengthsOf(e: PlayerEvaluation): {
  strong: { key: EvaluationArea; label: string; score: number }[];
  improve: { key: EvaluationArea; label: string; score: number }[];
} {
  const rows = EVALUATION_AREAS.map((a) => ({ key: a.key, label: a.short, score: e.scores[a.key] }));
  const max = Math.max(...rows.map((r) => r.score));
  const min = Math.min(...rows.map((r) => r.score));
  if (max === min) return { strong: [], improve: [] };
  return { strong: rows.filter((r) => r.score === max), improve: rows.filter((r) => r.score === min) };
}
