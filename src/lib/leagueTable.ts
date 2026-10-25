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

/** Dates of a phase (YYYY-MM-DD): from `from` (inclusive) up to `to` (exclusive); open ends have no limit. */
export interface PhaseRange {
  from?: string;
  to?: string;
}

/** The phases of a season (1.ª fase, 2.ª fase…), in order: the first has no start date, then by start date. */
export function seasonPhases(leagues: LeagueSetup[] | undefined, season: string): LeagueSetup[] {
  return (leagues || [])
    .filter((l) => l && l.season === season)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
}

/** A phase lasts from its start date until the next phase of the season starts. */
export function phaseRange(leagues: LeagueSetup[] | undefined, league: LeagueSetup): PhaseRange {
  const phases = seasonPhases(leagues, league.season);
  const next = phases.find((l) => l.id !== league.id && (l.startDate || '') > (league.startDate || ''));
  return { from: league.startDate || undefined, to: next?.startDate || undefined };
}

const inRange = (date: string | undefined, range?: PhaseRange) => {
  if (!range || (!range.from && !range.to)) return true;
  const d = (date || '').slice(0, 10);
  if (!d) return !range.from; // an undated game belongs to the first phase
  return (!range.from || d >= range.from) && (!range.to || d < range.to);
};

/** "1.ª fase", "2.ª fase"… (the phase's own name when it has one). */
export const phaseLabel = (phases: LeagueSetup[], league: LeagueSetup) =>
  league.name?.trim() || `${phases.findIndex((l) => l.id === league.id) + 1}.ª fase`;

/**
 * The team's finished championship games of that season (and phase, when given), written as league games (home
 * team first).
 */
