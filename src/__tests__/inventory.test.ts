import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildInventory,
  inventoryChecksum,
  inventoryFile,
  InventorySource,
  verifyInventoryFile,
  workspaceIdsToRead
} from '../lib/inventory';

// Fictitious data, only for this test
const NOW = new Date('2026-11-13T10:00:00Z');
const user = (id: string, account: Record<string, unknown>) => ({
  id,
  data: { account: { id, username: id, createdAt: '2026-09-01T00:00:00Z', ...account } }
});
const record = (id: string, kind: string, teamId: string, data: Record<string, unknown> = {}, deleted = false) => ({
  id,
  data: { kind, teamId, entityId: id, data, updatedAt: 1, deleted }
});

const source: InventorySource = {
  users: [
    user('u1', {
      name: 'Adulto Um',
      email: 'um@teste.pt',
      role: 'Administrador',
      status: 'approved',
      clubId: 'main',
      phoneNumber: '910000001'
    }),
    user('u2', { name: 'Adulto Dois', email: 'dois@teste.pt', role: 'Treinador Principal', status: 'approved' }),
    user('u3', {
      name: 'Adulto Três',
      email: 'tres@teste.pt',
      role: 'Treinador Adjunto',
      status: 'pending',
      clubId: 'clubeB',
      assignedTeams: ['sub9'],
      inviteCode: 'abc'
    })
  ],
  admins: ['u1'],
  invitations: [
    { id: 'i1', data: { status: 'pending', clubId: 'main', expiresAt: NOW.getTime() - 1000 } },
    { id: 'i2', data: { status: 'accepted', clubId: 'clubeB', expiresAt: NOW.getTime() + 1000 } },
    { id: 'i3', data: { status: 'pending', clubId: 'clubeC', expiresAt: NOW.getTime() + 1000 } }
  ],
  workspaces: [
    {
      id: 'main',
      legacy: {
        state: {
          users: [{ id: 'u1', email: 'um@teste.pt', phoneNumber: '910000099' }],
          teams: [{ id: 'sub11' }]
        },
        updatedAt: 1
      },
      records: [
        record('club', 'club', '_club', {
          users: [
            { id: 'u1', email: 'um@teste.pt', phoneNumber: '910000099', name: 'Adulto Um' },
            { id: 'u2', email: 'dois@teste.pt', name: 'Adulto Dois' }
          ],
          invitations: [{ id: 'i1' }],
          teams: [
            {
              id: 'sub11',
              clubName: 'Clube Teste',
              category: 'Sub-11',
              season: '2026/2027',
              liveToken: 'x'.repeat(24),
              calendarToken: 'y'.repeat(24),
              staffMembers: [{ name: 'Staff Fictício', phone: '930000000' }]
            },
            { id: 'sub9', clubName: 'Clube Teste', category: 'Sub-9', season: '2026/2027' }
          ]
        }),
        record('player__sub11__p1', 'player', 'sub11', { name: 'Atleta Secreto', birthDate: '2016-01-01' }),
        record('player__sub11__p2', 'player', 'sub11', { name: 'Outro Atleta' }),
        record('player__sub9__p3', 'player', 'sub9', { name: 'Terceiro Atleta' }),
        record('match__sub11__m1', 'match', 'sub11', { opponent: 'Adversário' }),
        record('match__sub11__m0', 'match', 'sub11', {}, true),
        { id: 'estranho', data: { teamId: 'sub11' } }
      ],
      pushSubscriptions: [
        { id: 's1', data: { uid: 'u1', endpoint: 'https://push.example/1' } },
        { id: 's2', data: { uid: 'u1', endpoint: 'https://push.example/2' } },
        { id: 's3', data: { uid: 'u2', endpoint: 'https://push.example/3' } }
      ],
      errors: []
    },
    { id: 'clubeB', legacy: null, records: [], pushSubscriptions: [], errors: ['registos: permission-denied'] }
  ],
  collectionCounts: { audit_logs: 12, clubs: 0, system: null },
  errors: []
};

