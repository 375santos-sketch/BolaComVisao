import React, { useState } from 'react';
import type { ShowConfirm } from '../../ConfirmModal';
import { ERASE_WORD } from '../../../lib/destructiveActions';
import { AppState } from '../../../types';
import { SquadSortBy, SquadSortDirection, SquadViewMode } from './types';
import { Icon, IconName } from '../../ui/Icon';
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
  onShowConfirm: ShowConfirm;
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
const STATUSES: [string, IconName, string, string][] = [
  ['indisponivel', 'alert', 'indisponíveis hoje', 'indisponível hoje'],
  ['inativo', 'x', 'inativos', 'inativo']
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
              onShowConfirm(
                'Limpar todos os atletas do plantel desta equipa, com as fichas, avaliações e testes?',
                () => {
                  onUpdateState({ roster: [] });
                  onShowToast('Plantel limpo.');
                },
                { confirmWord: ERASE_WORD }
              )
          ]
        ] as [string, () => void][])
      : [])
  ];

  /** One figure of the strip: tap to show only those athletes (tap again for all). */
  const figure = (key: string, label: string, tone: 'brand' | 'success' | 'danger' | 'warning') => {
    const on = key !== 'todos' && statusFilter === key;
    const value = key === 'todos' ? activeRosterCount : statusCounts[key] || 0;
    const color =
      value === 0 && key !== 'todos'
        ? 'text-ui-muted'
        : { brand: 'text-ui-text', success: 'text-ui-success', danger: 'text-ui-danger', warning: 'text-ui-warning' }[
            tone
          ];
    return (
      <button
        key={key}
        type="button"
        aria-pressed={key === 'todos' ? statusFilter === 'todos' : on}
        aria-label={`${label}: ${value}`}
        onClick={() => setStatusFilter(on || key === 'todos' ? 'todos' : key)}
        className={`flex min-h-[64px] flex-col justify-center gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-ui-surface-2 ${
          on ? 'bg-ui-surface-2 shadow-[inset_0_-2px_0_var(--color-ui-brand)]' : ''
        }`}
      >
        <span className={`text-ui-title font-bold tabular-nums ${color}`}>{value}</span>
        <span className="text-ui-caption text-ui-muted">{label}</span>
      </button>
    );
  };

  return (
    <div className="@container mb-3 space-y-2.5">
      {/* The squad in four figures, in one strip; each figure also filters the list */}
      <div
        role="group"
        aria-label="Resumo do plantel"
        className="ui-card grid grid-cols-4 divide-x divide-ui-line overflow-hidden"
      >
        {figure('todos', 'Atletas', 'brand')}
        {figure('disponivel', 'Disponíveis', 'success')}
        {figure('lesionado', 'Lesionados', 'danger')}
        {figure('suspenso', 'Suspensos', 'warning')}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <label className="relative min-w-0 basis-full sm:flex-1 sm:basis-auto">
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
            className="ui-input w-full !pl-9 text-sm min-h-11"
          />
        </label>
        {/* Cards (pictures, a little bigger) or the compact list (to go through 20 athletes quickly) */}
        <div
          role="group"
          aria-label="Ver o plantel em"
          className="flex h-11 shrink-0 rounded-ui-sm border border-ui-line bg-ui-surface-2 p-1"
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
            className="ui-btn ui-btn-secondary w-11 h-11 flex items-center justify-center"
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
          className="ui-btn ui-btn-primary ml-auto h-11 px-4 text-ui-body flex items-center gap-1 sm:ml-0"
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
              className={`min-h-10 shrink-0 rounded-full border px-3.5 text-ui-caption font-bold transition-colors ${
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
          {STATUSES.map(([key, icon, label, one]) => {
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
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 font-semibold ${
                  on ? 'border-ui-line-strong bg-ui-surface-2 text-ui-text' : 'border-transparent text-ui-text'
                }`}
              >
                <Icon
                  name={icon}
                  className={`h-3.5 w-3.5 ${key === 'indisponivel' ? 'text-ui-warning' : 'text-ui-muted'}`}
                />
                <strong className="text-ui-text">{count}</strong> {count === 1 ? one : label}
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
          className="min-h-9 text-ui-caption font-bold text-ui-brand"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
};
