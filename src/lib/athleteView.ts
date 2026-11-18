import { AppState, Assignment, ChallengeType, Mission, Player, VjItem, VjPause, VjSession } from '../types';
import { challengeTypeOf } from './challenges';
import { assignmentsForAthlete, missionsOf, assignmentsOf, stepsOf } from './missions';
import { sessionsOf } from './vjLibrary';

/**
 * MC2a — «O Meu Percurso»: the page of ONE athlete (missions and challenges given to them, and what the coach
 * ticked done), published by the coaching staff's phones for each accepted invitation: the guardian's (the «Modo
 * atleta» of a child under 13) and the athlete's own account (13+). Only what may be seen: never notes, evaluations,
 * contacts, other athletes, nor their progress. Nothing the athlete does is saved in MC2a.
 */

export const MAX_ASSIGNMENTS = 10;
export const OWN_ACCOUNT_AGE = 13;

export interface AthleteStep {
  title: string;
  type: ChallengeType;
  /** The day the coach ticked it done. */
  done?: string;
  instructions?: string;
  prompt?: VjPause & { image?: string };
  reflection?: { prompts: string[]; emojiScale?: boolean };
  /** Practical: what the exercise is (no picture, to keep the page small). */
  exercise?: { name: string; objective?: string; minutes?: number; material?: string };
  completionCriteria?: string;
  /** Video: the videos with their pauses. */
  items?: VjItem[];
  missing?: boolean;
}

export interface AthleteAssignmentView {
  id: string;
  kind: 'missao' | 'desafio';
  title: string;
  objective?: string;
  dueDate?: string;
  priority?: boolean;
  status: Assignment['status'];
  steps: AthleteStep[];
}

export interface AthleteView {
  athleteName: string;
  teamName: string;
  clubName: string;
  season: string;
  /** 13 or older (from the roster's birth date): the guardian may invite the athlete's own account. */
  canHaveOwnAccount: boolean;
  assignments: AthleteAssignmentView[];
  updatedAt: number;
}

/** Full years at `today` (null without a birth date). */
export function ageOn(birthDate: string | null | undefined, today: Date): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return null;
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number);
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age--;
  return age;
}

function stepOf(
  challenge: VjSession | null,
  done: string | undefined,
  exercises: AppState['exerciseLibrary']
): AthleteStep {
  if (!challenge || challenge.status !== 'publicado')
    return { title: 'Desafio indisponível', type: 'reflexao', missing: true, ...(done ? { done } : {}) };
  const type = challengeTypeOf(challenge);
  const step: AthleteStep = { title: challenge.title, type, ...(done ? { done } : {}) };
  if (challenge.instructions) step.instructions = challenge.instructions;
  if (type === 'pergunta' && challenge.prompt) step.prompt = challenge.prompt;
  if (type === 'reflexao' && challenge.reflection) step.reflection = challenge.reflection;
  if (type === 'video') step.items = challenge.items;
  if (type === 'pratico') {
    const ex = (exercises || []).find((x) => x.id === challenge.exerciseId);
    if (ex)
      step.exercise = {
        name: ex.name,
        ...(ex.objective ? { objective: ex.objective } : {}),
        ...(ex.durationMinutes ? { minutes: ex.durationMinutes } : {}),
        ...(ex.materialText ? { material: ex.materialText } : {})
      };
    if (challenge.completionCriteria) step.completionCriteria = challenge.completionCriteria;
  }
  return step;
}

/** The page of one athlete, from the coach's state (only this athlete's assignments and ticks). */
export function athleteViewOf(state: AppState, player: Player, today = new Date()): AthleteView {
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const challenges = sessionsOf(team);
  const missions: Mission[] = missionsOf(team);
  const roster = team?.roster || state.roster || [];
  const exercises = state.exerciseLibrary || [];
  const mine = assignmentsForAthlete(assignmentsOf(team), player.id, roster).slice(0, MAX_ASSIGNMENTS);
  const assignments = mine.map((a): AthleteAssignmentView => {
    const ticks = a.progress?.[player.id] || {};
    if (a.target.kind === 'missao') {
      const m = missions.find((x) => x.id === a.target.id);
      return {
        id: a.id,
        kind: 'missao',
        title: m?.title || 'Missão',
        ...(m?.objective ? { objective: m.objective } : {}),
        ...(a.dueDate ? { dueDate: a.dueDate } : {}),
        ...(a.priority ? { priority: true } : {}),
        status: a.status,
        steps: m ? stepsOf(m, challenges).map((s, i) => stepOf(s.challenge, ticks[String(i)], exercises)) : []
      };
    }
    const c = challenges.find((x) => x.id === a.target.id) || null;
    return {
      id: a.id,
      kind: 'desafio',
      title: c?.title || 'Desafio',
      ...(a.dueDate ? { dueDate: a.dueDate } : {}),
      ...(a.priority ? { priority: true } : {}),
      status: a.status,
      steps: [stepOf(c, ticks['0'], exercises)]
    };
  });
  const age = ageOn(player.birthDate, today);
  return {
    athleteName: player.name,
    teamName: state.category || 'Equipa',
    clubName: state.myClubName || '',
    season: state.season || '',
    canHaveOwnAccount: age !== null && age >= OWN_ACCOUNT_AGE,
    assignments,
    updatedAt: today.getTime()
  };
}

/** The steps done and the total of an assignment on the page. */
export const stepsDone = (a: AthleteAssignmentView) => a.steps.filter((s) => s.done).length;
