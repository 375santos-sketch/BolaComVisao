import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-2xl mb-3 shadow-inner text-cyan-400">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] uppercase tracking-wider text-white mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-400 font-mono max-w-md mb-5 leading-relaxed">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {secondaryActionLabel && onSecondaryAction && (
            <Button type="button" variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button type="button" variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
