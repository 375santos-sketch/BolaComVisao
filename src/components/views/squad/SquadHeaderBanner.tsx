import React from 'react';
import { AppState } from '../../../types';
import { SquadViewMode } from './types';

interface SquadHeaderBannerProps {
  state: AppState;
  activeRosterCount: number;
  viewMode: SquadViewMode;
  setViewMode: (mode: SquadViewMode) => void;
  statusCounts: Record<string, number>;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportExcel: () => void;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
}

export const SquadHeaderBanner: React.FC<SquadHeaderBannerProps> = ({
  state,
  activeRosterCount,
  viewMode,
  setViewMode,
  statusCounts,
  statusFilter,
  setStatusFilter,
  onOpenCreateModal,
  onOpenImportExcel,
  onUpdateState,
  onShowConfirm,
  onShowToast
}) => {
  return (
    <div className="ui-card p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] uppercase text-white flex items-center gap-2">
              <span>📋 Plantel de Jogadores</span>
            </h2>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-bold">
              {activeRosterCount} Atletas
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400">
            Visualização estruturada por ordem tática com marca de água BolaComVisão.
          </p>
        </div>

        {/* Action Buttons: Add Player + PDF/Excel Export + View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="ui-inset flex items-center p-0.5 font-mono text-xs">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'lista' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-cyan-300/70 hover:text-white'
              }`}
              title="Visualização em Lista (Foto - Posição - Nº - Nome)"
            >
              <span>📜 Lista</span>
            </button>
            <button
              onClick={() => setViewMode('grelha')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'grelha' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-cyan-300/70 hover:text-white'
              }`}
              title="Visualização em Grelha / Cartões"
            >
              <span>🔲 Grelha</span>
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={async () => {
              if (activeRosterCount === 0) {
                onShowToast('Não existem jogadores no plantel.');
                return;
              }
              const { generateSquadPDF } = await import('../../../lib/pdfUtils');
              generateSquadPDF(state);
              onShowToast('Plantel exportado em PDF com marca de água BolaComVisao! 📄');
            }}
            className="ui-btn ui-btn-soft px-3 py-2 text-xs flex items-center gap-1.5"
            title="Gerar PDF do Plantel com marca de água BolaComVisao"
          >
            <span>📄 PDF</span>
          </button>

          {/* End-of-season report: one PDF with every active athlete (one per page, to print for the families) */}
          <button
            onClick={async () => {
              const players = (state.roster || []).filter((p) => p && p.active !== false);
              if (players.length === 0) {
                onShowToast('Não existem jogadores no plantel.');
                return;
              }
              const { generateSeasonFinalReportPDF } = await import('../../../lib/pdfUtils');
              await generateSeasonFinalReportPDF(players, state);
              onShowToast(`Relatórios de fim de época gerados (${players.length} atletas) 🏆`);
            }}
            className="ui-btn ui-btn-soft-warning px-3 py-2 text-xs flex items-center gap-1.5"
            title="Relatório de fim de época de todos os atletas (um PDF, uma página por atleta)"
          >
            <span>🏆 Fim de época</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={async () => {
              if (activeRosterCount === 0) {
                onShowToast('Não existem jogadores no plantel.');
                return;
              }
              const { exportSquadExcel } = await import('../../../lib/exportUtils');
              exportSquadExcel(state);
              onShowToast('Plantel exportado para Excel (.xlsx) com sucesso! 📊');
            }}
            className="ui-btn ui-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
            title="Exportar Plantel para Excel com marca de água BolaComVisao"
          >
            <span>📊 Exportar</span>
          </button>

          {/* Clear All Players Button */}
          {activeRosterCount > 0 && (
            <button
              onClick={() => {
                onShowConfirm('Tens a certeza que queres limpar todos os jogadores do plantel desta equipa?', () => {
                  onUpdateState({ roster: [] });
                  onShowToast('Plantel limpo com sucesso.');
                });
              }}
              className="ui-btn ui-btn-secondary px-2.5 py-2 text-xs"
              title="Limpar todos os jogadores do plantel desta equipa"
            >
              <span>🗑️ Limpar</span>
            </button>
          )}

          {/* Import Excel Button */}
          <button
            onClick={onOpenImportExcel}
            className="ui-btn ui-btn-soft-success px-3.5 py-2 text-xs flex items-center gap-1.5"
            title="Importar atletas de um ficheiro Excel (.xlsx, .xls, .csv)"
          >
            <span>📥</span>
            <span>Importar Excel</span>
          </button>

          {/* Add Player Button */}
          <button
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>➕ Novo</span>
          </button>
        </div>
      </div>

      {/* Status Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-cyan-500/20 text-center text-xs font-mono">
        <button
          onClick={() => setStatusFilter(statusFilter === 'disponivel' ? 'todos' : 'disponivel')}
          className={`p-2 rounded-xl border transition-all ${
            statusFilter === 'disponivel'
              ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/40'
          }`}
        >
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">🟢 Disponíveis</div>
          <div className="text-base font-bold text-white mt-0.5">{statusCounts['disponivel'] || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'lesionado' ? 'todos' : 'lesionado')}
          className={`p-2 rounded-xl border transition-all ${
            statusFilter === 'lesionado'
              ? 'bg-red-950 border-red-400 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-red-500/40'
          }`}
        >
          <div className="text-[10px] text-red-400 uppercase tracking-wider font-bold">🏥 Lesionados</div>
          <div className="text-base font-bold text-white mt-0.5">{statusCounts['lesionado'] || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'suspenso' ? 'todos' : 'suspenso')}
          className={`p-2 rounded-xl border transition-all ${
            statusFilter === 'suspenso'
              ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-amber-500/40'
          }`}
        >
          <div className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">🟨 Suspensos</div>
          <div className="text-base font-bold text-white mt-0.5">{statusCounts['suspenso'] || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'inativo' ? 'todos' : 'inativo')}
          className={`p-2 rounded-xl border transition-all ${
            statusFilter === 'inativo'
              ? 'bg-slate-800 border-slate-400 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">⏸️ Inativos</div>
          <div className="text-base font-bold text-white mt-0.5">{statusCounts['inativo'] || 0}</div>
        </button>
      </div>
    </div>
  );
};
