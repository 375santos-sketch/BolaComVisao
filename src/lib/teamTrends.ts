import { GoalEvent, Match } from '../types';
import { calculateMatchScore } from './utils';

/**
 * 📈 Tendências da equipa: statistics turned into decisions. The last games are compared with the games before them
 * (5 against 5 when there are enough) and only real changes become a trend, each with what to do about it and the
 * number of games it rests on. A handful of games is never sold as a settled trend: every trend says so.
 */

export type TrendLevel = 'critico' | 'atencao' | 'evolucao';

export interface TeamTrend {
  id: string;
  level: TrendLevel;
  title: string;
  /** "Últimos 5 jogos: 4 · 5 jogos antes: 1" */
  detail: string;
  recommendation: string;
  /** Games the comparison rests on: recent + before. */
  recentGames: number;
  beforeGames: number;
  /** One value per game, oldest first (for the small chart); the last `recentGames` are the recent ones. */
  series: number[];
}

const SET_PIECES = /^(canto|livre|pen[aá]lti|lan[cç]amento)/i;
const isSetPiece = (g: GoalEvent) => SET_PIECES.test(String(g.goalType || '').trim());
const halfOf = (g: GoalEvent) => g.half ?? (/^2/.test(String(g.period || '')) ? 2 : 1);

interface GameNumbers {
  scored: number;
  conceded: number;
  concededSetPiece: number;
  scoredSetPiece: number;
  concededSecondHalf: number;
  shots: number;
  shotGoals: number;
}

function numbersOf(m: Match): GameNumbers {
  const goals = m.goals || [];
  const { scored, conceded } = calculateMatchScore(m);
  const against = goals.filter((g) => g.type === 'conceded');
  const shots = (m.shotsInBoxFor || 0) + (m.shotsOutBoxFor || 0);
  return {
    scored,
    conceded,
    concededSetPiece: against.filter(isSetPiece).length,
    scoredSetPiece: goals.filter((g) => g.type === 'scored' && isSetPiece(g)).length,
    concededSecondHalf: against.filter((g) => halfOf(g) === 2).length,
    shots,
    shotGoals: shots > 0 ? scored : 0
  };
}

