import { GoalEvent, Match, MatchType, SubEvent } from '../types';
import { computeMinuteInHalf, getNominalHalfDuration } from './matchPhaseUtils';
import { formatMinute, parseMinuteOrder, seasonFromDate, uid } from './utils';

/**
 * Editing a finished game in one screen (Resultados → Editar jogo) without reopening it. The game is turned into a
 * plain form (game minutes as the coach thinks of them: 40' = 10' into the 2nd half of a 2 x 30' game) and back into
 * the same fields the live game saves, so statistics and minutes read it exactly as if it had been played live.
 */

export type SubHalf = 1 | 2 | 'INT';

export interface GoalDraft {
  id: string;
  type: 'scored' | 'conceded';
  /** Roster id, 'autogolo' or '' (no scorer). Only for our goals. */
  scorerId: string;
  assistId: string;
  half: 1 | 2;
  /** Game minute (1-60 in a 2 x 30' game); null = no minute. */
  minute: number | null;
  goalType: string;
}

export interface SubDraft {
  id: string;
  outId: string;
  inId: string;
  half: SubHalf;
  minute: number | null;
}

export interface MatchDraft {
  date: string;
  opponent: string;
  type: MatchType;
  phase: string;
  location: Match['location'];
  goals: GoalDraft[];
  subs: SubDraft[];
  lineup: string[];
  lineupSecondHalf: string[];
}

const gameMinuteOf = (
  e: { minute?: unknown; half?: 1 | 2; minuteInHalf?: number; minuteBase?: string },
  half: number
) => {
  const parsed = parseMinuteOrder(e.minute as string | number | null | undefined);
  if (parsed !== 999 && parsed !== 45.5) return Math.round(parsed);
  if (typeof e.minuteInHalf === 'number') return e.minuteInHalf + (e.half === 2 ? half : 0);
  return null;
};

const halfOf = (e: { half?: 1 | 2; period?: string }, minute: number | null, halfMinutes: number): 1 | 2 =>
  e.half ?? (e.period === '2.ª parte' ? 2 : minute !== null && minute > halfMinutes ? 2 : 1);

function goalToDraft(g: GoalEvent, halfMinutes: number): GoalDraft {
  const minute = gameMinuteOf(g, halfMinutes);
  return {
    id: g.id,
    type: g.type,
    scorerId: g.type === 'scored' ? g.scorerId || '' : '',
    assistId: g.type === 'scored' ? g.assistId || '' : '',
    half: halfOf(g, minute, halfMinutes),
    minute,
    goalType: g.goalType ? String(g.goalType) : ''
  };
}

function subToDraft(s: SubEvent, halfMinutes: number): SubDraft {
  if (s.isHalftime || s.period === 'Intervalo' || String(s.minute).toUpperCase() === 'INT') {
    return { id: s.id, outId: s.outId, inId: s.inId, half: 'INT', minute: null };
  }
  const minute = gameMinuteOf(s, halfMinutes);
  return { id: s.id, outId: s.outId, inId: s.inId, half: halfOf(s, minute, halfMinutes), minute };
}

export function matchToDraft(m: Match, category?: string): MatchDraft {
  const halfMinutes = getNominalHalfDuration(m, category);
  return {
    date: m.date,
    opponent: m.opponent,
    type: m.type,
    phase: String(m.phase || ''),
    location: m.location || 'casa',
    goals: (m.goals || []).map((g) => goalToDraft(g, halfMinutes)),
    subs: (m.subs || []).map((s) => subToDraft(s, halfMinutes)),
    lineup: [...(m.lineup || [])],
    lineupSecondHalf: [...(m.lineupSecondHalf || [])]
  };
}

export const newGoalDraft = (type: 'scored' | 'conceded'): GoalDraft => ({
  id: uid(),
  type,
  scorerId: '',
  assistId: '',
  half: 1,
  minute: null,
  goalType: ''
});

export const newSubDraft = (): SubDraft => ({ id: uid(), outId: '', inId: '', half: 1, minute: null });

/**
 * Problems that stop the game from being saved (empty list = ok). An incomplete line-up does not: the screen shows it
 * (and the minutes check) so other corrections can still be saved.
 */
