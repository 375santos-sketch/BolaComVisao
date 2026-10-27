import React, { useState } from 'react';
import { AppState } from '../../../types';
import { SquadSortBy, SquadSortDirection, SquadViewMode } from './types';
import { Icon } from '../../ui/Icon';
import { CompactSelect } from '../../ui/CompactSelect';

interface SquadToolbarProps {
  state: AppState;
  activeRosterCount: number;
  viewMode: SquadViewMode;
  setViewMode: (mode: SquadViewMode) => void;
  statusCounts: Record<string, number>;
  statusFilter: string;
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

const STATUSES: [string, string, string][] = [
  ['disponivel', '🟢', 'disponíveis'],
  ['lesionado', '🏥', 'lesionados'],
  ['suspenso', '🟨', 'suspensos'],
  ['inativo', '⏸️', 'inativos']
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
      viewMode === 'lista' ? '🔲 Ver em grelha' : '📜 Ver em lista',
      () => setViewMode(viewMode === 'lista' ? 'grelha' : 'lista')
    ],
    [
      '📄 PDF do plantel',
      async () => {
        if (noPlayers()) return;
        const { generateSquadPDF } = await import('../../../lib/pdfUtils');
        generateSquadPDF(state);
        onShowToast('Plantel exportado em PDF 📄');
      }
    ],
    [
      '🏆 Fim de época (todos)',
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
      '📊 Exportar para Excel',
      async () => {
        if (noPlayers()) return;
        const { exportSquadExcel } = await import('../../../lib/exportUtils');
        exportSquadExcel(state);
        onShowToast('Plantel exportado para Excel 📊');
      }
    ],
    ['📥 Importar de Excel', onOpenImportExcel],
    ...(activeRosterCount > 0
      ? ([
          [
            '🗑️ Limpar o plantel',
            () =>
              onShowConfirm('Tens a certeza que queres limpar todos os jogadores do plantel desta equipa?', () => {
                onUpdateState({ roster: [] });
                onShowToast('Plantel limpo.');
              })
          ]
        ] as [string, () => void][])
      : [])
  ];

  return (
    <div className="mb-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Procurar atleta</span>
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Procurar atleta"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input w-full !pl-9 text-sm min-h-[42px]"
          />
        </label>
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
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800/70"
                >
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

      <div className="flex items-center gap-1.5 text-xs">
        <div role="group" aria-label="Filtrar por estado" className="flex items-center gap-1 overflow-x-auto">
          {STATUSES.map(([key, mark, label]) => {
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
                  on ? 'border-slate-500 bg-slate-800 text-white' : 'border-transparent text-slate-300'
                }`}
              >
                {mark} <strong className="text-white">{count}</strong> {label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-slate-400">
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
          className="shrink-0 rounded-full px-1.5 text-slate-300"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      {(statusFilter !== 'todos' || searchQuery.trim() !== '') && (
        <button
          type="button"
          onClick={() => {
            setStatusFilter('todos');
            setSearchQuery('');
          }}
          className="text-xs font-semibold text-cyan-400"
        >
          ✕ Limpar filtros
        </button>
      )}
    </div>
  );
};