const inventory = buildInventory(source, NOW);
const json = JSON.stringify(inventory);

describe('F1.1a — inventário da plataforma (só leitura)', () => {
  it('counts the adult accounts by status, role and workspace; no club means "main"', () => {
    expect(inventory.accounts.total).toBe(3);
    expect(inventory.accounts.byStatus).toEqual({ approved: 2, pending: 1 });
    expect(inventory.accounts.byWorkspace).toEqual({ clubeB: 1, main: 2 });
    expect(inventory.accounts.withoutClub).toBe(1);
    expect(inventory.accounts.platformAdmins).toBe(1);
    const u2 = inventory.accounts.list.find((a) => a.uid === 'u2')!;
    expect(u2).toMatchObject({ clubId: null, workspace: 'main', platformAdmin: false, invited: false });
    const u3 = inventory.accounts.list.find((a) => a.uid === 'u3')!;
    expect(u3).toMatchObject({ assignedTeams: ['sub9'], invited: true, status: 'pending' });
  });

  it('answers whether the shared club document holds user accounts (counts and field names only)', () => {
    expect(inventory.sharedDocHoldsUsers).toEqual([
      { workspace: 'clubeB', clubRecord: 0, legacyDoc: 0 },
      { workspace: 'main', clubRecord: 2, legacyDoc: 1 }
    ]);
    const main = inventory.workspaces.find((w) => w.id === 'main')!;
    expect(main.clubRecord.users.fields).toEqual({ email: 2, id: 2, name: 2, phoneNumber: 1 });
    expect(main.clubRecord.invitations).toBe(1);
    expect(main.clubRecord.staffMembers).toBe(1);
    expect(main.legacyDoc.exists).toBe(true);
  });

  it('never carries athlete data, phone numbers or staff contacts: only counts', () => {
    ['Atleta Secreto', 'Outro Atleta', '2016-01-01', 'Adversário', '910000001', '910000099', '930000000'].forEach(
      (secret) => expect(json).not.toContain(secret)
    );
    expect(json).not.toContain('Staff Fictício');
    expect(json).not.toContain('push.example');
  });

  it('counts records by kind (live and deleted) and by team, with the team names', () => {
    const main = inventory.workspaces.find((w) => w.id === 'main')!;
    expect(main.mode).toBe('registos');
    expect(main.records).toMatchObject({ total: 7, live: 5, deleted: 1, unknownKind: 1 });
    expect(main.records.byKind.player).toEqual({ live: 3, deleted: 0 });
    expect(main.records.byKind.match).toEqual({ live: 1, deleted: 1 });
    expect(main.teams.map((t) => [t.label, t.live])).toEqual([
      ['Clube Teste · Sub-11 · 2026/2027', 3],
      ['Clube Teste · Sub-9 · 2026/2027', 1]
    ]);
    expect(main.pushSubscriptions).toEqual({ phones: 3, accounts: 2 });
    expect(main.publicLinks['Jogo ao vivo para os pais']).toBe(1);
    expect(main.publicLinks['Calendário dos pais']).toBe(1);
    expect(main.publicLinks['Plano do adjunto']).toBe(0);
    expect(main.accounts).toBe(2);
  });

  it('keeps reading errors and invitations visible', () => {
    const b = inventory.workspaces.find((w) => w.id === 'clubeB')!;
    expect(b.mode).toBe('vazio');
    expect(b.errors).toEqual(['registos: permission-denied']);
    expect(inventory.invitations).toMatchObject({
      total: 3,
      byStatus: { accepted: 1, pending: 2 },
      pendingExpired: 1
    });
    expect(inventory.otherCollections).toEqual({ audit_logs: 12, clubs: 0, system: null });
  });

  it('reads "main", the listed workspaces and the clubs named in accounts and invitations', () => {
    expect(workspaceIdsToRead(['clubA'], source.users, source.invitations)).toEqual([
      'clubA',
      'clubeB',
      'clubeC',
      'main'
    ]);
  });

  it("also reads the organizations' spaces, which may hold only records (no top document)", () => {
    const withOrg = [...source.users, { id: 'uOrg', data: { account: { id: 'uOrg', defaultOrgId: 'orgDaConta' } } }];
    expect(workspaceIdsToRead([], withOrg, [], ['orgListada'])).toEqual(
      expect.arrayContaining(['orgListada', 'orgDaConta', 'main'])
    );
  });

  it('checksum: the same inventory gives the same SHA-256; any change is detected', async () => {
    const sum = await inventoryChecksum(inventory);
    expect(sum).toMatch(/^[0-9a-f]{64}$/);
    expect(await inventoryChecksum(buildInventory(source, NOW))).toBe(sum);
    const file = await inventoryFile(inventory);
    const reopened = JSON.parse(JSON.stringify(file));
    expect(await verifyInventoryFile(reopened)).toBe(true);
    reopened.inventory.accounts.total = 4;
    expect(await verifyInventoryFile(reopened)).toBe(false);
  });

  it('the inventory files contain no Firestore write function', () => {
    const files = [
      'src/lib/inventory.ts',
      'src/services/inventoryReader.ts',
      'src/components/admin/InventoryModal.tsx'
    ];
    files.forEach((f) => {
      const code = readFileSync(f, 'utf8');
      expect(code).not.toMatch(
        /\b(setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|onUpdateState|updateState)\s*\(/
      );
    });
  });
});

describe('F1.1a — leitura que não responde', () => {
  it('gives up after the time limit instead of hanging, and says why in plain words', async () => {
    const { withTimeout, serverProblemMessage } = await import('../lib/inventory');
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 20, 'users')).rejects.toMatchObject({ code: 'timeout' });
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'users')).resolves.toBe('ok');
    expect(serverProblemMessage({ code: 'timeout' })).toMatch(/não respondeu.*quota/);
    expect(serverProblemMessage({ code: 'resource-exhausted' })).toMatch(/quota diária gratuita/);
    expect(serverProblemMessage({ code: 'permission-denied' })).toMatch(/Administrador da plataforma/);
  });
});

