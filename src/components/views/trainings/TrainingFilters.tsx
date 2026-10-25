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
  return (
    <div className="ui-card p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setListFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase border transition-all flex items-center gap-1.5 ${
              listFilter === 'all'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                : 'bg-slate-950 text-cyan-300/80 border-slate-800 hover:border-cyan-500/40'
            }`}
          >
            <span>Todos</span>
            <span className="font-mono text-[10px] bg-slate-950/40 px-1.5 rounded-full">{totalTrainings}</span>
          </button>

          <button
            type="button"
            onClick={() => setListFilter('scheduled')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase border transition-all flex items-center gap-1.5 ${
              listFilter === 'scheduled'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-950 text-amber-300/80 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <span>🟡 Agendados</span>
            <span className="font-mono text-[10px] bg-slate-950/40 px-1.5 rounded-full">{scheduledCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setListFilter('completed')}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase border transition-all flex items-center gap-1.5 ${
              listFilter === 'completed'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                : 'bg-slate-950 text-emerald-300/80 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <span>🟢 Concluídos</span>
            <span className="font-mono text-[10px] bg-slate-950/40 px-1.5 rounded-full">{completedCount}</span>
          </button>

          {totalTrainings > 0 && (
            <button
              type="button"
              onClick={onClearAllTrainings}
              className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
              title="Eliminar todos os treinos desta equipa"
            >
              <span>🗑️ Limpar</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          A exibir {displayedCount}{' '}
          {listFilter === 'all'
            ? `de ${totalTrainings} · próximos primeiro`
            : listFilter === 'scheduled'
              ? `de ${scheduledCount} agendados`
              : `de ${completedCount} concluídos`}
        </div>
      </div>

      <input
        type="text"
        placeholder="Filtrar treinos por data (AAAA-MM-DD), foco ou notas..."
        value={listSearch}
        onChange={(e) => setListSearch(e.target.value)}
        className="ui-input w-full text-xs"
      />
    </div>
  );
};