const sum = (list: GameNumbers[], key: keyof GameNumbers) => list.reduce((s, g) => s + g[key], 0);
const perGame = (total: number, games: number) => (games ? total / games : 0);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The finished games, oldest first, compared in two equal groups: the last `window` against the ones before. */
export function teamTrends(matches: Match[] | undefined, window = 5): TeamTrend[] {
  const games = (matches || [])
    .filter((m) => m && m.finished)
    .sort((a, b) => `${a.date || ''}`.localeCompare(`${b.date || ''}`) || (a.liveAt || 0) - (b.liveAt || 0));
  const size = Math.min(window, Math.floor(games.length / 2));
  if (size < 3) return [];
  const used = games.slice(-size * 2).map(numbersOf);
  const before = used.slice(0, size);
  const recent = used.slice(size);
  const base = { recentGames: size, beforeGames: size };
  const label = (a: string, b: string) => `Últimos ${size} jogos: ${a} · ${size} jogos antes: ${b}`;
  const out: TeamTrend[] = [];

  // Goals conceded from set pieces
  const spNow = sum(recent, 'concededSetPiece');
  const spBefore = sum(before, 'concededSetPiece');
  if (spNow >= spBefore + 2) {
    out.push({
      id: 'sofridos-bola-parada',
      level: spNow >= 5 && spNow >= spBefore * 2 + 2 ? 'critico' : 'atencao',
      title: 'Golos sofridos de bola parada',
      detail: label(String(spNow), String(spBefore)),
      recommendation: 'Dar prioridade à defesa de cantos e livres laterais nos próximos treinos.',
      ...base,
      series: used.map((g) => g.concededSetPiece)
    });
  } else if (spBefore >= spNow + 2) {
    out.push({
      id: 'sofridos-bola-parada',
      level: 'evolucao',
      title: 'Menos golos sofridos de bola parada',
      detail: label(String(spNow), String(spBefore)),
      recommendation: 'O trabalho nas bolas paradas defensivas está a resultar: manter.',
      ...base,
      series: used.map((g) => g.concededSetPiece)
    });
  }

  // Goals conceded per game
  const caNow = perGame(sum(recent, 'conceded'), size);
  const caBefore = perGame(sum(before, 'conceded'), size);
  if (caNow - caBefore >= 1) {
    out.push({
      id: 'sofridos-por-jogo',
      level: caNow >= caBefore * 2 && caNow - caBefore >= 1.5 ? 'critico' : 'atencao',
      title: 'Mais golos sofridos por jogo',
      detail: label(`${fmt(caNow)} por jogo`, `${fmt(caBefore)} por jogo`),
      recommendation: 'Rever a organização defensiva e a reação à perda da bola.',
      ...base,
      series: used.map((g) => g.conceded)
    });
  } else if (caBefore - caNow >= 1) {
    out.push({
      id: 'sofridos-por-jogo',
      level: 'evolucao',
      title: 'Menos golos sofridos por jogo',
      detail: label(`${fmt(caNow)} por jogo`, `${fmt(caBefore)} por jogo`),
      recommendation: 'A defesa está mais sólida: manter o que tem sido trabalhado.',
      ...base,
      series: used.map((g) => g.conceded)
    });
  }

  // Goals scored per game
  const gfNow = perGame(sum(recent, 'scored'), size);
  const gfBefore = perGame(sum(before, 'scored'), size);
  if (gfBefore - gfNow >= 1) {
    out.push({
      id: 'marcados-por-jogo',
      level: 'atencao',
      title: 'Menos golos marcados por jogo',
      detail: label(`${fmt(gfNow)} por jogo`, `${fmt(gfBefore)} por jogo`),
      recommendation: 'Mais situações de finalização e de 1x1 no último terço nos treinos.',
      ...base,
      series: used.map((g) => g.scored)
    });
  } else if (gfNow - gfBefore >= 1) {
    out.push({
      id: 'marcados-por-jogo',
      level: 'evolucao',
      title: 'Mais golos marcados por jogo',
      detail: label(`${fmt(gfNow)} por jogo`, `${fmt(gfBefore)} por jogo`),
      recommendation: 'O ataque está a render: manter os exercícios de finalização.',
      ...base,
      series: used.map((g) => g.scored)
    });
  }

  // Finishing (only games with shots recorded)
  const shotGames = (list: GameNumbers[]) => list.filter((g) => g.shots > 0);
  const rNow = shotGames(recent);
  const rBefore = shotGames(before);
  if (rNow.length >= 3 && rBefore.length >= 3) {
    const effNow = sum(rNow, 'shotGoals') / Math.max(1, sum(rNow, 'shots'));
    const effBefore = sum(rBefore, 'shotGoals') / Math.max(1, sum(rBefore, 'shots'));
    const shotsLabel = (list: GameNumbers[], eff: number) =>
      `${pct(eff)} (${sum(list, 'shotGoals')} golos em ${sum(list, 'shots')} remates)`;
    if (effNow - effBefore >= 0.08 || effBefore - effNow >= 0.08) {
      const up = effNow > effBefore;
      out.push({
        id: 'eficacia',
        level: up ? 'evolucao' : 'atencao',
        title: up ? 'Melhor eficácia de finalização' : 'Pior eficácia de finalização',
        detail: `Últimos ${rNow.length} jogos com remates: ${shotsLabel(rNow, effNow)} · antes: ${shotsLabel(rBefore, effBefore)}`,
        recommendation: up
          ? 'Os avançados estão a decidir melhor: manter a finalização com oposição.'
          : 'Treinar a finalização com pouco tempo e com oposição (decidir mais depressa).',
        recentGames: rNow.length,
        beforeGames: rBefore.length,
        series: used.map((g) => (g.shots ? Math.round((g.shotGoals / g.shots) * 100) : 0))
      });
    }
  }

  // Second half: most of the recent goals conceded come after the break
  const totalRecent = sum(recent, 'conceded');
  const second = sum(recent, 'concededSecondHalf');
  if (totalRecent >= 4 && second / totalRecent >= 0.7) {
    out.push({
      id: 'sofridos-2-parte',
      level: 'atencao',
      title: 'Golos sofridos sobretudo na 2.ª parte',
      detail: `Últimos ${size} jogos: ${second} de ${totalRecent} golos sofridos depois do intervalo`,
      recommendation: 'Gerir o esforço e as substituições; rever a concentração no fim dos jogos.',
      ...base,
      series: used.map((g) => g.concededSecondHalf)
    });
  }

  const order: Record<TrendLevel, number> = { critico: 0, atencao: 1, evolucao: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** The trend to work on this week (the most serious problem), if any. */
export function weeklyFocus(matches: Match[] | undefined): TeamTrend | null {
  return teamTrends(matches).find((t) => t.level !== 'evolucao') || null;
}
