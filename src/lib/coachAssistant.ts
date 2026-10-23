import { AppState, Match, Player, Training } from '../types';
import { withRosterIds } from './eventPlayers';
import { computeSeasonPlayingTime } from './playingTime';
import { calculateMatchScore, homeFirstScore, isSeasonMatching, seasonFromDate } from './utils';

/**
 * Assistente (Início → 💬 Pergunte à app): answers the coach's usual questions from the app's own data, without
 * internet or paid AI. It recognises the subject (minutes, goals, assists, set-piece goals, absences, cards, results,
 * an opponent, an athlete, the next game) and the period ("este mês", "em outubro", "nos últimos 3 jogos", season).
 */

export interface AssistantAnswer {
  understood: boolean;
  title: string;
  lines: string[];
}

export const ASSISTANT_EXAMPLES = [
  'Quem jogou menos este mês?',
  'Quantos golos de canto marcámos?',
  'Quem é o melhor marcador?',
  'Quem faltou mais aos treinos?',
  'Como correu contra o Tramagal?',
  'Quantos minutos jogou o Rui?',
  'Quando é o próximo jogo?'
];

type AssistantState = Pick<
  AppState,
  'matches' | 'trainings' | 'roster' | 'schedule' | 'season' | 'category' | 'myClubName'
>;

