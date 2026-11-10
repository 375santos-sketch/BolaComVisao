import { Match } from '../types';

/**
 * ↩︎ Desfazer no Modo Jogo: every change to the game (goal, shot, corner, foul, substitution, card, line-up) can be
 * undone with one tap. The clock and the phase of the game are never taken back by an undo.
 */

const count = (m: Match | null | undefined, key: keyof Match) => Number((m?.[key] as number) || 0);
const len = (m: Match | null | undefined, key: 'goals' | 'subs' | 'cards') => (m?.[key] || []).length;

// The quick buttons of the Modo Jogo write these counters (shots are kept under both names)
const COUNTERS: Array<[keyof Match, string]> = [
  ['rematesDentroArea', 'Remate nosso dentro da área'],
  ['rematesForaArea', 'Remate nosso de fora da área'],
  ['rematesDentroAreaAdv', 'Remate deles dentro da área'],
  ['rematesForaAreaAdv', 'Remate deles de fora da área'],
  ['shotsInBoxFor', 'Remate nosso dentro da área'],
  ['shotsOutBoxFor', 'Remate nosso de fora da área'],
  ['shotsInBoxAgainst', 'Remate deles dentro da área'],
  ['shotsOutBoxAgainst', 'Remate deles de fora da área'],
  ['cantos', 'Canto a favor'],
  ['cantosAdv', 'Canto contra'],
  ['faltas', 'Falta nossa'],
  ['faltasAdv', 'Falta deles']
];

/** What a change did, in a few words ("Golo marcado", "Canto contra"); null when it is not worth undoing (clock). */
export function describeMatchChange(before: Match | null | undefined, after: Match): string | null {
  if (!before || before.id !== after.id) return null;
  const goalsNow = after.goals || [];
  if (goalsNow.length > len(before, 'goals')) {
    return goalsNow[goalsNow.length - 1]?.type === 'conceded' ? 'Golo sofrido' : 'Golo marcado';
  }
  if (goalsNow.length < len(before, 'goals')) return 'Golo apagado';
  if (len(after, 'subs') !== len(before, 'subs'))
    return len(after, 'subs') > len(before, 'subs') ? 'Substituição' : 'Substituição apagada';
  if (len(after, 'cards') !== len(before, 'cards'))
    return len(after, 'cards') > len(before, 'cards') ? 'Cartão' : 'Cartão apagado';
  for (const [key, label] of COUNTERS) {
    const d = count(after, key) - count(before, key);
    if (d > 0) return label;
    if (d < 0) return `${label} (retirado)`;
  }
  if (JSON.stringify(after.goals) !== JSON.stringify(before.goals)) return 'Golo corrigido';
  if (JSON.stringify(after.lineup) !== JSON.stringify(before.lineup)) return 'Titulares da 1.ª parte';
  if (JSON.stringify(after.lineupSecondHalf) !== JSON.stringify(before.lineupSecondHalf))
    return 'Titulares da 2.ª parte';
  if (after.capitao !== before.capitao) return 'Capitão';
  return null;
}

/** The game as it was before the change, keeping the clock and the phase of now. */
export function undoMatch(before: Match, now: Match): Match {
  return {
    ...before,
    timer: now.timer,
    matchPhase: now.matchPhase,
    phase: now.phase,
    finished: now.finished,
    timeline: now.timeline
  };
}
