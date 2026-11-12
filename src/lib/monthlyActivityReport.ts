import { AbsenceReason, AppState, Match, MonthlyReportRecord, Player, ScheduledMatch, Training } from '../types';
import { withRosterIds } from './eventPlayers';
import { getCalledUpPlayers, gamesMissingStarters, withPlayableDurations } from './playingTime';
import { buildPlayerSeason } from './playerSeason';
import { trainingStatus } from './planningSummary';
import { THEME_LABELS, ThemeKey } from './seasonPlan';
import { localDateISO } from './trainingQuick';
import { calcPlayerMinutes, calculateMatchScore, getHalfDuration, isSeasonMatching, seasonFromDate } from './utils';
import { monthLabel } from './monthlyReport';

/**
 * 📑 Relatório mensal de atividade e desenvolvimento (Relatórios): everything the app already records about one team
 * in one month, worked out with the same rules as the rest of the app, for the coach to complete and deliver to the
 * coordinator. Rules (see prototipos/relatorio-mensal/AUDITORIA.md):
 * - only REALIZED trainings count for attendance; "por fechar" and "agendado" are listed apart;
 * - called up ≠ used (more than 0 minutes) ≠ starter (1st-half line-up);
 * - minutes from line-ups and substitutions (calcPlayerMinutes); a game without a clock uses the age group's half
 *   duration and is flagged as estimated;
 * - a statistic that was not recorded is `null` (shown as "—"), never 0; team totals say in how many games it was
 *   recorded;
 * - nothing qualitative is made up: the coach's text lives in the MonthlyReportRecord.
 * The athletes' private evaluations (Player.evaluations) are never used here.
 */

export const REPORT_DIMENSIONS = [
  'Organização ofensiva',
  'Organização defensiva',
  'Transições',
  'Reação à perda',
  'Tomada de decisão',
  'Técnica individual',
  'Espírito de equipa',
  'Disciplina e compromisso'
] as const;

export const REPORT_LEVELS = ['Em desenvolvimento', 'Satisfatório', 'Bom', 'Muito bom'] as const;

export const REPORT_TEXT_FIELDS: [keyof MonthlyReportTexts, string][] = [
  ['evolucao', 'Evolução geral da equipa'],
  ['positivos', 'Aspetos positivos'],
  ['dificuldades', 'Dificuldades identificadas'],
  ['consolidados', 'Comportamentos consolidados'],
  ['melhorar', 'Aspetos a melhorar'],
  ['acompanhamento', 'Atletas que necessitam de acompanhamento individual'],
  ['observacoes', 'Observações relevantes']
];

export const REPORT_NEXT_FIELDS: [keyof MonthlyReportNext, string][] = [
  ['tecnicos', 'Objetivos técnicos'],
  ['taticos', 'Objetivos táticos'],
  ['fisicos', 'Objetivos físicos'],
  ['comportamentais', 'Objetivos comportamentais'],
  ['prioritarios', 'Aspetos prioritários'],
  ['coordenacao', 'Observações para a coordenação']
];

export type MonthlyReportTexts = NonNullable<MonthlyReportRecord['texts']>;
export type MonthlyReportNext = NonNullable<MonthlyReportRecord['next']>;

export const REPORT_STATUS_LABEL: Record<MonthlyReportRecord['status'], string> = {
  rascunho: 'Rascunho',
  validado: 'Validado pelo treinador',
  entregue: 'Entregue ao coordenador'
};

/** The record of a team's month ("2026-10"): one per team and month. */
export const reportRecordId = (month: string) => `relatorio-${month}`;

export function emptyReportRecord(month: string): MonthlyReportRecord {
  return { id: reportRecordId(month), month, status: 'rascunho', texts: {}, dims: {}, dimNotes: {}, next: {} };
}

const JUSTIFIED: AbsenceReason[] = ['doente', 'lesionado', 'escola', 'familia'];
export const ABSENCE_LABEL: Record<string, string> = {
  doente: 'Doença',
  lesionado: 'Lesão',
  escola: 'Escola',
  familia: 'Família',
  injustificada: 'Injustificada',
  inativo: 'Inativo'
};

