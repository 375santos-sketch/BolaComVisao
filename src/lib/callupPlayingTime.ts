import { Match, Player } from '../types';
import { computeSeasonPlayingTime, getCalledUpPlayers, PlayerPlayingTime } from './playingTime';
import { isSeasonMatching } from './utils';

/** How many of the latest games are checked for players who were left out. */
export const RECENT_GAMES = 3;

interface CallupPlayingTime extends PlayerPlayingTime {
  /** Of the last RECENT_GAMES games held, in how many the player was not called up. */
  leftOutRecently: number;
}

/**
 * Minutes of the season for each player, to help share playing time when choosing the call-up: minutes played,
 * share of the minutes they could have played, and how often they were left out of the latest games.
 */
export function callupPlayingTime(
  matches: Match[],
  roster: Player[],
  season?: string,
  category?: string
): Map<string, CallupPlayingTime> {
  const seasonGames = (matches || []).filter((m) => m && m.finished && isSeasonMatching(m.season, season));
  const recent = [...seasonGames].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, RECENT_GAMES);
  const recentCallups = recent.map((m) => new Set(getCalledUpPlayers(m)));

  return new Map(
    computeSeasonPlayingTime(seasonGames, roster, category).map((row) => [
      row.playerId,
      { ...row, leftOutRecently: recentCallups.filter((ids) => !ids.has(row.playerId)).length }
    ])
  );
}

/**
 * Players who need minutes: below the target share of the minutes of the games they were called up for (games they
 * were not called up for do not count). Fewest minutes first.
 */
export function playersNeedingMinutes(rows: Map<string, CallupPlayingTime>): CallupPlayingTime[] {
  return [...rows.values()]
    .filter((r) => r.belowTarget)
    .sort((a, b) => a.callupShare - b.callupShare || a.minutes - b.minutes);
}
