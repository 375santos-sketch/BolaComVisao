import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Unsubscribe,
  connectFirestoreEmulator
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';
import { AppState } from '../types';
import { resolveCloudMode, pushClubRecords, loadClubStateFromRecords } from './clubCloud';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(config);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Ensure local persistence across restarts/reloads on mobile & desktop
try {
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.warn('Firebase persistence warning:', e);
  });
} catch (e) {
  console.warn('Firebase persistence init error:', e);
}

export const db: Firestore = getFirestore(app, config.firestoreDatabaseId);

// Local development against the Firebase emulators (npm run dev with VITE_FIREBASE_EMULATORS=true).
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

const FIRESTORE_UPGRADE_CONSOLE_URL = `https://console.firebase.google.com/project/${config.projectId}/firestore/databases/${config.firestoreDatabaseId || '(default)'}/data?openUpgradeDialog=true`;

// Centralized quota status tracking to prevent continuous retry storms when free daily limits are hit
const QUOTA_STORAGE_KEY = 'FIRESTORE_QUOTA_COOLDOWN_UNTIL';

function getStoredQuotaCooldown(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return 0;
    const val = parseInt(raw, 10);
    return isNaN(val) ? 0 : val;
  } catch {
    return 0;
  }
}

let quotaExhaustedCooldownUntil = getStoredQuotaCooldown();
let isFirestoreQuotaExhausted = Date.now() < quotaExhaustedCooldownUntil;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const str = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('resource-exhausted') ||
    str.includes('Free daily write units') ||
    str.includes('Free daily read units')
  );
}

export function getFirestoreQuotaState(): {
  isExhausted: boolean;
  message: string;
  consoleUrl: string;
  cooldownUntil: number;
} {
  const isCurrentlyExhausted = isFirestoreQuotaExhausted || Date.now() < quotaExhaustedCooldownUntil;
  return {
    isExhausted: isCurrentlyExhausted,
    message:
      'Limite diário gratuito do Firestore atingido. Todos os dados continuam 100% seguros e gravados offline no seu dispositivo (IndexedDB / LocalStorage). O limite diário do Firestore renova automaticamente amanhã.',
    consoleUrl: FIRESTORE_UPGRADE_CONSOLE_URL,
    cooldownUntil: quotaExhaustedCooldownUntil
  };
}

