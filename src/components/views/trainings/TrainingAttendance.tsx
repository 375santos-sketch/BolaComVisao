import React, { useState, useMemo } from 'react';
import { AppState, Player } from '../../../types';
import { t } from '../../../i18n/dict';
import { absenceReasonLabel, playerAbsences } from '../../../lib/trainingQuick';

interface PlayerAttendanceItem {
  player: Player;
  presences: number;
  absences: number;
  totalCompleted: number;
  pct: number;
}

interface TrainingAttendanceProps {
  state: AppState;
  completedCount: number;
  scheduledCount: number;
  teamAvgPct: number;
  topAttendant?: PlayerAttendanceItem;
  playerStats: PlayerAttendanceItem[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onGoToList: () => void;
}

export const TrainingAttendance: React.FC<TrainingAttendanceProps> = ({
  state,
  completedCount,
  scheduledCount,
  teamAvgPct,
  topAttendant,
  playerStats,
  onExportPDF,
  onExportExcel,
  onGoToList
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'pct' | 'num' | 'name'>('pct');
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'low'>('all');
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);

  const processedPlayerStats = useMemo(() => {
    return playerStats
      .filter((item) => {
        const p = item.player;
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.number !== null && String(p.number).includes(searchQuery)) ||
          p.positions.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterMode === 'high') return item.pct >= 80;
        if (filterMode === 'low') return item.pct < 50;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'pct') return b.pct - a.pct || b.presences - a.presences;
        if (sortMode === 'num') {
          const numA = a.player.number !== null ? a.player.number : 999;
          const numB = b.player.number !== null ? b.player.number : 999;
          return numA - numB;
        }
        return a.player.name.localeCompare(b.player.name);
      });
  }, [playerStats, searchQuery, sortMode, filterMode]);

  return (
    <div className="space-y-3.5 text-left">
      {/* Top KPI Cards (Based ONLY on Completed Trainings) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="ui-card p-2.5">
          <div className="text-[10px] text-emerald-400 font-['Chakra_Petch'] uppercase font-semibold flex items-center justify-center gap-1">
            <span>🟢</span>
            <span>Treinos Realizados</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{completedCount}</div>
          <div className="text-[9px] text-slate-400 font-mono">contabilizados</div>
        </div>

        <div className="ui-card p-2.5">
          <div className="text-[10px] text-amber-400 font-['Chakra_Petch'] uppercase font-semibold flex items-center justify-center gap-1">
            <span>🟡</span>
            <span>Treinos Agendados</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{scheduledCount}</div>
          <div className="text-[9px] text-slate-400 font-mono">a aguardar data</div>
        </div>

        <div className="ui-card p-2.5">
          <div className="text-[10px] text-cyan-400 font-['Chakra_Petch'] uppercase font-semibold">
            {t(state.lang, 'tr_avg_att')}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-0.5 ${
              teamAvgPct >= 80 ? 'text-emerald-400' : teamAvgPct >= 50 ? 'text-cyan-400' : 'text-red-400'
            }`}
          >
            {completedCount > 0 ? `${teamAvgPct}%` : '—'}
          </div>
          <div className="text-[9px] text-slate-400 font-mono">média da equipa</div>
        </div>

        <div className="ui-card p-2.5">
          <div className="text-[10px] text-cyan-400 font-['Chakra_Petch'] uppercase font-semibold">
            {t(state.lang, 'tr_top_att')}
          </div>
          <div className="text-xs font-bold font-mono text-emerald-400 truncate mt-1">
            {topAttendant && completedCount > 0
              ? `${topAttendant.player.name.split(' ')[0]} (${topAttendant.pct}%)`
              : '—'}
          </div>
          <div className="text-[9px] text-slate-400 font-mono">mais frequente</div>
        </div>
      </div>

      {/* Export PDF & Excel Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-bold uppercase tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          onClick={onExportPDF}
        >
          <span>📄</span>
          <span>Exportar PDF Oficial (BolaComVisao)</span>
        </button>

        <button
          type="button"
          className="ui-btn ui-btn-soft-success py-3 px-4 text-xs sm:text-sm flex items-center justify-center gap-2"
          onClick={onExportExcel}
        >
          <span>📊</span>
          <span>Exportar Excel (.xlsx)</span>
        </button>
      </div>

      {/* Interactive Chart Section Card */}
      <div className="ui-card p-3.5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/20">
          <div className="font-['Chakra_Petch'] font-bold text-sm text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>📈</span>
            <span>Gráfico de Presenças vs Treinos Realizados</span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400/80">{completedCount} Treinos Concluídos</div>
        </div>

        {/* Controls: Search, Sort & Filter */}
        <div className="space-y-2 mb-3.5">
          <input
            type="text"
            placeholder="Pesquisar por nome ou nº do atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input w-full text-xs"
          />

          <div className="flex gap-2">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="ui-input text-[11px]"
            >
              <option value="pct">Ordenar por {t(state.lang, 'tr_sort_pct')}</option>
              <option value="num">Ordenar por {t(state.lang, 'tr_sort_num')}</option>
              <option value="name">Ordenar por {t(state.lang, 'tr_sort_name')}</option>
            </select>

            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="ui-input text-[11px] flex-1"
            >
              <option value="all">{t(state.lang, 'tr_filter_all')}</option>
              <option value="high">{t(state.lang, 'tr_filter_high')}</option>
              <option value="low">{t(state.lang, 'tr_filter_low')}</option>
            </select>
          </div>
        </div>

        {/* Attendance Chart Bars List */}
        {completedCount === 0 ? (
          <div className="ui-inset py-8 text-center p-4">
            <div className="text-3xl mb-2">⏱️</div>
            <p className="text-sm font-['Chakra_Petch'] text-cyan-300 font-bold uppercase">
              Ainda não existem treinos concluídos.
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1 mb-3">
              Tens {scheduledCount} treinos planeados na lista. Para passarem para as estatísticas, abre a lista e clica
              em "Concluir Treino" após a realização da sessão.
            </p>
            <button type="button" onClick={onGoToList} className="ui-btn ui-btn-primary px-3 py-1.5 text-xs">
              Ver Lista de Treinos ➔
            </button>
          </div>
        ) : processedPlayerStats.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Nenhum jogador encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {processedPlayerStats.map((st) => {
              const p = st.player;
              const isHigh = st.pct >= 80;
              const isMed = st.pct >= 50 && st.pct < 80;

              return (
                <div key={p.id} className="ui-inset p-2.5 transition-colors">
                  {/* Player Info Row: tap to see the trainings missed */}
                  <button
                    type="button"
                    onClick={() => setOpenPlayerId(openPlayerId === p.id ? null : p.id)}
                    aria-expanded={openPlayerId === p.id}
                    className="w-full text-left flex items-center justify-between mb-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[11px] flex items-center justify-center">
                        {p.number !== null ? p.number : '—'}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block leading-tight">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.positions || 'Jogador'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-white">
                        {st.presences} / {completedCount}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        ({st.absences} {t(state.lang, 'tr_abss')}){' '}
                        {st.absences > 0 ? (openPlayerId === p.id ? '▲' : '▼') : ''}
                      </span>
                    </div>
                  </button>

                  {/* Visual Percentage Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="ui-card flex-1 h-3 overflow-hidden relative p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(0,230,118,0.6)]'
                            : isMed
                              ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,210,255,0.6)]'
                              : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        }`}
                        style={{ width: `${st.pct}%` }}
                      />
                    </div>

                    <span
                      className={`text-xs font-bold font-mono min-w-[38px] text-right ${
                        isHigh ? 'text-emerald-400' : isMed ? 'text-cyan-400' : 'text-red-400'
                      }`}
                    >
                      {st.pct}%
                    </span>
                  </div>

                  {openPlayerId === p.id && st.absences > 0 && (
                    <ul aria-label={`Faltas de ${p.name}`} className="mt-2 space-y-1 text-[11px] font-mono">
                      {playerAbsences(state.trainings || [], p.id).map((a) => {
                        const [y, m, d] = a.date.split('-');
                        return (
                          <li
                            key={a.trainingId}
                            className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800"
                          >
                            <span className="text-slate-300">
                              {d}/{m}/{y}
                              {a.trainingNumber ? ` · Treino ${a.trainingNumber}` : ''}
                            </span>
                            <span className={a.reason ? 'text-amber-300' : 'text-slate-500'}>
                              {absenceReasonLabel(a.reason)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
