import { Match } from '../types';
import { getLineupSize } from './constants';
import { getCalledUpPlayers, getMatchTotalMinutes, withPlayableDurations } from './playingTime';
import { calcPlayerMinutes, getMatchElapsedMs } from './utils';

/**
 * Checks shown before a game is closed. The "important" ones decide whether the playing-time numbers are right
 * (starters, minutes adding up); the rest only make the reports richer.
 */

/** The game with the half durations it will be saved with when it is finished now (same rule as finishing). */
export function withFinalDurations(match: Match): Match {
  const totalElapsed = getMatchElapsedMs(match);
  const half1DurationMs = match.timer?.half1DurationMs ?? Math.floor(totalElapsed / 2);
  const half2DurationMs = match.timer?.half2DurationMs ?? Math.max(0, totalElapsed - half1DurationMs);
  return {
    ...match,
    timer: {
      ...(match.timer || { elapsedMs: 0, lastStartTs: null }),
      isRunning: false,
      elapsedMs: totalElapsed,
      lastStartTs: null,
      half1DurationMs,
      half2DurationMs
    }
  };
}

/** Minutes on the pitch should add up to players x game length (7 x 60' = 420'); a gap means missing starters/subs. */
export function minutesBalance(match: Match, category?: string) {
  const m = withPlayableDurations(withFinalDurations(match), category);
  const lineupSize = getLineupSize(m);
  const gameMinutes = getMatchTotalMinutes(m, category);
  const players = new Set([
    ...getCalledUpPlayers(m),
    ...(m.lineup || []),
    ...(m.lineupSecondHalf || []),
    ...(m.subs || []).flatMap((s) => [s.inId, s.outId])
  ]);
  const total = [...players].filter(Boolean).reduce((n, id) => n + calcPlayerMinutes(m, id), 0);
  const expected = lineupSize * gameMinutes;
  const sentOff = (m.cards || []).some((c) => c.color === 'Vermelho' || c.type === 'red');
  // A couple of minutes of rounding (a sub logged at 31' of a 30' half) is not an error
  const ok = sentOff || gameMinutes === 0 || Math.abs(total - expected) <= 2;
  return { total, expected, gameMinutes, lineupSize, sentOff, ok };
}

export interface MatchCheck {
  id: string;
  label: string;
  ok: boolean;
  /** Without it the playing-time numbers come out wrong. */
  important: boolean;
  details: string;
  fieldKey: string;
}

const UNKNOWN = new Set(['', 'unknown', 'none']);

export function buildMatchChecklist(match: Match, category?: string): MatchCheck[] {
  const goals = match.goals || [];
  const scored = goals.filter((g) => g.type === 'scored');
  const conceded = goals.filter((g) => g.type === 'conceded');
  const lineupSize = getLineupSize(match);
  const starters = (match.lineup || []).length;
  const balance = minutesBalance(match, category);
  const withoutScorer = scored.filter((g) => UNKNOWN.has(String(g.scorerId || g.scorer || '').trim())).length;
  const withoutMinute = goals.filter(
    (g) => g.minute === null || g.minute === undefined || String(g.minute).trim() === ''
  ).length;
  const withoutOrigin = goals.filter((g) => !g.goalType || !String(g.goalType).trim()).length;

  return [
    {
      id: 'starters',
      label: 'Titulares da 1.ª parte',
      ok: starters === lineupSize,
      important: true,
      details:
        starters === lineupSize
          ? `${starters} titulares registados`
          : `${starters} de ${lineupSize}: sem os titulares, quem começou o jogo perde os minutos`,
      fieldKey: 'lineup'
    },
    {
      id: 'minutes',
      label: 'Minutos de jogo',
      ok: balance.ok,
      important: true,
      details: balance.sentOff
        ? 'Houve expulsão: confirme as substituições'
        : balance.ok
          ? `${balance.total}' = ${balance.lineupSize} x ${balance.gameMinutes}'`
          : `Somam ${balance.total}' e deviam somar ${balance.expected}' (${balance.lineupSize} x ${balance.gameMinutes}'): confirme titulares e substituições`,
      fieldKey: 'subs'
    },
    {
      id: 'scorers',
      label: 'Marcadores dos golos',
      ok: withoutScorer === 0,
      important: false,
      details:
        withoutScorer === 0
          ? `${scored.length} ${scored.length === 1 ? 'golo' : 'golos'} com marcador`
          : `${withoutScorer} ${withoutScorer === 1 ? 'golo' : 'golos'} sem marcador`,
      fieldKey: 'goals'
    },
    {
      id: 'goalMinutes',
      label: 'Minuto e origem dos golos',
      ok: withoutMinute === 0 && withoutOrigin === 0,
      important: false,
      details:
        withoutMinute === 0 && withoutOrigin === 0
          ? `${scored.length + conceded.length} golos com minuto e origem`
          : [withoutMinute ? `${withoutMinute} sem minuto` : '', withoutOrigin ? `${withoutOrigin} sem origem` : '']
              .filter(Boolean)
              .join(' · '),
      fieldKey: 'goals'
    }
  ];
}
