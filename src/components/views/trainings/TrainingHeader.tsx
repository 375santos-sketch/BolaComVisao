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
    ['list', 'Sessões', totalTrainings],
    ['stats', 'Presenças', completedCount],
    ['library', 'Exercícios', null]
  ];
  return (
    <div role="group" aria-label="Partes dos treinos" className="mb-4 flex gap-1 border-b border-ui-line">
      {tabs.map(([tab, label, count]) => (
        <button
          key={tab}
          type="button"
          aria-current={activeTab === tab ? 'page' : undefined}
          className={`-mb-px flex min-h-[40px] flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-ui-body font-bold transition-colors sm:flex-none sm:px-4 ${
            activeTab === tab ? 'border-ui-brand text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {label}
          {count !== null && (
            <span className="hidden rounded-full bg-ui-surface-3 px-1.5 text-ui-caption text-ui-muted sm:inline">
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
