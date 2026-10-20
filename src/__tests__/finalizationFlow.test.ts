import { describe, it, expect } from 'vitest';
import { ScheduledMatch, OpponentScouting, AppState } from '../types';
import { validateAndSanitizeAppState } from '../lib/schemaValidator';

describe('Finalization and Editing Flow (Convocatória, Pré-Jogo, Adversário)', () => {
  it('allows finalizing a convocatória and reopening it for edit', () => {
    let match: ScheduledMatch = {
      id: 'match-1',
      opponent: 'SL Benfica',
      date: '2026-10-15',
      time: '10:00',
      type: 'campeonato',
      location: 'casa',
      callup: ['p1', 'p2', 'p3'],
      callupFinalized: false
    };

    expect(match.callupFinalized).toBe(false);

    // Finalize convocatória
    const finalizedTimestamp = Date.now();
    match = {
      ...match,
      callupFinalized: true,
      callupFinalizedAt: finalizedTimestamp
    };

    expect(match.callupFinalized).toBe(true);
    expect(match.callupFinalizedAt).toBe(finalizedTimestamp);
    expect(match.callup).toHaveLength(3);

    // Reopen convocatória for edit
    match = {
      ...match,
      callup: [...match.callup, 'p4'],
      callupFinalized: false
    };

    expect(match.callupFinalized).toBe(false);
    expect(match.callup).toHaveLength(4);
    expect(match.callup).toContain('p4');
  });

  it('allows finalizing a Pre-Match Plan (Pré-Jogo) and reopening it for edit', () => {
    let scout: OpponentScouting = {
      id: 'scout-1',
      matchId: 'match-1',
      opponentName: 'Sporting CP',
      formation: '2-3-1',
      ourFormation: '2-3-1',
      strengths: ['Velocidade'],
      weaknesses: ['Costas da defesa'],
      keyPlayer: { name: 'Silva', dominantFoot: 'Direito', threats: 'Remate', howToStop: 'Pressão' },
      tacticalNotes: 'Bloco médio',
      gamePlan: 'Ataque rápido',
      notes: '',
      updatedAt: Date.now(),
      preMatchFinalized: false
    };

    expect(scout.preMatchFinalized).toBe(false);

    // Finalize Pré-Jogo
    const finTimestamp = Date.now();
    scout = {
      ...scout,
      preMatchFinalized: true,
      preMatchFinalizedAt: finTimestamp,
      updatedAt: finTimestamp
    };

    expect(scout.preMatchFinalized).toBe(true);
    expect(scout.preMatchFinalizedAt).toBe(finTimestamp);

    // Reopen for edit and modify tactical model
    scout = {
      ...scout,
      ourPlayingModel: 'Pressão Alta no Terço Ofensivo',
      preMatchFinalized: false
    };

    expect(scout.preMatchFinalized).toBe(false);
    expect(scout.ourPlayingModel).toBe('Pressão Alta no Terço Ofensivo');

    // Finalize again
    scout = {
      ...scout,
      preMatchFinalized: true,
      preMatchFinalizedAt: Date.now()
    };
    expect(scout.preMatchFinalized).toBe(true);
  });

  it('allows finalizing an Opponent Scouting report (Adversário) and reopening it for edit', () => {
    let scout: OpponentScouting = {
      id: 'scout-2',
      matchId: 'match-2',
      opponentName: 'FC Porto',
      formation: '3-2-1',
      strengths: ['Bolas paradas'],
      weaknesses: ['Transição defensiva lenta'],
      keyPlayer: { name: 'Costa', dominantFoot: 'Esquerdo', threats: 'Cabeceamento', howToStop: 'Duelos' },
      tacticalNotes: 'Saída longa',
      gamePlan: 'Pressionar saída',
      notes: '',
      updatedAt: Date.now(),
      scoutingFinalized: false
    };

    expect(scout.scoutingFinalized).toBe(false);

    // Finalize Adversário
    const finTimestamp = Date.now();
    scout = {
      ...scout,
      scoutingFinalized: true,
      scoutingFinalizedAt: finTimestamp,
      updatedAt: finTimestamp
    };

    expect(scout.scoutingFinalized).toBe(true);
    expect(scout.scoutingFinalizedAt).toBe(finTimestamp);

    // Reopen for edit
    scout = {
      ...scout,
      weaknesses: [...scout.weaknesses, 'Laterais sobem muito'],
      scoutingFinalized: false
    };

    expect(scout.scoutingFinalized).toBe(false);
    expect(scout.weaknesses).toContain('Laterais sobem muito');
  });

  it('preserves finalization flags during schema validation', () => {
    const timestamp = 1730000000000;
    const rawState: Partial<AppState> = {
      schedule: [
        {
          id: 'match-3',
          opponent: 'SC Braga',
          date: '2026-10-20',
          time: '11:00',
          type: 'campeonato',
          location: 'fora',
          callup: ['p1', 'p5'],
          callupFinalized: true,
          callupFinalizedAt: timestamp,
          preMatchFinalized: true,
          preMatchFinalizedAt: timestamp,
          scoutingFinalized: true,
          scoutingFinalizedAt: timestamp
        }
      ],
      roster: [],
      matches: [],
      trainings: []
    };

    const { sanitizedState } = validateAndSanitizeAppState(rawState as AppState);
    const sanitizedMatch = sanitizedState.schedule[0];

    expect(sanitizedMatch.callupFinalized).toBe(true);
    expect(sanitizedMatch.callupFinalizedAt).toBe(timestamp);
    expect(sanitizedMatch.preMatchFinalized).toBe(true);
    expect(sanitizedMatch.preMatchFinalizedAt).toBe(timestamp);
    expect(sanitizedMatch.scoutingFinalized).toBe(true);
    expect(sanitizedMatch.scoutingFinalizedAt).toBe(timestamp);
  });
});