export function markQuotaExhausted(cooldownMinutes = 30) {
  isFirestoreQuotaExhausted = true;
  quotaExhaustedCooldownUntil = Date.now() + cooldownMinutes * 60 * 1000;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExhaustedCooldownUntil));
    } catch {
      // safe fallback
    }
  }
  console.warn(
    `[Firestore Quota Protection] Limite diário gratuito atingido. Pausa de requisições de rede ativada por ${cooldownMinutes} minutos. Dados protegidos localmente.`
  );
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  isQuotaExceeded?: boolean;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const isQuota = isQuotaExceededError(error);
  if (isQuota) {
    markQuotaExhausted(15);
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    isQuotaExceeded: isQuota,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };

  if (isQuota) {
    console.warn('Firestore Quota Alert: ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

export interface CloudSyncResult {
  success: boolean;
  message: string;
  isQuotaExceeded?: boolean;
}

import { normalizeClubState } from '../lib/storage';

/**
 * Saves complete shared club state to Firestore under the designated club workspace
 */
export async function saveMasterClubState(
  workspaceId: string = 'main',
  state: AppState,
  authorId?: string,
  authorName?: string,
  forceOverwrite = false
): Promise<CloudSyncResult> {
  // If not authenticated in Firebase Auth, avoid unauthenticated Firestore writes
  if (!auth.currentUser) {
    return { success: false, message: 'Autenticação necessária para guardar na Nuvem.' };
  }

  const cleanWorkspaceId = workspaceId && workspaceId.trim() ? workspaceId.trim() : 'main';

  // Clubs migrated to per-record storage are saved record by record (the legacy document stays as a backup).
  if ((await resolveCloudMode(cleanWorkspaceId)) === 'records') {
    return pushClubRecords(cleanWorkspaceId, state, { authorId, allowMassDelete: forceOverwrite });
  }

  // If quota was already hit and cooldown is active, avoid hitting Firestore backend with failing requests
  if (isFirestoreQuotaExhausted && Date.now() < quotaExhaustedCooldownUntil) {
    return {
      success: false,
      isQuotaExceeded: true,
      message:
        'Quota diária gratuita do Firestore atingida. Todos os dados continuam guardados em segurança no seu dispositivo (IndexedDB).'
    };
  }

  const path = `club_workspace/${cleanWorkspaceId}`;
  try {
    const clubDocRef = doc(db, 'club_workspace', cleanWorkspaceId);

    // Normalize state to guarantee consistency between active team and roster
    const normalized = normalizeClubState(state);

    // Safeguard: If incoming state has 0 players and 0 matches while teams exist, verify that we are not
    // accidentally wiping out a database due to a partial load error.
    if (!forceOverwrite && (!normalized.roster || normalized.roster.length === 0) && normalized.teams.length > 0) {
      try {
        const currentSnap = await getDoc(clubDocRef);
        if (currentSnap.exists()) {
          const currentData = currentSnap.data();
          const existingState = currentData?.state as AppState | undefined;
          if (
            existingState &&
            ((existingState.roster && existingState.roster.length > 0) ||
              (existingState.teams && existingState.teams.some((t) => (t.roster || []).length > 0)))
          ) {
            console.warn(
              'Proteção de dados ativada: Gravação ignorada para evitar apagar o plantel existente na Nuvem.'
            );
            return {
              success: true,
              message: 'Plantel na Nuvem protegido contra substituição por estado vazio.'
            };
          }
        }
      } catch (checkErr) {
        if (isQuotaExceededError(checkErr)) {
          markQuotaExhausted(15);
          return {
            success: false,
            isQuotaExceeded: true,
            message: 'Quota diária gratuita atingida. Dados guardados localmente com segurança.'
          };
        }
      }
    }

    // Clean state object for Firestore (sanitize undefined fields)
    const writeTimestamp = state.updatedAt || Date.now();
    normalized.updatedAt = writeTimestamp;
    const sanitizedState = JSON.parse(JSON.stringify(normalized));
    // Don't overwrite currentUser inside shared state
    delete sanitizedState.currentUser;

    const shouldMerge = !forceOverwrite && Array.isArray(sanitizedState.teams) && sanitizedState.teams.length > 0;

    await setDoc(
      clubDocRef,
      {
        state: sanitizedState,
        updatedAt: writeTimestamp,
        lastUpdatedBy: authorId || auth.currentUser.uid,
        lastUpdatedByName: authorName || auth.currentUser.displayName || 'Treinador'
      },
      { merge: shouldMerge }
    );

    // If previously marked as exhausted, reset upon successful write
    isFirestoreQuotaExhausted = false;

    return { success: true, message: 'Dados partilhados do Clube guardados na Nuvem.' };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, path);
    if (isQuotaExceededError(error)) {
      markQuotaExhausted(15);
      return {
        success: false,
        isQuotaExceeded: true,
        message:
          'Quota diária gratuita do Firestore atingida. Todos os dados foram guardados no armazenamento local (IndexedDB) e serão sincronizados após renovação da quota.'
      };
    }
    if (error?.code === 'permission-denied') {
      return {
        success: false,
        message:
          'Acesso recusado pelo Firestore. Apenas utilizadores autorizados pelo Administrador têm permissão de escrita.'
      };
    }
    return { success: false, message: error?.message || 'Erro ao sincronizar dados do clube.' };
  }
}

/**
 * Fetches the shared master club state from Firestore
 */
export async function loadMasterClubState(workspaceId: string = 'main'): Promise<AppState | null> {
  // If not authenticated in Firebase Auth, avoid unauthenticated Firestore reads
  if (!auth.currentUser) {
    return null;
  }

  if (isFirestoreQuotaExhausted && Date.now() < quotaExhaustedCooldownUntil) {
    return null;
  }

  const cleanWorkspaceId = workspaceId && workspaceId.trim() ? workspaceId.trim() : 'main';
  const path = `club_workspace/${cleanWorkspaceId}`;

  // Clubs migrated to per-record storage are read from their records, never from the (frozen) legacy document.
  if ((await resolveCloudMode(cleanWorkspaceId)) === 'records') {
    return loadClubStateFromRecords(cleanWorkspaceId);
  }

  try {
    const clubDocRef = doc(db, 'club_workspace', cleanWorkspaceId);
    const snap = await getDoc(clubDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.state) {
        return normalizeClubState(data.state as AppState);
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Real-time listener on the legacy club document that also reports when it does not exist (state = null).
 */
export function subscribeToLegacyClubDocument(
  workspaceId: string,
  onUpdate: (state: AppState | null, updatedAt: number) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!auth.currentUser) return () => {};
  const cleanWorkspaceId = workspaceId && workspaceId.trim() ? workspaceId.trim() : 'main';
  return onSnapshot(
    doc(db, 'club_workspace', cleanWorkspaceId),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      if (!data || !data.state) {
        onUpdate(null, 0);
        return;
      }
      const updatedAt = data.updatedAt || (data.state as any)?.updatedAt || 0;
      onUpdate(normalizeClubState({ ...(data.state as AppState), updatedAt }), updatedAt);
    },
    (error) => {
      if (isQuotaExceededError(error)) markQuotaExhausted(30);
      onError(error);
    }
  );
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
};
