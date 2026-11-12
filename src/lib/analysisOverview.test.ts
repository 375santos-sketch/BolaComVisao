import { describe, expect, it } from 'vitest';
import { analysisOverview } from './analysisOverview';
import { Match } from '../types';

const g = (type: 'scored' | 'conceded') => ({ id: Math.random().toString(), type });
const m = (id: string, date: string, ours: number, theirs: number, extra: Partial<Match> = {}) =>
  ({
    id,
    date,
    opponent: id,
    finished: true,
    goals: [
      ...Array(ours)
        .fill(0)
        .map(() => g('scored')),
      ...Array(theirs)
        .fill(0)
        .map(() => g('conceded'))
    ],
    ...extra
  }) as unknown as Match;

describe('Análise · Visão geral', () => {
  it('golos, resultados e pontos só dos jogos terminados, do mais antigo para o mais recente', () => {
    const o = analysisOverview([
      m('b', '2026-10-17', 2, 1),
      m('a', '2026-10-10', 0, 0),
      m('c', '2026-10-24', 1, 3),
      { ...m('d', '2026-10-31', 5, 0), finished: false } as Match
    ]);
    expect(o.games.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect([o.scored, o.conceded, o.wins, o.draws, o.losses, o.points]).toEqual([3, 4, 1, 1, 1, 4]);
  });

  it('eficácia só sobre os jogos com remates registados (sem remates: nenhuma)', () => {
    expect(analysisOverview([m('a', '2026-10-10', 2, 0)]).efficiency).toBeNull();
    const o = analysisOverview([
      m('a', '2026-10-10', 2, 0, { rematesDentroArea: 5, rematesForaArea: 3 } as Partial<Match>),
      m('b', '2026-10-17', 3, 0)
    ]);
    expect(o.efficiency).toEqual({ goals: 2, shots: 8 });
  });
});
