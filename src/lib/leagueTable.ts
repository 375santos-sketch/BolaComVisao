import { LeagueGame, LeagueSetup, Match } from '../types';
import { calculateMatchScore, isSeasonMatching, seasonFromDate, uid } from './utils';

/**
 * League table of the team's championship series (Resultados → Classificação). The coach records (or pastes) the
 * results of the other games of the series; the team's own championship games come from the app automatically.
 * Points: win 3, draw 1, defeat 0. Ties: points, then the games between the tied teams (points, goal difference,
 * goals scored), then overall goal difference, goals scored and name.
 */

export interface StandingRow {
  team: string;
  ours: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  position: number;
}

/** Game used in the table (the team's own games are marked `fromApp`). */
export interface TableGame extends LeagueGame {
  fromApp?: boolean;
}

/** Comparison key for team names: case, accents, dots and extra spaces ignored ("C.D. Mação" = "cd macao"). */
export const teamKey = (name: string) =>
  (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The team's finished championship games of that season, written as league games (home team first). */
export function ownLeagueGames(matches: Match[], ourName: string, season?: string): TableGame[] {
  return (matches || [])
    .filter(
      (m) =>
        m &&
        m.finished &&
        m.type === 'campeonato' &&
        m.opponent?.trim() &&
        isSeasonMatching(m.season || (m.date ? seasonFromDate(m.date) : undefined), season)
    )
    .map((m) => {
      const { scored, conceded } = calculateMatchScore(m);
      const home = m.location !== 'fora';
      return {
        id: `app-${m.id}`,
        date: m.date?.slice(0, 10),
        home: home ? ourName : m.opponent.trim(),
        away: home ? m.opponent.trim() : ourName,
        homeGoals: home ? scored : conceded,
        awayGoals: home ? conceded : scored,
        fromApp: true
      };
    });
}

/**
 * Every game of the table: the other games of the series plus the team's own (oldest first). A typed/pasted game
 * that repeats one of the team's games under another name ("GD Alferrarede" for "Dragões": same opponent, same
 * side, same score) is left out, so it is not counted twice.
 */
export function leagueGames(league: LeagueSetup, matches: Match[], ourName: string): TableGame[] {
  const ourKey = teamKey(ourName);
  const own = ownLeagueGames(matches, ourName, league.season);
  const repeatsOwn = (g: LeagueGame) =>
    own.some(
      (o) =>
        o.homeGoals === g.homeGoals &&
        o.awayGoals === g.awayGoals &&
        ((teamKey(o.away) === ourKey && teamKey(o.home) === teamKey(g.home)) ||
          (teamKey(o.home) === ourKey && teamKey(o.away) === teamKey(g.away)))
    );
  const others = (league.games || []).filter(
    (g) => teamKey(g.home) !== ourKey && teamKey(g.away) !== ourKey && !repeatsOwn(g)
  );
  return [...others, ...own].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

type Tally = Omit<StandingRow, 'position' | 'ours'>;

function tally(games: TableGame[], teams: string[]): Map<string, Tally> {
  const rows = new Map<string, Tally>();
  const names = new Map<string, string>();
  const row = (name: string) => {
    const key = teamKey(name);
    if (!names.has(key)) names.set(key, name.trim());
    if (!rows.has(key)) {
      rows.set(key, {
        team: names.get(key)!,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0
      });
    }
    return rows.get(key)!;
  };
  teams.forEach((t) => t.trim() && row(t));
  games.forEach((g) => {
    const h = row(g.home);
    const a = row(g.away);
    const add = (r: Tally, gf: number, ga: number) => {
      r.played++;
      r.goalsFor += gf;
      r.goalsAgainst += ga;
      r.goalDiff = r.goalsFor - r.goalsAgainst;
      if (gf > ga) {
        r.won++;
        r.points += 3;
      } else if (gf === ga) {
        r.drawn++;
        r.points += 1;
      } else r.lost++;
    };
    add(h, g.homeGoals, g.awayGoals);
    add(a, g.awayGoals, g.homeGoals);
  });
  return rows;
}

/** The table, sorted, with positions. */
export function computeStandings(games: TableGame[], teams: string[], ourName: string): StandingRow[] {
  const all = tally(games, teams);
  const ourKey = teamKey(ourName);
  const byPoints = new Map<number, Tally[]>();
  all.forEach((r) => byPoints.set(r.points, [...(byPoints.get(r.points) || []), r]));

  const sorted: Tally[] = [];
  [...byPoints.keys()]
    .sort((a, b) => b - a)
    .forEach((pts) => {
      const group = byPoints.get(pts)!;
      if (group.length === 1) {
        sorted.push(group[0]);
        return;
      }
      // Head-to-head among the tied teams
      const keys = new Set(group.map((r) => teamKey(r.team)));
      const h2h = tally(
        games.filter((g) => keys.has(teamKey(g.home)) && keys.has(teamKey(g.away))),
        group.map((r) => r.team)
      );
      const hh = (r: Tally) => h2h.get(teamKey(r.team))!;
      sorted.push(
        ...[...group].sort(
          (a, b) =>
            hh(b).points - hh(a).points ||
            hh(b).goalDiff - hh(a).goalDiff ||
            hh(b).goalsFor - hh(a).goalsFor ||
            b.goalDiff - a.goalDiff ||
            b.goalsFor - a.goalsFor ||
            a.team.localeCompare(b.team, 'pt-PT')
        )
      );
    });

  return sorted.map((r, i) => ({ ...r, ours: teamKey(r.team) === ourKey, position: i + 1 }));
}

// ---------- Import (paste from the association's site, WhatsApp or Excel) ----------

export interface ParsedResults {
  games: LeagueGame[];
  /** Lines that were not understood (shown to the coach). */
  skipped: string[];
}

const DATE = /(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/;

function isoDate(d: string, m: string, y: string | undefined, season?: string): string | undefined {
  const day = Number(d);
  const month = Number(m);
  if (!day || !month || day > 31 || month > 12) return undefined;
  let year = y ? Number(y.length === 2 ? `20${y}` : y) : 0;
  if (!year) {
    // Season "2026/2027": August–December in the first year, January–July in the second
    const first = Number((season || '').slice(0, 4)) || new Date().getFullYear();
    year = month >= 8 ? first : first + 1;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Reads pasted results, one game per line, home team first:
 * "Tramagal SU 1-10 Dragões", "12/10 Mação 2 x 2 Abrantes", "Jornada 3" (sets the round of the next lines), or
 * Excel/Sheets columns "data | casa | golos | golos | fora" (date optional).
 */
export function parseResults(text: string, season?: string): ParsedResults {
  const games: LeagueGame[] = [];
  const skipped: string[] = [];
  let round: number | undefined;
  (text || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const roundMatch =
      /^(?:jornada|ronda|j)\s*\.?\s*(\d{1,2})\b\.?$/i.exec(line) || /^(\d{1,2})\s*[.ªº]*\s*jornada$/i.exec(line);
    if (roundMatch) {
      round = Number(roundMatch[1]);
      return;
    }
    let date: string | undefined;
    let home = '';
    let away = '';
    let hg = NaN;
    let ag = NaN;

    const cells = line.split('\t').map((c) => c.trim());
    if (cells.length >= 4) {
      const nums = cells.map((c) => (/^\d{1,2}$/.test(c) ? Number(c) : NaN));
      const i = nums.findIndex((n, k) => !isNaN(n) && !isNaN(nums[k + 1]) && k > 0 && k + 2 < cells.length);
      if (i > 0) {
        home = cells[i - 1];
        hg = nums[i];
        ag = nums[i + 1];
        away = cells[i + 2];
        const d = cells
          .slice(0, i - 1)
          .join(' ')
          .match(DATE);
        if (d) date = isoDate(d[1], d[2], d[3], season);
      }
    }
    if (!home) {
      let rest = line;
      const d = rest.match(new RegExp(`^${DATE.source}\\s+`));
      if (d) {
        date = isoDate(d[1], d[2], d[3], season);
        rest = rest.slice(d[0].length);
      }
      const m = /^(.+?)\s+(\d{1,2})\s*[-x×–:]\s*(\d{1,2})\s+(.+)$/i.exec(rest);
      if (m) {
        home = m[1];
        hg = Number(m[2]);
        ag = Number(m[3]);
        away = m[4];
      }
    }
    home = home.replace(/\s+/g, ' ').trim();
    away = away.replace(/\s+/g, ' ').trim();
    if (!home || !away || isNaN(hg) || isNaN(ag) || teamKey(home) === teamKey(away)) {
      skipped.push(line);
      return;
    }
    games.push({ id: uid(), round, date, home, away, homeGoals: hg, awayGoals: ag });
  });
  return { games, skipped };
}

/**
 * Adds imported games to the league: a game between the same two teams (same home team) on the same round/date
 * replaces the old one, so pasting the same list twice does not duplicate results.
 */
export function mergeLeagueGames(existing: LeagueGame[], incoming: LeagueGame[]): LeagueGame[] {
  const key = (g: LeagueGame) => `${teamKey(g.home)}|${teamKey(g.away)}|${g.round ?? ''}|${g.date ?? ''}`;
  const looseKey = (g: LeagueGame) => `${teamKey(g.home)}|${teamKey(g.away)}`;
  const out = [...(existing || [])];
  incoming.forEach((g) => {
    let i = out.findIndex((x) => key(x) === key(g));
    // Without round or date, the same fixture (home vs away) is played only once in a series
    if (i < 0 && g.round === undefined && !g.date) i = out.findIndex((x) => looseKey(x) === looseKey(g));
    if (i >= 0) out[i] = { ...g, id: out[i].id };
    else out.push(g);
  });
  return out;
}
