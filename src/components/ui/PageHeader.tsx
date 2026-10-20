import React from 'react';

export interface PageHeaderProps {
  category?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  description,
  action,
  secondaryAction,
  badge,
  children,
  className = ''
}) => {
  return (
    <div className={`mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-slate-800/80 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          {category && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {category}
              </span>
              {badge}
            </div>
          )}
          <h1 className="text-lg sm:text-xl md:text-2xl font-black font-['Chakra_Petch'] uppercase tracking-wider text-white truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5 max-w-2xl line-clamp-2">{description}</p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:self-start">
            {secondaryAction}
            {action}
          </div>
        )}
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};
