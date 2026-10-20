import { describe, it, expect } from 'vitest';
import {
  getMatchPhase,
  derivePeriodAndHalfFromPhase,
  getPlayersAtEndOfFirstHalf,
  getCurrentPlayersOnPitch,
  getSuggestedMinute
} from '../lib/matchPhaseUtils';
import { calcPlayerMinutes } from '../lib/utils';
import { Match } from '../types';

describe('Match Phase and Lineup Logic', () => {
  const baseMatch: Match = {
    id: 'm1',
    opponent: 'Rival FC',
    date: '2026-10-12',
    type: 'campeonato',
    season: '2026/2027',
    location: 'casa',
    finished: false,
    goals: [],
    cards: [],
    subs: [],
    lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    capitao: 'p1'
  };

  describe('1. Derivação da Fase do Jogo (getMatchPhase)', () => {
    it('deve retornar "nao_iniciado" por omissão se a fase não estiver definida e o jogo não estiver terminado', () => {
      expect(getMatchPhase(baseMatch)).toBe('nao_iniciado');
    });

    it('deve respeitar a fase definida no match (parte1, intervalo, parte2)', () => {
      expect(getMatchPhase({ ...baseMatch, phase: 'parte1' })).toBe('parte1');
      expect(getMatchPhase({ ...baseMatch, phase: 'intervalo' })).toBe('intervalo');
      expect(getMatchPhase({ ...baseMatch, phase: 'parte2' })).toBe('parte2');
    });

    it('em jogos antigos sem campo phase, trata como "parte2" se o jogo estiver terminado', () => {
      const oldFinishedMatch: Match = {
        ...baseMatch,
        phase: undefined,
        finished: true
      };
      expect(getMatchPhase(oldFinishedMatch)).toBe('parte2');
    });
  });

  describe('2. Derivação do Período e Half a partir de match.phase', () => {
    it('parte1 deriva para "1.ª parte" e half 1', () => {
      const res = derivePeriodAndHalfFromPhase('parte1');
      expect(res.period).toBe('1.ª parte');
      expect(res.half).toBe(1);
    });

    it('intervalo deriva para "Intervalo", half 1 e isHalftime = true', () => {
      const res = derivePeriodAndHalfFromPhase('intervalo');
      expect(res.period).toBe('Intervalo');
      expect(res.half).toBe(1);
      expect(res.isHalftime).toBe(true);
    });

    it('parte2 deriva para "2.ª parte" e half 2', () => {
      const res = derivePeriodAndHalfFromPhase('parte2');
      expect(res.period).toBe('2.ª parte');
      expect(res.half).toBe(2);
    });
  });

  describe('3. Validação Obrigatória do Minuto', () => {
    it('rejeita minutos vazios ou em branco', () => {
      const isValidMinute = (min: string) => min.trim().length > 0;
      expect(isValidMinute('')).toBe(false);
      expect(isValidMinute('   ')).toBe(false);
    });

    it('aceita número inteiro ou momento de intervalo', () => {
      const isValidMinute = (min: string) => {
        const clean = min.trim();
        if (clean.toUpperCase() === 'INT') return true;
        const num = parseInt(clean, 10);
        return !isNaN(num) && num >= 0;
      };

      expect(isValidMinute('0')).toBe(true);
      expect(isValidMinute('15')).toBe(true);
      expect(isValidMinute('45+2')).toBe(true);
      expect(isValidMinute('INT')).toBe(true);
      expect(isValidMinute('-5')).toBe(false);
      expect(isValidMinute('abc')).toBe(false);
    });
  });

  describe('4. Gestão dos 7 Titulares e Jogadores em Campo', () => {
    it('na 1.ª parte os jogadores em campo são os 7 titulares mais as substituições da 1.ª parte', () => {
      const matchWithSub: Match = {
        ...baseMatch,
        phase: 'parte1',
        subs: [
          {
            id: 's1',
            outId: 'p1',
            inId: 'p8',
            minute: "15'",
            period: '1.ª parte',
            half: 1
          }
        ]
      };

      const onPitch = getCurrentPlayersOnPitch(matchWithSub);
      expect(onPitch).toHaveLength(7);
      expect(onPitch).not.toContain('p1');
      expect(onPitch).toContain('p8');
    });

    it('ao intervalo calcula exatamente quem estava em campo no fim da 1.ª parte', () => {
      const matchAtHalftime: Match = {
        ...baseMatch,
        phase: 'intervalo',
        subs: [
          {
            id: 's1',
            outId: 'p2',
            inId: 'p9',
            minute: "25'",
            period: '1.ª parte',
            half: 1
          }
        ]
      };

      const atEndOfFirst = getPlayersAtEndOfFirstHalf(matchAtHalftime);
      expect(atEndOfFirst).toHaveLength(7);
      expect(atEndOfFirst).not.toContain('p2');
      expect(atEndOfFirst).toContain('p9');
    });

    it('na 2.ª parte utiliza os 7 titulares da 2.ª parte (lineupSecondHalf)', () => {
      const secondHalfLineup = ['p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
      const matchInSecondHalf: Match = {
        ...baseMatch,
        phase: 'parte2',
        lineupSecondHalf: secondHalfLineup,
        subs: []
      };

      const onPitch = getCurrentPlayersOnPitch(matchInSecondHalf);
      expect(onPitch).toHaveLength(7);
      expect(onPitch).toEqual(secondHalfLineup);
    });
  });

  describe('5. Testes Específicos de Minutos e Minuto Sugerido', () => {
    // 1) Jogador que só inicia a 2.ª parte
    it('jogador que só inicia a 2.ª parte joga a duração da 2.ª parte e não fica com 0 minutos', () => {
      const secondHalfLineup = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']; // p8 só entra na 2ª parte
      const match: Match = {
        ...baseMatch,
        finished: true,
        halfDurationMinutes: 25,
        lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        lineupSecondHalf: secondHalfLineup,
        subs: []
      };

      const minsP8 = calcPlayerMinutes(match, 'p8');
      expect(minsP8).toBe(25);
    });

    // 2) Titular da 1.ª parte substituído ao intervalo
    it('titular da 1.ª parte substituído ao intervalo joga apenas a 1.ª parte', () => {
      const secondHalfLineup = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']; // p1 sai ao intervalo
      const match: Match = {
        ...baseMatch,
        finished: true,
        halfDurationMinutes: 25,
        lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        lineupSecondHalf: secondHalfLineup,
        subs: [
          {
            id: 's_half',
            outId: 'p1',
            inId: 'p8',
            minute: 'INT',
            half: 1,
            isHalftime: true
          }
        ]
      };

      const minsP1 = calcPlayerMinutes(match, 'p1');
      expect(minsP1).toBe(25);
      const minsP8 = calcPlayerMinutes(match, 'p8');
      expect(minsP8).toBe(25);
    });

    // 3) Jogo antigo sem lineupSecondHalf (resultado igual ao atual)
    it('jogo antigo sem lineupSecondHalf mantém o mesmo cálculo que anteriormente', () => {
      const matchOld: Match = {
        ...baseMatch,
        finished: true,
        halfDurationMinutes: 25,
        lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        lineupSecondHalf: undefined,
        subs: []
      };

      // p1 joga 25 + 25 = 50 minutos
      const minsP1 = calcPlayerMinutes(matchOld, 'p1');
      expect(minsP1).toBe(50);
      // p8 não jogou
      const minsP8 = calcPlayerMinutes(matchOld, 'p8');
      expect(minsP8).toBe(0);
    });

    // 4) Substituição na 2.ª parte com minuteInHalf
    it('substituição na 2.ª parte com minuteInHalf calcula minutos corretamente', () => {
      const secondHalfLineup = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
      const match: Match = {
        ...baseMatch,
        finished: true,
        halfDurationMinutes: 30,
        lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        lineupSecondHalf: secondHalfLineup,
        subs: [
          {
            id: 'sub_2nd',
            outId: 'p1',
            inId: 'p8',
            half: 2,
            minute: "40'",
            minuteBase: 'game',
            minuteInHalf: 10
          }
        ]
      };

      // p1 jogou 30 min na 1ª parte + 10 min na 2ª parte = 40 min
      expect(calcPlayerMinutes(match, 'p1')).toBe(40);
      // p8 jogou 30 - 10 = 20 min na 2ª parte
      expect(calcPlayerMinutes(match, 'p8')).toBe(20);
    });

    // 5) getSuggestedMinute na 1.ª parte, na 2.ª parte e nos acréscimos
    it('getSuggestedMinute calcula corretamente na 1.ª parte, 2.ª parte e acréscimos', () => {
      // 5.1 não iniciado e intervalo devolvem null
      expect(getSuggestedMinute({ ...baseMatch, phase: 'nao_iniciado' })).toBeNull();
      expect(getSuggestedMinute({ ...baseMatch, phase: 'intervalo' })).toBeNull();

      // 5.2 1.ª parte tempo regular (ex.: aos 14 minutos e 30s -> 15')
      const matchPart1Regular: Match = {
        ...baseMatch,
        phase: 'parte1',
        halfDurationMinutes: 25,
        timer: { isRunning: true, elapsedMs: 14 * 60000 + 30000, lastStartTs: null }
      };
      expect(getSuggestedMinute(matchPart1Regular)).toBe('15');

      // 5.3 1.ª parte acréscimos (ex.: 26 min e 30s com D=25 -> '25+2')
      const matchPart1Extra: Match = {
        ...baseMatch,
        phase: 'parte1',
        halfDurationMinutes: 25,
        timer: { isRunning: true, elapsedMs: 26 * 60000 + 30000, lastStartTs: null }
      };
      expect(getSuggestedMinute(matchPart1Extra)).toBe('25+2');

      // 5.4 2.ª parte tempo regular (ex.: half1 durou 25m, elapsedMs = 39m30s -> 15m na 2ª parte -> min jogo = 40)
      const matchPart2Regular: Match = {
        ...baseMatch,
        phase: 'parte2',
        halfDurationMinutes: 25,
        timer: {
          isRunning: true,
          elapsedMs: 39 * 60000 + 30000,
          half1DurationMs: 25 * 60000,
          lastStartTs: null
        }
      };
      expect(getSuggestedMinute(matchPart2Regular)).toBe('40');

      // 5.5 2.ª parte acréscimos (ex.: half1 durou 25m, elapsedMs = 51m30s -> m2 = 27 com D=25 -> '50+2')
      const matchPart2Extra: Match = {
        ...baseMatch,
        phase: 'parte2',
        halfDurationMinutes: 25,
        timer: {
          isRunning: true,
          elapsedMs: 51 * 60000 + 30000,
          half1DurationMs: 25 * 60000,
          lastStartTs: null
        }
      };
      expect(getSuggestedMinute(matchPart2Extra)).toBe('50+2');
    });
  });
});
