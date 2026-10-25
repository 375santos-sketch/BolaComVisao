import React from 'react';
import { AnalysisFilters as IAnalysisFilters, EventTypeFilter } from '../../../lib/gameAnalysis';
import { MatchType, MatchLocation } from '../../../types';

interface AnalysisFiltersProps {
  filters: IAnalysisFilters;
  onFilterChange: (updated: Partial<IAnalysisFilters>) => void;
  onResetFilters: () => void;
  availableSeasons: string[];
  availableMonths: [string, string][];
  availableOpponents: string[];
  activeFiltersCount: number;
  showPanel: boolean;
  onTogglePanel: () => void;
  categoryDefaultHalfDuration: number;
}

export const AnalysisFilters: React.FC<AnalysisFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableSeasons,
  availableMonths,
  availableOpponents,
  activeFiltersCount,
  showPanel,
  onTogglePanel,
  categoryDefaultHalfDuration
}) => {
  return (
    <div className="ui-card p-4 sm:p-5 mb-6">
      {/* Top Quick Bar: Search + Event Type + Filter Toggle + Reset */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search & Event Quick Select */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          {/* Search Query */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar por adversário, torneio..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="ui-input w-full text-xs"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Event Type Filter Dropdown (Item 1) */}
          <div className="sm:w-64">
            <select
              value={filters.eventType}
              onChange={(e) => onFilterChange({ eventType: e.target.value as EventTypeFilter })}
              className={`w-full bg-slate-950/80 border rounded-2xl px-3.5 py-2.5 text-xs font-bold outline-none transition-all ${
                filters.eventType !== 'todos'
                  ? 'border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/30'
                  : 'border-slate-700/80 text-slate-200 focus:border-cyan-400'
              }`}
            >
              <optgroup label="📋 Todos">
                <option value="todos">Todos os Acontecimentos</option>
              </optgroup>
              <optgroup label="⚽ Golos Marcados (Origem)">
                <option value="golos">⚽ Todos os Golos Marcados</option>
                <option value="golos_bola_jogada">🎯 Golos: Bola Jogada</option>
                <option value="golos_recuperacao">⚡ Golos: Recuperação de Bola</option>
                <option value="golos_canto">🚩 Golos: Canto</option>
                <option value="golos_livre">📐 Golos: Livre</option>
                <option value="golos_penalti">🎯 Golos: Penálti</option>
                <option value="golos_pontape_baliza">🥅 Golos: Pontapé de Baliza</option>
                <option value="golos_ressalto">🔄 Golos: Ressalto</option>
              </optgroup>
              <optgroup label="🛡️ Defensivo">
                <option value="golos_sofridos">🥅 Golos Sofridos</option>
              </optgroup>
              <optgroup label="🚩 Bolas Paradas & Faltas">
                <option value="cantos">🚩 Cantos (Favor/Contra)</option>
                <option value="faltas_cometidas">⚠️ Faltas Cometidas</option>
                <option value="faltas_sofridas">🩹 Faltas Sofridas</option>
              </optgroup>
              <optgroup label="⚖️ Disciplina & Gestão">
                <option value="amarelos">🟨 Cartões Amarelos</option>
                <option value="vermelhos">🟥 Cartões Vermelhos</option>
                <option value="substituicoes">🔄 Substituições</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Buttons: More Filters & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePanel}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
              showPanel || activeFiltersCount > 0
                ? 'bg-cyan-500/10 border-cyan-400/60 text-cyan-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>⚙️ Filtros Avançados</span>
            {activeFiltersCount > 0 && (
              <span className="bg-cyan-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <span className="text-[10px]">{showPanel ? '▲' : '▼'}</span>
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Repor todos os filtros"
              className="ui-btn ui-btn-soft-danger px-3 py-2.5 text-xs"
            >
              ✕ Repor
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showPanel && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
          {/* Season Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              📅 Época
            </label>
            <select
              value={filters.season}
              onChange={(e) => onFilterChange({ season: e.target.value })}
              className="ui-input w-full text-xs"
            >
              <option value="todas">Todas as Épocas</option>
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">📆 Mês</label>
            <select
              value={filters.month}
              onChange={(e) => onFilterChange({ month: e.target.value })}
              className="ui-input w-full text-xs"
            >
              <option value="todos">Todos os Meses</option>
              {availableMonths.map(([yyyymm, label]) => (
                <option key={yyyymm} value={yyyymm}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Opponent Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              ⚔️ Adversário
            </label>
            <select
              value={filters.opponent}
              onChange={(e) => onFilterChange({ opponent: e.target.value })}
              className="ui-input w-full text-xs"
            >
              <option value="todos">Todos os Adversários</option>
              {availableOpponents.map((opp) => (
                <option key={opp} value={opp}>
                  {opp}
                </option>
              ))}
            </select>
          </div>

          {/* Competition Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              🏆 Competição
            </label>
            <select
              value={filters.matchType}
              onChange={(e) => onFilterChange({ matchType: e.target.value as MatchType | 'todos' })}
              className="ui-input w-full text-xs"
            >
              <option value="todos">Todas as Competições</option>
              <option value="campeonato">Campeonato / Liga</option>
              <option value="torneio">Torneio / Taça</option>
              <option value="amigavel">Jogo Amigável / Preparação</option>
            </select>
          </div>

          {/* Location (Home / Away) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              🏟️ Condição do Jogo
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'casa', label: '🏠 Casa' },
                { id: 'fora', label: '✈️ Fora' }
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onFilterChange({ location: loc.id as MatchLocation | 'todos' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    filters.location === loc.id
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Half Duration Setting (Item 2) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              ⏱️ Duração por Parte ({filters.halfDurationMinutes || categoryDefaultHalfDuration} min)
            </label>
            <select
              value={filters.halfDurationMinutes || categoryDefaultHalfDuration}
              onChange={(e) => onFilterChange({ halfDurationMinutes: parseInt(e.target.value, 10) })}
              className="ui-input w-full text-xs"
            >
              <option value={20}>20 min / parte (Total 40' • Petizes/Traquinas)</option>
              <option value={25}>25 min / parte (Total 50' • Benjamins)</option>
              <option value={30}>30 min / parte (Total 60' • Sub-11 / Infantis)</option>
              <option value={35}>35 min / parte (Total 70' • Sub-13 / Iniciados)</option>
              <option value={40}>40 min / parte (Total 80' • Sub-15 / Juvenis)</option>
              <option value={45}>45 min / parte (Total 90' • Sub-17 / Sub-19 / Seniores)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
