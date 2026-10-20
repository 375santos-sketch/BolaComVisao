import { createContext, useContext } from 'react';

/**
 * Truthful cloud save status, derived from saves the Firestore backend actually confirmed
 * (not from intentions), so the coach can see when data exists only on this device.
 */
export type CloudSyncStatus =
  | 'synced' // every local change is confirmed in the cloud
  | 'saving' // a save is in flight
  | 'pending' // local changes not yet confirmed in the cloud
  | 'offline' // no internet; local changes (if any) wait to be sent
  | 'error' // the last save failed (quota, permissions, size, ...); will retry
  | 'local'; // not signed in to the cloud: data lives only on this device

export interface CloudSyncInfo {
  status: CloudSyncStatus;
  hasUnsavedChanges: boolean;
  lastSavedAt: number;
  message?: string;
}

export const CloudSyncContext = createContext<CloudSyncInfo | null>(null);

export const useCloudSync = () => useContext(CloudSyncContext);

const CLOUD_SAVED_AT_KEY = 'bcv-cloud-saved-at';

/** Timestamp (lastLocalMutationAt) of the latest local change confirmed in the cloud, per device. */
export function readCloudSavedAt(): number {
  try {
    return Number(localStorage.getItem(CLOUD_SAVED_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeCloudSavedAt(ts: number): void {
  try {
    localStorage.setItem(CLOUD_SAVED_AT_KEY, String(ts));
  } catch {
    // Storage unavailable: the status just falls back to "pending" after a reload.
  }
}

export function deriveCloudSyncStatus(input: {
  signedIn: boolean;
  online: boolean;
  saving: boolean;
  error?: string;
  lastLocalMutationAt: number;
  cloudSavedAt: number;
}): CloudSyncInfo {
  const hasUnsavedChanges = input.signedIn && input.lastLocalMutationAt > input.cloudSavedAt;
  const base = { hasUnsavedChanges, lastSavedAt: input.cloudSavedAt };
  if (!input.signedIn) return { ...base, status: 'local' };
  if (!input.online) return { ...base, status: 'offline' };
  if (input.saving) return { ...base, status: 'saving' };
  if (hasUnsavedChanges && input.error) return { ...base, status: 'error', message: input.error };
  if (hasUnsavedChanges) return { ...base, status: 'pending' };
  return { ...base, status: 'synced' };
}
