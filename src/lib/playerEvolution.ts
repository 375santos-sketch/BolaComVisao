import { EvaluationArea, Player, PlayerEvaluation, PlayerGoal } from '../types';

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

/** Open goals first (oldest first), then the reached ones (most recent first). */
export function goalsOf(player: Pick<Player, 'individualGoals'>): PlayerGoal[] {
  const list = (Array.isArray(player.individualGoals) ? player.individualGoals : []).filter(
    (g) => g && typeof g.id === 'string' && typeof g.text === 'string' && g.text.trim()
  );
  const open = list.filter((g) => !g.doneAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = list.filter((g) => g.doneAt).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  return [...open, ...done];
}

export function withGoal(player: Player, goal: PlayerGoal): Player {
  const text = goal.text.trim().slice(0, 140);
  if (!text) return player;
  return {
    ...player,
    individualGoals: [
      ...(player.individualGoals || []).filter((g) => g.id !== goal.id),
      { id: goal.id, text, createdAt: goal.createdAt, ...(goal.area ? { area: goal.area } : {}) }
    ]
  };
}

/** Marks a goal as reached today, or opens it again. */
export function toggledGoal(player: Player, id: string, today: string): Player {
  return {
    ...player,
    individualGoals: (player.individualGoals || []).map((g) => {
      if (g.id !== id) return g;
      if (g.doneAt) {
        const rest = { ...g };
        delete rest.doneAt;
        return rest;
      }
      return { ...g, doneAt: today };
    })
  };
}

export function withoutGoal(player: Player, id: string): Player {
  return { ...player, individualGoals: (player.individualGoals || []).filter((g) => g.id !== id) };
}
