import { Match, Player } from '../types';
import { getLineupSize } from './constants';
import { getNominalHalfDuration } from './matchPhaseUtils';
import { computeSeasonPlayingTime, getCalledUpPlayers, getLiveMatchMinutes, PLAYING_TIME_TARGET } from './playingTime';
import { isSeasonMatching, playerLabel, seasonFromDate } from './utils';

/**
 * At halftime: where each called-up athlete stands in the season's playing time (same rule as the minutes table:
 * share of all the games' minutes) counting this game's first half, and a suggested 2nd-half line-up that gives the
 * minutes to whoever is furthest behind. The coach decides; the suggestion only pre-fills the 2nd-half picker.
 */

export interface HalftimeRow {
  playerId: string;
  label: string;
  /** Minutes in this game's first half. */
  firstHalf: number;
  /** Season share counting this game, if he stays on the bench / plays the whole 2nd half. */
  shareIfBenched: number;
  shareIfPlays: number;
  suggested: boolean;
  goalkeeper: boolean;
}

const isGoalkeeper = (p?: Player) => /guarda|\bgr\b/i.test(p?.positions || '');

export function halftimePlan(
  match: Match,
  allMatches: Match[],
  roster: Player[],
  category?: string
): { rows: HalftimeRow[]; suggested: string[]; target: number } {
  const season = match.season || seasonFromDate(match.date);
  const seasonGames = (allMatches || []).filter(
    (m) => m && m.finished && m.id !== match.id && isSeasonMatching(m.season || seasonFromDate(m.date), season)
  );
  const half = getNominalHalfDuration(match, category);
  const thisGame = 2 * half;
  const seasonRows = new Map(computeSeasonPlayingTime(seasonGames, roster, category).map((r) => [r.playerId, r]));
  const { played } = getLiveMatchMinutes(match);
  const sentOff = new Set(
    (match.cards || []).filter((c) => c.color === 'Vermelho' || c.type === 'red').map((c) => c.playerId)
  );

  const rows: HalftimeRow[] = getCalledUpPlayers(match)
    .filter((id) => !sentOff.has(id))
    .map((id) => {
      const p = roster.find((x) => x.id === id);
      const s = seasonRows.get(id);
      const minutes = s?.minutes || 0;
      const available = (s?.availableMinutes || 0) + thisGame;
      const firstHalf = played[id] || 0;
      return {
        playerId: id,
        label: p ? playerLabel(p) : 'Atleta',
        firstHalf,
        shareIfBenched: available ? (minutes + firstHalf) / available : 0,
        shareIfPlays: available ? (minutes + firstHalf + half) / available : 0,
        suggested: false,
        goalkeeper: isGoalkeeper(p)
      };
    })
    .sort((a, b) => a.shareIfBenched - b.shareIfBenched || a.firstHalf - b.firstHalf || a.label.localeCompare(b.label));

  const size = Math.min(getLineupSize(match), rows.length);
  const pick = rows.slice(0, size);
  // Keep a goalkeeper on the pitch: swap in the one furthest behind for the last outfield pick
  if (!pick.some((r) => r.goalkeeper)) {
    const gk = rows.find((r) => r.goalkeeper);
    const lastOutfield = [...pick].reverse().find((r) => !r.goalkeeper);
    if (gk && lastOutfield) pick[pick.indexOf(lastOutfield)] = gk;
  }
  const suggested = pick.map((r) => r.playerId);
  rows.forEach((r) => (r.suggested = suggested.includes(r.playerId)));
  return { rows, suggested, target: PLAYING_TIME_TARGET };
}
