import React from 'react';
import { Icon } from '../../ui/Icon';
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
    <div className="mb-5">
      {/* Top Quick Bar: Search + Event Type + Filter Toggle + Reset */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search & Event Quick Select */}
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          {/* Search Query */}
          <div className="relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-muted"
            />
            <input
              type="text"
              placeholder="Pesquisar por adversário, torneio..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              aria-label="Pesquisar jogos"
              className="ui-input min-h-11 w-full !pl-9 text-ui-body"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: '' })}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-ui-sm text-ui-muted hover:text-ui-text"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Event Type Filter Dropdown (Item 1) */}
          <div className="sm:w-64">
            <select
              value={filters.eventType}
              onChange={(e) => onFilterChange({ eventType: e.target.value as EventTypeFilter })}
              aria-label="Tipo de acontecimento"
              className={`ui-input min-h-11 w-full text-ui-body font-semibold ${
                filters.eventType !== 'todos' ? '!border-ui-brand text-ui-brand' : ''
              }`}
            >
              <optgroup label="Todos">
                <option value="todos">Todos os Acontecimentos</option>
              </optgroup>
              <optgroup label="Golos Marcados (Origem)">
                <option value="golos">Todos os Golos Marcados</option>
                <option value="golos_bola_jogada">Golos: Bola Jogada</option>
                <option value="golos_recuperacao">Golos: Recuperação de Bola</option>
                <option value="golos_canto">Golos: Canto</option>
                <option value="golos_livre">Golos: Livre</option>
                <option value="golos_penalti">Golos: Penálti</option>
                <option value="golos_pontape_baliza">Golos: Pontapé de Baliza</option>
                <option value="golos_ressalto">Golos: Ressalto</option>
              </optgroup>
              <optgroup label="Defensivo">
                <option value="golos_sofridos">Golos Sofridos</option>
              </optgroup>
              <optgroup label="Bolas Paradas & Faltas">
                <option value="cantos">Cantos (Favor/Contra)</option>
                <option value="faltas_cometidas">Faltas Cometidas</option>
                <option value="faltas_sofridas">Faltas Sofridas</option>
              </optgroup>
              <optgroup label="Disciplina & Gestão">
                <option value="amarelos">Cartões Amarelos</option>
                <option value="vermelhos">Cartões Vermelhos</option>
                <option value="substituicoes">Substituições</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Buttons: More Filters & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePanel}
            aria-expanded={showPanel}
            className={`ui-btn ui-btn-secondary min-h-11 flex-1 px-4 text-ui-body sm:flex-none ${
              showPanel || activeFiltersCount > 0 ? '!border-ui-brand/60 text-ui-brand' : ''
            }`}
          >
            <span>Mais filtros</span>
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-ui-brand px-2 py-0.5 text-ui-caption font-bold tabular-nums text-ui-brand-ink">
                {activeFiltersCount}
              </span>
            )}
            <Icon name="chevronDown" className={`h-4 w-4 transition-transform ${showPanel ? 'rotate-180' : ''}`} />
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Repor todos os filtros"
              className="ui-btn ui-btn-secondary min-h-11 px-3 text-ui-body"
            >
              <Icon name="x" className="h-4 w-4" />
              Repor
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showPanel && (
        <div className="ui-card mt-3 grid grid-cols-1 gap-3 p-4 animate-fadeIn sm:grid-cols-2 lg:grid-cols-4">
          {/* Season Filter */}
          <div>
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">Época</label>
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
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">Mês</label>
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
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">Adversário</label>
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
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">Competição</label>
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
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">Condição do Jogo</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'casa', label: 'Casa' },
                { id: 'fora', label: 'Fora' }
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => onFilterChange({ location: loc.id as MatchLocation | 'todos' })}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    filters.location === loc.id
                      ? 'bg-ui-brand text-ui-brand-ink font-bold shadow-sm'
                      : 'bg-ui-inset/80 text-ui-text hover:bg-ui-surface-2'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Half Duration Setting (Item 2) */}
          <div>
            <label className="mb-1.5 block text-ui-caption font-semibold text-ui-muted">
              Duração por Parte ({filters.halfDurationMinutes || categoryDefaultHalfDuration} min)
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