const inSeason = (date: string | undefined, explicit: string | undefined, season?: string) =>
  isSeasonMatching(explicit || (date ? seasonFromDate(date) : undefined), season);
const inMonth = (date: string | undefined, month: string) => (date || '').slice(0, 7) === month;
export const nextMonthOf = (month: string) => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const shortName = (p?: Player) => (p ? p.nickname?.trim() || p.name : 'Atleta');

export interface ReportTraining {
  id: string;
  number?: number;
  date: string;
  time?: string;
  status: 'realizado' | 'por_fechar' | 'agendado';
  durationMinutes: number | null;
  focus: string;
  objective: string;
  /** Minutes per theme from the session plan (empty = no plan). */
  themes: { key: ThemeKey; label: string; minutes: number }[];
  present: number | null;
  squad: number;
  notes: string;
}

export interface ReportGame {
  id: string;
  date: string;
  opponent: string;
  home: boolean;
  competition: string;
  round: string;
  scored: number;
  conceded: number;
  result: 'V' | 'E' | 'D';
  /** Planned system (Pré-jogo / Equipa inicial), not a live record. */
  system: string | null;
  lineupSize: number;
  starters: { id: string; name: string; number: number | null }[];
  /** Called-up athletes who came on (minutes). */
  benchUsed: { id: string; name: string; number: number | null; minutes: number }[];
  benchUnused: number;
  subs: { minute: string; out: string; in: string }[];
  events: { minute: string; text: string; kind: 'golo' | 'sofrido' | 'amarelo' | 'vermelho' }[];
  shots: { for: number; against: number } | null;
  corners: { for: number; against: number } | null;
  fouls: { for: number; against: number } | null;
  halfMinutes: [number, number];
  estimatedMinutes: boolean;
  missingStarters: boolean;
  coachNotes: string;
}

export interface ReportAthlete {
  id: string;
  name: string;
  number: number | null;
  position: string;
  trainingsPresent: number;
  trainingsHeld: number;
  attendance: number | null;
  justified: number;
  unjustified: number;
  noReason: number;
  calledUp: number;
  played: number;
  starts: number;
  subIn: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  estimated: boolean;
  /** Training by training and game by game, for the athlete's own sheet. */
  trainingDays: { date: string; state: 'presente' | 'justificada' | 'injustificada' | 'sem-motivo' }[];
  gameLines: {
    date: string;
    opponent: string;
    called: boolean;
    starter: boolean;
    minutes: number;
    total: number;
    goals: number;
    assists: number;
  }[];
}

export interface ReportCollective {
  label: string;
  for: number | null;
  against: number | null;
  perGame: number | null;
  recorded: number;
}

export interface MonthlyActivityReport {
  month: string;
  label: string;
  club: string;
  team: string;
  category: string;
  season: string;
  trainings: ReportTraining[];
  games: ReportGame[];
  athletes: ReportAthlete[];
  summary: {
    trainingsHeld: number;
    trainingsUnclosed: number;
    trainingsScheduled: number;
    trainingMinutes: number;
    attendance: number | null;
    games: number;
    competitionMinutes: number;
    record: { V: number; E: number; D: number; gf: number; ga: number };
    absences: { justified: number; unjustified: number; noReason: number; byReason: Record<string, number> };
    athletesUsed: number;
  };
  themes: {
    rows: { key: ThemeKey; label: string; minutes: number }[];
    withPlan: number;
    noPlanCount: number;
    noPlanMinutes: number;
  };
  collective: ReportCollective[];
  missing: { level: 'aviso' | 'info'; text: string }[];
  nextMonth: { label: string; objectives: string[]; games: { date: string; opponent: string; competition: string }[] };
}

const competitionOf = (m: Pick<Match, 'type' | 'tournamentName'>) =>
  m.type === 'torneio' ? m.tournamentName || 'Torneio' : m.type === 'amigavel' ? 'Amigável' : 'Campeonato';

const pair = (a: number | undefined, b: number | undefined) =>
  a === undefined && b === undefined ? null : { for: a ?? 0, against: b ?? 0 };

