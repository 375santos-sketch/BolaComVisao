/**
 * The report's numbers, worked out from the (fictitious) month data with the same rules the app uses today:
 * - only REALIZED trainings count for attendance (por fechar / agendado are listed apart, never as held);
 * - "convocado" (called up) ≠ "utilizado" (played > 0 minutes) ≠ "titular" (in the 1st-half line-up);
 * - minutes per player from the line-up and the substitutions (calcPlayerMinutes); games without a recorded clock
 *   use the age group's half duration and are flagged "estimado";
 * - a statistic that was not recorded stays `null` and is shown as "—", never as 0.
 */
import { ATHLETES, DemoGame, DemoTraining, GAMES, Theme, TRAININGS } from './demoData';

export const THEME_LABEL: Record<Theme, string> = {
  aquecimento: 'Aquecimento',
  tecnica: 'Técnica',
  tatica: 'Tática',
  fisico: 'Físico',
  jogo: 'Jogo / forma jogada',
  bolas_paradas: 'Bolas paradas',
  calma: 'Retorno à calma'
};

export const JUSTIFIED: Record<string, string> = {
  doente: 'Doença',
  lesionado: 'Lesão',
  escola: 'Escola',
  familia: 'Família'
};

export const datePT = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const realized = TRAININGS.filter((t) => t.status === 'realizado');
export const unclosed = TRAININGS.filter((t) => t.status === 'por_fechar');
export const scheduled = TRAININGS.filter((t) => t.status === 'agendado');

export const present = (t: DemoTraining) => ATHLETES.filter((a) => !(a.id in t.absences)).length;

/** Minutes on the pitch per player in one game (2 halves, continuous game minute). */
export function gameMinutes(g: DemoGame): Record<string, number> {
  const total = g.halfMinutes * 2;
  const on: Record<string, number> = {};
  const mins: Record<string, number> = {};
  g.lineup.forEach((id) => (on[id] = 0));
  [...g.subs]
    .sort((a, b) => a.minute - b.minute)
    .forEach((s) => {
      if (s.outId in on) {
        mins[s.outId] = (mins[s.outId] || 0) + (s.minute - on[s.outId]);
        delete on[s.outId];
      }
      on[s.inId] = s.minute;
    });
  Object.entries(on).forEach(([id, from]) => (mins[id] = (mins[id] || 0) + (total - from)));
  return mins;
}

export const score = (g: DemoGame) => ({
  scored: g.goals.filter((x) => x.type === 'scored').length,
  conceded: g.goals.filter((x) => x.type === 'conceded').length
});

export const resultOf = (g: DemoGame): 'V' | 'E' | 'D' => {
  const { scored, conceded } = score(g);
  return scored > conceded ? 'V' : scored === conceded ? 'E' : 'D';
};

export const nameOf = (id?: string) => ATHLETES.find((a) => a.id === id)?.name || '—';
export const numberOf = (id?: string) => ATHLETES.find((a) => a.id === id)?.number ?? '';

export interface AthleteRow {
  id: string;
  name: string;
  number: number;
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
  /** Minutes of games the athlete was called up for. */
  calledUpMinutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  estimated: boolean;
}

export const athleteRows: AthleteRow[] = ATHLETES.map((a) => {
  const held = realized.length;
  let justified = 0;
  let unjustified = 0;
  let noReason = 0;
  realized.forEach((t) => {
    if (!(a.id in t.absences)) return;
    const r = t.absences[a.id];
    if (r === 'injustificada') unjustified++;
    else if (r) justified++;
    else noReason++;
  });
  const presentCount = held - justified - unjustified - noReason;
  let calledUp = 0;
  let played = 0;
  let starts = 0;
  let subIn = 0;
  let minutes = 0;
  let calledUpMinutes = 0;
  let goals = 0;
  let assists = 0;
  let yellow = 0;
  let red = 0;
  let estimated = false;
  GAMES.forEach((g) => {
    if (!g.convocados.includes(a.id)) return;
    calledUp++;
    calledUpMinutes += g.halfMinutes * 2;
    const m = gameMinutes(g)[a.id] || 0;
    minutes += m;
    if (m > 0) {
      played++;
      if (!g.clockRecorded) estimated = true;
    }
    if (g.lineup.includes(a.id)) starts++;
    else if (g.subs.some((s) => s.inId === a.id)) subIn++;
    g.goals.forEach((x) => {
      if (x.type !== 'scored') return;
      if (x.scorerId === a.id) goals++;
      if (x.assistId === a.id) assists++;
    });
    g.cards.forEach((c) => {
      if (c.playerId !== a.id) return;
      if (c.color === 'Vermelho') red++;
      else yellow++;
    });
  });
  return {
    id: a.id,
    name: a.name,
    number: a.number,
    position: a.position,
    trainingsPresent: presentCount,
    trainingsHeld: held,
    attendance: held ? Math.round((presentCount / held) * 100) : null,
    justified,
    unjustified,
    noReason,
    calledUp,
    played,
    starts,
    subIn,
    minutes,
    calledUpMinutes,
    goals,
    assists,
    yellow,
    red,
    estimated
  };
});

const rates = athleteRows.map((r) => r.attendance).filter((x): x is number => x !== null);

