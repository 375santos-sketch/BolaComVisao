import { Player } from '../types';

/**
 * P1-05 — The athletes' names never go to the AI. Before a request, each name the app would send (the scorers, and
 * any roster name written in the coach's highlights) becomes a code — J1, J2, … — and the text that comes back has
 * the codes put back as names, here on the device. The server and Gemini only ever see the codes. Pure.
 */

export interface Pseudonyms {
  /** The code for a display name (a new one the first time it is seen). */
  code(name: string): string;
  /** A free text with every roster name (full name, first name, nickname) changed to its code. */
  mask(text: string): string;
  /** The AI's text with the codes changed back to the names. */
  restore(text: string): string;
}

const LETTER = '\\p{L}\\p{N}';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ');

/** What the app shows of an athlete in shared texts: the nickname or the first name. */
export const displayName = (p: Pick<Player, 'name' | 'nickname'>): string =>
  norm(p.nickname || '') || norm(p.name || '').split(' ')[0] || '';

export function makePseudonyms(roster: Array<Pick<Player, 'name' | 'nickname'>> = []): Pseudonyms {
  const codeOf = new Map<string, string>(); // display name (lower case) → code
  const nameOf = new Map<string, string>(); // code → display name
  const variants = new Map<string, string>(); // any way of writing the athlete (lower case) → code

  const code = (raw: string): string => {
    const name = norm(raw);
    const key = name.toLocaleLowerCase('pt');
    if (!key) return name;
    let c = codeOf.get(key);
    if (!c) {
      c = `J${codeOf.size + 1}`;
      codeOf.set(key, c);
      nameOf.set(c, name);
    }
    if (!variants.has(key)) variants.set(key, c);
    return c;
  };

  for (const p of roster) {
    if (!p) continue;
    const shown = displayName(p);
    if (!shown) continue;
    const c = code(shown);
    for (const v of [norm(p.name || ''), norm(p.nickname || ''), norm(p.name || '').split(' ')[0]]) {
      const key = v.toLocaleLowerCase('pt');
      if (key.length >= 2 && !variants.has(key)) variants.set(key, c);
    }
  }

  const mask = (text: string): string => {
    if (!text || !variants.size) return text || '';
    // Longest first, so "Rui Silva" is taken whole before "Rui"
    const keys = [...variants.keys()].sort((a, b) => b.length - a.length);
    const re = new RegExp(`(?<![${LETTER}])(${keys.map(escape).join('|')})(?![${LETTER}])`, 'giu');
    return text.normalize('NFC').replace(re, (m) => variants.get(m.toLocaleLowerCase('pt')) || m);
  };

  const restore = (text: string): string =>
    (text || '').replace(/(?<![\p{L}\p{N}])J(\d{1,3})(?![\p{L}\p{N}])/gu, (m) => nameOf.get(m) || m);

  return { code, mask, restore };
}
