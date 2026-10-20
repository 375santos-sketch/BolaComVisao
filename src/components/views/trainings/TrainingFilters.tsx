import React from 'react';

interface TrainingFiltersProps {
  listFilter: 'scheduled' | 'completed';
  setListFilter: (filter: 'scheduled' | 'completed') => void;
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
    <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/20 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 font-['Chakra_Petch'] font-bold text-xs uppercase transition-colors"
              title="Eliminar todos os treinos desta equipa"
            >
              <span>🗑️ Limpar</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          A exibir {displayedCount}{' '}
          {listFilter === 'scheduled' ? `de ${scheduledCount} agendados` : `de ${completedCount} concluídos`}
        </div>
      </div>

      <input
        type="text"
        placeholder="Filtrar treinos por data (AAAA-MM-DD), foco ou notas..."
        value={listSearch}
        onChange={(e) => setListSearch(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
      />
    </div>
  );
};
