import { describe, it, expect } from 'vitest';
import { getMatchCompetitionDetails } from '../lib/utils';
import { Match, ScheduledMatch, AppState } from '../types';

describe('Match Competition Details from Agenda (Schedule)', () => {
  const baseMatch: Match = {
    id: 'm123',
    opponent: 'Sporting CP',
    date: '2026-10-15',
    type: 'campeonato',
    phase: '',
    season: '2025/2026',
    location: 'casa',
    finished: false,
    goals: [],
    subs: [],
    lineup: [],
    capitao: null
  };

  it('retrieves tipo: campeonato and fase/jornada: Jornada 4 directly from state.schedule by match id', () => {
    const scheduledMatch: ScheduledMatch = {
      id: 'm123',
      opponent: 'Sporting CP',
      date: '2026-10-15',
      time: '15:00',
      type: 'campeonato',
      phase: 'Jornada 4',
      location: 'casa',
      callup: []
    };

    const state: Partial<AppState> = {
      schedule: [scheduledMatch],
      teams: []
    };

    const details = getMatchCompetitionDetails(baseMatch, state as AppState);
    expect(details.type).toBe('campeonato');
    expect(details.typeLabel).toBe('Campeonato');
    expect(details.phase).toBe('Jornada 4');
    expect(details.faseJornadaText).toBe('Jornada 4');
    expect(details.source).toBe('agenda');
  });

  it('retrieves tipo: amigável and fase/jornada: Jogo de Preparação from state.schedule by date & opponent', () => {
    const scheduledMatch: ScheduledMatch = {
      id: 'sched-999',
      opponent: 'Sporting CP',
      date: '2026-10-15',
      time: '10:30',
      type: 'amigavel',
      phase: 'Jogo de Preparação',
      location: 'casa',
      callup: []
    };

    const state: Partial<AppState> = {
      schedule: [scheduledMatch]
    };

    const matchWithoutId: Match = {
      ...baseMatch,
      id: 'different-id-456'
    };

    const details = getMatchCompetitionDetails(matchWithoutId, state as AppState);
    expect(details.type).toBe('amigavel');
    expect(details.typeLabel).toBe('Jogo Amigável');
    expect(details.phase).toBe('Jogo de Preparação');
    expect(details.faseJornadaText).toBe('Jogo de Preparação');
    expect(details.source).toBe('agenda');
  });

  it('provides default Jogo Único for amigável when no phase is specified in agenda', () => {
    const scheduledMatch: ScheduledMatch = {
      id: 'sched-friendly',
      opponent: 'Sporting CP',
      date: '2026-10-15',
      time: '10:30',
      type: 'amigavel',
      phase: '',
      location: 'fora',
      callup: []
    };

    const state: Partial<AppState> = {
      schedule: [scheduledMatch]
    };

    const details = getMatchCompetitionDetails(baseMatch, state as AppState);
    expect(details.type).toBe('amigavel');
    expect(details.typeLabel).toBe('Jogo Amigável');
    expect(details.faseJornadaText).toBe('Jogo Único');
  });

  it('retrieves tournament name and phase for tournament match', () => {
    const scheduledMatch: ScheduledMatch = {
      id: 'sched-torneio',
      opponent: 'Sporting CP',
      date: '2026-10-15',
      time: '14:00',
      type: 'torneio',
      tournamentName: 'Torneio de Páscoa',
      phase: 'Quartos de Final',
      location: 'casa',
      callup: []
    };

    const state: Partial<AppState> = {
      schedule: [scheduledMatch]
    };

    const details = getMatchCompetitionDetails(baseMatch, state as AppState);
    expect(details.type).toBe('torneio');
    expect(details.typeLabel).toBe('Torneio (Torneio de Páscoa)');
    expect(details.phase).toBe('Quartos de Final');
    expect(details.faseJornadaText).toBe('Quartos de Final');
  });

  it('falls back to match.originalSchedule when match was removed from schedule list upon kickoff', () => {
    const matchWithOriginalSchedule: Match = {
      ...baseMatch,
      originalSchedule: {
        id: 'old-sched-id',
        opponent: 'Sporting CP',
        date: '2026-10-15',
        time: '16:00',
        type: 'campeonato',
        phase: 'Fase de Apuramento - Jornada 2',
        location: 'casa',
        callup: []
      }
    };

    const stateWithEmptySchedule: Partial<AppState> = {
      schedule: []
    };

    const details = getMatchCompetitionDetails(matchWithOriginalSchedule, stateWithEmptySchedule as AppState);
    expect(details.type).toBe('campeonato');
    expect(details.typeLabel).toBe('Campeonato');
    expect(details.phase).toBe('Fase de Apuramento - Jornada 2');
    expect(details.faseJornadaText).toBe('Fase de Apuramento - Jornada 2');
  });

  it('verifies Excel export includes Tipo and Fase/Jornada rows', async () => {
    const { exportMatchSheetExcel } = await import('../lib/exportUtils');

    const scheduledMatch: ScheduledMatch = {
      id: 'm123',
      opponent: 'Sporting CP',
      date: '2026-10-15',
      time: '15:00',
      type: 'campeonato',
      phase: 'Jornada 7',
      location: 'casa',
      callup: []
    };

    const state: AppState = {
      myClubName: 'Benfica',
      category: 'Sub-15',
      season: '2025/2026',
      roster: [],
      schedule: [scheduledMatch],
      matches: [],
      trainings: [],
      lang: 'pt'
    } as unknown as AppState;

    // Export function should execute successfully
    await expect(exportMatchSheetExcel(baseMatch, state)).resolves.not.toThrow();
  });

  describe('Excel Modo Jogo Uppercase, No Symbols, Pure Number Minutes', () => {
    it('sanitizes strings to uppercase and removes emojis, symbols and apostrophes', async () => {
      const { sanitizeExcelModeGameText } = await import('../lib/exportUtils');

      expect(sanitizeExcelModeGameText('Golo Marcado ⚽')).toBe('GOLO MARCADO');
      expect(sanitizeExcelModeGameText('Golo Sofrido 🥅')).toBe('GOLO SOFRIDO');
      expect(sanitizeExcelModeGameText('Remates a Favor (Dentro da Área) 🎯')).toBe('REMATES A FAVOR (DENTRO DA ÁREA)');
      expect(sanitizeExcelModeGameText('Remates Contra (Fora da Área) 🛡️')).toBe('REMATES CONTRA (FORA DA ÁREA)');
      expect(sanitizeExcelModeGameText('Cantos 🚩')).toBe('CANTOS');
      expect(sanitizeExcelModeGameText('Faltas ⚠️')).toBe('FALTAS');
      expect(sanitizeExcelModeGameText('Substituição 🔄')).toBe('SUBSTITUIÇÃO');
      expect(sanitizeExcelModeGameText('Sincronizado com a Agenda ✓')).toBe('SINCRONIZADO COM A AGENDA');

      // Minutes must be pure numbers without '
      expect(sanitizeExcelModeGameText("45'")).toBe(45);
      expect(sanitizeExcelModeGameText("14'")).toBe(14);
      expect(sanitizeExcelModeGameText(14)).toBe(14);
      expect(sanitizeExcelModeGameText("90+2'")).toBe('90+2');
      expect(sanitizeExcelModeGameText('Intervalo')).toBe('INTERVALO');
    });

    it('guarantees that all cells in generated Excel are uppercase and without emojis or apostrophes in minutes', async () => {
      const { buildMatchSheetExcelWorkbook } = await import('../lib/exportUtils');
      const XLSX = await import('xlsx');

      const matchWithDetails: Match = {
        ...baseMatch,
        goals: [
          {
            id: 'g1',
            type: 'scored',
            minute: 14,
            scorerId: 'p1',
            assistId: null,
            scorer: 'Ronaldo',
            goalType: 'Bola jogada'
          },
          { id: 'g2', type: 'conceded', minute: "38'", scorerId: null, assistId: null, goalType: 'Canto' }
        ],
        cards: [{ id: 'c1', color: 'Amarelo', half: 1, minute: 22, playerId: 'p1' }],
        subs: [
          { id: 's1', inId: 'p2', outId: 'p1', minute: 45, isHalftime: true },
          { id: 's2', inId: 'p3', outId: 'p2', minute: "60'" }
        ]
      };

      const scheduledMatch: ScheduledMatch = {
        id: 'm123',
        opponent: 'Sporting CP',
        date: '2026-10-15',
        time: '15:00',
        type: 'campeonato',
        phase: 'Jornada 7',
        location: 'casa',
        callup: []
      };

      const state: AppState = {
        myClubName: 'Benfica',
        category: 'Sub-15',
        season: '2025/2026',
        roster: [{ id: 'p1', name: 'João Silva', number: 7, active: true, positions: 'Avançado' }],
        schedule: [scheduledMatch],
        matches: [],
        trainings: [],
        lang: 'pt'
      } as unknown as AppState;

      const { wb: exportedWorkbook } = buildMatchSheetExcelWorkbook(matchWithDetails, state, XLSX);

      expect(exportedWorkbook).not.toBeNull();
      expect(exportedWorkbook.SheetNames).toContain('FICHA DE JOGO');
      expect(exportedWorkbook.SheetNames).toContain('ORIGEM DOS GOLOS');

      const emojiRegex = /\p{Extended_Pictographic}/u;

      exportedWorkbook.SheetNames.forEach((sheetName: string) => {
        // Sheet name itself must be UPPERCASE
        expect(sheetName).toBe(sheetName.toUpperCase());

        const ws = exportedWorkbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        data.forEach((row) => {
          row.forEach((cell) => {
            if (typeof cell === 'string') {
              // 1. Must be uppercase (excluding numbers or pure punctuation)
              expect(cell).toBe(cell.toUpperCase());
              // 2. Must not contain emojis (alvos, balizas, etc.)
              expect(emojiRegex.test(cell)).toBe(false);
              // 3. Must not contain apostrophes '
              expect(cell.includes("'")).toBe(false);
              expect(cell.includes('’')).toBe(false);
            }
          });
        });
      });
    });
  });
});
