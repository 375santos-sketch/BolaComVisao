import React from 'react';
import { SyncState } from '../../types';
import { useCloudSync } from '../../lib/cloudSyncStatus';
import { getSyncView } from '../../lib/syncView';

interface SyncStatusBadgeProps {
  onClick?: () => void;
  /** Legacy sync info, used only when rendered outside the app's CloudSyncContext. */
  fallbackSyncInfo?: SyncState;
  className?: string;
}

/** Cloud save status button, shared by every header so they all tell the same (true) story. */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onClick, fallbackSyncInfo, className = '' }) => {
  const cloudSync = useCloudSync();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const sync = cloudSync || {
    status: !isOnline ? 'offline' : fallbackSyncInfo?.status === 'syncing' ? 'saving' : 'synced',
    hasUnsavedChanges: false,
    lastSavedAt: 0
  };
  const view = getSyncView(sync);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 min-h-[36px] sm:min-h-[32px] shrink-0 whitespace-nowrap rounded-xl font-mono text-[10px] font-bold border transition-all active:scale-95 cursor-pointer touch-manipulation ${view.className} ${className}`}
      title={view.title}
      aria-label={view.title}
      data-testid="sync-status"
      data-status={sync.status}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${view.dotClassName}`} />
      {view.alwaysShowLabel && <span className="sm:hidden">{view.shortLabel}</span>}
      <span className="hidden sm:inline">{view.label}</span>
    </button>
  );
};
