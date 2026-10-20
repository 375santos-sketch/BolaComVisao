import React, { useState } from 'react';
import { AppState, AttendancePeriod, AttendanceCategory } from '../types';
import { calculateAttendanceMetrics } from '../lib/intelligenceEngine';

interface AttendanceSectionProps {
  state: AppState;
  onNavigate: (tab: any, targetId?: string) => void;
  onShowToast: (msg: string) => void;
  onSelectPlayer?: (playerId: string) => void;
}

const CATEGORY_BADGES: Record<
  AttendanceCategory,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  excelente: {
    label: 'Excelente (≥ 90%)',
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-300',
    border: 'border-emerald-500/50',
    icon: '🟢'
  },
  boa: {
    label: 'Boa (75–89%)',
    bg: 'bg-cyan-950/80',
    text: 'text-cyan-300',
    border: 'border-cyan-500/50',
    icon: '🔵'
  },
  atencao: {
    label: 'Atenção (60–74%)',
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-500/50',
    icon: '🟡'
  },
  baixa: {
    label: 'Baixa (< 60%)',
    bg: 'bg-red-950/80',
    text: 'text-red-300',
    border: 'border-red-500/50',
    icon: '🔴'
  }
};

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  state,
  onNavigate,
  onShowToast,
  onSelectPlayer
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AttendancePeriod>('30d');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | AttendanceCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'taxa' | 'nome' | 'presencas'>('taxa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const attendanceData = calculateAttendanceMetrics(state, selectedPeriod);

  // Filtragem
  const filteredPlayers = attendanceData.playerSummaries.filter((p) => {
    const matchCategory = categoryFilter === 'todas' || p.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q || p.playerName.toLowerCase().includes(q) || (p.playerNumber !== null && String(p.playerNumber).includes(q));
    return matchCategory && matchSearch;
  });

  // Ordenação
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'taxa') diff = a.rate - b.rate;
    else if (sortBy === 'presencas') diff = a.presences - b.presences;
    else if (sortBy === 'nome') diff = a.playerName.localeCompare(b.playerName, 'pt-PT');
    return sortDirection === 'asc' ? diff : -diff;
  });

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* Top Banner / Team Stats Overview */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border border-cyan-500/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Acompanhamento de Assiduidade
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Avaliação de presenças nos treinos baseada estritamente em registos reais de assiduidade.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-cyan-500/30 shrink-0">
            {(
              [
                { id: '7d', label: '7 Dias' },
                { id: '30d', label: '30 Dias' },
                { id: '90d', label: '90 Dias' },
                { id: 'season', label: 'Época' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedPeriod === tab.id ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Assiduidade Global</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-cyan-300 font-['Chakra_Petch']">
                {attendanceData.totalTrainingsEvaluated > 0 ? `${attendanceData.teamAverageRate}%` : '—'}
              </span>
              {attendanceData.totalTrainingsEvaluated > 0 && attendanceData.teamTrend !== 'insuficiente' && (
                <span
                  className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                    attendanceData.teamTrend === 'melhorou'
                      ? 'text-emerald-400'
                      : attendanceData.teamTrend === 'diminuiu'
                        ? 'text-red-400'
                        : 'text-slate-400'
                  }`}
                >
                  {attendanceData.teamTrend === 'melhorou'
                    ? '↗ +'
                    : attendanceData.teamTrend === 'diminuiu'
                      ? '↘ '
                      : '→ '}
                  {attendanceData.teamTrendDiff !== 0 ? `${attendanceData.teamTrendDiff}%` : 'Estável'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              vs período anterior ({attendanceData.previousTeamAverageRate}%)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Treinos Avaliados</span>
            <span className="text-2xl font-extrabold text-white font-['Chakra_Petch'] mt-1 block">
              {attendanceData.totalTrainingsEvaluated}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Sessões com presenças fechadas</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
            <span className="text-[10px] uppercase font-mono text-emerald-400 block">Excelente / Boa (≥75%)</span>
            <span className="text-2xl font-extrabold text-emerald-300 font-['Chakra_Petch'] mt-1 block">
              {attendanceData.categoryCounts.excelente + attendanceData.categoryCounts.boa}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Atletas com alto compromisso</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-red-500/30">
            <span className="text-[10px] uppercase font-mono text-red-400 block">Atenção / Baixa (&lt;75%)</span>
            <span className="text-2xl font-extrabold text-red-300 font-['Chakra_Petch'] mt-1 block">
              {attendanceData.categoryCounts.atencao + attendanceData.categoryCounts.baixa}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Requerem acompanhamento</span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-cyan-500/20">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'todas'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({attendanceData.playerSummaries.length})
          </button>

          {(['excelente', 'boa', 'atencao', 'baixa'] as const).map((cat) => {
            const cfg = CATEGORY_BADGES[cat];
            const count = attendanceData.categoryCounts[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                  categoryFilter === cat
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>
      </div>

      {/* Table / Card List */}
      {sortedPlayers.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-['Chakra_Petch'] text-cyan-300 font-bold">
            Nenhum atleta encontrado para o filtro selecionado.
          </p>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Altere o período temporal ou limpe os filtros de pesquisa.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-sm">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-slate-950/80 border-b border-cyan-500/20 text-[10px] font-['Chakra_Petch'] uppercase tracking-wider text-slate-400 font-bold">
            <div className="col-span-5 sm:col-span-4">Atleta</div>
            <div className="col-span-3 sm:col-span-2 text-center">Assiduidade</div>
            <div className="hidden sm:block sm:col-span-2 text-center">Presenças / Total</div>
            <div className="col-span-4 sm:col-span-2 text-center">Tendência</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Ação</div>
          </div>

          {/* Player Rows */}
          <div className="divide-y divide-slate-800/60">
            {sortedPlayers.map((p) => {
              const catCfg = CATEGORY_BADGES[p.category];

              return (
                <div
                  key={p.playerId}
                  onClick={() => onSelectPlayer && onSelectPlayer(p.playerId)}
                  className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-800/40 cursor-pointer transition-colors text-xs font-mono"
                >
                  {/* Name & Position */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 shrink-0">
                      {p.playerNumber !== null && p.playerNumber !== undefined ? `#${p.playerNumber}` : '⚽'}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{p.playerName}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.position || 'Plantel'}</span>
                    </div>
                  </div>

                  {/* Rate & Category Badge */}
                  <div className="col-span-3 sm:col-span-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}
                    >
                      <span>{p.totalTrainings > 0 ? `${p.rate}%` : '—'}</span>
                    </span>
                  </div>

                  {/* Presences / Total */}
                  <div className="hidden sm:block sm:col-span-2 text-center">
                    <span className="text-slate-300 font-bold">
                      {p.presences} <span className="text-slate-500">/ {p.totalTrainings}</span>
                    </span>
                    {p.justifiedAbsences > 0 && (
                      <span className="text-[10px] text-amber-400 block">
                        ({p.justifiedAbsences} justificada{p.justifiedAbsences > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>

                  {/* Trend Indicator */}
                  <div className="col-span-4 sm:col-span-2 text-center">
                    {p.trend === 'insuficiente' ? (
                      <span className="text-[10px] text-slate-500">Dados insuficientes</span>
                    ) : p.trend === 'melhorou' ? (
                      <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center gap-0.5">
                        <span>↗</span>
                        <span>+{p.trendDiff}%</span>
                      </span>
                    ) : p.trend === 'diminuiu' ? (
                      <span className="text-[11px] text-red-400 font-bold inline-flex items-center gap-0.5">
                        <span>↘</span>
                        <span>{p.trendDiff}%</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">→ Estável</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPlayer) onSelectPlayer(p.playerId);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[10px] font-['Chakra_Petch'] font-bold uppercase transition-all"
                    >
                      Ver Perfil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
