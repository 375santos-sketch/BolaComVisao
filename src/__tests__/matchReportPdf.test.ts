import { describe, it, expect } from 'vitest';
import { generateMatchSheetPDF } from '../lib/pdf/createMatchReport';
import { normalizeClubState } from '../lib/storage';
import { AppState, Match } from '../types';

// Away game won 10-1: the report reads home team first, "Tramagal SU 1 - 10 Dragões"
const goals = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `s${i}`,
    type: 'scored',
    scorerId: null,
    assistId: null,
    minute: i + 1
  })),
  { id: 'c1', type: 'conceded', scorerId: null, assistId: null, minute: 30 }
];
const game = (location: 'casa' | 'fora') =>
  ({
    id: 'm1',
    opponent: 'Tramagal SU',
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    location,
    finished: true,
    goals,
    subs: [],
    lineup: [],
    capitao: null
  }) as unknown as Match;

describe('Relatório do jogo (PDF): equipa da casa primeiro', () => {
  const state = normalizeClubState({ myClubName: 'Dragões' } as AppState);

  it('away game: opponent and their goals first', async () => {
    const raw = (await generateMatchSheetPDF(game('fora'), state, false)).doc.output() as string;
    expect(raw).toContain('(1 - 10)');
    expect(raw).not.toContain('(10 - 1)');
  });

  it('home game: our team and our goals first', async () => {
    const raw = (await generateMatchSheetPDF(game('casa'), state, false)).doc.output() as string;
    expect(raw).toContain('(10 - 1)');
  });
});
