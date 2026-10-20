import { describe, it, expect } from 'vitest';
import {
  computeAge,
  getPositionRank,
  sortPlayerObjs,
  playerLabel,
  calcPlayerMinutes,
  normalizeSeasonString,
  isSeasonMatching
} from '../lib/utils';
import { Player, Match } from '../types';

describe('utils library', () => {
  describe('computeAge', () => {
    it('computes age correctly from ISO date string', () => {
      const birthDate = '2005-05-15';
      const age = computeAge(birthDate);
      expect(typeof age).toBe('number');
      expect(age).toBeGreaterThanOrEqual(18);
    });

    it('returns null for empty or invalid dates', () => {
      expect(computeAge('')).toBeNull();
      expect(computeAge(undefined)).toBeNull();
      expect(computeAge('invalid-date')).toBeNull();
    });
  });

  describe('getPositionRank', () => {
    it('ranks Goalkeepers as rank 1', () => {
      expect(getPositionRank('Guarda-Redes (GR)')).toBe(1);
      expect(getPositionRank('GR')).toBe(1);
    });

    it('ranks Defenders before Midfielders and Attackers', () => {
      const gk = getPositionRank('Guarda-Redes');
      const def = getPositionRank('Defesa Central (DC)');
      const med = getPositionRank('Médio Centro (MC)');
      const att = getPositionRank('Avançado Centro (PL/AC)');

      expect(gk).toBeLessThan(def);
      expect(def).toBeLessThan(med);
      expect(med).toBeLessThan(att);
    });
  });

  describe('sortPlayerObjs', () => {
    it('sorts players by position rank then jersey number', () => {
      const players: Player[] = [
        { id: '1', name: 'Atacante', positions: 'Avançado', birthDate: '2004-01-01', number: 9, active: true },
        { id: '2', name: 'Guarda Redes', positions: 'Guarda-Redes', birthDate: '2003-01-01', number: 1, active: true },
        { id: '3', name: 'Defesa', positions: 'Defesa Central', birthDate: '2004-05-01', number: 4, active: true }
      ];

      const sorted = sortPlayerObjs(players);
      expect(sorted[0].name).toBe('Guarda Redes');
      expect(sorted[1].name).toBe('Defesa');
      expect(sorted[2].name).toBe('Atacante');
    });
  });

  describe('playerLabel', () => {
    it('formats player label with number and name', () => {
      const player: Player = {
        id: '1',
        name: 'Ronaldo',
        positions: 'Avançado',
        birthDate: '1985-02-05',
        number: 7,
        active: true
      };
      expect(playerLabel(player)).toBe('7 - Ronaldo');
    });

    it('handles player without number', () => {
      const player: Player = {
        id: '1',
        name: 'Sem Numero',
        positions: 'Médio',
        birthDate: '2000-01-01',
        number: null,
        active: true
      };
      expect(playerLabel(player)).toBe('Sem Numero');
    });
  });

  describe('calcPlayerMinutes', () => {
    it('calculates full match duration for starter with standard timeline', () => {
      const match: Match = {
        id: 'm1',
        season: '2025/2026',
        type: 'campeonato',
        location: 'casa',
        date: '2026-05-01',
        opponent: 'Sporting',
        finished: true,
        lineup: ['p1'],
        subs: [],
        goals: [],
        cards: [],
        ratings: {},
        capitao: 'p1',
        timer: { isRunning: false, elapsedMs: 5400000, lastStartTs: null },
        timeline: {
          kickoff: '15:00',
          halftime: '15:45',
          secondHalfStart: '16:00',
          fullTime: '16:45'
        }
      };

      const minutes = calcPlayerMinutes(match, 'p1');
      expect(minutes).toBe(90);
    });

    it('calculates minutes when substituted in half 2', () => {
      const match: Match = {
        id: 'm1',
        season: '2025/2026',
        type: 'campeonato',
        location: 'casa',
        date: '2026-05-01',
        opponent: 'Sporting',
        finished: true,
        lineup: ['p1'],
        subs: [{ id: 'sub1', inId: 'p2', outId: 'p1', minute: 15, half: 2, isHalftime: false }],
        goals: [],
        cards: [],
        ratings: {},
        capitao: 'p1',
        timer: { isRunning: false, elapsedMs: 5400000, lastStartTs: null },
        timeline: {
          kickoff: '15:00',
          halftime: '15:45',
          secondHalfStart: '16:00',
          fullTime: '16:45'
        }
      };

      // p1 plays 45 mins in half 1 + 15 mins in half 2 = 60 mins
      expect(calcPlayerMinutes(match, 'p1')).toBe(60);
      // p2 plays from minute 15 to 45 in half 2 = 30 mins
      expect(calcPlayerMinutes(match, 'p2')).toBe(30);
    });
  });

  describe('season normalization and matching', () => {
    it('normalizes seasons properly', () => {
      expect(normalizeSeasonString('2026/27')).toBe('2026/2027');
      expect(normalizeSeasonString('2025/26')).toBe('2025/2026');
      expect(normalizeSeasonString('2025/2026')).toBe('2025/2026');
      expect(normalizeSeasonString('')).toBe('');
    });

    it('matches seasons flexibly', () => {
      expect(isSeasonMatching('2026/27', '2026/2027')).toBe(true);
      expect(isSeasonMatching('2026/2027', '2026/27')).toBe(true);
      expect(isSeasonMatching('2025/2026', 'todas')).toBe(true);
      expect(isSeasonMatching('2025/2026', null)).toBe(true);
      expect(isSeasonMatching(undefined, 'Sem época')).toBe(true);
      expect(isSeasonMatching('2025/2026', '2024/2025')).toBe(false);
    });
  });
});
