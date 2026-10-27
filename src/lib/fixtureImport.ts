import { Match, ScheduledMatch } from '../types';
import { canonicalTeam, harmonizeTeams, looseDate, teamKey, teamMatch } from './leagueTable';
import { PrintFixture } from './printJornada';

/**
 * Agenda → 📷 Importar jogos: the games of a calendar read from a picture become games of the Agenda. Only our
 * team's games are kept (home or away), with the opponent under the name the app already uses; games already in the
 * Agenda (same day, same opponent) are flagged so they are not added twice.
 */

interface FixtureDraft {
  opponent: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM ('' when the picture has no time)
  location: 'casa' | 'fora';
  round?: number;
  venue?: string;
  /** Already in the Agenda or among the played games. */
  duplicate: boolean;
}

/** The team names in the picture, most frequent first (our team plays in every round). */
export function fixtureTeams(fixtures: PrintFixture[]): string[] {
  const count = new Map<string, { name: string; n: number }>();
  fixtures.forEach((f) =>
    [f.home, f.away].forEach((name) => {
      const k = teamKey(name);
      count.set(k, { name: count.get(k)?.name || name, n: (count.get(k)?.n || 0) + 1 });
    })
  );
  return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'pt-PT')).map((c) => c.name);
}

/** The name in the picture that is our team (by the club's name), if it can be told. */
export function guessOurName(fixtures: PrintFixture[], ourName: string, clubName?: string): string | undefined {
  const games = fixtures.map((f, i) => ({ id: `${i}`, home: f.home, away: f.away, homeGoals: 0, awayGoals: 0 }));
  return harmonizeTeams(games, { ourName, clubName, known: [] }).ourAlias;
}

export function fixtureDrafts(
  fixtures: PrintFixture[],
  opts: {
    /** How our team is written in the picture. */
    ourAlias: string;
    season?: string;
    schedule: ScheduledMatch[];
    matches: Match[];
  }
): FixtureDraft[] {
  const ours = teamKey(opts.ourAlias);
  const known = [
    ...(opts.schedule || []).map((s) => s.opponent),
    ...(opts.matches || []).map((m) => m.opponent)
  ].filter(Boolean);
  const existing = [
    ...(opts.schedule || []).map((s) => ({ date: s.date.slice(0, 10), opponent: s.opponent })),
    ...(opts.matches || []).map((m) => ({ date: (m.date || '').slice(0, 10), opponent: m.opponent }))
  ];
  return fixtures
    .filter((f) => teamKey(f.home) === ours || teamKey(f.away) === ours)
    .map((f) => {
      const home = teamKey(f.home) === ours;
      const opponent = canonicalTeam(home ? f.away : f.home, known);
      const date = looseDate(f.date, opts.season) || '';
      return {
        opponent,
        date,
        time: f.time || '',
        location: home ? ('casa' as const) : ('fora' as const),
        round: f.round,
        venue: f.venue,
        duplicate: existing.some((e) => e.date === date && teamMatch(e.opponent, opponent) > 0)
      };
    })
    .filter((d) => d.date)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
