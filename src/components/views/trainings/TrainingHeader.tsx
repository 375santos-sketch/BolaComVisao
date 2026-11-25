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
    <div
      role="group"
      aria-label="Partes dos treinos"
      className="mb-4 flex gap-1 rounded-ui border border-ui-line bg-ui-surface p-1 sm:inline-flex"
    >
      {tabs.map(([tab, label, count]) => (
        <button
          key={tab}
          type="button"
          aria-current={activeTab === tab ? 'page' : undefined}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-ui-sm px-3 text-ui-body font-semibold transition-colors sm:flex-none sm:px-4 ${
            activeTab === tab ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted hover:text-ui-text'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {label}
          {count !== null && (
            <span className="hidden text-ui-caption tabular-nums text-ui-muted sm:inline">{count}</span>
          )}
        </button>
      ))}
    </div>
  );
};
