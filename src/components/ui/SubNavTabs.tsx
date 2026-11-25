import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
}

interface SubNavTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/** One level of tabs, the same look in every module: the active one in white with a green line under it. */
export const SubNavTabs: React.FC<SubNavTabsProps> = ({ tabs, activeTab, onChange, className = '' }) => (
  <div className={`flex gap-1 overflow-x-auto border-b border-ui-line [scrollbar-width:none] ${className}`}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
          className={`-mb-px flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-ui-body font-semibold transition-colors ${
            isActive ? 'border-ui-brand text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
          }`}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge !== null && (
            <span className="rounded-full bg-ui-surface-2 px-1.5 text-ui-caption font-bold tabular-nums text-ui-muted">
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
