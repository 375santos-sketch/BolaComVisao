import { Match, Player } from '../types';
import { calcPlayerMinutes, getHalfDuration, getMatchElapsedMs } from './utils';
import { getMatchPhase, getNominalHalfDuration } from './matchPhaseUtils';
import { getLineupSize } from './constants';
import { withRosterIds } from './eventPlayers';

/**
 * Playing time per player (youth football: every called-up player should get meaningful minutes).
 */

/**
 * No minimum is imposed (every age group and coach is different): the app only points out the athletes with the
 * fewest minutes, so the coach can decide. How many are pointed out:
 */
export const FEWEST_MINUTES_COUNT = 3;

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
  /** Minutes of all the season's games (the same for every athlete). */
  availableMinutes: number;
  /** minutes / availableMinutes (0..1): share of all the games' minutes. */
  share: number;
  /** Minutes of the games the athlete was called up for (what they could have played). */
  calledUpMinutes: number;
  /** minutes / calledUpMinutes (0..1); 0 when never called up. Short of minutes is measured on this. */
  callupShare: number;
  matchesCalledUp: number;
  matchesPlayed: number;
  starts: number;
  /** One of the FEWEST_MINUTES_COUNT athletes with the lowest share of the minutes of the games they were called up
   * for (`callupShare`). Never called up, or played every minute: never flagged. A warning only, never an
   * obligation. */
  fewestMinutes: boolean;
}

/**
 * Finished games without the full first-half line-up (e.g. imported from a sheet that did not list the starters):
 * nobody is known to be on the pitch at kick-off, so the minutes of those games come out short.
 */
export function gamesMissingStarters(matches: Match[], roster: Player[]): Match[] {
  return withRosterIds(
    (matches || []).filter((m) => m && m.finished),
    roster
  ).filter((m) => {
    const ids = new Set(roster.map((p) => p.id));
    return (m.lineup || []).filter((id) => ids.has(id)).length < getLineupSize(m);
  });
}

/**
 * Season summary of playing time, lowest share first so the players who need minutes stand out. `share` is over the
 * minutes of all the games (2 games of 60' = 120' for everyone), called up or not, so it adds up to the team's time
 * on the pitch. The athletes with the fewest minutes (`fewestMinutes`) are measured on the games each athlete was
 * called up for (`callupShare`). Only the team's active athletes count (inactive ones and athletes of other teams are left out).
 */
export function computeSeasonPlayingTime(
  matches: Match[],
  roster: Player[],
  category?: string,
  count = FEWEST_MINUTES_COUNT
): PlayerPlayingTime[] {
  const finished = withRosterIds(
    matches.filter((m) => m && m.finished),
    roster
  );

  const availableMinutes = finished.reduce((n, m) => n + getMatchTotalMinutes(m, category), 0);

  const rows = roster
    .filter((p) => p && p.active !== false)
    .map((p) => {
      let minutes = 0;
      let calledUpMinutes = 0;
      let matchesCalledUp = 0;
      let matchesPlayed = 0;
      let starts = 0;

      finished.forEach((m) => {
        if (!getCalledUpPlayers(m).includes(p.id)) return;
        const full = withPlayableDurations(m, category);
        const played = calcPlayerMinutes(full, p.id);
        matchesCalledUp++;
        calledUpMinutes += getMatchTotalMinutes(m, category);
        minutes += played;
        if (played > 0) matchesPlayed++;
        if ((m.lineup || []).includes(p.id)) starts++;
      });

      const share = availableMinutes > 0 ? minutes / availableMinutes : 0;
      const callupShare = calledUpMinutes > 0 ? minutes / calledUpMinutes : 0;
      return {
        playerId: p.id,
        name: p.name,
        number: p.number,
        minutes,
        availableMinutes,
        share,
        calledUpMinutes,
        callupShare,
        matchesCalledUp,
        matchesPlayed,
        starts,
        fewestMinutes: false
      };
    })
    .sort((a, b) => a.share - b.share || a.minutes - b.minutes || a.name.localeCompare(b.name, 'pt-PT'));
  return markFewest(rows, count);
}

/** Marks the `count` athletes with the lowest share of the minutes of the games they were called up for. */
function markFewest(rows: PlayerPlayingTime[], count: number): PlayerPlayingTime[] {
  const fewest = new Set(
    rows
      // Called up at least once and not already playing every minute they could
      .filter((r) => r.calledUpMinutes > 0 && r.callupShare < 1)
      .sort((a, b) => a.callupShare - b.callupShare || a.minutes - b.minutes || a.name.localeCompare(b.name, 'pt-PT'))
      .slice(0, count)
      .map((r) => r.playerId)
  );
  return rows.map((r) => ({ ...r, fewestMinutes: fewest.has(r.playerId) }));
}
