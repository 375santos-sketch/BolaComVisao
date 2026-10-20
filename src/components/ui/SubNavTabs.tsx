import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export interface SubNavTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const SubNavTabs: React.FC<SubNavTabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      className={`flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isActive
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.25)] font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