describe('F1.1a — contas noutro formato', () => {
  it('reads accounts kept at the top of the document and lists only the field names of empty ones', async () => {
    const { buildInventory } = await import('../lib/inventory');
    const inv = buildInventory(
      {
        users: [
          {
            id: 'novo1234x',
            data: { account: { name: 'Adulto Novo', role: 'Treinador Principal', status: 'approved' } }
          },
          {
            id: 'antigo12x',
            data: {
              name: 'Adulto Antigo',
              email: 'antigo@teste.pt',
              role: 'Treinador Adjunto',
              status: 'approved',
              createdAt: 1700000000000
            }
          },
          { id: 'vazio123x', data: { lastActiveAt: 1, updatedAt: 2, fcmToken: 'segredo-do-token' } }
        ],
        admins: [],
        invitations: [],
        workspaces: [],
        collectionCounts: {},
        errors: []
      },
      new Date('2026-11-13T10:00:00Z')
    );
    expect(inv.accounts.byFormat).toEqual({ account: 1, antigo: 1, 'sem dados': 1 });
    const old = inv.accounts.list.find((a) => a.uid === 'antigo12x')!;
    expect(old).toMatchObject({ name: 'Adulto Antigo', role: 'Treinador Adjunto', format: 'antigo' });
    expect(old.createdAt).toBe('2023-11-14T22:13:20.000Z');
    const empty = inv.accounts.list.find((a) => a.uid === 'vazio123x')!;
    expect(empty).toMatchObject({ format: 'sem dados', fields: ['fcmToken', 'lastActiveAt', 'updatedAt'] });
    expect(inv.accounts.fieldsWithoutAccount).toMatchObject({ fcmToken: 1, lastActiveAt: 1, updatedAt: 1 });
    // Field names only, never the values
    expect(JSON.stringify(inv)).not.toContain('segredo-do-token');
  });
});
