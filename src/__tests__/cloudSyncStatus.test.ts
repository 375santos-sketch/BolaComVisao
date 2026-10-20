import { describe, it, expect } from 'vitest';
import { deriveCloudSyncStatus } from '../lib/cloudSyncStatus';

const base = { signedIn: true, online: true, saving: false, lastLocalMutationAt: 100, cloudSavedAt: 100 };

describe('Indicador de sincronização', () => {
  it('is "synced" only when the latest local change is confirmed in the cloud', () => {
    expect(deriveCloudSyncStatus(base).status).toBe('synced');
    expect(deriveCloudSyncStatus({ ...base, cloudSavedAt: 150 }).status).toBe('synced');
  });

  it('shows pending changes that never reached the cloud', () => {
    const s = deriveCloudSyncStatus({ ...base, lastLocalMutationAt: 200 });
    expect(s.status).toBe('pending');
    expect(s.hasUnsavedChanges).toBe(true);
  });

  it('shows the save error while changes are still unsaved', () => {
    const s = deriveCloudSyncStatus({ ...base, lastLocalMutationAt: 200, error: 'Quota' });
    expect(s).toMatchObject({ status: 'error', message: 'Quota' });
    // An old error no longer matters once everything is saved
    expect(deriveCloudSyncStatus({ ...base, error: 'Quota' }).status).toBe('synced');
  });

  it('prioritises offline and saving states', () => {
    expect(deriveCloudSyncStatus({ ...base, online: false, lastLocalMutationAt: 200 })).toMatchObject({
      status: 'offline',
      hasUnsavedChanges: true
    });
    expect(deriveCloudSyncStatus({ ...base, saving: true, lastLocalMutationAt: 200 }).status).toBe('saving');
  });

  it('is "local" without a cloud session and never reports unsaved changes', () => {
    expect(deriveCloudSyncStatus({ ...base, signedIn: false, lastLocalMutationAt: 200 })).toMatchObject({
      status: 'local',
      hasUnsavedChanges: false
    });
  });
});
