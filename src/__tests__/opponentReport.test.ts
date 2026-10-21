import { describe, it, expect } from 'vitest';
import {
  isSameOpponent,
  getOpponentMatchFacts,
  previousReports,
  buildOpponentReportText,
  hasReportNotes,
  linesToList
} from '../lib/opponentReport';
import { withoutOpponentScouting, normalizeClubState } from '../lib/storage';
import { extractRecords, hashData } from '../lib/recordSync';
import { AppState, Match } from '../types';

const match = (id: string, opponent: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent,
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'fora',
    finished: true,
    lineup: [],
    subs: [],
    capitao: null,
    goals: [
      { id: 'g1', type: 'scored', scorerId: 'p1', assistId: null, minute: "6'" },
      { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: "59'", goalType: 'Penálti' }
    ],
    ...extra
  }) as Match;

describe('Relatório do adversário pós-jogo', () => {
  it('recognises the same opponent written differently', () => {
    expect(isSameOpponent('GRD Os Esparteiros', 'Esparteiros')).toBe(true);
    expect(isSameOpponent('TRAMAGAL SU', 'Tramagal')).toBe(true);
    expect(isSameOpponent('Águias de Alvega', 'aguias de alvega')).toBe(true);
    expect(isSameOpponent('Sporting CP', 'SC Braga')).toBe(false);
    expect(isSameOpponent('Sporting CP', 'Sporting Braga')).toBe(false);
    expect(isSameOpponent('', 'Tramagal')).toBe(false);
  });

  it('takes the opponent numbers from the match (live names or Ficha de Jogo names)', () => {
    const f = getOpponentMatchFacts(
      match('m', 'Tramagal SU', '2026-10-17', {
        rematesDentroAreaAdv: 3,
        rematesForaAreaAdv: 2,
        cantosAdv: 3,
        faltasAdv: 1
      })
    );
    expect(f).toMatchObject({
      scored: 1,
      conceded: 1,
      shotsAgainst: 5,
      shotsAgainstInBox: 3,
      cornersAgainst: 3,
      opponentFouls: 1,
      opponentConversion: 20
    });
    expect(f.concededGoals).toEqual([{ minute: "59'", origin: 'Penálti' }]);
  });

  it('numbers not recorded stay empty (not 0)', () => {
    const f = getOpponentMatchFacts(match('m', 'X', '2026-10-17'));
    expect(f.shotsAgainst).toBeNull();
    expect(f.cornersAgainst).toBeNull();
  });

  it('earlier reports against the same opponent, most recent first; empty reports ignored', () => {
    const list = [
      match('a', 'Tramagal SU', '2025-11-02', { opponentReport: { nextTime: 'Pressionar o central' } }),
      match('b', 'Tramagal', '2026-02-10', { opponentReport: { weaknesses: ['Lentos a recuperar'] } }),
      match('c', 'Tramagal SU', '2026-03-01', { opponentReport: { strengths: [] } }),
      match('d', 'Esparteiros', '2026-03-05', { opponentReport: { nextTime: 'x' } })
    ];
    expect(previousReports(list, 'TRAMAGAL SU').map((m) => m.id)).toEqual(['b', 'a']);
    expect(previousReports(list, 'Tramagal SU', '2026-01-01').map((m) => m.id)).toEqual(['a']);
    expect(hasReportNotes({ strengths: ['  '] })).toBe(false);
  });

  it('WhatsApp summary for the coaching staff', () => {
    const m = match('m', 'Tramagal SU', '2026-10-17', {
      rematesDentroAreaAdv: 3,
      rematesForaAreaAdv: 2,
      opponentReport: {
        system: '3-2-1',
        weaknesses: linesToList('- Lentos a recuperar\n\n• Saída de bola fraca'),
        nextTime: 'Pressionar a saída de bola'
      }
    });
    const text = buildOpponentReportText(m, { myClubName: 'Dragões', schedule: [] } as unknown as AppState);
    expect(text).toContain('Tramagal SU 1-1 Dragões');
    expect(text).toContain("Golos marcados por eles: 1 (59' Penálti)");
    expect(text).toContain('Remates: 5 (3 dentro, 2 fora da área)');
    expect(text).toContain('• Saída de bola fraca');
    expect(text).toContain('Pressionar a saída de bola');
  });
});

describe('Fim do scouting do adversário e do Pré-jogo antigo', () => {
  const state = (): AppState =>
    normalizeClubState({
      activeTeamId: 't',
      version: 2,
      teams: [
        {
          id: 't',
          clubName: 'Dragões',
          category: 'Sub-11',
          season: '2026/2027',
          opponentScouting: [
            { id: 'scout-s1', opponentName: 'Abrantes', formation: '3-3', strengths: ['Rápidos'], updatedAt: 1 },
            {
              id: 'report-s1',
              opponentName: 'Abrantes',
              ourFormation: '2-3-1',
              teamMotto: 'Foco',
              formation: '2-3-1',
              strengths: ['Transições'],
              keyPlayer: { name: 'Nº 9' },
              tacticalNotes: 'x',
              updatedAt: 1
            }
          ],
          schedule: [{ id: 's1', opponent: 'Abrantes', date: '2026-10-21', scoutingFinalized: true, callup: [] }]
        } as any
      ]
    } as AppState);

  it('deletes the old pre-match plans and scouting reports (both screens were replaced)', () => {
    const s = state();
    expect(s.opponentScouting).toEqual([]);
    expect(s.teams[0].opponentScouting).toEqual([]);
    expect((s.schedule[0] as any).scoutingFinalized).toBeUndefined();
  });

  it('is idempotent (no endless re-saving)', () => {
    const once = state();
    const twice = withoutOpponentScouting(normalizeClubState(once));
    expect(hashData([...extractRecords(twice).values()].map((r) => r.data))).toBe(
      hashData([...extractRecords(once).values()].map((r) => r.data))
    );
  });
});

describe('PDF do relatório do adversário', () => {
  it('is generated with the report content', async () => {
    const { buildOpponentReportPDF } = await import('../lib/pdf/createOpponentReport');
    const m = match('m', 'Tramagal SU', '2026-10-17', {
      opponentReport: {
        system: '3-2-1',
        dangerousPlayers: ['Nº 10 – remata de fora'],
        nextTime: 'Fechar o corredor esquerdo'
      }
    });
    const doc = await buildOpponentReportPDF(m, normalizeClubState({ myClubName: 'Dragões' } as AppState));
    const raw = doc.output() as string;
    expect(doc.getNumberOfPages()).toBe(1);
    expect(raw).toContain('Fechar o corredor esquerdo');
    expect(raw).toContain('3-2-1');
  });
});
