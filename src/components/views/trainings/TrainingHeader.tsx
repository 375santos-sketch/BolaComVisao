import React from 'react';
import { TrainingsTab } from './types';

interface TrainingHeaderProps {
  activeTab: TrainingsTab;
  setActiveTab: (tab: TrainingsTab) => void;
  totalTrainings: number;
  completedCount: number;
}

export const TrainingHeader: React.FC<TrainingHeaderProps> = ({
  activeTab,
  setActiveTab,
  totalTrainings,
  completedCount
}) => {
  const tabs: [TrainingsTab, string, number | null][] = [
    ['list', 'Lista', totalTrainings],
    ['stats', 'Assiduidade', completedCount],
    ['library', 'Exercícios', null]
  ];
  return (
    <div className="ui-card grid grid-cols-3 gap-1 mb-3 p-1 text-[13px] font-semibold">
      {tabs.map(([tab, label, count]) => (
        <button
          key={tab}
          type="button"
          aria-current={activeTab === tab ? 'page' : undefined}
          className={`py-2 px-1 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 ${
            activeTab === tab ? 'ui-btn-primary' : 'text-slate-400 hover:text-white hover:bg-slate-950/60'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {label}
          {count !== null && <span className="rounded-full bg-black/20 px-1.5 text-[11px]">{count}</span>}
        </button>
      ))}
    </div>
  );
};
