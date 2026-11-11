import React from 'react';
import { Icon, IconName } from './Icon';

/** When a block has nothing yet: what will appear here and the one thing to do to get it. */
export const EmptyState: React.FC<{
  icon?: IconName;
  title: string;
  text?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}> = ({ icon = 'clipboard', title, text, action, compact = false }) => (
  <div className={`ui-inset flex flex-col items-center text-center ${compact ? 'gap-1.5 p-4' : 'gap-2 p-6'}`}>
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-surface-3 text-ui-muted" aria-hidden>
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <p className="text-ui-body font-bold text-ui-text">{title}</p>
    {text && <p className="max-w-sm text-ui-caption text-ui-muted">{text}</p>}
    {action && (
      <button type="button" onClick={action.onClick} className="ui-btn ui-btn-soft mt-1 px-3 py-1.5">
        {action.label}
      </button>
    )}
  </div>
);
