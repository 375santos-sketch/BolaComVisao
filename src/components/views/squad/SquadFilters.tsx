import React from 'react';
import { SquadSortBy, SquadSortDirection } from './types';

interface SquadFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: SquadSortBy;
  setSortBy: (sort: SquadSortBy) => void;
  sortDirection: SquadSortDirection;
  setSortDirection: (dir: SquadSortDirection) => void;
}

export const SquadFilters: React.FC<SquadFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection
}) => {
  return (
    <div className="ui-card p-3 sm:p-4 mb-4 space-y-3">
      {/* Top line: Search Bar + Clear button */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar por nome, número ou posição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input w-full text-xs sm:text-sm min-h-[40px]"
          />
        </div>

        {(statusFilter !== 'todos' || searchQuery.trim() !== '') && (
          <button
            onClick={() => {
              setStatusFilter('todos');
              setSearchQuery('');
            }}
            className="ui-btn ui-btn-secondary px-3 py-2 min-h-[40px] text-xs whitespace-nowrap touch-manipulation flex items-center justify-center gap-1"
            title="Limpar todos os filtros de pesquisa e estado"
          >
            <span>Limpar Filtros</span>
            <span>✖</span>
          </button>
        )}
      </div>

      {/* Bottom line: Sorting buttons (Posição, Número, Nome) + Order Direction Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-cyan-500/20 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1 text-[11px]">
            <span>🔃</span>
            <span>Ordenar:</span>
          </span>

          {/* Posição */}
          <button
            onClick={() => setSortBy('posicao')}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg border font-bold transition-all flex items-center gap-1 active:scale-95 touch-manipulation ${
              sortBy === 'posicao'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-white'
            }`}
            title="Ordenar por posição tática no campo (GR, Defesas, Médios, Avançados)"
          >
            <span>🧤</span>
            <span>Posição</span>
          </button>

          {/* Número */}
          <button
            onClick={() => setSortBy('numero')}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg border font-bold transition-all flex items-center gap-1 active:scale-95 touch-manipulation ${
              sortBy === 'numero'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-white'
            }`}
            title="Ordenar sequencialmente pelo número da camisola (#1, #2, #3...)"
          >
            <span>🔢</span>
            <span>Número</span>
          </button>

          {/* Nome */}
          <button
            onClick={() => setSortBy('nome')}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg border font-bold transition-all flex items-center gap-1 active:scale-95 touch-manipulation ${
              sortBy === 'nome'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-white'
            }`}
            title="Ordenar alfabeticamente pelo nome do atleta (A a Z)"
          >
            <span>🔤</span>
            <span>Nome</span>
          </button>
        </div>

        {/* Sort Direction Toggle */}
        <div className="flex items-center gap-1 ml-auto sm:ml-0">
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="ui-btn ui-btn-soft px-2.5 sm:px-3 py-1.5 min-h-[36px] flex items-center gap-1.5 touch-manipulation"
            title={
              sortDirection === 'asc'
                ? 'Ordem Crescente (clique para alternar para Decrescente)'
                : 'Ordem Decrescente (clique para alternar para Crescente)'
            }
          >
            <span>{sortDirection === 'asc' ? '⬆️' : '⬇️'}</span>
            <span>
              {sortBy === 'nome'
                ? sortDirection === 'asc'
                  ? 'A ➔ Z'
                  : 'Z ➔ A'
                : sortBy === 'numero'
                  ? sortDirection === 'asc'
                    ? 'Menor ➔ Maior'
                    : 'Maior ➔ Menor'
                  : sortDirection === 'asc'
                    ? 'Crescente'
                    : 'Decrescente'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
