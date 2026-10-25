import { AppState, Match, OpponentReport } from '../types';
import { getMatchShots } from './matchShots';
import { getMatchSetPieces } from './matchSetPieces';
import { getMatchCompetitionDetails, parseMinuteOrder } from './utils';

/**
 * Post-match report on the opponent: what the match itself recorded about them (goals, shots, corners, fouls)
 * plus the coach's notes, and the "next time" advice shown in the Pré-jogo the next time we face them.
 */

const foldName = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "GRD Os Esparteiros" and "Esparteiros" are the same opponent; "Tramagal SU" and "Tramagal" too. */
export function isSameOpponent(a: string | undefined, b: string | undefined): boolean {
  const x = foldName(a || '');
  const y = foldName(b || '');
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && ` ${long} `.includes(` ${short} `);
}

interface OpponentMatchFacts {
  scored: number;
  conceded: number;
  /** Goals the opponent scored: minute and origin as recorded. */
  concededGoals: Array<{ minute: string | null; origin: string | null }>;
  shotsAgainst: number | null;
  shotsAgainstInBox: number | null;
  shotsAgainstOutBox: number | null;
  /** Opponent's shots per goal, in % (null when shots were not recorded). */
  opponentConversion: number | null;
  cornersAgainst: number | null;
  /** Fouls the opponent committed (= fouls suffered by us). */
  opponentFouls: number | null;
}

export function getOpponentMatchFacts(m: Match): OpponentMatchFacts {
  const goals = m.goals || [];
  const scored = goals.filter((g) => g.type === 'scored').length;
  const concededList = goals
    .filter((g) => g.type === 'conceded')
    .sort((a, b) => parseMinuteOrder(a.minute) - parseMinuteOrder(b.minute));
  const shots = getMatchShots(m);
  const shotsRecorded = shots.inBoxAgainst != null || shots.outBoxAgainst != null;
  const shotsAgainst = shotsRecorded ? (shots.inBoxAgainst || 0) + (shots.outBoxAgainst || 0) : null;
  const setPieces = getMatchSetPieces(m);
  return {
    scored,
    conceded: concededList.length,
    concededGoals: concededList.map((g) => ({
      minute: g.minute == null || g.minute === '' ? null : String(g.minute).replace(/'$/, '') + "'",
      origin: g.goalType ? String(g.goalType) : null
    })),
    shotsAgainst,
    shotsAgainstInBox: shotsRecorded ? shots.inBoxAgainst || 0 : null,
    shotsAgainstOutBox: shotsRecorded ? shots.outBoxAgainst || 0 : null,
    opponentConversion: shotsAgainst ? Math.round((concededList.length / shotsAgainst) * 100) : null,
    cornersAgainst: setPieces.cornersAgainst ?? null,
    opponentFouls: setPieces.foulsSuffered ?? null
  };
}

export const hasReportNotes = (r?: OpponentReport | null): boolean =>
  Boolean(
    r &&
    ((r.system && r.system.trim()) ||
      (r.strengths || []).some((s) => s.trim()) ||
      (r.weaknesses || []).some((s) => s.trim()) ||
      (r.dangerousPlayers || []).some((s) => s.trim()) ||
      (r.notes && r.notes.trim()) ||
      (r.nextTime && r.nextTime.trim()))
  );

/** Earlier finished games against the same opponent that have a report, most recent first. */
export function previousReports(matches: Match[], opponent: string, beforeDate?: string): Match[] {
  return (matches || [])
    .filter(
      (m) =>
        m &&
        m.finished &&
        isSameOpponent(m.opponent, opponent) &&
        (!beforeDate || m.date < beforeDate) &&
        hasReportNotes(m.opponentReport)
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Text lines (one item per line) <-> list. */
export const linesToList = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
export const listToLines = (list?: string[]): string => (list || []).join('\n');

const dateLabel = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/** Summary for the coaching staff's WhatsApp group (not for parents: it is an internal report). */
export function buildOpponentReportText(m: Match, state: AppState): string {
  const club = state.myClubName || 'A nossa equipa';
  const f = getOpponentMatchFacts(m);
  const r = m.opponentReport || {};
  const comp = getMatchCompetitionDetails(m, state);
  const home = m.location !== 'fora';
  const score = home
    ? `${club} ${f.scored}-${f.conceded} ${m.opponent}`
    : `${m.opponent} ${f.conceded}-${f.scored} ${club}`;

  const lines = [
    `🛡️ *Relatório do adversário: ${m.opponent}*`,
    `${score} · ${dateLabel(m.date)} · ${comp.typeLabel}`,
    ''
  ];
  lines.push('📊 *No jogo*');
  if (f.conceded > 0) {
    lines.push(
      `• Golos marcados por eles: ${f.conceded} (${f.concededGoals
        .map((g) => [g.minute, g.origin].filter(Boolean).join(' ') || 'sem minuto')
        .join(', ')})`
    );
  } else lines.push('• Não marcaram');
  if (f.shotsAgainst !== null)
    lines.push(`• Remates: ${f.shotsAgainst} (${f.shotsAgainstInBox} dentro, ${f.shotsAgainstOutBox} fora da área)`);
  if (f.cornersAgainst !== null) lines.push(`• Cantos: ${f.cornersAgainst}`);
  if (f.opponentFouls !== null) lines.push(`• Faltas cometidas: ${f.opponentFouls}`);

  const section = (title: string, items?: string[]) => {
    const list = (items || []).filter((s) => s.trim());
    if (list.length) lines.push('', title, ...list.map((s) => `• ${s}`));
  };
  if (r.system?.trim()) lines.push('', `🧩 *Sistema:* ${r.system.trim()}`);
  section('💪 *Pontos fortes*', r.strengths);
  section('🎯 *Pontos fracos*', r.weaknesses);
  section('⚠️ *Jogadores perigosos*', r.dangerousPlayers);
  if (r.notes?.trim()) lines.push('', '📝 *Notas*', r.notes.trim());
  if (r.nextTime?.trim()) lines.push('', '🔁 *Para o próximo jogo*', r.nextTime.trim());
  return lines.join('\n');
}
