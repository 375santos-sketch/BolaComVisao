import { SyncState } from '../types';
import { uid } from './utils';
import { isClubDataKey } from './deviceCache';

const IDB_NAME = 'BolaComVisao_DB';
const IDB_VERSION = 1;
const STORE_NAME = 'coach_state_store';

// Default initial sync state
export const defaultSyncState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  lastSyncedAt: Date.now(),
  pendingChangesCount: 0,
  syncId: 'BCV-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
  lastSyncMessage: 'Sincronizado localmente e na nuvem',
  autoSyncEnabled: true,
  deviceId: getOrCreateDeviceId(),
  pendingMutations: [],
  activeConflicts: []
};

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem('bolacomvisao_device_id');
    if (!id) {
      id = 'DEV_' + uid();
      localStorage.setItem('bolacomvisao_device_id', id);
    }
    return id;
  } catch {
    return 'DEV_' + Math.random().toString(36).slice(2, 8);
  }
}

// IndexedDB Helper for high-capacity offline persistent storage
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado'));
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Reads what saveToIndexedDB kept under `key` (null when there is nothing, or IndexedDB is unavailable). */
export async function loadFromIndexedDB<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result?.data as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveToIndexedDB(key: string, data: any): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback:', err);
    return false;
  }
}

/**
 * Removes every copy of club data kept on this device (IndexedDB backups, offline queue, conflicts, audit
 * cache, sync markers). Called on logout so the next person using the device (or "Modo Convidado") cannot
 * reach the previous club's data.
 */
export async function clearDeviceClubData(): Promise<void> {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bolacomvisao_') || isClubDataKey(key))) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage unavailable: nothing stored there either.
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn('IndexedDB clear fallback:', err);
  }
}

/**
 * P1-02 — Copies of the whole club that older versions kept on the device and nothing ever read: the state written
 * by syncStateWithCloud on each return of the network ("offline_state_backup", "latest_cloud_synced_state"), the
 * archives of an offline queue that was never filled ("archived_mutations_<time>", "processed_queue_<time>") and the
 * queue itself. The app's own copy ("coach_active_state" and the per-account keys) is NOT one of them.
 */
export const OLD_OFFLINE_QUEUE_KEY = 'bolacomvisao_mutations_queue_v1';
export function isUnusedOfflineCopy(key: string): boolean {
  return (
    key === 'offline_state_backup' ||
    key === 'latest_cloud_synced_state' ||
    /^archived_mutations_\d+$/.test(key) ||
    /^processed_queue_\d+$/.test(key)
  );
}

/** Removes those copies from this device (once per start; nothing to do after the first time). Returns how many. */
export async function removeUnusedOfflineCopies(): Promise<number> {
  try {
    localStorage.removeItem(OLD_OFFLINE_QUEUE_KEY);
  } catch {
    // Storage unavailable: nothing kept there either
  }
  try {
    const db = await openDB();
    return await new Promise<number>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      let removed = 0;
      req.onsuccess = () => {
        (req.result || []).forEach((k) => {
          if (typeof k === 'string' && isUnusedOfflineCopy(k)) {
            store.delete(k);
            removed++;
          }
        });
      };
      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => resolve(removed);
    });
  } catch {
    return 0;
  }
}
