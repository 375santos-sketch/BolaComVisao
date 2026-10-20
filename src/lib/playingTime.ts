import { Match, Player } from '../types';
import { calcPlayerMinutes, getHalfDuration, getMatchElapsedMs } from './utils';
import { getMatchPhase, getNominalHalfDuration } from './matchPhaseUtils';

/**
 * Playing time per player (youth football: every called-up player should get meaningful minutes).
 */

/** Share of the available minutes below which a player is flagged (50% of the time they could have played). */
export const PLAYING_TIME_TARGET = 0.5;

const participants = (m: Match): string[] =>
  Array.from(
    new Set([...(m.lineup || []), ...(m.lineupSecondHalf || []), ...(m.subs || []).flatMap((s) => [s.inId, s.outId])])
  ).filter(Boolean);

/** Players who were available for the match: the call-up list, or everyone who took part when there is none. */
export function getCalledUpPlayers(m: Match): string[] {
  return m.convocados && m.convocados.length > 0 ? m.convocados : participants(m);
}

/**
 * Fills in half durations for matches without a recorded clock (e.g. imported from Excel), using the nominal
 * duration of the category, so their minutes are not counted as zero.
 */
export function withPlayableDurations(m: Match, category?: string): Match {
  const nominal = getNominalHalfDuration(m, category);
  const half1 = getHalfDuration(m, 1) || nominal;
  const half2 = getHalfDuration(m, 2) || nominal;
  return {
    ...m,
    timer: {
      ...(m.timer || { isRunning: false, elapsedMs: 0, lastStartTs: null }),
      half1DurationMs: half1 * 60000,
      half2DurationMs: half2 * 60000
    }
  };
}

export function getMatchTotalMinutes(m: Match, category?: string): number {
  const full = withPlayableDurations(m, category);
  return getHalfDuration(full, 1) + getHalfDuration(full, 2);
}

/**
 * Minutes played so far in a match that is being played: the halves are cut at the current clock time.
 */
export function getLiveMatchMinutes(m: Match): { played: Record<string, number>; elapsedMinutes: number } {
  const phase = getMatchPhase(m);
  const elapsedMs = getMatchElapsedMs(m);
  let half1Ms = 0;
  let half2Ms = 0;
  if (phase === 'parte1') {
    half1Ms = elapsedMs;
  } else if (phase === 'intervalo') {
    half1Ms = m.timer?.half1DurationMs ?? elapsedMs;
  } else if (phase === 'parte2') {
    half1Ms = m.timer?.half1DurationMs ?? 0;
    half2Ms = Math.max(0, elapsedMs - half1Ms);
  }

  const snapshot: Match = {
    ...m,
    timer: {
      ...(m.timer || { isRunning: false, elapsedMs: 0, lastStartTs: null }),
      half1DurationMs: half1Ms,
      half2DurationMs: half2Ms
    }
  };
  const played: Record<string, number> = {};
  getCalledUpPlayers(m).forEach((id) => {
    played[id] = phase === 'nao_iniciado' ? 0 : calcPlayerMinutes(snapshot, id);
  });
  return { played, elapsedMinutes: Math.floor((half1Ms + half2Ms) / 60000) };
}

export interface PlayerPlayingTime {
  playerId: string;
  name: string;
  number: number | null;
  minutes: number;
  /** Minutes the player could have played (sum of the full length of the matches they were called up for). */
  availableMinutes: number;
  /** minutes / availableMinutes (0..1); 0 when never called up. */
  share: number;
  matchesCalledUp: number;
  matchesPlayed: number;
  starts: number;
  belowTarget: boolean;
}

/** Season summary of playing time, lowest share first so the players who need minutes stand out. */
export function computeSeasonPlayingTime(
  matches: Match[],
  roster: Player[],
  category?: string,
  target = PLAYING_TIME_TARGET
): PlayerPlayingTime[] {
  const finished = matches.filter((m) => m && m.finished);

  return roster
    .filter((p) => p && p.active !== false)
    .map((p) => {
      let minutes = 0;
      let availableMinutes = 0;
      let matchesCalledUp = 0;
      let matchesPlayed = 0;
      let starts = 0;

      finished.forEach((m) => {
        if (!getCalledUpPlayers(m).includes(p.id)) return;
        const full = withPlayableDurations(m, category);
        const played = calcPlayerMinutes(full, p.id);
        matchesCalledUp++;
        availableMinutes += getMatchTotalMinutes(m, category);
        minutes += played;
        if (played > 0) matchesPlayed++;
        if ((m.lineup || []).includes(p.id)) starts++;
      });

      const share = availableMinutes > 0 ? minutes / availableMinutes : 0;
      return {
        playerId: p.id,
        name: p.name,
        number: p.number,
        minutes,
        availableMinutes,
        share,
        matchesCalledUp,
        matchesPlayed,
        starts,
        belowTarget: matchesCalledUp > 0 && share < target
      };
    })
    .sort((a, b) => a.share - b.share || a.minutes - b.minutes || a.name.localeCompare(b.name, 'pt-PT'));
}
