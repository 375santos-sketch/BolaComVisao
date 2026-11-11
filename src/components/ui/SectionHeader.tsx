import React from 'react';

/** The title of a block of a screen, with an optional link on the right ("Ver todos ›"). */
export const SectionHeader: React.FC<{
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => (
  <div className={`flex items-end justify-between gap-3 px-1 ${className}`}>
    <div className="min-w-0">
      <h2 className="ui-kicker">{title}</h2>
      {subtitle && <p className="mt-0.5 text-ui-caption text-ui-muted">{subtitle}</p>}
    </div>
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="shrink-0 rounded-ui-sm text-ui-caption font-bold text-ui-brand hover:underline focus-visible:outline-2 focus-visible:outline-ui-brand"
      >
        {action.label} ›
      </button>
    )}
  </div>
);
