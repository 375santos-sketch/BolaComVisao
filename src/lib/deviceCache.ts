/**
 * F1.4 — Where this device keeps the club data: always per ACCOUNT and ORGANIZATION (club workspace), never one
 * copy shared by whoever signs in. Pure functions (the reading and writing is in storage.ts and clubCloud.ts).
 *
 * Before: one key for everyone ("coach-app-data-v1") and the sync markers per club only. A copy left by one
 * account could be shown to, or merged into, another account on the same device if the session changed without
 * signing out. Signing out still wipes everything (unchanged).
 */
import { UserAccount } from '../types';

/** The old single key (kept for the signed-out state and read once to move old devices to the new keys). */
export const LEGACY_STATE_KEY = 'coach-app-data-v1';
/** Which per-account key holds the state shown at start-up (the last account and organization used). */
export const ACTIVE_STATE_POINTER = 'bcv-state-active';
const STATE_PREFIX = 'bcv-state:';

/**
 * The club workspace (organization) an account works in. F1.4 keeps today's rule (its club, or "main"); F1.5
 * adds the organization found through the members, and the "main" fallback only goes away with the strict rules.
 */
export function workspaceIdOf(user: (Pick<UserAccount, 'clubId'> & { orgId?: string }) | null | undefined): string {
  const org = user?.orgId?.trim();
  if (org) return org;
  const club = user?.clubId?.trim();
  return club || 'main';
}

const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

/** The device key of the club data of this account in this organization (guests and signed-out: the old key). */
export function stateKeyFor(
  user: (Pick<UserAccount, 'id' | 'clubId'> & { orgId?: string }) | null | undefined
): string {
  if (!user?.id || user.id.startsWith('guest-')) return LEGACY_STATE_KEY;
  return `${STATE_PREFIX}${safe(user.id)}:${safe(workspaceIdOf(user))}`;
}

/** The device key of the sync markers (what this device knows to be equal in the cloud), per account and club. */
export const syncedKeyFor = (uid: string, workspaceId: string) =>
  `bcv-synced-records-${safe(uid)}-${safe(workspaceId)}`;
/** The old key of the sync markers (per club only), read once to move old devices. */
export const legacySyncedKey = (workspaceId: string) => `bcv-synced-records-${workspaceId}`;

/** Every device key that holds club data (all are wiped when signing out). */
export const isClubDataKey = (key: string) =>
  key === LEGACY_STATE_KEY || key === ACTIVE_STATE_POINTER || key.startsWith(STATE_PREFIX) || key.startsWith('bcv-');