export const summary = {
  trainingsHeld: realized.length,
  trainingsUnclosed: unclosed.length,
  trainingsScheduled: scheduled.length,
  trainingMinutes: realized.reduce((n, t) => n + t.durationMinutes, 0),
  attendance: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
  games: GAMES.length,
  competitionMinutes: GAMES.reduce((n, g) => n + g.halfMinutes * 2, 0),
  record: GAMES.reduce(
    (r, g) => {
      const res = resultOf(g);
      const s = score(g);
      return {
        V: r.V + (res === 'V' ? 1 : 0),
        E: r.E + (res === 'E' ? 1 : 0),
        D: r.D + (res === 'D' ? 1 : 0),
        gf: r.gf + s.scored,
        ga: r.ga + s.conceded
      };
    },
    { V: 0, E: 0, D: 0, gf: 0, ga: 0 }
  ),
  absences: athleteRows.reduce(
    (n, r) => ({
      justified: n.justified + r.justified,
      unjustified: n.unjustified + r.unjustified,
      noReason: n.noReason + r.noReason
    }),
    { justified: 0, unjustified: 0, noReason: 0 }
  ),
  athletesUsed: athleteRows.filter((r) => r.played > 0).length
};

/** Minutes per theme from the plans of the realized trainings; trainings without a plan are counted apart. */
export const themes = (() => {
  const by: Partial<Record<Theme, number>> = {};
  let withPlan = 0;
  realized.forEach((t) =>
    t.blocks.forEach((b) => {
      by[b.theme] = (by[b.theme] || 0) + b.minutes;
      withPlan += b.minutes;
    })
  );
  const noPlan = realized.filter((t) => t.blocks.length === 0);
  return {
    rows: (Object.entries(by) as [Theme, number][]).sort((a, b) => b[1] - a[1]),
    withPlan,
    noPlanCount: noPlan.length,
    noPlanMinutes: noPlan.reduce((n, t) => n + t.durationMinutes, 0)
  };
})();

/** What is missing or uncertain this month: shown to the coach before the PDF, never filled in by the app. */
export const missing: { level: 'aviso' | 'info'; text: string }[] = [
  ...unclosed.map((t) => ({
    level: 'aviso' as const,
    text: `Treino nº ${t.number} (${datePT(t.date)}) por fechar: não entra nas presenças até ser fechado.`
  })),
  ...realized
    .filter((t) => t.blocks.length === 0)
    .map((t) => ({
      level: 'info' as const,
      text: `Treino nº ${t.number} (${datePT(t.date)}) sem plano de sessão: conteúdos por indicar.`
    })),
  ...(summary.absences.noReason
    ? [
        {
          level: 'info' as const,
          text: `${summary.absences.noReason} faltas sem motivo indicado: não contam como justificadas nem como injustificadas.`
        }
      ]
    : []),
  ...GAMES.filter((g) => !g.clockRecorded).map((g) => ({
    level: 'aviso' as const,
    text: `Jogo vs ${g.opponent} (${datePT(g.date)}) sem relógio: minutos estimados com ${g.halfMinutes}' por parte.`
  })),
  ...GAMES.filter((g) => !g.system).map((g) => ({
    level: 'info' as const,
    text: `Jogo vs ${g.opponent} sem sistema tático no Pré-jogo.`
  })),
  ...GAMES.filter((g) => !g.corners || !g.fouls).map((g) => ({
    level: 'info' as const,
    text: `Jogo vs ${g.opponent}: ${[!g.corners && 'cantos', !g.fouls && 'faltas'].filter(Boolean).join(' e ')} não registados (aparecem «—»).`
  })),
  ...GAMES.filter((g) => !g.coachNotes).map((g) => ({
    level: 'info' as const,
    text: `Jogo vs ${g.opponent} sem análise do treinador.`
  }))
];

/**
 * Team statistics of the month. Each indicator adds up only the games where it was recorded and says in how many;
 * the average per game divides by those games (a game without the record is not a game with 0).
 */
export const collective = (() => {
  const row = (label: string, pick: (g: DemoGame) => { for: number; against: number } | undefined) => {
    const rec = GAMES.map(pick).filter((x): x is { for: number; against: number } => Boolean(x));
    const f = rec.reduce((n, x) => n + x.for, 0);
    const a = rec.reduce((n, x) => n + x.against, 0);
    return {
      label,
      recorded: rec.length,
      for: rec.length ? f : null,
      against: rec.length ? a : null,
      perGame: rec.length ? (Math.round((f / rec.length) * 10) / 10).toLocaleString('pt-PT') : null
    };
  };
  return [
    row('Golos', (g) => ({ for: score(g).scored, against: score(g).conceded })),
    row('Remates', (g) => g.shots),
    row('Cantos', (g) => g.corners),
    row('Faltas', (g) => g.fouls),
    row('Cartões (nós)', (g) => ({ for: g.cards.length, against: 0 }))
  ].map((r) => (r.label.startsWith('Cartões') ? { ...r, against: null } : r));
})();

/** One athlete's month, training by training and game by game ("Consultar atleta"). */
export function athleteDetail(id: string) {
  return {
    trainings: realized.map((t) => ({
      number: t.number,
      date: t.date,
      state: !(id in t.absences)
        ? 'presente'
        : t.absences[id] === 'injustificada'
          ? 'injustificada'
          : t.absences[id]
            ? 'justificada'
            : 'sem motivo'
    })),
    games: GAMES.map((g) => {
      const called = g.convocados.includes(id);
      const minutes = called ? gameMinutes(g)[id] || 0 : 0;
      return {
        date: g.date,
        opponent: g.opponent,
        called,
        starter: g.lineup.includes(id),
        minutes,
        total: g.halfMinutes * 2,
        estimated: !g.clockRecorded && minutes > 0,
        goals: g.goals.filter((x) => x.type === 'scored' && x.scorerId === id).length,
        assists: g.goals.filter((x) => x.type === 'scored' && x.assistId === id).length
      };
    })
  };
}
