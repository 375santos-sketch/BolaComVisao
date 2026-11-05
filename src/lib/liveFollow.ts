import { Match, Player } from '../types';
import { getMatchPhase } from './matchPhaseUtils';

/**
 * 📡 Acompanhar ao vivo: while someone (the director, an assistant) records the game in the Modo Jogo, the other
 * coaches follow it from their phones — score, clock, numbers and every event as it arrives through the cloud. Only
 * to watch: nothing here changes the game.
 */

/** The game being played now (started and not finished), if any. */
export function liveMatchOf(matches: Match[] | undefined): Match | null {
  return (matches || []).find((m) => m && !m.finished && getMatchPhase(m) !== 'nao_iniciado') || null;
}

export const PHASE_LABELS: Record<string, string> = {
  parte1: '1.ª parte',
  intervalo: 'Intervalo',
  parte2: '2.ª parte'
};

export function liveScore(match: Match): { ours: number; theirs: number } {
  const ours = (match.goals || []).filter((g) => g.type === 'scored').length;
  return { ours, theirs: (match.goals || []).length - ours };
}

interface FollowEvent {
  id: string;
  /** Sort key: half, then minute. */
  order: number;
  minute: string; // "31'" or "—"
  icon: string;
  title: string; // "Golo · Rui"
  detail?: string;
  goal?: 'ours' | 'theirs';
}

const nameOf = (roster: Player[], id: string | null | undefined, fallback?: string | null) => {
  if (!id) return fallback || '';
  if (id === 'autogolo') return 'autogolo';
  const p = roster.find((r) => r && r.id === id);
  return p ? p.nickname?.trim() || p.name.split(/\s+/)[0] : fallback || '';
};

const minuteNumber = (m: number | string | null | undefined) => {
  const n = parseInt(String(m ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
};
/** Order in the game: half, then the second it was recorded at (or its minute). */
const orderOf = (e: { half?: 1 | 2; period?: string; minute: number | string | null; clockSec?: number }) =>
  halfOf(e) * 100000 + (typeof e.clockSec === 'number' ? e.clockSec : minuteNumber(e.minute) * 60);
const halfOf = (e: { half?: 1 | 2; period?: string }) => e.half ?? (/^2/.test(String(e.period || '')) ? 2 : 1);
const label = (m: number | string | null | undefined) =>
  m === null || m === undefined || `${m}` === '' ? '—' : `${String(m).replace(/'+$/, '')}'`;

/** Every event of the game with its minute, the most recent first. */
export function followEvents(match: Match, roster: Player[] | undefined): FollowEvent[] {
  const players = roster || [];
  const out: FollowEvent[] = [];
  for (const g of match.goals || []) {
    const ours = g.type === 'scored';
    const scorer = ours ? nameOf(players, g.scorerId, g.scorer) : '';
    const assist = ours ? nameOf(players, g.assistId, g.assist) : '';
    out.push({
      id: g.id,
      order: orderOf(g),
      minute: label(g.minute),
      icon: '⚽',
      title: ours ? `Golo${scorer ? ` · ${scorer}` : ''}` : 'Golo sofrido',
      detail:
        [assist && assist !== 'autogolo' ? `Assist. ${assist}` : '', g.goalType ? String(g.goalType) : '']
          .filter(Boolean)
          .join(' · ') || undefined,
      goal: ours ? 'ours' : 'theirs'
    });
  }
  for (const s of match.subs || []) {
    out.push({
      id: s.id,
      order: s.isHalftime ? 199998 : orderOf(s),
      minute: s.isHalftime ? '—' : label(s.minute),
      icon: '🔄',
      title: `Sai ${nameOf(players, s.outId, s.playerOut)}, entra ${nameOf(players, s.inId, s.playerIn)}`,
      detail: s.isHalftime ? 'Ao intervalo' : undefined
    });
  }
  for (const c of match.cards || []) {
    out.push({
      id: c.id,
      order: orderOf(c),
      minute: label(c.minute),
      icon: c.color === 'Vermelho' ? '🟥' : '🟨',
      title: nameOf(players, c.playerId, c.player) || 'Cartão',
      detail: c.reason || undefined
    });
  }
  // Half time, once reached
  const phase = getMatchPhase(match);
  if (phase === 'intervalo' || phase === 'parte2') {
    const before = (match.goals || []).filter((g) => halfOf(g) === 1);
    const ours = before.filter((g) => g.type === 'scored').length;
    out.push({
      id: 'intervalo',
      order: 199997,
      minute: '—',
      icon: '⏸️',
      title: `Intervalo · ${ours} – ${before.length - ours}`
    });
  }
  // Same moment: the one recorded last first
  return out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.order - a.e.order || b.i - a.i)
    .map(({ e }) => e);
}

interface FollowStat {
  label: string;
  ours: number;
  theirs: number;
}

/** The numbers of the game, ours against theirs (only what was recorded). */
export function followStats(match: Match): FollowStat[] {
  const inFor = match.shotsInBoxFor || 0;
  const inAgainst = match.shotsInBoxAgainst || 0;
  const shotsFor = inFor + (match.shotsOutBoxFor || 0);
  const shotsAgainst = inAgainst + (match.shotsOutBoxAgainst || 0);
  const yellow = (match.cards || []).filter((c) => c.color !== 'Vermelho').length;
  const red = (match.cards || []).filter((c) => c.color === 'Vermelho').length;
  const stats: FollowStat[] = [
    { label: 'Remates', ours: shotsFor, theirs: shotsAgainst },
    { label: 'dentro da área', ours: inFor, theirs: inAgainst },
    { label: 'Cantos', ours: match.cornersFor || 0, theirs: match.cornersAgainst || 0 }
  ];
  if (yellow) stats.push({ label: 'Cartões amarelos', ours: yellow, theirs: 0 });
  if (red) stats.push({ label: 'Cartões vermelhos', ours: red, theirs: 0 });
  return stats;
}

/** New shots or corners since the last look (only counts: they come without a minute). */
export function countChanges(before: Match | null, after: Match): Array<{ key: string; text: string }> {
  if (!before || before.id !== after.id) return [];
  const items: Array<[keyof Match, string]> = [
    ['shotsInBoxFor', '🎯 Remate nosso dentro da área'],
    ['shotsOutBoxFor', '🎯 Remate nosso de fora da área'],
    ['shotsInBoxAgainst', '🧤 Remate deles dentro da área'],
    ['shotsOutBoxAgainst', '🧤 Remate deles de fora da área'],
    ['cornersFor', '🚩 Canto a nosso favor'],
    ['cornersAgainst', '🚩 Canto contra']
  ];
  return items
    .filter(([k]) => ((after[k] as number) || 0) > ((before[k] as number) || 0))
    .map(([k, text]) => ({ key: String(k), text }));
}
