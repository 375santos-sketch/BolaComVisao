import { describe, expect, it } from 'vitest';
import { migrationAccountsFrom, planMainMigration, recordCountsByKind } from '../lib/mainMigration';

// Fictitious data, only for this test
const NOW = 1_800_000_000_000;
const accounts = migrationAccountsFrom([
  {
    id: 'u1',
    data: {
      account: {
        name: 'Adulto Um',
        email: 'um@t.pt',
        role: 'Administrador',
        status: 'approved',
        assignedTeams: ['all']
      }
    }
  },
  {
    id: 'u2',
    data: {
      account: {
        name: 'Adulto Dois',
        email: 'dois@t.pt',
        role: 'Treinador Principal',
        status: 'approved',
        assignedTeams: ['eq1']
      }
    }
  },
  { id: 'u3', data: { account: { name: 'Adulto Três', role: 'Treinador Adjunto', status: 'pending' } } },
  { id: 'v1', data: { lastActiveAt: 1 } }
]);
const plan = (choices: Record<string, 'membro' | 'fora'>) =>
  planMainMigration({ orgName: 'Clube Teste', ownerUid: 'u1', actorUid: 'u1', accounts, choices, now: NOW });

describe('F1.8 — plano da migração de «main»', () => {
  it('reads the accounts by name; documents without account data are marked empty (and listed last)', () => {
    expect(accounts.map((a) => [a.uid, a.empty])).toEqual([
      ['u2', false],
      ['u3', false],
      ['u1', false],
      ['v1', true]
    ]);
  });

  it('chosen accounts become members (owner = owner, "all" = every team); the rest stays out', () => {
    const p = plan({ u1: 'membro', u2: 'membro' });
    expect(p.problems).toEqual([]);
    expect(p.org).toMatchObject({ id: 'main', type: 'club', status: 'active', ownerUid: 'u1', plan: null });
    expect(p.members.map((m) => [m.uid, m.role, m.teamIds])).toEqual([
      ['u2', 'treinador', ['eq1']],
      ['u1', 'owner', ['*']]
    ]);
    expect(p.defaultOrgFor).toEqual(['u2', 'u1']);
    expect(p.audit.map((a) => a.id)).toEqual(['migracao-m2-u2', 'migracao-m2-u1']);
    expect(p.leftOut).toEqual([
      { uid: 'u3', reason: 'escolhida para ficar de fora' },
      { uid: 'v1', reason: 'documento sem dados de conta' }
    ]);
  });

  it('problems: empty documents, accounts not approved, and the owner missing', () => {
    const p = plan({ u2: 'membro', u3: 'membro', v1: 'membro' });
    expect(p.problems).toEqual([
      'Adulto Três: só contas aprovadas podem ser membros',
      'v1: documento sem dados de conta não pode ser membro',
      'o dono do clube tem de estar entre os membros escolhidos'
    ]);
  });

  it('the same choices always give the same plan (deterministic: running twice does not duplicate)', () => {
    expect(plan({ u1: 'membro', u2: 'membro' })).toEqual(plan({ u1: 'membro', u2: 'membro' }));
  });

  it('counts the club records by kind, deleted apart (must be identical before and after)', () => {
    expect(
      recordCountsByKind([
        { data: { kind: 'player' } },
        { data: { kind: 'player' } },
        { data: { kind: 'match', deleted: true } },
        { data: {} }
      ])
    ).toEqual({ '?': 1, 'match (apagado)': 1, player: 2 });
  });
});
