import { describe, it, expect } from 'vitest';
import {
  parseMinuteToNumber,
  formatMinute,
  classifyTimePeriod,
  computeAggregatedAnalysis,
  AnalysisFilters
} from '../lib/gameAnalysisUtils';

describe('gameAnalysisUtils', () => {
  describe('Minute parsing & formatting (incl. 45+2 and 90+3)', () => {
    it('correctly parses standard numbers and numeric strings', () => {
      expect(parseMinuteToNumber(15)).toBe(15);
      expect(parseMinuteToNumber('32')).toBe(32);
      expect(parseMinuteToNumber("45'")).toBe(45);
    });

    it('correctly parses extra time / stoppage time minutes like 45+2 and 90+3', () => {
      expect(parseMinuteToNumber('45+2')).toBe(47);
      expect(parseMinuteToNumber("45+2'")).toBe(47);
      expect(parseMinuteToNumber('90+3')).toBe(93);
      expect(parseMinuteToNumber("90+4'")).toBe(94);
      expect(parseMinuteToNumber('105+1')).toBe(106);
    });

    it('returns null for missing, unknown or invalid minutes', () => {
      expect(parseMinuteToNumber(null)).toBeNull();
      expect(parseMinuteToNumber(undefined)).toBeNull();
      expect(parseMinuteToNumber('')).toBeNull();
      expect(parseMinuteToNumber('unknown')).toBeNull();
      expect(parseMinuteToNumber('N/A')).toBeNull();
    });

    it('formats minutes properly for display', () => {
      expect(formatMinute(32)).toBe("32'");
      expect(formatMinute('45+2')).toBe("45+2'");
      expect(formatMinute(null)).toBe('—');
    });
  });

  describe('Period classification (0–5, 6–10, 11–15, 16–20, 21–25, 26–30, 31–35, 36–40, 41–45, 46–50, 51–55, 56–60, 60+)', () => {
    it('classifies minutes into standard 5-minute match periods for Sub-11 (two 30-min halves)', () => {
      expect(classifyTimePeriod(3)).toBe('0-5');
      expect(classifyTimePeriod(5)).toBe('0-5');
      expect(classifyTimePeriod(6)).toBe('6-10');
      expect(classifyTimePeriod(10)).toBe('6-10');
      expect(classifyTimePeriod(12)).toBe('11-15');
      expect(classifyTimePeriod(15)).toBe('11-15');
      expect(classifyTimePeriod(16)).toBe('16-20');
      expect(classifyTimePeriod(20)).toBe('16-20');
      expect(classifyTimePeriod(21)).toBe('21-25');
      expect(classifyTimePeriod(25)).toBe('21-25');
      expect(classifyTimePeriod(26)).toBe('26-30');
      expect(classifyTimePeriod(30)).toBe('26-30');
      expect(classifyTimePeriod('30+2')).toBe('26-30'); // 1st half stoppage
      expect(classifyTimePeriod(31)).toBe('31-35');
      expect(classifyTimePeriod(35)).toBe('31-35');
      expect(classifyTimePeriod(36)).toBe('36-40');
      expect(classifyTimePeriod(40)).toBe('36-40');
      expect(classifyTimePeriod(41)).toBe('41-45');
      expect(classifyTimePeriod(45)).toBe('41-45');
      expect(classifyTimePeriod(46)).toBe('46-50');
      expect(classifyTimePeriod(50)).toBe('46-50');
      expect(classifyTimePeriod(51)).toBe('51-55');
      expect(classifyTimePeriod(55)).toBe('51-55');
      expect(classifyTimePeriod(56)).toBe('56-60');
      expect(classifyTimePeriod(60)).toBe('56-60');
      expect(classifyTimePeriod('60+2')).toBe('60+'); // 2nd half stoppage
      expect(classifyTimePeriod(63)).toBe('60+');
      expect(classifyTimePeriod(null)).toBe('0-5'); // default fallback
    });

    it('correctly classifies relative minutes when half is specified', () => {
      expect(classifyTimePeriod(5, 1)).toBe('0-5');
      expect(classifyTimePeriod(10, 1)).toBe('6-10');
      expect(classifyTimePeriod(30, 1)).toBe('26-30');
      // In 2nd half, minute 5 relative = minute 35 overall -> 31-35
      expect(classifyTimePeriod(5, 2)).toBe('31-35');
      // In 2nd half, minute 30 relative = minute 60 overall -> 56-60
      expect(classifyTimePeriod(30, 2)).toBe('56-60');
    });
  });

  describe('Aggregated calculation with real match scenarios and missing data handling', () => {
    // Nota: usa propositadamente nomes de campo legados (player, playerOut, playerIn) para
    // testar o caminho de compatibilidade retroativa em gameAnalysisUtils
    const mockMatches: any[] = [
      {
        id: 'm1',
        season: '2026/27',
        date: '2026-09-12',
        opponent: 'ABC FC',
        type: 'campeonato',
        location: 'casa',
        finished: true,
        goals: [
          { minute: 12, player: 'p1', type: 'scored', goalType: 'Bola jogada' },
          { minute: '45+2', player: 'p2', type: 'scored', goalType: 'Canto' },
          { minute: 65, player: 'p1', type: 'scored', goalType: 'Livre' },
          { minute: 88, player: null, type: 'conceded', goalType: 'Bola jogada' }
        ],
        cards: [
          { minute: 30, player: 'p3', type: 'yellow' },
          { minute: 70, player: 'p4', type: 'red' }
        ],
        subs: [
          { minute: 60, playerOut: 'p1', playerIn: 'p5' }
        ],
        cornersFor: 7,
        cornersAgainst: 3,
        foulsCommitted: 10,
        foulsSuffered: 8
      },
      {
        id: 'm2',
        season: '2026/27',
        date: '2026-09-20',
        opponent: 'XYZ SC',
        type: 'campeonato',
        location: 'fora',
        finished: true,
        goals: [
          { minute: 20, player: null, type: 'conceded', goalType: 'Penálti' }
        ],
        cards: [
          { minute: 40, player: 'p5', type: 'yellow' }
        ],
        subs: [],
        cornersFor: 4,
        cornersAgainst: 6,
        foulsCommitted: 14,
        foulsSuffered: 12
      },
      {
        id: 'm3',
        season: '2025/26',
        date: '2025-10-05',
        opponent: 'ABC FC',
        type: 'torneio',
        location: 'casa',
        finished: true,
        goals: [
          { minute: 10, player: 'p2', type: 'scored', goalType: 'Bola jogada' }
        ],
        cards: [],
        subs: [],
        // Missing corners and fouls in this match to test graceful null distinction
        cornersFor: undefined,
        cornersAgainst: undefined,
        foulsCommitted: undefined,
        foulsSuffered: undefined
      }
    ];

    it('aggregates total statistics accurately for all matches', () => {
      const defaultFilters: AnalysisFilters = {
        matchId: 'todos',
        month: 'todos',
        season: 'todas',
        opponent: 'todos',
        matchType: 'todos',
        location: 'todos',
        eventType: 'todos'
      };

      const analysis = computeAggregatedAnalysis(mockMatches, defaultFilters);

      expect(analysis.totalMatches).toBe(3);
      expect(analysis.finishedMatchesCount).toBe(3);
      expect(analysis.wins).toBe(2);
      expect(analysis.draws).toBe(0);
      expect(analysis.losses).toBe(1);
      expect(analysis.goalsScored).toBe(4);
      expect(analysis.goalsConceded).toBe(2);
      expect(analysis.goalDifference).toBe(2);
      expect(analysis.yellowCardsTotal).toBe(2);
      expect(analysis.redCardsTotal).toBe(1);

      // Corners (only m1 and m2 had records: 7+4=11 for, 3+6=9 against)
      expect(analysis.cornersForTotal).toBe(11);
      expect(analysis.cornersAgainstTotal).toBe(9);
      expect(analysis.cornersForAvg).toBe('5.5');
      expect(analysis.cornersAgainstAvg).toBe('4.5');

      // Fouls (m1 and m2: 10+14=24 committed, 8+12=20 suffered across 2 valid matches)
      expect(analysis.foulsCommittedAvg).toBe('12.0');
      expect(analysis.foulsSufferedAvg).toBe('10.0');
    });

    it('filters accurately by Season and Opponent', () => {
      const filters: AnalysisFilters = {
        matchId: 'todos',
        month: 'todos',
        season: '2026/27',
        opponent: 'ABC FC',
        matchType: 'todos',
        location: 'todos',
        eventType: 'todos'
      };

      const analysis = computeAggregatedAnalysis(mockMatches, filters);

      expect(analysis.totalMatches).toBe(1);
      expect(analysis.goalsScored).toBe(3);
      expect(analysis.goalsConceded).toBe(1);
      expect(analysis.wins).toBe(1);
      expect(analysis.cleanSheets).toBe(0);
      expect(analysis.cornersForTotal).toBe(7);
      expect(analysis.cornersAgainstTotal).toBe(3);
    });

    it('calculates goal origin breakdown properly', () => {
      const defaultFilters: AnalysisFilters = {
        matchId: 'todos',
        month: 'todos',
        season: 'todas',
        opponent: 'todos',
        matchType: 'todos',
        location: 'todos',
        eventType: 'todos'
      };

      const analysis = computeAggregatedAnalysis(mockMatches, defaultFilters);

      const bolaJogada = analysis.goalTypes.find((g) => g.type === 'Bola jogada');
      expect(bolaJogada?.count).toBe(2);

      const canto = analysis.goalTypes.find((g) => g.type === 'Canto');
      expect(canto?.count).toBe(1);

      const livre = analysis.goalTypes.find((g) => g.type === 'Livre');
      expect(livre?.count).toBe(1);
    });
  });
});
