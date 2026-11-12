import React, { useState } from 'react';
import { AppState } from '../../../types';
import { SquadSortBy, SquadSortDirection, SquadViewMode } from './types';
import { Icon, IconName } from '../../ui/Icon';
import { StatTile } from '../../ui/StatTile';
import { CompactSelect } from '../../ui/CompactSelect';

interface SquadToolbarProps {
  state: AppState;
  activeRosterCount: number;
  viewMode: SquadViewMode;
  setViewMode: (mode: SquadViewMode) => void;
  statusCounts: Record<string, number>;
  statusFilter: string;
  sectorFilter?: string;
  setSectorFilter?: (sector: string) => void;
  setStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SquadSortBy;
  setSortBy: (sort: SquadSortBy) => void;
  sortDirection: SquadSortDirection;
  setSortDirection: (dir: SquadSortDirection) => void;
  onOpenCreateModal: () => void;
  onOpenImportExcel: () => void;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
}

/** The icon of each action of the "⋯" menu (the system's icons, no emojis). */
const MENU_ICONS: Record<string, IconName> = {
  'Ver em grelha': 'more',
  'Ver em lista': 'more',
  'PDF do plantel': 'clipboard',
  'Fim de época (todos)': 'trophy',
  'Cromos de todos (PDF)': 'users',
  'Exportar para Excel': 'database',
  'Importar de Excel': 'plus',
  'Limpar o plantel': 'x'
};

// Available, injured and suspended are the tiles at the top; here the ones who cannot play today (injured or
// suspended, return dates counted) together, and the inactive athletes (rare)
const STATUSES: [string, string, string, string][] = [
  ['indisponivel', '⛔', 'indisponíveis hoje', 'indisponível hoje'],
  ['inativo', '⏸️', 'inativos', 'inativo']
];

/**
 * Equipa → Plantel, above the athletes: search, "+ Novo" and the less used actions under "⋯" (PDF, end of season,
 * Excel, clear), then one line with the availability counts (tap to filter) and the order.
 */