/** The system the coach planned for the game (Pré-jogo, else the "Equipa inicial" of the call-up). */
const plannedSystem = (m: Match, schedule: ScheduledMatch[]): string | null => {
  const s = schedule.find((x) => x.id === m.originalSchedule?.id) || m.originalSchedule;
  return s?.preMatchPlan?.system?.trim() || s?.startingLineup?.system?.trim() || null;
};

const minuteText = (e: { minute: number | string | null }) =>
  e.minute === null || e.minute === '' ? '—' : `${e.minute}'`;

export function buildMonthlyActivityReport(
  state: Pick<
    AppState,
    'matches' | 'trainings' | 'roster' | 'category' | 'season' | 'schedule' | 'myClubName' | 'teams' | 'activeTeamId'
  >,
  month: string,
  today: string = localDateISO()
): MonthlyActivityReport {
  const roster = (state.roster || []).filter((p) => p && p.active !== false);
  const byId = new Map((state.roster || []).map((p) => [p.id, p]));
  const schedule = state.schedule || [];

  // ---- trainings
  const monthTrainings: Training[] = (state.trainings || [])
    .filter((t) => t && inMonth(t.date, month) && inSeason(t.date, t.season, state.season))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const trainings: ReportTraining[] = monthTrainings.map((t) => {
    const status = trainingStatus(t, today);
    const themes: Partial<Record<ThemeKey, number>> = {};
    (t.sessionPlan?.blocks || []).forEach((b) => {
      const key: ThemeKey = b.category && b.category in THEME_LABELS ? b.category : 'outros';
      themes[key] = (themes[key] || 0) + (Number(b.durationMinutes) || 0);
    });
    const absent = new Set(t.absences || []);
    return {
      id: t.id,
      number: t.trainingNumber,
      date: t.date.slice(0, 10),
      time: t.time,
      status,
      durationMinutes: t.durationMinutes ?? t.sessionPlan?.totalDurationMinutes ?? null,
      focus: (t.type || '').replace(/^[^\p{L}]+/u, '').trim(),
      objective: t.sessionPlan?.objective?.trim() || '',
      themes: (Object.entries(themes) as [ThemeKey, number][])
        .filter(([, m]) => m > 0)
        .map(([key, minutes]) => ({ key, label: THEME_LABELS[key], minutes })),
      present: status === 'realizado' ? roster.filter((p) => !absent.has(p.id)).length : null,
      squad: roster.length,
      notes: t.notes?.trim() || ''
    };
  });
  const realized = monthTrainings.filter((t) => trainingStatus(t, today) === 'realizado');

  // ---- games
  const matches: Match[] = withRosterIds(
    (state.matches || []).filter(
      (m) => m && m.finished && inMonth(m.date, month) && inSeason(m.date, m.season, state.season)
    ),
    state.roster || []
  ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const missingStarters = new Set(gamesMissingStarters(matches, state.roster || []).map((m) => m.id));
  const games: ReportGame[] = matches.map((m) => {
    const { scored, conceded } = calculateMatchScore(m);
    const estimated = getHalfDuration(m, 1) <= 0 || getHalfDuration(m, 2) <= 0;
    const full = withPlayableDurations(m, state.category);
    const h1 = getHalfDuration(full, 1);
    const h2 = getHalfDuration(full, 2);
    const called = getCalledUpPlayers(m);
    const lineup = m.lineup || [];
    const bench = called.filter((id) => !lineup.includes(id));
    const benchUsed = bench
      .map((id) => ({ id, minutes: calcPlayerMinutes(full, id) }))
      .filter((b) => b.minutes > 0)
      .map((b) => ({ ...b, name: shortName(byId.get(b.id)), number: byId.get(b.id)?.number ?? null }));
    const events: ReportGame['events'] = [
      ...(m.goals || []).map((g) => ({
        order: Number.parseInt(String(g.minute), 10) || 0,
        minute: minuteText(g),
        kind: (g.type === 'scored' ? 'golo' : 'sofrido') as 'golo' | 'sofrido',
        text:
          g.type === 'scored'
            ? `${g.scorerId ? shortName(byId.get(g.scorerId)) : 'Golo'}${g.assistId ? ` (assist. ${shortName(byId.get(g.assistId))})` : ''}`
            : 'Golo sofrido'
      })),
      ...(m.cards || []).map((c) => ({
        order: Number.parseInt(String(c.minute), 10) || 0,
        minute: minuteText(c),
        kind: (c.color === 'Vermelho' ? 'vermelho' : 'amarelo') as 'amarelo' | 'vermelho',
        text: shortName(byId.get(c.playerId))
      }))
    ]
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...e }) => e);
    const shotsFor =
      m.rematesDentroArea !== undefined || m.rematesForaArea !== undefined
        ? (m.rematesDentroArea || 0) + (m.rematesForaArea || 0)
        : m.shotsInBoxFor !== undefined || m.shotsOutBoxFor !== undefined
          ? (m.shotsInBoxFor || 0) + (m.shotsOutBoxFor || 0)
          : undefined;
    const shotsAgainst =
      m.rematesDentroAreaAdv !== undefined || m.rematesForaAreaAdv !== undefined
        ? (m.rematesDentroAreaAdv || 0) + (m.rematesForaAreaAdv || 0)
        : m.shotsInBoxAgainst !== undefined || m.shotsOutBoxAgainst !== undefined
          ? (m.shotsInBoxAgainst || 0) + (m.shotsOutBoxAgainst || 0)
          : undefined;
    return {
      id: m.id,
      date: (m.date || '').slice(0, 10),
      opponent: m.opponent || 'Adversário',
      home: m.location !== 'fora',
      competition: competitionOf(m),
      round: (
        m.competitionPhase ||
        (typeof m.phase === 'string' && !['nao_iniciado', 'parte1', 'intervalo', 'parte2'].includes(m.phase)
          ? m.phase
          : '') ||
        m.originalSchedule?.phase ||
        ''
      ).trim(),
      scored,
      conceded,
      result: scored > conceded ? 'V' : scored === conceded ? 'E' : 'D',
      system: plannedSystem(m, schedule),
      lineupSize: m.lineupSize ?? lineup.length,
      starters: lineup.map((id) => ({ id, name: shortName(byId.get(id)), number: byId.get(id)?.number ?? null })),
      benchUsed,
      benchUnused: bench.length - benchUsed.length,
      subs: (m.subs || []).map((s) => ({
        minute: s.isHalftime ? 'Int.' : minuteText(s),
        out: shortName(byId.get(s.outId)),
        in: shortName(byId.get(s.inId))
      })),
      events,
      shots: pair(shotsFor, shotsAgainst),
      corners: pair(m.cantos ?? m.cornersFor, m.cantosAdv ?? m.cornersAgainst),
      fouls: pair(m.faltas ?? m.foulsCommitted, m.faltasAdv ?? m.foulsSuffered),
      halfMinutes: [h1, h2],
      estimatedMinutes: estimated,
      missingStarters: missingStarters.has(m.id),
      coachNotes: m.notes?.trim() || ''
    };
  });

  // ---- athletes (same rules as the athlete's sheet, restricted to this month's games and realized trainings)
  const monthState = { matches, trainings: realized, roster: state.roster || [], category: state.category };
  const byReason: Record<string, number> = {};
  const estimatedGames = new Set(games.filter((g) => g.estimatedMinutes).map((g) => g.id));
  const athletes: ReportAthlete[] = roster
    .map((p) => {
      const s = buildPlayerSeason(monthState, p.id);
      s.absences.forEach((x) => (byReason[x.reason || 'sem motivo'] = (byReason[x.reason || 'sem motivo'] || 0) + 1));
      const justified = s.absences.filter((a) => a.reason && JUSTIFIED.includes(a.reason)).length;
      const unjustified = s.absences.filter((a) => a.reason === 'injustificada' || a.reason === 'inativo').length;
      const noReason = s.absences.length - justified - unjustified;
      const gameLines = matches.map((m) => {
        const called = getCalledUpPlayers(m).includes(p.id);
        const full = withPlayableDurations(m, state.category);
        const minutes = called ? calcPlayerMinutes(full, p.id) : 0;
        return {
          date: (m.date || '').slice(0, 10),
          opponent: m.opponent || 'Adversário',
          called,
          starter: (m.lineup || []).includes(p.id),
          minutes,
          total: getHalfDuration(full, 1) + getHalfDuration(full, 2),
          goals: (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === p.id).length,
          assists: (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === p.id).length
        };
      });
      const absenceByDate = new Map(s.absences.map((a) => [a.date.slice(0, 10), a.reason]));
      return {
        id: p.id,
        name: shortName(p),
        number: p.number ?? null,
        position: (p.positions || '').split(/[,;/]/)[0]?.trim() || '',
        trainingsPresent: s.trainings.present,
        trainingsHeld: s.trainings.held,
        attendance: s.trainings.rate,
        justified,
        unjustified,
        noReason,
        calledUp: s.games.calledUp,
        played: s.games.played,
        starts: s.games.starts,
        subIn: gameLines.filter((g) => g.called && !g.starter && g.minutes > 0).length,
        minutes: s.games.minutes,
        goals: s.goals,
        assists: s.assists,
        yellow: s.yellowCards,
        red: s.redCards,
        estimated: gameLines.some((g, i) => g.minutes > 0 && estimatedGames.has(matches[i].id)),
        trainingDays: realized.map((t) => {
          const day = t.date.slice(0, 10);
          if (!absenceByDate.has(day)) return { date: day, state: 'presente' as const };
          const r = absenceByDate.get(day);
          return {
            date: day,
            state: (r && JUSTIFIED.includes(r)
              ? 'justificada'
              : r === 'injustificada' || r === 'inativo'
                ? 'injustificada'
                : 'sem-motivo') as 'justificada' | 'injustificada' | 'sem-motivo'
          };
        }),
        gameLines
      };
    })
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name, 'pt-PT'));

  // ---- summary
  const rates = athletes.map((a) => a.attendance).filter((r): r is number => r !== null);
  const record = games.reduce(
    (r, g) => ({
      V: r.V + (g.result === 'V' ? 1 : 0),
      E: r.E + (g.result === 'E' ? 1 : 0),
      D: r.D + (g.result === 'D' ? 1 : 0),
      gf: r.gf + g.scored,
      ga: r.ga + g.conceded
    }),
    { V: 0, E: 0, D: 0, gf: 0, ga: 0 }
  );

  // ---- themes (minutes of exercises; trainings without a plan apart)
  const themeTotals: Partial<Record<ThemeKey, number>> = {};
  let withPlan = 0;
  const realizedRows = trainings.filter((t) => t.status === 'realizado');
  realizedRows.forEach((t) =>
    t.themes.forEach((th) => {
      themeTotals[th.key] = (themeTotals[th.key] || 0) + th.minutes;
      withPlan += th.minutes;
    })
  );
  const noPlan = realizedRows.filter((t) => t.themes.length === 0);

  // ---- team statistics: only games where each indicator was recorded
  const collectiveRow = (
    label: string,
    pick: (g: ReportGame) => { for: number; against: number } | null,
    against = true
  ): ReportCollective => {
    const rec = games.map(pick).filter((x): x is { for: number; against: number } => x !== null);
    const f = rec.reduce((n, x) => n + x.for, 0);
    const a = rec.reduce((n, x) => n + x.against, 0);
    return {
      label,
      recorded: rec.length,
      for: rec.length ? f : null,
      against: rec.length && against ? a : null,
      perGame: rec.length ? Math.round((f / rec.length) * 10) / 10 : null
    };
  };
  const collective = games.length
    ? [
        collectiveRow('Golos', (g) => ({ for: g.scored, against: g.conceded })),
        collectiveRow('Remates', (g) => g.shots),
        collectiveRow('Cantos', (g) => g.corners),
        collectiveRow('Faltas', (g) => g.fouls),
        collectiveRow(
          'Cartões (nós)',
          (g) => ({ for: g.events.filter((e) => e.kind === 'amarelo' || e.kind === 'vermelho').length, against: 0 }),
          false
        )
      ]
    : [];

  // ---- missing / uncertain information
  const missing: MonthlyActivityReport['missing'] = [
    ...trainings
      .filter((t) => t.status === 'por_fechar')
      .map((t) => ({
        level: 'aviso' as const,
        text: `Treino${t.number ? ` nº ${t.number}` : ''} de ${dm(t.date)} por fechar: não entra nas presenças até ser fechado.`
      })),
    ...realizedRows
      .filter((t) => t.themes.length === 0)
      .map((t) => ({
        level: 'info' as const,
        text: `Treino${t.number ? ` nº ${t.number}` : ''} de ${dm(t.date)} sem plano de sessão: conteúdos por indicar.`
      })),
    ...(athletes.reduce((n, a) => n + a.noReason, 0)
      ? [
          {
            level: 'info' as const,
            text: `${athletes.reduce((n, a) => n + a.noReason, 0)} falta(s) sem motivo indicado: não contam como justificadas nem como injustificadas.`
          }
        ]
      : []),
    ...games
      .filter((g) => g.estimatedMinutes)
      .map((g) => ({
        level: 'aviso' as const,
        text: `Jogo vs ${g.opponent} (${dm(g.date)}) sem relógio: minutos estimados com a duração do escalão.`
      })),
    ...games
      .filter((g) => g.missingStarters)
      .map((g) => ({
        level: 'aviso' as const,
        text: `Jogo vs ${g.opponent} (${dm(g.date)}) sem os titulares todos: os minutos ficam a menos.`
      })),
    ...games
      .filter((g) => !g.system)
      .map((g) => ({ level: 'info' as const, text: `Jogo vs ${g.opponent} sem sistema tático no Pré-jogo.` })),
    ...games
      .filter((g) => !g.shots || !g.corners || !g.fouls)
      .map((g) => ({
        level: 'info' as const,
        text: `Jogo vs ${g.opponent}: ${[!g.shots && 'remates', !g.corners && 'cantos', !g.fouls && 'faltas'].filter(Boolean).join(', ')} não registados (aparecem «—»).`
      })),
    ...games
      .filter((g) => !g.coachNotes)
      .map((g) => ({ level: 'info' as const, text: `Jogo vs ${g.opponent} sem análise do treinador (notas do jogo).` }))
  ];

  // ---- next month: objectives written in Época and games already in the Agenda
  const next = nextMonthOf(month);
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const nextGames = schedule
    .filter((s) => s && inMonth(s.date, next))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .map((s) => ({
      date: s.date.slice(0, 10),
      opponent: s.opponent,
      competition: [competitionOf(s), s.phase].filter(Boolean).join(' · ')
    }));

  return {
    month,
    label: monthLabel(month),
    club: state.myClubName || team?.clubName || '',
    team: [state.myClubName || team?.clubName, state.category || team?.category].filter(Boolean).join(' · '),
    category: state.category || team?.category || '',
    season: state.season || team?.season || '',
    trainings,
    games,
    athletes,
    summary: {
      trainingsHeld: realizedRows.length,
      trainingsUnclosed: trainings.filter((t) => t.status === 'por_fechar').length,
      trainingsScheduled: trainings.filter((t) => t.status === 'agendado').length,
      trainingMinutes: realizedRows.reduce((n, t) => n + (t.durationMinutes || 0), 0),
      attendance: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
      games: games.length,
      competitionMinutes: games.reduce((n, g) => n + g.halfMinutes[0] + g.halfMinutes[1], 0),
      record,
      absences: {
        justified: athletes.reduce((n, a) => n + a.justified, 0),
        unjustified: athletes.reduce((n, a) => n + a.unjustified, 0),
        noReason: athletes.reduce((n, a) => n + a.noReason, 0),
        byReason
      },
      athletesUsed: athletes.filter((a) => a.played > 0).length
    },
    themes: {
      rows: (Object.entries(themeTotals) as [ThemeKey, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([key, minutes]) => ({ key, label: THEME_LABELS[key], minutes })),
      withPlan,
      noPlanCount: noPlan.length,
      noPlanMinutes: noPlan.reduce((n, t) => n + (t.durationMinutes || 0), 0)
    },
    collective,
    missing,
    nextMonth: {
      label: monthLabel(next),
      objectives: (team?.monthObjectives?.[next] || []).filter((o) => o?.trim()),
      games: nextGames
    }
  };
}