export function ownLeagueGames(matches: Match[], ourName: string, season?: string, range?: PhaseRange): TableGame[] {
  return (matches || [])
    .filter(
      (m) =>
        m &&
        m.finished &&
        m.type === 'campeonato' &&
        m.opponent?.trim() &&
        isSeasonMatching(m.season || (m.date ? seasonFromDate(m.date) : undefined), season) &&
        inRange(m.date, range)
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
 * Every game of the table: the other games of the series plus the team's own (oldest first). The team's games
 * registered in the app win; a pasted game of the team is used only when the app does not have it (same opponent
 * within 3 days). A pasted game that repeats one of the team's games under another name ("GD Alferrarede" for
 * "Dragões": same opponent, same side, same score) is left out, so it is not counted twice.
 */
export function leagueGames(league: LeagueSetup, matches: Match[], ourName: string, range?: PhaseRange): TableGame[] {
  const ourKey = teamKey(ourName);
  const own = ownLeagueGames(matches, ourName, league.season, range);
  const repeatsOwn = (g: LeagueGame) =>
    own.some(
      (o) =>
        o.homeGoals === g.homeGoals &&
        o.awayGoals === g.awayGoals &&
        ((teamKey(o.away) === ourKey && teamKey(o.home) === teamKey(g.home)) ||
          (teamKey(o.home) === ourKey && teamKey(o.away) === teamKey(g.away)))
    );
  const days = (a?: string, b?: string) =>
    a && b ? Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000 : 0;
  const inApp = (g: LeagueGame) => {
    const opponent = teamKey(g.home) === ourKey ? g.away : g.home;
    return own.some(
      (o) => teamKey(o.home === ourName ? o.away : o.home) === teamKey(opponent) && days(o.date, g.date) <= 3
    );
  };
  const others = (league.games || []).filter((g) => {
    const ours = teamKey(g.home) === ourKey || teamKey(g.away) === ourKey;
    return ours ? !inApp(g) : !repeatsOwn(g);
  });
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

const PT_MONTHS: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12
};
const FPF_DATE = /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?$/i;

/**
 * Text copied from the series page of resultados.fpf.pt ("Jogos" tab): each game is the home team and the score on
 * one line ("Cdr Alferrarede 'A'⇥7 - 3"), the date ("24 OUT"), the away team and the pitch. Headers, round numbers
 * and pitches are ignored; games not played yet (no score) too.
 */
export function parseFpfPage(text: string, season?: string): LeagueGame[] {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const games: LeagueGame[] = [];
  for (let i = 0; i + 2 < lines.length; i++) {
    const m = /^(.+?)\s+(\d{1,2})\s*-\s*(\d{1,2})$/.exec(lines[i]);
    const d = FPF_DATE.exec(lines[i + 1]);
    if (!m || !d) continue;
    const home = m[1].trim();
    const away = lines[i + 2].trim();
    if (!home || !away || teamKey(home) === teamKey(away)) continue;
    const month = PT_MONTHS[d[2].toLowerCase()];
    games.push({
      id: uid(),
      date: isoDate(d[1], String(month), undefined, season),
      home,
      away,
      homeGoals: Number(m[2]),
      awayGoals: Number(m[3])
    });
    i += 2;
  }
  return games;
}

/**
 * A date as written on a results page or a picture: "24 OUT", "24 out.", "24/10", "24-10-2026" or "2026-10-24".
 * Without the year, the season says which one.
 */
export function looseDate(text: string | undefined, season?: string): string | undefined {
  const t = (text || '').trim();
  if (!t) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return isoDate(iso[3], iso[2], iso[1], season);
  const pt = /^(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s+(\d{4}))?/i.exec(
    t
  );
  if (pt) return isoDate(pt[1], String(PT_MONTHS[pt[2].toLowerCase()]), pt[3], season);
  const d = DATE.exec(t);
  return d ? isoDate(d[1], d[2], d[3], season) : undefined;
}

/** Leaves out the games of our team: those come from the games registered in the app, so they are never doubled. */
export function withoutOurGames<T extends LeagueGame>(games: T[], ourName: string): T[] {
  const ourKey = teamKey(ourName);
  return games.filter((g) => teamKey(g.home) !== ourKey && teamKey(g.away) !== ourKey);
}

// Words that say nothing about which team it is ("Cdr", "Clube", "Casa do Povo"…)
const GENERIC = new Set(
  'cdr cd gd gdr grd ad ud uds sc cf fc acd adc cad cfr csd gdc ccd cb ca sl sport clube club desportivo desportiva recreativo recreativa cultural futebol associacao uniao casa povo os as de do da dos das sub11 sub10 sub'.split(
    ' '
  )
);
const teamWords = (name: string) =>
  teamKey(name)
    .split(' ')
    .filter((w) => w.length >= 3 && !GENERIC.has(w));

/**
 * Names of a pasted list matched to the app's: our team (a name sharing a distinctive word with the club, e.g.
 * "Cdr Alferrarede 'A'" for "Dragões de Alferrarede") becomes `ourName`, and an opponent whose distinctive words
 * match exactly one name already in use ("Gdr Os Esparteiros" ↔ "Esparteiros") takes that name. Returns the games
 * with the names changed and the pasted name recognised as ours.
 */
export function harmonizeTeams(
  games: LeagueGame[],
  opts: { ourName: string; clubName?: string; known: string[] }
): { games: LeagueGame[]; ourAlias?: string } {
  const clubWords = new Set([...teamWords(opts.ourName), ...teamWords(opts.clubName || '')]);
  const pasted = Array.from(new Set(games.flatMap((g) => [g.home, g.away])));
  const oursCandidates = pasted.filter((n) => teamWords(n).some((w) => clubWords.has(w)));
  const ourAlias = oursCandidates.length === 1 ? oursCandidates[0] : undefined;
  const known = Array.from(new Set(opts.known.filter((k) => k && teamKey(k) !== teamKey(opts.ourName))));
  const alias = (name: string) => {
    if (ourAlias && teamKey(name) === teamKey(ourAlias)) return opts.ourName;
    if (known.some((k) => teamKey(k) === teamKey(name))) return known.find((k) => teamKey(k) === teamKey(name))!;
    const words = teamWords(name);
    if (!words.length) return name;
    const matches = known.filter((k) => {
      const kw = teamWords(k);
      return kw.length > 0 && (kw.every((w) => words.includes(w)) || words.every((w) => kw.includes(w)));
    });
    return matches.length === 1 ? matches[0] : name;
  };
  return { games: games.map((g) => ({ ...g, home: alias(g.home), away: alias(g.away) })), ourAlias };
}

/**
 * Reads pasted results, one game per line, home team first:
 * "Tramagal SU 1-10 Dragões", "12/10 Mação 2 x 2 Abrantes", "Jornada 3" (sets the round of the next lines), or
 * Excel/Sheets columns "data | casa | golos | golos | fora" (date optional).
 */
export function parseResults(text: string, season?: string): ParsedResults {
  const fpf = parseFpfPage(text, season);
  if (fpf.length) return { games: fpf, skipped: [] };
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
