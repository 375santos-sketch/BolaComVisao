import { describe, expect, it } from 'vitest';
import { assembleState, extractRecords } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { newSetPiece, setPieceAssignments, setPieceTitle } from '../lib/setPieces';
import { mvpCandidates, mvpResultLine, mvpStatsLine } from '../lib/mvpCard';
import { AppState, Match, Player, SetPiece } from '../types';

const roster: Player[] = [
  { id: 'p1', name: 'Rui Silva', number: 9, positions: '', birthDate: null, active: true },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, positions: '', birthDate: null, active: true },
  { id: 'p3', name: 'André Lopes', number: 10, positions: '', birthDate: null, active: true }
];

const corner: SetPiece = {
  ...newSetPiece('canto'),
  id: 'sp1',
  side: 'direita',
  image: 'data:image/jpeg;base64,AAAA',
  roles: [
    { label: 'Marca', playerId: 'p1' },
    { label: '1.º poste', playerId: 'p3' },
    { label: '2.º poste', playerId: null }
  ]
};

describe('Bolas paradas', () => {
  it('a new set piece comes with the usual jobs of its type', () => {
    expect(newSetPiece('canto').roles.map((r) => r.label)).toEqual([
      'Marca',
      '1.º poste',
      '2.º poste',
      'Entrada da área'
    ]);
    expect(setPieceTitle(corner)).toBe('Canto direita');
    expect(setPieceTitle({ ...corner, name: 'Canto curto' })).toBe('Canto curto (canto direita)');
  });

  it('lists who takes each one in the game and warns about athletes not called up', () => {
    const [a] = setPieceAssignments([corner], roster, ['p1', 'p2']);
    expect(a.lines.map((l) => [l.role.label, l.player?.name, l.missing])).toEqual([
      ['Marca', 'Rui Silva', false],
      ['1.º poste', 'André Lopes', true]
    ]);
    expect(setPieceAssignments([{ ...corner, roles: [{ label: 'Marca', playerId: null }] }], roster, [])).toEqual([]);
  });

  it('each set piece is its own cloud record (with its drawing), kept per team', () => {
    const state = normalizeClubState({ myClubName: 'Dragões', roster } as never);
    const withPieces = {
      ...state,
      teams: state.teams.map((t) => (t.id === state.activeTeamId ? { ...t, setPieces: [corner] } : t))
    } as AppState;
    const records = extractRecords(withPieces);
    const rec = [...records.values()].find((r) => r.kind === 'setpiece');
    expect(rec?.entityId).toBe('sp1');
    expect(JSON.stringify(records.get('club')?.data)).not.toContain('data:image');
    const back = assembleState(records, state as AppState);
    expect(back.teams.find((t) => t.id === back.activeTeamId)?.setPieces).toEqual([
      expect.objectContaining({ id: 'sp1', side: 'direita' })
    ]);
  });
});

describe('Jogador do jogo', () => {
  const match = {
    id: 'm1',
    opponent: 'Tramagal SU',
    date: '2026-10-17',
    season: '2026/2027',
    type: 'campeonato',
    location: 'fora',
    finished: true,
    goals: [
      { id: 'g1', type: 'scored', scorerId: 'p2', assistId: 'p1', minute: "5'" },
      { id: 'g2', type: 'scored', scorerId: 'p2', assistId: null, minute: "15'" },
      { id: 'g3', type: 'conceded', scorerId: null, assistId: null, minute: "20'" }
    ],
    subs: [],
    lineup: ['p1', 'p2'],
    lineupSize: 2,
    convocados: ['p1', 'p2', 'p3'],
    capitao: null,
    halfDurationMinutes: 25
  } as unknown as Match;

  it('suggests the athletes who played, best contribution first (who did not play is left out)', () => {
    const list = mvpCandidates({ roster, matches: [], trainings: [], category: 'Sub-11' }, match);
    expect(list.map((l) => [l.player.name, l.goals, l.assists, l.minutes])).toEqual([
      ['Tomás Gonçalves', 2, 0, 50],
      ['Rui Silva', 0, 1, 50]
    ]);
    expect(mvpStatsLine(list[0])).toBe('2 golos · 50 minutos');
    expect(mvpStatsLine({ goals: 1, assists: 1, minutes: 20 })).toBe('1 golo · 1 assistência · 20 minutos');
  });

  it('writes the result with the home team first', () => {
    expect(mvpResultLine(match, 'Dragões', 2, 1)).toBe('Tramagal SU 1-2 Dragões');
    expect(mvpResultLine({ ...match, location: 'casa' }, 'Dragões', 2, 1)).toBe('Dragões 2-1 Tramagal SU');
  });
});