export const SquadToolbar: React.FC<SquadToolbarProps> = ({
  state,
  activeRosterCount,
  viewMode,
  setViewMode,
  statusCounts,
  statusFilter,
  setStatusFilter,
  sectorFilter = 'todos',
  setSectorFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  onOpenCreateModal,
  onOpenImportExcel,
  onUpdateState,
  onShowConfirm,
  onShowToast
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const noPlayers = () => {
    if (activeRosterCount > 0) return false;
    onShowToast('Não existem jogadores no plantel.');
    return true;
  };

  const actions: [string, () => void][] = [
    [
      'PDF do plantel',
      async () => {
        if (noPlayers()) return;
        const { generateSquadPDF } = await import('../../../lib/pdfUtils');
        generateSquadPDF(state);
        onShowToast('Plantel exportado em PDF 📄');
      }
    ],
    [
      'Fim de época (todos)',
      async () => {
        const players = (state.roster || []).filter((p) => p && p.active !== false);
        if (players.length === 0) {
          onShowToast('Não existem jogadores no plantel.');
          return;
        }
        const { generateSeasonFinalReportPDF } = await import('../../../lib/pdfUtils');
        await generateSeasonFinalReportPDF(players, state);
        onShowToast(`Relatórios de fim de época gerados (${players.length} atletas) 🏆`);
      }
    ],
    [
      'Cromos de todos (PDF)',
      async () => {
        if (noPlayers()) return;
        const { generatePlayerCardsPDF } = await import('../../../lib/pdfUtils');
        const n = await generatePlayerCardsPDF(state);
        onShowToast(`${n} cromos prontos a imprimir 🃏`);
      }
    ],
    [
      'Exportar para Excel',
      async () => {
        if (noPlayers()) return;
        const { exportSquadExcel } = await import('../../../lib/exportUtils');
        exportSquadExcel(state);
        onShowToast('Plantel exportado para Excel 📊');
      }
    ],
    ['Importar de Excel', onOpenImportExcel],
    ...(activeRosterCount > 0
      ? ([
          [
            'Limpar o plantel',
            () =>
              onShowConfirm('Tens a certeza que queres limpar todos os jogadores do plantel desta equipa?', () => {
                onUpdateState({ roster: [] });
                onShowToast('Plantel limpo.');
              })
          ]
        ] as [string, () => void][])
      : [])
  ];

  const tile = (key: string, label: string, tone: 'brand' | 'success' | 'danger' | 'warning', icon: IconName) => {
    const on = key === 'todos' ? statusFilter === 'todos' : statusFilter === key;
    const value = key === 'todos' ? activeRosterCount : statusCounts[key] || 0;
    return (
      <StatTile
        key={key}
        label={label}
        value={value}
        icon={icon}
        tone={value === 0 && key !== 'todos' ? 'neutral' : tone}
        onClick={() => setStatusFilter(on || key === 'todos' ? 'todos' : key)}
        className={on && key !== 'todos' ? '!border-ui-brand' : ''}
      />
    );
  };

  return (
    <div className="@container mb-3 space-y-2.5">
      {/* The squad over the stadium, in four figures that also filter the list */}
      <div className="squad-hero">
        <div className="min-w-0">
          <h2 className="bcv-title text-[30px] sm:text-[36px]">Plantel</h2>
          <p className="truncate text-ui-caption text-ui-muted">
            {[state.myClubName, state.category, state.season ? `Época ${state.season}` : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div role="group" aria-label="Resumo do plantel" className="grid grid-cols-2 gap-2 @xl:grid-cols-4 @xl:flex-1">
          {tile('todos', 'Atletas', 'brand', 'users')}
          {tile('disponivel', 'Disponíveis', 'success', 'ball')}
          {tile('lesionado', 'Lesionados', 'danger', 'plus')}
          {tile('suspenso', 'Suspensos', 'warning', 'clipboard')}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Procurar atleta</span>
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted pointer-events-none"
          />
          <input
            type="search"
            placeholder="Procurar atleta"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input w-full !pl-9 text-sm min-h-[42px]"
          />
        </label>
        {/* Cards (pictures, a little bigger) or the compact list (to go through 20 athletes quickly) */}
        <div
          role="group"
          aria-label="Ver o plantel em"
          className="flex h-[42px] shrink-0 rounded-ui-sm border border-ui-line bg-ui-surface-2 p-1"
        >
          {(
            [
              ['grelha', 'Cartões', 'users'],
              ['lista', 'Lista', 'clipboard']
            ] as const
          ).map(([mode, label, icon]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              aria-label={label}
              title={label}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 rounded-[8px] px-2.5 text-ui-caption font-bold ${
                viewMode === mode ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted hover:text-ui-text'
              }`}
            >
              <Icon name={icon} className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Mais ações do plantel"
            className="ui-btn ui-btn-secondary w-[42px] h-[42px] flex items-center justify-center"
          >
            <Icon name="more" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="Mais ações do plantel"
              className="ui-card absolute right-0 top-full mt-1.5 w-56 p-1.5 z-30 shadow-2xl"
            >
              {actions.map(([label, run]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    run();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ui-text hover:bg-ui-surface-2/70"
                >
                  <Icon name={MENU_ICONS[label] || 'more'} className="h-4 w-4 shrink-0 text-ui-muted" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="ui-btn ui-btn-primary h-[42px] px-3.5 text-sm flex items-center gap-1"
        >
          <Icon name="plus" className="w-4 h-4" strokeWidth={2.5} />
          Novo
        </button>
      </div>

      {setSectorFilter && (
        <div
          role="group"
          aria-label="Filtrar por setor"
          className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]"
        >
          {[
            ['todos', 'Todos'],
            ['gr', 'GR'],
            ['def', 'Defesas'],
            ['med', 'Médios'],
            ['ata', 'Avançados']
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sectorFilter === key}
              onClick={() => setSectorFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1 text-ui-caption font-bold transition-colors ${
                sectorFilter === key
                  ? 'border-ui-brand bg-ui-brand-soft text-ui-brand'
                  : 'border-ui-line text-ui-muted hover:text-ui-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs">
        <div role="group" aria-label="Filtrar por estado" className="flex items-center gap-1 overflow-x-auto">
          {STATUSES.map(([key, mark, label, one]) => {
            const count = statusCounts[key] || 0;
            const on = statusFilter === key;
            if (key !== 'disponivel' && count === 0 && !on) return null;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                title={on ? 'Mostrar todos' : `Mostrar só os ${label}`}
                onClick={() => setStatusFilter(on ? 'todos' : key)}
                className={`shrink-0 rounded-full border px-2.5 py-1 font-semibold ${
                  on ? 'border-ui-line-strong bg-ui-surface-2 text-ui-text' : 'border-transparent text-ui-text'
                }`}
              >
                {mark} <strong className="text-ui-text">{count}</strong> {count === 1 ? one : label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-ui-muted">
          Ordenar
          <CompactSelect
            label="Ordenar por"
            value={sortBy}
            onChange={(v) => setSortBy(v as SquadSortBy)}
            options={[
              ['posicao', 'Posição'],
              ['numero', 'Número'],
              ['nome', 'Nome']
            ]}
          />
        </span>
        <button
          type="button"
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          aria-label={sortDirection === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
          title="Trocar a ordem"
          className="shrink-0 rounded-full px-1.5 text-ui-text"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      {(statusFilter !== 'todos' || sectorFilter !== 'todos' || searchQuery.trim() !== '') && (
        <button
          type="button"
          onClick={() => {
            setStatusFilter('todos');
            setSectorFilter?.('todos');
            setSearchQuery('');
          }}
          className="text-xs font-semibold text-ui-brand"
        >
          ✕ Limpar filtros
        </button>
      )}
    </div>
  );
};