export function validateDraft(d: MatchDraft, halfMinutes: number): string[] {
  const errors: string[] = [];
  if (!d.opponent.trim()) errors.push('Indique o adversário.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) errors.push('Indique a data do jogo.');
  d.subs.forEach((s, i) => {
    if (!s.outId || !s.inId) errors.push(`Substituição ${i + 1}: escolha quem sai e quem entra.`);
    else if (s.outId === s.inId) errors.push(`Substituição ${i + 1}: quem sai e quem entra têm de ser diferentes.`);
    if (s.half !== 'INT' && s.minute === null) errors.push(`Substituição ${i + 1}: indique o minuto.`);
  });
  [...d.goals, ...d.subs].forEach((e) => {
    if (e.minute === null || e.half === 'INT') return;
    const from = e.half === 2 ? halfMinutes : 0;
    if (e.minute < from || e.minute > from + halfMinutes + 10)
      errors.push(
        `Minuto ${e.minute}' não pertence à ${e.half}.ª parte (${from}'-${from + halfMinutes}').`.replace("0'-", "1'-")
      );
  });
  return [...new Set(errors)];
}

function draftToGoal(d: GoalDraft, original: GoalEvent | undefined, halfMinutes: number): GoalEvent {
  const minute = d.minute === null ? null : formatMinute(d.minute);
  const scored = d.type === 'scored';
  const autogolo = d.scorerId === 'autogolo';
  const { goalType: _type, ...kept } = original || ({} as Partial<GoalEvent>);
  return {
    ...kept,
    id: d.id,
    type: d.type,
    scorerId: scored ? d.scorerId || null : null,
    assistId: scored && !autogolo ? d.assistId || null : null,
    minute,
    minuteBase: 'game',
    minuteInHalf: computeMinuteInHalf(minute, d.half, halfMinutes),
    period: d.half === 2 ? '2.ª parte' : '1.ª parte',
    half: d.half,
    ...(d.goalType ? { goalType: d.goalType } : {})
  };
}

function draftToSub(d: SubDraft, original: SubEvent | undefined, halfMinutes: number): SubEvent {
  const base = { ...(original || {}), id: d.id, outId: d.outId, inId: d.inId, minuteBase: 'game' as const };
  if (d.half === 'INT') {
    return { ...base, minute: 'INT', half: 1, period: 'Intervalo', isHalftime: true, minuteInHalf: halfMinutes };
  }
  const minute = d.minute === null ? null : formatMinute(d.minute);
  const { isHalftime: _ht, ...rest } = base as SubEvent;
  return {
    ...rest,
    minute,
    half: d.half,
    period: d.half === 2 ? '2.ª parte' : '1.ª parte',
    minuteInHalf: computeMinuteInHalf(minute, d.half, halfMinutes)
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The game with the form's values; events the coach did not touch are kept exactly as they were. */
export function applyDraft(m: Match, d: MatchDraft, category?: string): Match {
  const halfMinutes = getNominalHalfDuration(m, category);
  const goalsById = new Map((m.goals || []).map((g) => [g.id, g]));
  const subsById = new Map((m.subs || []).map((s) => [s.id, s]));
  const goals = d.goals.map((g) => {
    const original = goalsById.get(g.id);
    return original && same(goalToDraft(original, halfMinutes), g) ? original : draftToGoal(g, original, halfMinutes);
  });
  const subs = d.subs.map((s) => {
    const original = subsById.get(s.id);
    return original && same(subToDraft(original, halfMinutes), s) ? original : draftToSub(s, original, halfMinutes);
  });
  const scored = goals.filter((g) => g.type === 'scored').length;
  const { lineupSecondHalf: _old, ...rest } = m;
  return {
    ...rest,
    date: d.date,
    season: d.date === m.date ? m.season : seasonFromDate(d.date),
    opponent: d.opponent.trim(),
    type: d.type,
    phase: d.phase.trim(),
    location: d.location,
    goals,
    subs,
    lineup: d.lineup,
    ...(d.lineupSecondHalf.length > 0 ? { lineupSecondHalf: d.lineupSecondHalf } : {}),
    finalScore: { scored, conceded: goals.length - scored }
  };
}
