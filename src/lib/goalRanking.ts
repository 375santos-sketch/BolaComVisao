import { Match, Player } from '../types';

/**
 * Análise → Atletas: goals and assists of each athlete in the games shown (the filters of the screen), most first.
 * A ranking on purpose (the coach asked for the top scorers table): it lists only what was registered in the games.
 * Only the team's active athletes; own goals and goals without a scorer are left out.
 */
export interface RankingRow {
  playerId: string;
  name: string;
  number: number | null;
  count: number;
}

const rank = (counts: Map<string, number>, roster: Player[]): RankingRow[] =>
  roster
    .filter((p) => p && p.active !== false && (counts.get(p.id) || 0) > 0)
    .map((p) => ({ playerId: p.id, name: p.name, number: p.number ?? null, count: counts.get(p.id) || 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-PT'));

export function goalRanking(matches: Match[], roster: Player[]): { scorers: RankingRow[]; assists: RankingRow[] } {
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  (matches || []).forEach((m) =>
    (m.goals || [])
      .filter((g) => g.type === 'scored')
      .forEach((g) => {
        if (g.scorerId) goals.set(g.scorerId, (goals.get(g.scorerId) || 0) + 1);
        if (g.assistId) assists.set(g.assistId, (assists.get(g.assistId) || 0) + 1);
      })
  );
  return { scorers: rank(goals, roster), assists: rank(assists, roster) };
}
