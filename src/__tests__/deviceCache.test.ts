import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_STATE_POINTER,
  LEGACY_STATE_KEY,
  isClubDataKey,
  legacySyncedKey,
  stateKeyFor,
  syncedKeyFor,
  workspaceIdOf
} from '../lib/deviceCache';

// A device without network: only its storage (fictitious data, only for this test)
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  }
});

const { loadAppState, saveAppState, clearAllAppState } = await import('../lib/storage');
const { clearDeviceClubData } = await import('../lib/syncEngine');

const user = (id: string, clubId?: string) =>
  ({ id, username: id, name: id, role: 'Treinador Principal', status: 'approved', createdAt: '', clubId }) as never;
const stateOf = (u: unknown, clubName: string) =>
  ({ ...loadAppState(), currentUser: u, lastBackupDate: clubName }) as never;

describe('F1.4 — chaves do aparelho por conta e organização', () => {
  it('one key per account and club; guests and signed-out use the old key', () => {
    expect(stateKeyFor(user('uA', 'clubeX'))).toBe('bcv-state:uA:clubeX');
    expect(stateKeyFor(user('uA'))).toBe('bcv-state:uA:main');
    expect(stateKeyFor({ id: 'uA', clubId: 'clubeX', orgId: 'orgY' })).toBe('bcv-state:uA:orgY');
    expect(stateKeyFor(null)).toBe(LEGACY_STATE_KEY);
    expect(stateKeyFor(user('guest-123'))).toBe(LEGACY_STATE_KEY);
    expect(workspaceIdOf(null)).toBe('main');
    expect(workspaceIdOf({ clubId: ' clubeX ' })).toBe('clubeX');
    expect(syncedKeyFor('uA', 'main')).toBe('bcv-synced-records-uA-main');
    expect(legacySyncedKey('main')).toBe('bcv-synced-records-main');
    expect(isClubDataKey('bcv-state:uA:main')).toBe(true);
    expect(isClubDataKey(LEGACY_STATE_KEY)).toBe(true);
    expect(isClubDataKey('outra-coisa')).toBe(false);
  });
});

describe('F1.4 — gravar e abrir sem rede', () => {
  beforeEach(() => store.clear());

  it('saves under the account key and opens it again (the old shared key is not used)', () => {
    saveAppState(stateOf(user('uA'), 'Clube do A'));
    expect(store.has('bcv-state:uA:main')).toBe(true);
    expect(store.get(ACTIVE_STATE_POINTER)).toBe('bcv-state:uA:main');
    expect(store.has(LEGACY_STATE_KEY)).toBe(false);
    expect(loadAppState().lastBackupDate).toBe('Clube do A');
  });

  it('an old device opens its old copy and moves it on the first save', () => {
    store.set(LEGACY_STATE_KEY, JSON.stringify(stateOf(user('uA'), 'Copia antiga')));
    expect(loadAppState().lastBackupDate).toBe('Copia antiga');
    saveAppState(stateOf(user('uA'), 'Copia antiga'));
    expect(store.has(LEGACY_STATE_KEY)).toBe(false);
    expect(JSON.parse(store.get('bcv-state:uA:main')!).lastBackupDate).toBe('Copia antiga');
  });

  it("another account's old copy is never moved into this account", () => {
    store.set(LEGACY_STATE_KEY, JSON.stringify(stateOf(user('uB'), 'Dados do B')));
    saveAppState(stateOf(user('uA'), 'Dados do A'));
    expect(JSON.parse(store.get(LEGACY_STATE_KEY)!).lastBackupDate).toBe('Dados do B');
    expect(JSON.parse(store.get('bcv-state:uA:main')!).lastBackupDate).toBe('Dados do A');
  });

  it('two accounts on the same device: each one only opens its own copy', () => {
    saveAppState(stateOf(user('uA'), 'Dados do A'));
    saveAppState(stateOf(user('uB', 'clubeB'), 'Dados do B'));
    expect(loadAppState().lastBackupDate).toBe('Dados do B');
    expect(JSON.parse(store.get('bcv-state:uA:main')!).lastBackupDate).toBe('Dados do A');
    expect(store.get(ACTIVE_STATE_POINTER)).toBe('bcv-state:uB:clubeB');
  });

  it('signing out wipes every copy of club data on the device (all accounts)', async () => {
    saveAppState(stateOf(user('uA'), 'Dados do A'));
    saveAppState(stateOf(user('uB'), 'Dados do B'));
    store.set('bcv-synced-records-uA-main', '{}');
    store.set('preferencia-de-outra-app', 'fica');
    await clearDeviceClubData();
    clearAllAppState(null);
    expect([...store.keys()].sort()).toEqual([LEGACY_STATE_KEY, 'preferencia-de-outra-app']);
    expect(loadAppState().currentUser ?? null).toBeNull();
    expect(JSON.stringify(loadAppState())).not.toContain('Dados do');
  });
});

describe('F2.2 — âmbito de equipas', () => {
  it('all teams without an organization or with "*"; otherwise the teams of the membership', async () => {
    const { teamScopeOf } = await import('../lib/deviceCache');
    expect(teamScopeOf(null)).toBeNull();
    expect(teamScopeOf({ orgTeamIds: ['eq1'] })).toBeNull(); // no organization yet: the old rule
    expect(teamScopeOf({ orgId: 'o', orgTeamIds: ['*'] })).toBeNull();
    expect(teamScopeOf({ orgId: 'o', orgTeamIds: [] })).toBeNull();
    expect(teamScopeOf({ orgId: 'o', orgTeamIds: ['eq2', 'eq1'] })).toEqual(['eq1', 'eq2']);
  });
});
