import { Match, Player } from '../types';
import { withRosterIds } from './eventPlayers';
import { hasReportNotes, isSameOpponent } from './opponentReport';

/**
 * Every finished game against one opponent: score, where, who scored, and the notes the coach left in the
 * post-match report (the most recent ones), shown in the Convocatória and the Pré-jogo before facing them again.
 */

interface HeadToHeadGame {
  id: string;
  date: string;
  where: string; // "Casa", "Fora", "Torneio de Natal"
  scored: number;
  conceded: number;
  result: 'V' | 'E' | 'D';
  scorers: string[]; // ["Tomás Costa 2", "Rui Matos"]
}

interface HeadToHead {
  games: HeadToHeadGame[]; // most recent first
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Notes of the most recent game with a post-match report. */
  report?: {
    date: string;
    notes: string;
    nextTime: string;
    dangerous: string[];
    weaknesses: string[];
    system: string;
  };
}

const scoreOf = (m: Match) => {
  const goals = m.goals || [];
  if (goals.length === 0 && m.finalScore) return m.finalScore;
  return {
    scored: goals.filter((g) => g.type === 'scored').length,
    conceded: goals.filter((g) => g.type === 'conceded').length
  };
};

function scorersOf(m: Match, roster: Player[]): string[] {
  const counts = new Map<string, number>();
  (m.goals || [])
    .filter((g) => g.type === 'scored')
    .forEach((g) => {
      const p = g.scorerId ? roster.find((r) => r && r.id === g.scorerId) : undefined;
      const name = p ? p.nickname?.trim() || p.name : g.scorer?.trim() || '';
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ${n}` : name));
}

export function headToHead(
  matches: Match[],
  roster: Player[],
  opponent: string | undefined,
  beforeDate?: string
): HeadToHead | null {
  if (!opponent) return null;
  const games = withRosterIds(
    (matches || []).filter(
      (m) => m && m.finished && isSameOpponent(m.opponent, opponent) && (!beforeDate || m.date < beforeDate)
    ),
    roster || []
  ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (games.length === 0) return null;

  const rows: HeadToHeadGame[] = games.map((m) => {
    const { scored, conceded } = scoreOf(m);
    return {
      id: m.id,
      date: m.date,
      where: m.type === 'torneio' ? m.tournamentName?.trim() || 'Torneio' : m.location === 'fora' ? 'Fora' : 'Casa',
      scored,
      conceded,
      result: scored > conceded ? 'V' : scored < conceded ? 'D' : 'E',
      scorers: scorersOf(m, roster || [])
    };
  });
  const withReport = games.find((m) => hasReportNotes(m.opponentReport));
  const r = withReport?.opponentReport;
  const clean = (list?: string[]) => (list || []).map((s) => s.trim()).filter(Boolean);
  return {
    games: rows,
    wins: rows.filter((g) => g.result === 'V').length,
    draws: rows.filter((g) => g.result === 'E').length,
    losses: rows.filter((g) => g.result === 'D').length,
    goalsFor: rows.reduce((s, g) => s + g.scored, 0),
    goalsAgainst: rows.reduce((s, g) => s + g.conceded, 0),
    report:
      withReport && r
        ? {
            date: withReport.date,
            notes: (r.notes || '').trim(),
            nextTime: (r.nextTime || '').trim(),
            dangerous: clean(r.dangerousPlayers),
            weaknesses: clean(r.weaknesses),
            system: (r.system || '').trim()
          }
        : undefined
  };
}
