import { describe, expect, it } from 'vitest';
import { buildInventory, InventorySource, teamMixingOf } from '../lib/inventory';

/**
 * P0-03 — Deteção de escalões misturados no inventário (só leitura, só contagens). Fictitious data only: two age
 * groups of the same club, as the old change of team and the old schedule copy left them.
 */
const rec = (kind: string, teamId: string, entityId: string, data: Record<string, unknown> = {}, deleted = false) => ({
  id: `${kind}__${teamId}__${entityId}`,
  data: { kind, teamId, entityId, updatedAt: 1, deleted, data: { id: entityId, ...data } }
});
const TEAMS = [
  { id: 'sub11', clubName: 'Clube Fictício', category: 'Sub-11', season: '2026/2027' },
  { id: 'sub13', clubName: 'Clube Fictício', category: 'Sub-13', season: '2026/2027' }
];
const club = rec('club', '_club', 'club', { teams: TEAMS });
club.id = 'club';

describe('P0-03 · escalões misturados (teamMixingOf)', () => {
  it('um clube sem misturas: «sem sinais»', () => {
    const m = teamMixingOf(
      [
        club,
        rec('schedule', 'sub11', 'g1', { teamId: 'sub11' }),
        rec('match', 'sub13', 'm1', { teamId: 'sub13' }),
        rec('player', 'sub11', 'a1'),
        rec('player', 'sub13', 'b1')
      ],
      null,
      true,
      TEAMS
    );
    expect(m.verdict).toBe('sem sinais');
    expect(m.source).toBe('registos');
    expect(m.knownTeams).toBe(2);
  });

  it('conta as cópias da agenda deixadas noutro escalão do mesmo clube, e quantas duplicam um original', () => {
    const m = teamMixingOf(
      [
        club,
        rec('schedule', 'sub11', 'g1', { teamId: 'sub11' }),
        rec('schedule', 'sub13', 'g1', { teamId: 'sub11' }), // a copy of g1 kept in Sub-13
        rec('schedule', 'sub13', 'g2', { teamId: 'sub11' }) // a copy whose original is gone
      ],
      null,
      true,
      TEAMS
    );
    expect(m.inOtherTeam).toMatchObject({ schedule: 2, match: 0, duplicateOfOriginal: 1 });
    expect(m.inOtherTeam.byTeam).toEqual({ 'Clube Fictício · Sub-13 · 2026/2027': 2 });
    expect(m.sameGameInSeveralTeams).toEqual({ match: 0, schedule: 1 });
    expect(m.verdict).toBe('a verificar');
  });

  it('conta jogos e agenda sem equipa marcada, e registos de equipas que já não existem', () => {
    const m = teamMixingOf(
      [
        club,
        rec('match', 'sub11', 'm1'),
        rec('schedule', 'sub11', 'g1'),
        rec('player', 'apagada', 'x1'),
        rec('match', 'apagada', 'm9', { teamId: 'apagada' })
      ],
      null,
      true,
      TEAMS
    );
    expect(m.untagged).toEqual({ match: 1, schedule: 1 });
    expect(m.inUnknownTeam).toEqual({ match: 1, player: 1 });
  });

  it('atletas em duas equipas da mesma época (mas não entre épocas diferentes)', () => {
    const teams = [...TEAMS, { id: 'sub11b', clubName: 'Clube Fictício', category: 'Sub-11', season: '2025/2026' }];
    const m = teamMixingOf(
      [
        rec('player', 'sub11', 'a1', { athleteId: 'pessoa1' }),
        rec('player', 'sub13', 'a2', { athleteId: 'pessoa1' }), // same season: counted
        rec('player', 'sub11b', 'a3', { athleteId: 'pessoa2' }),
        rec('player', 'sub11', 'a4', { athleteId: 'pessoa2' }) // next season: not counted
      ],
      null,
      true,
      teams
    );
    expect(m.athletesInTwoTeamsSameSeason).toBe(1);
  });

  it('ignora os registos apagados (marcas)', () => {
    const m = teamMixingOf([club, rec('schedule', 'sub13', 'g1', { teamId: 'sub11' }, true)], null, true, TEAMS);
    expect(m.verdict).toBe('sem sinais');
  });

  it('um clube ainda no documento antigo é lido pelas listas de cada equipa', () => {
    const legacy = {
      teams: [
        { ...TEAMS[0], schedule: [{ id: 'g1', teamId: 'sub11' }], matches: [{ id: 'm1' }], roster: [] },
        { ...TEAMS[1], schedule: [{ id: 'g1', teamId: 'sub11' }], matches: [], roster: [] }
      ]
    };
    const m = teamMixingOf([], legacy, false, legacy.teams);
    expect(m.source).toBe('documento único');
    expect(m.inOtherTeam.schedule).toBe(1);
    expect(m.untagged.match).toBe(1);
  });

  it('sem dados: nada a ler', () => {
    expect(teamMixingOf([], null, false, []).source).toBe('nenhum');
  });
});

describe('P0-03 · no inventário completo', () => {
  const source: InventorySource = {
    users: [],
    admins: [],
    invitations: [],
    workspaces: [
      {
        id: 'clubeFicticio',
        legacy: null,
        records: [
          club,
          rec('schedule', 'sub11', 'g1', { teamId: 'sub11', opponent: 'Adversário Secreto', date: '2026-12-06' }),
          rec('schedule', 'sub13', 'g1', { teamId: 'sub11', opponent: 'Adversário Secreto', date: '2026-12-06' }),
          rec('player', 'sub11', 'a1', { name: 'Atleta Secreto', phone: '900000000' })
        ],
        pushSubscriptions: [],
        errors: []
      }
    ],
    collectionCounts: {},
    errors: []
  };
  const inventory = buildInventory(source, new Date('2026-11-24T10:00:00Z'));
  const json = JSON.stringify(inventory);

  it('cada espaço tem a verificação', () => {
    expect(inventory.workspaces[0].mixing.inOtherTeam.schedule).toBe(1);
    expect(inventory.workspaces[0].mixing.verdict).toBe('a verificar');
  });

  it('nunca leva nomes, adversários, datas nem contactos: só contagens e nomes das equipas', () => {
    ['Atleta Secreto', 'Adversário Secreto', '2026-12-06', '900000000', 'pessoa'].forEach((secret) =>
      expect(json).not.toContain(secret)
    );
  });
});
