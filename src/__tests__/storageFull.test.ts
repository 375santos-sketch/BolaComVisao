import { beforeEach, describe, expect, it, vi } from 'vitest';

// A phone whose small storage holds at most LIMIT characters (fictitious data, only for this test)
let LIMIT = 4000;
const store = new Map<string, string>();
const used = () => [...store].reduce((n, [k, v]) => n + k.length + v.length, 0);
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    const before = store.get(k);
    store.set(k, String(v));
    if (used() > LIMIT) {
      if (before === undefined) store.delete(k);
      else store.set(k, before);
      throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
    }
  },
  removeItem: (k: string) => void store.delete(k),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  }
});
const events: string[] = [];
vi.stubGlobal('window', { dispatchEvent: (e: Event) => events.push(e.type) });

const { saveAppState, loadAppState, STATE_IN_IDB_KEY, STORAGE_FULL_EVENT } = await import('../lib/storage');

const user = (id: string) =>
  ({ id, username: id, name: id, role: 'Treinador Principal', status: 'approved', createdAt: '' }) as never;
const stateOf = (u: unknown, notes: string) => ({ ...loadAppState(), currentUser: u, lastBackupDate: notes }) as never;

describe('Espaço esgotado no telemóvel', () => {
  beforeEach(() => {
    store.clear();
    events.length = 0;
    LIMIT = 4000;
  });

  it("first frees room by removing other accounts' copies (they are in the cloud), and saves", () => {
    // Room for this account's copy only once the other account's copy is gone
    const size = JSON.stringify(stateOf(user('uA'), 'Clube A')).length + 200;
    store.set('bcv-state:outraConta:main', 'x'.repeat(size));
    LIMIT = used() + Math.floor(size / 2);
    expect(saveAppState(stateOf(user('uA'), 'Clube A'))).toBe(true);
    expect(store.has('bcv-state:outraConta:main')).toBe(false);
    expect(JSON.parse(store.get('bcv-state:uA:main')!).lastBackupDate).toBe('Clube A');
    expect(events).toEqual([]);
  });

  it('when it still does not fit: no stale copy here, a marker for the larger storage, one short message', () => {
    LIMIT = 300;
    expect(saveAppState(stateOf(user('uA'), 'Clube A'))).toBe(true);
    expect(store.has('bcv-state:uA:main')).toBe(false);
    expect(store.get(STATE_IN_IDB_KEY)).toBe('bcv-state:uA:main');
    expect(events).toEqual([STORAGE_FULL_EVENT]);
    // Opening again never shows another copy instead (the app reads the larger storage right after)
    expect(loadAppState().currentUser ?? null).toBeNull();
  });
});
