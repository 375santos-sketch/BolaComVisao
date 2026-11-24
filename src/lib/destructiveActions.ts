/**
 * P0-09 — Protecting the history: the actions that erase a lot at once, and the guard against deletions that look
 * like a broken load. Pure functions (no React, no Firebase).
 */

/** The word to type before erasing a whole list (trainings, squad, schedule, a team). */
export const ERASE_WORD = 'ELIMINAR';
/** The word to type before a backup replaces the data of this device. */
export const REPLACE_WORD = 'SUBSTITUIR';

/** Whether what was typed is the confirmation word (spaces and upper/lower case do not matter). */
export function confirmWordMatches(typed: string | null | undefined, word: string): boolean {
  return (typed || '').trim().toLocaleUpperCase('pt-PT') === word.trim().toLocaleUpperCase('pt-PT');
}

/** Below this number of deletions in one save, the guard never acts (normal use: a game, a training, a few athletes). */
export const MASS_DELETE_MIN = 20;
/** A save that would delete more than this share of the club's known records looks like a broken load. */
export const MASS_DELETE_SHARE = 0.5;

/** Whether a save that deletes `deletions` records, out of `knownRecords`, must be held back (sign of a broken load). */
export function isSuspiciousMassDelete(deletions: number, knownRecords: number): boolean {
  return deletions > MASS_DELETE_MIN && deletions > knownRecords * MASS_DELETE_SHARE;
}

/** What the coach sees when the guard held deletions back (before, only the browser console said it). */
export function massDeleteNotice(held: number): string {
  return (
    `Proteção de dados: ${held} registos apagados neste aparelho não foram apagados na nuvem, porque parecia um ` +
    `carregamento incompleto. Continuam nos outros aparelhos. Se foi mesmo para apagar, apague em partes de até ` +
    `${MASS_DELETE_MIN} de cada vez.`
  );
}
