import { Assignment, Mission, Player, VjSession } from '../types';
import { AGE_GROUPS } from './challenges';
import { isKnownCompetency } from './competencies';
import { goalsOf, statusOf } from './playerEvolution';

/**
 * MC1b — Missões e atribuições (só para os treinadores). A mission is 2 to 6 published challenges of the team, in
 * order (referenced by id, never copied). An assignment gives a mission or a challenge to the whole team or to some
 * athletes, with a deadline; the coach ticks what each athlete did (internal, like attendance). Finishing a mission
 * never changes an evaluation: it only suggests reassessing the competency.
 */

export const MIN_STEPS = 2;
export const MAX_STEPS = 6;
export const MISSION_STATUS: Record<Mission['status'], { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-ui-surface-2 text-ui-muted' },
  publicado: { label: 'Publicada', cls: 'bg-ui-success/15 text-ui-success' },
  arquivado: { label: 'Arquivada', cls: 'bg-ui-surface-2 text-ui-muted' }
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const missionsOf = (team: { missions?: Mission[] } | undefined): Mission[] =>
  (Array.isArray(team?.missions) ? team!.missions! : []).filter((m) => m && m.id && Array.isArray(m.steps));

export const assignmentsOf = (team: { assignments?: Assignment[] } | undefined): Assignment[] =>
  (Array.isArray(team?.assignments) ? team!.assignments! : []).filter((a) => a && a.id && a.target);

export function newMission(input: { id: string; authorName?: string; now: string }): Mission {
  return {
    id: input.id,
    title: '',
    steps: [],
    status: 'rascunho',
    ...(input.authorName ? { authorName: input.authorName } : {}),
    createdAt: input.now,
    updatedAt: input.now
  };
}

/** A clean mission (no empty fields; at most 6 steps, each once). */
export function cleanMission(m: Mission, now: string): Mission {
  const seen = new Set<string>();
  const steps: Mission['steps'] = [];
  for (const st of m.steps || []) {
    if (!st || typeof st.challengeId !== 'string' || !st.challengeId || seen.has(st.challengeId)) continue;
    seen.add(st.challengeId);
    const note = text(st.note, 200);
    steps.push({ challengeId: st.challengeId, ...(note ? { note } : {}) });
    if (steps.length === MAX_STEPS) break;
  }
  const ageGroups = [...new Set((m.ageGroups || []).filter((a) => AGE_GROUPS.includes(a)))];
  const out: Mission = {
    id: m.id,
    title: text(m.title, 120) || 'Missão sem título',
    steps,
    status: m.status in MISSION_STATUS ? m.status : 'rascunho',
    createdAt: m.createdAt,
    updatedAt: now
  };
  const objective = text(m.objective, 300);
  if (objective) out.objective = objective;
  if (isKnownCompetency(m.competencyId)) out.competencyId = m.competencyId;
  if (ageGroups.length) out.ageGroups = ageGroups;
  if (m.difficulty === 1 || m.difficulty === 2 || m.difficulty === 3) out.difficulty = m.difficulty;
  if (m.authorName) out.authorName = text(m.authorName, 120);
  return out;
}

/** Why the mission cannot be published (empty = it can): 2–6 steps, each a published challenge of the team. */
export function missionProblems(m: Mission, challenges: VjSession[]): string[] {
  const p: string[] = [];
  if (!m.title.trim()) p.push('Dê um título à missão.');
  if (m.steps.length < MIN_STEPS || m.steps.length > MAX_STEPS)
    p.push(`Uma missão tem de ${MIN_STEPS} a ${MAX_STEPS} desafios.`);
  const byId = new Map(challenges.map((c) => [c.id, c]));
  if (m.steps.some((s) => byId.get(s.challengeId)?.status !== 'publicado'))
    p.push('Todos os desafios da missão têm de estar publicados na equipa.');
  return p;
}

/** The steps of a mission with their challenge (null when it is no longer in the library). */
export const stepsOf = (m: Mission, challenges: VjSession[]) =>
  m.steps.map((s) => ({ ...s, challenge: challenges.find((c) => c.id === s.challengeId) || null }));

/** How many steps the target of an assignment has (a single challenge = 1). */
export function stepCount(a: Assignment, missions: Mission[]): number {
  if (a.target.kind === 'desafio') return 1;
  return missions.find((m) => m.id === a.target.id)?.steps.length || 0;
}

/** Who the assignment is for (the whole team = every active athlete of the roster). */
export function athletesOf(a: Assignment, roster: Pick<Player, 'id' | 'active'>[]): string[] {
  const active = roster.filter((p) => p.active !== false).map((p) => p.id);
  return a.to === 'equipa' ? active : a.to.filter((id) => roster.some((p) => p.id === id));
}

export function newAssignment(input: {
  id: string;
  target: Assignment['target'];
  to: Assignment['to'];
  dueDate?: string;
  priority?: boolean;
  goal?: Assignment['goal'];
  note?: string;
  createdBy?: string;
  now: string;
}): Assignment {
  return cleanAssignment(
    {
      id: input.id,
      target: input.target,
      to: input.to,
      dueDate: input.dueDate,
      priority: input.priority,
      goal: input.goal,
      note: input.note,
      status: 'ativa',
      createdBy: input.createdBy,
      createdAt: input.now,
      updatedAt: input.now
    },
    input.now
  );
}

/** A clean assignment: the goal only for one athlete; the progress only of its athletes and steps. */
export function cleanAssignment(a: Assignment, now: string): Assignment {
  const to: Assignment['to'] =
    a.to === 'equipa' ? 'equipa' : [...new Set((Array.isArray(a.to) ? a.to : []).filter(Boolean))].slice(0, 60);
  const out: Assignment = {
    id: a.id,
    target: { kind: a.target.kind === 'missao' ? 'missao' : 'desafio', id: a.target.id },
    to,
    status: a.status === 'concluida' || a.status === 'cancelada' ? a.status : 'ativa',
    createdAt: a.createdAt,
    updatedAt: now
  };
  if (isDay(a.dueDate)) out.dueDate = a.dueDate;
  if (a.priority) out.priority = true;
  if (a.goal && Array.isArray(to) && to.length === 1 && a.goal.athleteId === to[0] && a.goal.goalId)
    out.goal = { athleteId: a.goal.athleteId, goalId: a.goal.goalId };
  const note = text(a.note, 300);
  if (note) out.note = note;
  if (a.createdBy) out.createdBy = text(a.createdBy, 120);
  if (a.progress && typeof a.progress === 'object') {
    const progress: Record<string, Record<string, string>> = {};
    for (const [athlete, steps] of Object.entries(a.progress)) {
      if (to !== 'equipa' && !to.includes(athlete)) continue;
      const kept = Object.fromEntries(
        Object.entries(steps || {}).filter(([k, d]) => /^\d$/.test(k) && Number(k) < MAX_STEPS && isDay(d))
      );
      if (Object.keys(kept).length) progress[athlete] = kept;
    }
    if (Object.keys(progress).length) out.progress = progress;
  }
  return out;
}

/** Ticks (or unticks) one step of one athlete, with the day. */
export function withStepDone(a: Assignment, athleteId: string, step: number, day: string | null, now: string) {
  const progress = { ...(a.progress || {}) };
  const steps = { ...(progress[athleteId] || {}) };
  if (day) steps[String(step)] = day;
  else delete steps[String(step)];
  progress[athleteId] = steps;
  return cleanAssignment({ ...a, progress }, now);
}

/** How many steps an athlete has done. */
export const doneSteps = (a: Assignment, athleteId: string) => Object.keys(a.progress?.[athleteId] || {}).length;

export const isAssignmentOverdue = (a: Assignment, today: string) =>
  a.status === 'ativa' && !!a.dueDate && a.dueDate < today;

/** The athletes who did every step: the coach is invited to reassess the competency (never changed by itself). */
export function readyToReassess(a: Assignment, missions: Mission[], roster: Pick<Player, 'id' | 'active'>[]) {
  const total = stepCount(a, missions);
  if (!total) return [];
  return athletesOf(a, roster).filter((id) => doneSteps(a, id) >= total);
}

/** Active assignments first (priority, then the nearest deadline), then the others. */
export function sortAssignments(list: Assignment[]): Assignment[] {
  const rank = (a: Assignment) => (a.status === 'ativa' ? 0 : 1);
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      Number(!!b.priority) - Number(!!a.priority) ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
      b.createdAt.localeCompare(a.createdAt)
  );
}

/** What was given to this athlete (for the athlete's sheet; only the coaching staff sees it). */
export const assignmentsForAthlete = (list: Assignment[], athleteId: string, roster: Pick<Player, 'id' | 'active'>[]) =>
  sortAssignments(list.filter((a) => a.status !== 'cancelada' && athletesOf(a, roster).includes(athleteId)));

/** The athlete's goals in progress (to link an assignment for one athlete). */
export const goalsInProgress = (player: Player) => goalsOf(player).filter((g) => statusOf(g) === 'em_curso');

/** The team's lists with this mission or assignment added or replaced. */
export const withItem = <T extends { id: string }>(list: T[], item: T): T[] => [
  ...list.filter((x) => x.id !== item.id),
  item
];
