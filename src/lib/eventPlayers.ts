import { Match, Player } from '../types';

/**
 * Events from older versions and from imports may name the athlete instead of pointing to the athlete's id
 * (scorerId holding "Rui", or only `scorer`/`player`/`assist`/`playerIn` filled). These helpers turn every such reference into the
 * roster id, so per-athlete goals, assists and cards add up the same everywhere.
 */

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// "7 - Rui", "#7 Rui", "7 · Rui" -> "Rui"
const withoutNumber = (s: string) => s.replace(/^#?\s*\d+\s*[-·.:)]?\s*/, '');

const IGNORED = new Set(['', 'none', 'unknown', 'autogolo', 'auto_golo', 'auto-golo']);

export function playerResolver(roster: Player[]): (...refs: unknown[]) => string | null {
  const byKey = new Map<string, string>();
  (roster || []).forEach((p) => {
    if (!p) return;
    [p.name, p.nickname].forEach((k) => {
      if (k && !byKey.has(norm(k))) byKey.set(norm(k), p.id);
    });
  });
  const ids = new Set((roster || []).filter(Boolean).map((p) => p.id));
  return (...refs) => {
    for (const raw of refs) {
      if (typeof raw !== 'string') continue;
      const s = raw.trim();
      if (IGNORED.has(s.toLowerCase())) continue;
      if (ids.has(s)) return s;
      const hit = byKey.get(norm(s)) ?? byKey.get(norm(withoutNumber(s)));
      if (hit) return hit;
    }
    return null;
  };
}

/**
 * Same games with every athlete reference (goals, cards, substitutions, starters, call-up) pointing to roster ids;
 * unknown names are left as they were.
 */
export function withRosterIds(matches: Match[], roster: Player[]): Match[] {
  const resolve = playerResolver(roster);
  return (matches || []).map((m) => {
    if (!m) return m;
    const goals = (m.goals || []).map((g) => {
      const legacy = g as typeof g & { player?: string; assistant?: string };
      const scorerId = resolve(g.scorerId, g.scorer, legacy.player) ?? g.scorerId ?? null;
      const assistId = resolve(g.assistId, g.assist, legacy.assistant) ?? g.assistId ?? null;
      return scorerId === g.scorerId && assistId === g.assistId ? g : { ...g, scorerId, assistId };
    });
    const cards = m.cards?.map((c) => {
      const playerId = resolve(c.playerId, c.player) ?? c.playerId;
      return playerId === c.playerId ? c : { ...c, playerId };
    });
    const subs = m.subs?.map((s) => {
      const outId = resolve(s.outId, s.playerOut) ?? s.outId;
      const inId = resolve(s.inId, s.playerIn) ?? s.inId;
      return outId === s.outId && inId === s.inId ? s : { ...s, outId, inId };
    });
    const ids = (list?: string[]) => list?.map((id) => resolve(id) ?? id);
    return {
      ...m,
      goals,
      ...(cards ? { cards } : {}),
      ...(subs ? { subs } : {}),
      ...(m.lineup ? { lineup: ids(m.lineup) } : {}),
      ...(m.lineupSecondHalf ? { lineupSecondHalf: ids(m.lineupSecondHalf) } : {}),
      ...(m.convocados ? { convocados: ids(m.convocados) } : {})
    };
  });
}
