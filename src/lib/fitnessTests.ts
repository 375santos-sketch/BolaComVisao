import { Player } from '../types';

/**
 * 📏 Testes: the same five simple tests three times a season (September, January, May). Each athlete only ever sees
 * their own evolution: no rankings, no comparison with team-mates.
 */

export type TestId = 'sprint20' | 'slalom' | 'salto' | 'toques30' | 'passe30';
export type RoundId = 'set' | 'jan' | 'mai';

export interface FitnessTest {
  id: TestId;
  emoji: string;
  name: string;
  unit: 's' | 'cm' | '';
  /** Times: lower is better; distances and counts: higher is better. */
  lowerIsBetter: boolean;
  /** "cronometro": tap at the start and at the line; "contagem": 30 s countdown with a +1 button. */
  tool: 'cronometro' | 'contagem' | 'manual';
  how: string;
  min: number;
  max: number;
}

export const FITNESS_TESTS: FitnessTest[] = [
  {
    id: 'sprint20',
    emoji: '⚡',
    name: 'Sprint 20 m',
    unit: 's',
    lowerIsBetter: true,
    tool: 'cronometro',
    how: 'Partida parada. 2 tentativas, conta a melhor.',
    min: 2,
    max: 15
  },
  {
    id: 'slalom',
    emoji: '🔀',
    name: 'Slalom com bola',
    unit: 's',
    lowerIsBetter: true,
    tool: 'cronometro',
    how: '6 estacas a 2 m, ida e volta com bola. 2 tentativas, conta a melhor.',
    min: 3,
    max: 60
  },
  {
    id: 'salto',
    emoji: '🦘',
    name: 'Salto horizontal',
    unit: 'cm',
    lowerIsBetter: false,
    tool: 'manual',
    how: 'Pés juntos, salto em frente. Mede-se até ao calcanhar mais atrás. 2 tentativas.',
    min: 30,
    max: 350
  },
  {
    id: 'toques30',
    emoji: '⚽',
    name: 'Toques em 30 s',
    unit: '',
    lowerIsBetter: false,
    tool: 'contagem',
    how: 'Toques sem a bola cair (se cair, continua a contar a partir daí).',
    min: 0,
    max: 300
  },
  {
    id: 'passe30',
    emoji: '🧱',
    name: 'Passe à parede 30 s',
    unit: '',
    lowerIsBetter: false,
    tool: 'contagem',
    how: 'Atrás de uma linha a 3 m da parede, conta cada passe que volta.',
    min: 0,
    max: 120
  }
];

export const ROUNDS: { id: RoundId; label: string; short: string }[] = [
  { id: 'set', label: 'Setembro', short: 'set' },
  { id: 'jan', label: 'Janeiro', short: 'jan' },
  { id: 'mai', label: 'Maio', short: 'mai' }
];

export const roundKey = (season: string, round: RoundId) => `${season}-${round}`;

/** The round of a date: September–December, January–April, May–August. */
export function roundOf(date: Date): RoundId {
  const m = date.getMonth() + 1;
  return m >= 9 ? 'set' : m >= 5 ? 'mai' : 'jan';
}

/** "3,94 s", "151 cm", "34". */
export function formatResult(test: FitnessTest, value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const n = test.unit === 's' ? value.toFixed(2).replace('.', ',') : String(Math.round(value));
  return test.unit ? `${n} ${test.unit}` : n;
}

/** What the coach typed ("3,94", "3.9", "151") as a valid result, or null. */
export function parseResult(test: FitnessTest, text: string): number | null {
  const v = Number(String(text).trim().replace(',', '.'));
  if (!String(text).trim() || !Number.isFinite(v) || v < test.min || v > test.max) return null;
  return test.unit === 's' ? Math.round(v * 100) / 100 : Math.round(v);
}

/** The athlete with one result set (or removed with null). */
export function withResult(player: Player, key: string, test: TestId, value: number | null): Player {
  const tests = { ...(player.fitnessTests || {}) };
  const round = { ...(tests[key] || {}) };
  if (value === null) delete round[test];
  else round[test] = value;
  if (Object.keys(round).length) tests[key] = round;
  else delete tests[key];
  return { ...player, fitnessTests: tests };
}

interface TestEvolution {
  test: FitnessTest;
  values: (number | undefined)[]; // per round of the season
  first?: number;
  last?: number;
  /** Better, worse or the same between the first and the latest result (null with fewer than two). */
  trend: 'melhor' | 'pior' | 'igual' | null;
  /** A big step up (5% or more better): 🚀. */
  big: boolean;
}

/** The athlete's own evolution in each test during the season. */
export function playerEvolution(player: Player, season: string): TestEvolution[] {
  return FITNESS_TESTS.map((test) => {
    const values = ROUNDS.map((r) => player.fitnessTests?.[roundKey(season, r.id)]?.[test.id]);
    const done = values.filter((v): v is number => typeof v === 'number');
    const first = done[0];
    const last = done[done.length - 1];
    let trend: TestEvolution['trend'] = null;
    let big = false;
    if (done.length >= 2) {
      const gain = test.lowerIsBetter ? first - last : last - first;
      trend = gain > 0 ? 'melhor' : gain < 0 ? 'pior' : 'igual';
      big = gain > 0 && gain / Math.max(first, 0.001) >= 0.05;
    }
    return { test, values, first, last, trend, big };
  });
}

/** Message for the family: the athlete's own evolution only. */
export function evolutionMessage(player: Player, season: string, club: string): string {
  const rows = playerEvolution(player, season).filter((e) => e.last !== undefined);
  const better = rows.filter((e) => e.trend === 'melhor').length;
  const compared = rows.filter((e) => e.trend !== null).length;
  const lines = rows.map((e) => {
    const from = e.first !== undefined && e.trend !== null ? `${formatResult(e.test, e.first)} → ` : '';
    const mark = e.trend === 'melhor' ? (e.big ? ' 🚀' : ' ▲') : '';
    return `${e.test.emoji} ${e.test.name}: ${from}${formatResult(e.test, e.last)}${mark}`;
  });
  return [
    `📏 Testes de ${player.nickname?.trim() || player.name.split(/\s+/)[0]} · ${club} · ${season}`,
    '',
    ...lines,
    ...(compared ? ['', `Melhorou em ${better} de ${compared} ${compared === 1 ? 'teste' : 'testes'} 💪`] : [])
  ].join('\n');
}
