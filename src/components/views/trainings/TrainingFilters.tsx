import React from 'react';
import { TrainingListFilter } from './hooks/useTrainingFilters';

interface TrainingFiltersProps {
  listFilter: TrainingListFilter;
  setListFilter: (filter: TrainingListFilter) => void;
  listSearch: string;
  setListSearch: (search: string) => void;
  scheduledCount: number;
  completedCount: number;
  totalTrainings: number;
  displayedCount: number;
  onClearAllTrainings: () => void;
}

export const TrainingFilters: React.FC<TrainingFiltersProps> = ({
  listFilter,
  setListFilter,
  listSearch,
  setListSearch,
  scheduledCount,
  completedCount,
  totalTrainings,
  displayedCount,
  onClearAllTrainings
}) => {
  const chip = (key: TrainingListFilter, label: string, count: number) => (
    <button
      type="button"
      aria-pressed={listFilter === key}
      onClick={() => setListFilter(key)}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        listFilter === key ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-800 text-slate-400'
      }`}
    >
      {label} {count}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {chip('all', 'Todos', totalTrainings)}
        {chip('scheduled', 'Por fazer', scheduledCount)}
        {chip('completed', 'Feitos', completedCount)}
        {totalTrainings > 0 && (
          <button
            type="button"
            onClick={onClearAllTrainings}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-rose-300"
            title="Eliminar todos os treinos desta equipa"
          >
            🗑️ Limpar
          </button>
        )}
      </div>
      <input
        type="search"
        placeholder="Procurar por data (AAAA-MM-DD), foco ou notas"
        value={listSearch}
        onChange={(e) => setListSearch(e.target.value)}
        className="ui-input w-full text-xs"
        aria-label={`Procurar treinos (a mostrar ${displayedCount})`}
      />
    </div>
  );
};
