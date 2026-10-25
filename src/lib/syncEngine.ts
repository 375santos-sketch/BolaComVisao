import { AppState, SyncState, OfflineMutation } from '../types';
import { uid } from './utils';
import { saveMasterClubState } from '../services/firebase';

const IDB_NAME = 'BolaComVisao_DB';
const IDB_VERSION = 1;
const STORE_NAME = 'coach_state_store';
const QUEUE_STORAGE_KEY = 'bolacomvisao_mutations_queue_v1';

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
      if (key && (key.startsWith('bolacomvisao_') || key.startsWith('bcv-'))) keys.push(key);
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

// Offline Mutations Queue Operations
function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineMutation[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Erro ao guardar fila offline:', e);
  }
}

// Perform sync directly against official Firestore cloud database & process queue
export async function syncStateWithCloud(
  state: AppState,
  _syncId: string
): Promise<{ success: boolean; message: string; remoteState?: Partial<AppState> }> {
  // If currently offline according to browser, store in IndexedDB and queue
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await saveToIndexedDB('offline_state_backup', state);
    await saveToIndexedDB('latest_cloud_synced_state', state);
    const queue = getOfflineQueue();
    return {
      success: false,
      message: `Modo Offline: ${queue.length} alteraç${queue.length === 1 ? 'ão' : 'ões'} guardadas em base de dados local.`
    };
  }

  try {
    const queue = getOfflineQueue();

    // 1. Save local snapshot to IndexedDB
    await saveToIndexedDB('latest_cloud_synced_state', state);

    // 2. Direct write to official Firestore database
    const authorId = state.currentUser?.id;
    const authorName = state.currentUser?.name || state.currentUser?.username || 'Treinador';
    const workspaceId = state.currentUser?.clubId || 'main';
    const result = await saveMasterClubState(workspaceId, state, authorId, authorName);

    if (result.success) {
      // Clear processed mutations queue upon successful Firestore write
      if (queue.length > 0) {
        await saveToIndexedDB(`archived_mutations_${Date.now()}`, queue);
        saveOfflineQueue([]);
      }
      return {
        success: true,
        message: 'Base de dados oficial (Firestore) sincronizada com sucesso! ☁️'
      };
    } else {
      return {
        success: false,
        message: result.message || 'Falha ao sincronizar com Firestore. Guardado localmente.'
      };
    }
  } catch {
    await saveToIndexedDB('offline_state_backup', state);
    return {
      success: true,
      message: 'Guardado em base de dados offline local (IndexedDB).'
    };
  }
}

// Process and flush offline queued mutations when connection is restored
export async function processOfflineMutationsQueue(): Promise<{ processed: number; success: boolean }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { processed: 0, success: true };
  }

  const count = queue.length;
  try {
    // Save queue items to IndexedDB archive
    await saveToIndexedDB(`processed_queue_${Date.now()}`, queue);
    // Clear pending queue
    saveOfflineQueue([]);
    return { processed: count, success: true };
  } catch (err) {
    console.warn('Erro ao processar fila offline:', err);
    return { processed: 0, success: false };
  }
}
