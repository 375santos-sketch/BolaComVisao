import { describe, it, expect } from 'vitest';
import { computeGameAnalysis } from '../lib/gameAnalysis/aggregationService';
import type { AnalysisFilters } from '../lib/gameAnalysis/types';
import { getMatchSetPieces } from '../lib/matchSetPieces';
import { Match } from '../types';

const filters: AnalysisFilters = {
  matchId: 'todos',
  month: 'todos',
  season: 'todas',
  opponent: 'todos',
  matchType: 'todos',
  location: 'todos',
  eventType: 'todos'
};
const match = (id: string, extra: Partial<Match>): Match =>
  ({
    id,
    date: '2026-10-10',
    season: '2026/2027',
    opponent: `Adversário ${id}`,
    type: 'campeonato',
    location: 'casa',
    lineup: [],
    subs: [],
    capitao: null,
    finished: true,
    goals: [],
    ...extra
  }) as Match;

describe('Análise: cantos e faltas', () => {
  it('counts corners and fouls recorded live or from a Ficha de Jogo (they showed 0)', () => {
    const a = computeGameAnalysis(
      [
        match('ficha', { cantos: 6, cantosAdv: 0, faltas: 0, faltasAdv: 1 }),
        match('lista', { cornersFor: 3, cornersAgainst: 3, foulsCommitted: 2, foulsSuffered: 1 })
      ],
      filters,
      'Sub-11'
    );
    expect(a.cornersForTotal).toBe(9);
    expect(a.cornersAgainstTotal).toBe(3);
    expect(a.cornersForMatchesCount).toBe(2);
    expect(a.foulsCommittedTotal).toBe(2);
    expect(a.foulsSufferedTotal).toBe(2);
  });

  it('a match with no corners recorded is not counted as 0 corners', () => {
    const a = computeGameAnalysis([match('a', { cantos: 4 }), match('b', {})], filters, 'Sub-11');
    expect(a.cornersForTotal).toBe(4);
    expect(a.cornersForMatchesCount).toBe(1);
  });

  it('the live count wins when both names exist (the quick bench mode only updates "cantos")', () => {
    expect(getMatchSetPieces(match('x', { cantos: 5, cornersFor: 2 })).cornersFor).toBe(5);
  });
});
