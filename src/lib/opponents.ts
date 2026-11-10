import { Match, OpponentFile, ScheduledMatch } from '../types';
import { isSameOpponent } from './opponentReport';
import { calculateMatchScore } from './utils';

/**
 * 🔭 Adversários: every opponent of the team (from the games played, the games in the Agenda and the staff's files),
 * with the results against them, the next game and whether there is a file on them.
 */

export interface OpponentSummary {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  lastDate?: string;
  next?: { date: string; time?: string; location?: string };
  file?: OpponentFile;
}

export function opponentsOf(
  matches: Match[] | undefined,
  schedule: ScheduledMatch[] | undefined,
  files: OpponentFile[] | undefined,
  today: string
): OpponentSummary[] {
  const out: OpponentSummary[] = [];
  const entry = (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    let e = out.find((o) => isSameOpponent(o.name, clean));
    if (!e) {
      e = { name: clean, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      out.push(e);
    } else if (clean.length > e.name.length) {
      e.name = clean; // the fuller name ("GRD Os Esparteiros" over "Esparteiros")
    }
    return e;
  };
  for (const f of files || []) {
    const e = entry(f.name);
    if (e) {
      e.file = f;
      e.name = f.name.trim();
    }
  }
  for (const m of matches || []) {
    if (!m || !m.finished || !m.opponent) continue;
    const e = entry(m.opponent);
    if (!e) continue;
    const { scored, conceded } = calculateMatchScore(m);
    e.played++;
    e.goalsFor += scored;
    e.goalsAgainst += conceded;
    if (scored > conceded) e.wins++;
    else if (scored === conceded) e.draws++;
    else e.losses++;
    if (!e.lastDate || (m.date || '') > e.lastDate) e.lastDate = m.date;
  }
  for (const s of schedule || []) {
    if (!s || !s.opponent || s.date < today) continue;
    const e = entry(s.opponent);
    if (e && (!e.next || s.date < e.next.date)) e.next = { date: s.date, time: s.time, location: s.location };
  }
  // The next opponents first, then the most recent ones, then by name
  return out.sort(
    (a, b) =>
      (a.next ? 0 : 1) - (b.next ? 0 : 1) ||
      (a.next && b.next ? a.next.date.localeCompare(b.next.date) : 0) ||
      (b.lastDate || '').localeCompare(a.lastDate || '') ||
      a.name.localeCompare(b.name, 'pt')
  );
}

/** The staff's file on this opponent, if there is one. */
export const fileOf = (files: OpponentFile[] | undefined, opponent: string | undefined) =>
  (files || []).find((f) => isSameOpponent(f.name, opponent)) || null;

/** The files with this one saved (replacing the old one), or without it when it is empty. */
export function withFile(files: OpponentFile[] | undefined, file: OpponentFile): OpponentFile[] {
  const clean = (list?: string[]) =>
    (list || [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  const next: OpponentFile = {
    id: file.id,
    name: file.name.trim().slice(0, 80),
    updatedAt: file.updatedAt,
    ...(file.formation?.trim() ? { formation: file.formation.trim().slice(0, 30) } : {}),
    ...(clean(file.strengths).length ? { strengths: clean(file.strengths) } : {}),
    ...(clean(file.weaknesses).length ? { weaknesses: clean(file.weaknesses) } : {}),
    ...(file.notes?.trim() ? { notes: file.notes.trim().slice(0, 1500) } : {}),
    ...(file.strategy?.trim() ? { strategy: file.strategy.trim().slice(0, 1500) } : {})
  };
  const others = (files || []).filter((f) => f.id !== file.id);
  const empty = !next.formation && !next.strengths && !next.weaknesses && !next.notes && !next.strategy;
  return empty ? others : [...others, next];
}
