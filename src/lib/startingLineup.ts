import { Player, StartingLineup } from '../types';
import { sortPlayerObjs } from './utils';

/**
 * "Equipa inicial" (Convocatória → 🖼️): the starters drawn on the pitch by the game system. A system is written
 * from defence to attack without the goalkeeper ("2-3-1" for 7 players); place 0 is always the goalkeeper.
 */

/** Usual systems by number of players on the pitch. */
const DEFAULT_SYSTEMS: Record<number, string> = {
  5: '2-2',
  7: '2-3-1',
  8: '3-3-1',
  9: '3-3-2',
  11: '4-3-3'
};

export const SYSTEM_OPTIONS: Record<number, string[]> = {
  5: ['2-2', '1-2-1', '2-1-1'],
  7: ['2-3-1', '3-2-1', '3-1-2', '2-1-2-1', '1-3-2'],
  8: ['3-3-1', '3-2-2', '2-3-2'],
  9: ['3-3-2', '3-2-3', '2-4-2'],
  11: ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-1-4-1', '5-3-2', '3-4-3']
};

export const defaultSystem = (size: number) => DEFAULT_SYSTEMS[size] || evenSystem(size - 1).join('-');

function evenSystem(outfield: number): number[] {
  const lines = outfield >= 6 ? 3 : 2;
  const base = Math.floor(outfield / lines);
  return Array.from({ length: lines }, (_, i) => base + (i < outfield % lines ? 1 : 0));
}

/** Lines of the system (defence to attack); a system that does not add up to the players becomes the usual one. */
export function systemLines(system: string | undefined, size: number): number[] {
  const lines = (system || '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => n > 0);
  const total = lines.reduce((a, b) => a + b, 0);
  if (lines.length > 0 && total === size - 1) return lines;
  return defaultSystem(size).split('-').map(Number);
}

/**
 * Where each place is on the pitch, as fractions of the pitch (x from left to right, y from our goal at the bottom
 * = 1 to the other goal at the top = 0). Place 0 is the goalkeeper.
 */
export function slotPositions(lines: number[]): { x: number; y: number }[] {
  const out = [{ x: 0.5, y: 0.93 }];
  const top = 0.12;
  const bottom = 0.64;
  lines.forEach((count, i) => {
    const y = lines.length === 1 ? (top + bottom) / 2 : bottom - (i * (bottom - top)) / (lines.length - 1);
    for (let k = 0; k < count; k++) out.push({ x: (k + 1) / (count + 1), y });
  });
  return out;
}

type Group = 'gr' | 'def' | 'med' | 'ava';

/** Line of the pitch for the athlete's position in the squad ("Guarda-redes", "Defesa central", "Médio", "Ponta de lança"…). */
export function positionGroup(positions?: string): Group | undefined {
  const p = (positions || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!p.trim()) return undefined;
  if (/guarda|\bgr\b|\bgk\b|keeper/.test(p)) return 'gr';
  if (/defes|central|lateral|\bdc\b|\bdd\b|\bld\b|fixo/.test(p)) return 'def';
  if (/medio|\bmc\b|\bmd\b|\bme\b|\bmdc\b|\bmoc\b|pivo|ala/.test(p)) return 'med';
  if (/avanc|ponta|extremo|\bpl\b|\bed\b|\bee\b|atac/.test(p)) return 'ava';
  return undefined;
}

/** Which group each line is: the first is the defence, the last the attack, the rest the midfield. */
const lineGroup = (i: number, count: number): Group => (i === 0 ? 'def' : i === count - 1 && count > 1 ? 'ava' : 'med');

/**
 * Places the starters on the pitch by their positions in the squad: the goalkeeper in goal, defenders at the back,
 * midfielders in the middle, forwards up front; who does not fit (or has no position) fills the free places.
 */
export function arrangeStarters(starters: Player[], system: string, size: number): (string | null)[] {
  const lines = systemLines(system, size);
  const slotGroups: Group[] = [
    'gr',
    ...lines.flatMap((n, i) => Array.from({ length: n }, () => lineGroup(i, lines.length)))
  ];
  const slots: (string | null)[] = slotGroups.map(() => null);
  const left = sortPlayerObjs([...starters]);
  const take = (group: Group) => {
    const i = left.findIndex((p) => positionGroup(p.positions) === group);
    return i >= 0 ? left.splice(i, 1)[0] : undefined;
  };
  slotGroups.forEach((g, i) => {
    const p = take(g);
    if (p) slots[i] = p.id;
  });
  // A line with no specialist takes the nearest group's player before the rest
  slotGroups.forEach((g, i) => {
    if (slots[i] || left.length === 0) return;
    const near: Group[] =
      g === 'gr' ? [] : g === 'def' ? ['med', 'ava'] : g === 'ava' ? ['med', 'def'] : ['def', 'ava'];
    let p: Player | undefined;
    for (const n of near) {
      p = take(n);
      if (p) break;
    }
    if (!p) {
      p = left.find((x) => positionGroup(x.positions) !== 'gr') || left[0];
      left.splice(left.indexOf(p), 1);
    }
    slots[i] = p.id;
  });
  return slots;
}

/** Swaps two places (tap one player, then the other). */
export function swapSlots(slots: (string | null)[], a: number, b: number): (string | null)[] {
  const next = [...slots];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Starters of a saved line-up that are still called up (to start the game with them). */
export function lineupStarters(lineup: StartingLineup | undefined, callup: string[]): string[] {
  const ok = new Set(callup);
  return (lineup?.slots || []).filter((id): id is string => Boolean(id && ok.has(id)));
}

/** Short name for the picture: the nickname, or the first and last names. */
export function shortName(p: Pick<Player, 'name' | 'nickname'>): string {
  if (p.nickname?.trim()) return p.nickname.trim();
  const parts = p.name.trim().split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : p.name.trim();
}
