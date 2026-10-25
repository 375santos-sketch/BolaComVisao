import { Match } from '../types';

/**
 * Shots are stored as rematesDentroArea/rematesForaArea(+Adv) by the live match and the Ficha de Jogo, and as
 * shotsInBox…/shotsOutBox… by older data; the first set wins (same rule as the live screen).
 */
export function getMatchShots(m: Match): {
  inBoxFor?: number;
  outBoxFor?: number;
  inBoxAgainst?: number;
  outBoxAgainst?: number;
} {
  return {
    inBoxFor: m.rematesDentroArea ?? m.shotsInBoxFor,
    outBoxFor: m.rematesForaArea ?? m.shotsOutBoxFor,
    inBoxAgainst: m.rematesDentroAreaAdv ?? m.shotsInBoxAgainst,
    outBoxAgainst: m.rematesForaAreaAdv ?? m.shotsOutBoxAgainst
  };
}

interface ShotStats {
  /** Matches where shots were recorded (all the figures below come from these matches only). */
  matchesCount: number;
  shotsFor: number;
  inBoxFor: number;
  outBoxFor: number;
  shotsAgainst: number;
  inBoxAgainst: number;
  outBoxAgainst: number;
  goalsScored: number;
  goalsConceded: number;
  avgShotsFor: number | null;
  avgShotsAgainst: number | null;
  /** Goals per shot, in % (null without shots). */
  conversionFor: number | null;
  /** Opponent's goals per shot against us, in %. */
  conversionAgainst: number | null;
  shotsPerGoal: number | null;
}

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);
const avg = (total: number, n: number) => (n > 0 ? Math.round((total / n) * 10) / 10 : null);

/** Shot totals and finishing efficiency. A match with no shots recorded is left out (not counted as 0 shots). */
export function computeShotStats(matches: Match[]): ShotStats {
  const s = {
    matchesCount: 0,
    inBoxFor: 0,
    outBoxFor: 0,
    inBoxAgainst: 0,
    outBoxAgainst: 0,
    goalsScored: 0,
    goalsConceded: 0
  };
  matches.forEach((m) => {
    const shots = getMatchShots(m);
    if (Object.values(shots).every((v) => v == null)) return;
    s.matchesCount++;
    s.inBoxFor += shots.inBoxFor || 0;
    s.outBoxFor += shots.outBoxFor || 0;
    s.inBoxAgainst += shots.inBoxAgainst || 0;
    s.outBoxAgainst += shots.outBoxAgainst || 0;
    (m.goals || []).forEach((g) => {
      if (g.type === 'scored') s.goalsScored++;
      else s.goalsConceded++;
    });
  });
  const shotsFor = s.inBoxFor + s.outBoxFor;
  const shotsAgainst = s.inBoxAgainst + s.outBoxAgainst;
  return {
    ...s,
    shotsFor,
    shotsAgainst,
    avgShotsFor: avg(shotsFor, s.matchesCount),
    avgShotsAgainst: avg(shotsAgainst, s.matchesCount),
    conversionFor: pct(s.goalsScored, shotsFor),
    conversionAgainst: pct(s.goalsConceded, shotsAgainst),
    shotsPerGoal: s.goalsScored > 0 && shotsFor > 0 ? Math.round((shotsFor / s.goalsScored) * 10) / 10 : null
  };
}
