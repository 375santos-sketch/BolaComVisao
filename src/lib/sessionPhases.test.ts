import { describe, expect, it } from 'vitest';
import { SessionBlock } from '../types';
import { phaseOf, sessionPhases, sessionWarnings } from './sessionPhases';

const b = (category: SessionBlock['category'], durationMinutes: number) =>
  ({ id: `${category}${durationMinutes}`, title: 'x', category, durationMinutes }) as SessionBlock;

describe('Partes da sessão', () => {
  it('warm-up, main part and cool-down with their minutes', () => {
    const blocks = [b('aquecimento', 15), b('tecnica', 20), b(undefined, 10), b('jogo', 25), b('calma', 5)];
    expect(sessionPhases(blocks)).toEqual([
      { phase: 'aquecimento', minutes: 15, blocks: 1 },
      { phase: 'fundamental', minutes: 55, blocks: 3 },
      { phase: 'calma', minutes: 5, blocks: 1 }
    ]);
    expect(phaseOf('bolas_paradas')).toBe('fundamental');
    expect(sessionWarnings(blocks, 75)).toEqual([]);
  });

  it('says what is missing or too long', () => {
    expect(sessionWarnings([b('tecnica', 50), b('jogo', 40)], 75)).toEqual([
      'Sem aquecimento',
      'Sem retorno à calma',
      'Planeado 90 de 75 min'
    ]);
    expect(sessionWarnings([], 75)).toEqual([]);
  });
});