const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MONTHS = [
  'janeiro',
  'fevereiro',
  'marco',
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
const MONTH_LABEL = [
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
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

interface Period {
  label: string;
  from?: string;
  to?: string;
  lastGames?: number;
}

function periodOf(q: string, season: string | undefined, today: Date): Period {
  const last = /ultimos?\s+(\d+)\s+jogos/.exec(q);
  if (last) return { label: `nos últimos ${last[1]} jogos`, lastGames: Number(last[1]) };
  if (/\b(ultimo jogo)\b/.test(q) && !/contra/.test(q)) return { label: 'no último jogo', lastGames: 1 };
  if (/\b(este|neste|deste) mes\b/.test(q)) {
    const from = iso(new Date(today.getFullYear(), today.getMonth(), 1));
    return { label: 'este mês', from, to: iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
  if (/\bmes passado\b/.test(q)) {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { label: 'no mês passado', from: iso(d), to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  const m = MONTHS.findIndex((name) => new RegExp(`\\b${name}\\b`).test(q));
  if (m >= 0) {
    const first = Number((season || '').slice(0, 4)) || today.getFullYear();
    const year = m >= 7 ? first : first + 1; // August–December in the first year of the season
    return {
      label: `em ${MONTH_LABEL[m]}`,
      from: iso(new Date(year, m, 1)),
      to: iso(new Date(year, m + 1, 0))
    };
  }
  return { label: 'esta época' };
}

function gamesIn(state: AssistantState, p: Period): Match[] {
  const all = withRosterIds(
    (state.matches || []).filter(
      (m) =>
        m && m.finished && isSeasonMatching(m.season || (m.date ? seasonFromDate(m.date) : undefined), state.season)
    ),
    state.roster || []
  ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (p.lastGames) return all.slice(-p.lastGames);
  return all.filter((m) => (!p.from || (m.date || '') >= p.from) && (!p.to || (m.date || '').slice(0, 10) <= p.to));
}

function trainingsIn(state: AssistantState, p: Period): Training[] {
  return (state.trainings || []).filter(
    (t) =>
      t &&
      t.completed !== false &&
      isSeasonMatching(t.season || (t.date ? seasonFromDate(t.date) : undefined), state.season) &&
      (!p.from || t.date >= p.from) &&
      (!p.to || t.date.slice(0, 10) <= p.to)
  );
}

const active = (state: AssistantState) => (state.roster || []).filter((p) => p && p.active !== false);
const label = (p: Pick<Player, 'name' | 'number'>) =>
  `${p.number !== null && p.number !== undefined && `${p.number}` !== '' ? `${p.number} · ` : ''}${p.name}`;

/** An athlete named in the question (full name, first/last name, nickname or "o 9"). */
function playerIn(q: string, roster: Player[]): Player | undefined {
  const num = /\b(?:o|numero|n)\s+(\d{1,2})\b/.exec(q);
  if (num) {
    const byNumber = roster.filter((p) => String(p.number ?? '') === num[1]);
    if (byNumber.length === 1) return byNumber[0];
  }
  const words = new Set(q.split(' '));
  const scored = roster
    .map((p) => {
      const tokens = norm(`${p.name} ${p.nickname || ''}`)
        .split(' ')
        .filter((t) => t.length >= 3);
      const hits = tokens.filter((t) => words.has(t)).length;
      return { p, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (scored.length === 0) return undefined;
  if (scored.length > 1 && scored[0].hits === scored[1].hits) return undefined;
  return scored[0].p;
}

function ranking<T>(items: T[], value: (t: T) => number, text: (t: T, v: number) => string, n = 5): string[] {
  return items
    .map((t) => ({ t, v: value(t) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x, i) => `${i + 1}. ${text(x.t, x.v)}`);
}

const GOAL_KINDS: { words: RegExp; types: string[]; label: string }[] = [
  { words: /\bcantos?\b/, types: ['Canto'], label: 'de canto' },
  { words: /\blivres?\b/, types: ['Livre'], label: 'de livre' },
  { words: /\bpenaltis?\b|\bgrandes? penalidades?\b/, types: ['Penalti', 'Penálti'], label: 'de penálti' },
  { words: /\bbolas? paradas?\b/, types: ['Canto', 'Livre', 'Penalti', 'Penálti'], label: 'de bola parada' },
  { words: /\brecupera/, types: ['Recuperação de bola'], label: 'de recuperação de bola' },
  { words: /\bressaltos?\b/, types: ['Ressalto'], label: 'de ressalto' }
];

/** Answers a question about the team. */
export function answerQuestion(question: string, state: AssistantState, today = new Date()): AssistantAnswer {
  const q = norm(question);
  const p = periodOf(q, state.season, today);
  const games = gamesIn(state, p);
  const roster = active(state);
  const noGames: AssistantAnswer = { understood: true, title: `Ainda não há jogos terminados ${p.label}.`, lines: [] };

  // Next game
  if (/\bproximo jogo\b|\bquando (e que )?jogamos\b|\bproximo adversario\b/.test(q)) {
    const today10 = iso(today);
    const next = (state.schedule || [])
      .filter((s) => s && s.date >= today10)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))[0];
    if (!next) return { understood: true, title: 'Não há jogos marcados na Agenda.', lines: [] };
    return {
      understood: true,
      title: `Próximo jogo: ${next.location === 'fora' ? `${next.opponent} – ${state.myClubName || 'nós'}` : `${state.myClubName || 'Nós'} – ${next.opponent}`}`,
      lines: [
        `📅 ${ddmm(next.date)}${next.time ? ` às ${next.time}` : ''} · ${next.location === 'fora' ? 'fora' : 'em casa'}`,
        ...(next.venue ? [`📍 ${next.venue}`] : []),
        `📋 ${(next.callup || []).length} convocados`
      ]
    };
  }

  // Head to head: "contra o X"
  const opponents = Array.from(new Set((state.matches || []).filter((m) => m && m.finished).map((m) => m.opponent)));
  const against = opponents.find((o) => {
    const words = norm(o)
      .split(' ')
      .filter((w) => w.length >= 4);
    return words.length > 0 && words.some((w) => q.split(' ').includes(w));
  });
  if (against && /\bcontra\b|\bjogo\b|\bresultado|\bcorreu\b|\bdefront/.test(q)) {
    const vs = (state.matches || [])
      .filter((m) => m && m.finished && m.opponent === against)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return {
      understood: true,
      title: `Jogos contra ${against}: ${vs.length}`,
      lines: vs.map((m) => {
        const { scored, conceded } = calculateMatchScore(m);
        const res = scored > conceded ? 'vitória' : scored === conceded ? 'empate' : 'derrota';
        return `${ddmm(m.date || '')} · ${m.location === 'fora' ? 'fora' : 'casa'} · ${homeFirstScore(scored, conceded, m.location !== 'fora')} (${res})`;
      })
    };
  }

  // Goals by type (corners, free kicks, penalties…)
  const kind = GOAL_KINDS.find((k) => k.words.test(q));
  if (kind && /\bgolos?\b/.test(q)) {
    if (!games.length) return noGames;
    const conceded = /\bsofr/.test(q);
    const matching = games.flatMap((m) =>
      (m.goals || []).filter(
        (g) => (conceded ? g.type === 'conceded' : g.type === 'scored') && kind.types.includes(g.goalType || '')
      )
    );
    const total = games.flatMap((m) =>
      (m.goals || []).filter((g) => g.type === (conceded ? 'conceded' : 'scored'))
    ).length;
    return {
      understood: true,
      title: `${matching.length} golo(s) ${kind.label} ${conceded ? 'sofridos' : 'marcados'} ${p.label}`,
      lines: [
        `De ${total} golo(s) ${conceded ? 'sofridos' : 'marcados'} em ${games.length} jogo(s)${total ? ` (${Math.round((matching.length / total) * 100)}%)` : ''}.`,
        ...(total && !conceded ? ['Só contam os golos com a origem registada (canto, livre…).'] : [])
      ]
    };
  }

  // One athlete
  const player = playerIn(q, roster);
  if (
    player &&
    /\bminutos?\b|\bjogou\b|\bgolos?\b|\bmarcou\b|\bassist|\bfaltou\b|\bfaltas\b|\btreinos?\b|\bcomo esta\b/.test(q)
  ) {
    const time = computeSeasonPlayingTime(games, [player], state.category)[0];
    const goals = games.reduce(
      (n, m) => n + (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === player.id).length,
      0
    );
    const assists = games.reduce(
      (n, m) => n + (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === player.id).length,
      0
    );
    const trainings = trainingsIn(state, p);
    const missed = trainings.filter((t) => (t.absences || []).includes(player.id)).length;
    return {
      understood: true,
      title: `${label(player)} ${p.label}`,
      lines: [
        `⏱️ ${time?.minutes ?? 0} minutos em ${time?.matchesPlayed ?? 0} jogo(s) (convocado ${time?.matchesCalledUp ?? 0}, titular ${time?.starts ?? 0})`,
        `⚽ ${goals} golo(s) · 🅰️ ${assists} assistência(s)`,
        trainings.length
          ? `🏃 ${trainings.length - missed} de ${trainings.length} treinos (faltou ${missed})`
          : '🏃 Sem treinos registados'
      ]
    };
  }

  // Playing time ranking
  if (/\bjogou (menos|mais)\b|\b(menos|mais) minutos\b|\bminutos\b/.test(q)) {
    if (!games.length) return noGames;
    const fewest = /\bmenos\b/.test(q) || !/\bmais\b/.test(q);
    const rows = computeSeasonPlayingTime(games, roster, state.category).sort((a, b) =>
      fewest ? a.minutes - b.minutes || a.name.localeCompare(b.name, 'pt-PT') : b.minutes - a.minutes
    );
    return {
      understood: true,
      title: `Quem jogou ${fewest ? 'menos' : 'mais'} ${p.label} (${games.length} jogo(s))`,
      lines: rows.slice(0, 5).map((r, i) => `${i + 1}. ${label(r)} — ${r.minutes} min (${Math.round(r.share * 100)}%)`)
    };
  }

  // Scorers and assists
  if (/\bmarcador|\bmais golos\b|\bquem marcou\b|\bmarcou mais\b/.test(q)) {
    if (!games.length) return noGames;
    const lines = ranking(
      roster,
      (pl) =>
        games.reduce(
          (n, m) => n + (m.goals || []).filter((g) => g.type === 'scored' && g.scorerId === pl.id).length,
          0
        ),
      (pl, v) => `${label(pl)} — ${v} golo(s)`
    );
    return {
      understood: true,
      title: `Melhores marcadores ${p.label}`,
      lines: lines.length ? lines : ['Ainda sem golos com marcador.']
    };
  }
  if (/\bassist/.test(q)) {
    if (!games.length) return noGames;
    const lines = ranking(
      roster,
      (pl) =>
        games.reduce(
          (n, m) => n + (m.goals || []).filter((g) => g.type === 'scored' && g.assistId === pl.id).length,
          0
        ),
      (pl, v) => `${label(pl)} — ${v} assistência(s)`
    );
    return {
      understood: true,
      title: `Mais assistências ${p.label}`,
      lines: lines.length ? lines : ['Ainda sem assistências registadas.']
    };
  }

  // Training attendance
  if (/\bfalt|\bassiduidade\b|\bpresenc|\btreinos?\b/.test(q)) {
    const trainings = trainingsIn(state, p);
    if (!trainings.length) return { understood: true, title: `Ainda sem treinos registados ${p.label}.`, lines: [] };
    const lines = ranking(
      roster,
      (pl) => trainings.filter((t) => (t.absences || []).includes(pl.id)).length,
      (pl, v) => `${label(pl)} — ${v} falta(s) em ${trainings.length}`
    );
    return {
      understood: true,
      title: `Faltas aos treinos ${p.label} (${trainings.length} treino(s))`,
      lines: lines.length ? lines : ['Ninguém faltou. 👏']
    };
  }

  // Cards
  if (/\bcart(ao|oes)\b|\bamarelos?\b|\bvermelhos?\b/.test(q)) {
    if (!games.length) return noGames;
    const lines = ranking(
      roster,
      (pl) => games.reduce((n, m) => n + (m.cards || []).filter((c) => c.playerId === pl.id).length, 0),
      (pl, v) => `${label(pl)} — ${v} cartão(ões)`
    );
    return { understood: true, title: `Cartões ${p.label}`, lines: lines.length ? lines : ['Nenhum cartão. 👏'] };
  }

  // Results and goals overall
  if (
    /\bgolos?\b|\bvitorias?\b|\bderrotas?\b|\bempates?\b|\bresultados?\b|\bbalanco\b|\bcomo estamos\b|\bpontos\b/.test(
      q
    )
  ) {
    if (!games.length) return noGames;
    let w = 0;
    let d = 0;
    let l = 0;
    let gf = 0;
    let ga = 0;
    games.forEach((m) => {
      const { scored, conceded } = calculateMatchScore(m);
      gf += scored;
      ga += conceded;
      if (scored > conceded) w++;
      else if (scored === conceded) d++;
      else l++;
    });
    return {
      understood: true,
      title: `${games.length} jogo(s) ${p.label}: ${w} vitória(s), ${d} empate(s), ${l} derrota(s)`,
      lines: [
        `⚽ ${gf} golo(s) marcados (${(gf / games.length).toFixed(1).replace('.', ',')} por jogo)`,
        `🛡️ ${ga} golo(s) sofridos (${(ga / games.length).toFixed(1).replace('.', ',')} por jogo)`
      ]
    };
  }

  return {
    understood: false,
    title: 'Não percebi a pergunta.',
    lines: ['Experimente, por exemplo:', ...ASSISTANT_EXAMPLES.slice(0, 4).map((e) => `«${e}»`)]
  };
}
