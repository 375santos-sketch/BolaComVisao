import { AppState, Match, MatchType, Training } from '../types';
import { buildPlayerSeason } from './playerSeason';
import { calculateMatchScore, isSeasonMatching, seasonFromDate } from './utils';

/**
 * Monthly report for the club's coordinator (Mais → Relatório mensal): the month's games and results, training
 * attendance, minutes per athlete and the objectives worked on (training plans and pre-match plans). Sporting data
 * only: no contacts, birth dates or the coach's private notes.
 */

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

/** "outubro de 2026" for "2026-10". */
export const monthLabel = (month: string) =>
  `${MONTH_NAMES[Number(month.slice(5, 7)) - 1] || month} de ${month.slice(0, 4)}`;

const TYPE_LABEL: Record<MatchType, string> = { campeonato: 'Campeonato', torneio: 'Torneio', amigavel: 'Amigável' };

export interface MonthlyGame {
  date: string;
  opponent: string;
  home: boolean;
  scored: number;
  conceded: number;
  result: 'V' | 'E' | 'D';
  competition: string;
}

export interface MonthlyPlayer {
  name: string;
  number: number | null;
  trainingsPresent: number;
  trainingsHeld: number;
  /** 0..100, null when there were no trainings. */
  attendance: number | null;
  calledUp: number;
  played: number;
  starts: number;
  minutes: number;
  /** Share of the month's minutes (0..100), null without games. */
  share: number | null;
  goals: number;
  assists: number;
}

export interface MonthlyObjective {
  date: string;
  source: string;
  text: string;
}

export interface MonthlyReport {
  month: string;
  label: string;
  games: MonthlyGame[];
  record: { won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number };
  trainings: { held: number; planned: number; attendance: number | null };
  players: MonthlyPlayer[];
  objectives: MonthlyObjective[];
}

const inSeason = (date: string | undefined, explicit: string | undefined, season?: string) =>
  isSeasonMatching(explicit || (date ? seasonFromDate(date) : undefined), season);
const inMonth = (date: string | undefined, month: string) => (date || '').slice(0, 7) === month;

/** Months of the season with games or trainings, latest first ("2026-10"). */
export function reportMonths(state: Pick<AppState, 'matches' | 'trainings' | 'season'>): string[] {
  const months = new Set<string>();
  (state.matches || []).forEach((m) => {
    if (m?.finished && m.date && inSeason(m.date, m.season, state.season)) months.add(m.date.slice(0, 7));
  });
  (state.trainings || []).forEach((t) => {
    if (t?.date && inSeason(t.date, t.season, state.season)) months.add(t.date.slice(0, 7));
  });
  return [...months].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => b.localeCompare(a));
}

export function buildMonthlyReport(
  state: Pick<AppState, 'matches' | 'trainings' | 'roster' | 'category' | 'season' | 'schedule'>,
  month: string
): MonthlyReport {
  const matches: Match[] = (state.matches || []).filter(
    (m) => m && m.finished && inMonth(m.date, month) && inSeason(m.date, m.season, state.season)
  );
  const allTrainings: Training[] = (state.trainings || []).filter(
    (t) => t && inMonth(t.date, month) && inSeason(t.date, t.season, state.season)
  );
  const trainings = allTrainings.filter((t) => t.completed !== false);

  const games: MonthlyGame[] = [...matches]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((m) => {
      const { scored, conceded } = calculateMatchScore(m);
      return {
        date: (m.date || '').slice(0, 10),
        opponent: m.opponent || 'Adversário',
        home: m.location !== 'fora',
        scored,
        conceded,
        result: scored > conceded ? 'V' : scored === conceded ? 'E' : 'D',
        competition: m.type === 'torneio' && m.tournamentName ? m.tournamentName : TYPE_LABEL[m.type] || ''
      };
    });
  const record = games.reduce(
    (r, g) => ({
      won: r.won + (g.result === 'V' ? 1 : 0),
      drawn: r.drawn + (g.result === 'E' ? 1 : 0),
      lost: r.lost + (g.result === 'D' ? 1 : 0),
      goalsFor: r.goalsFor + g.scored,
      goalsAgainst: r.goalsAgainst + g.conceded
    }),
    { won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }
  );

  // Same rules as the athlete's sheet, restricted to this month's games and trainings
  const monthState = { matches, trainings, roster: state.roster || [], category: state.category };
  const players: MonthlyPlayer[] = (state.roster || [])
    .filter((p) => p && p.active !== false)
    .map((p) => {
      const s = buildPlayerSeason(monthState, p.id);
      return {
        name: p.nickname?.trim() || p.name,
        number: p.number ?? null,
        trainingsPresent: s.trainings.present,
        trainingsHeld: s.trainings.held,
        attendance: s.trainings.rate,
        calledUp: s.games.calledUp,
        played: s.games.played,
        starts: s.games.starts,
        minutes: s.games.minutes,
        share: s.games.availableMinutes > 0 ? Math.round(s.games.share * 100) : null,
        goals: s.goals,
        assists: s.assists
      };
    })
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name, 'pt-PT'));

  const rates = players.map((p) => p.attendance).filter((r): r is number => r !== null);
  const attendance = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;

  const objectives: MonthlyObjective[] = [];
  [...allTrainings]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach((t) => {
      const text = t.sessionPlan?.objective?.trim();
      if (text) {
        objectives.push({
          date: t.date.slice(0, 10),
          source: t.trainingNumber ? `Treino nº ${t.trainingNumber}` : 'Treino',
          text
        });
      }
    });
  (state.schedule || [])
    .filter((s) => s && inMonth(s.date, month) && inSeason(s.date, s.season, state.season))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach((s) => {
      (s.preMatchPlan?.objectives || [])
        .map((o) => o?.trim())
        .filter(Boolean)
        .forEach((text) =>
          objectives.push({ date: s.date.slice(0, 10), source: `Jogo vs ${s.opponent}`, text: text as string })
        );
    });
  objectives.sort((a, b) => a.date.localeCompare(b.date));
  // The same objective in several sessions shows once, with all of them ("Treino nº 2 · Treino nº 4")
  const merged: MonthlyObjective[] = [];
  objectives.forEach((o) => {
    const same = merged.find((m) => m.text.toLowerCase() === o.text.toLowerCase());
    if (same) same.source = `${same.source} · ${o.source}`;
    else merged.push({ ...o });
  });

  return {
    month,
    label: monthLabel(month),
    games,
    record,
    trainings: { held: trainings.length, planned: allTrainings.length, attendance },
    players,
    objectives: merged
  };
}
