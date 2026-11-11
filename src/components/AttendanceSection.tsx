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
    bg: 'bg-ui-success-soft',
    text: 'text-ui-success',
    border: 'border-ui-success/50',
    icon: '🟢'
  },
  boa: {
    label: 'Boa (75–89%)',
    bg: 'bg-ui-brand-soft',
    text: 'text-ui-brand',
    border: 'border-ui-brand/50',
    icon: '🔵'
  },
  atencao: {
    label: 'Atenção (60–74%)',
    bg: 'bg-ui-warning-soft',
    text: 'text-ui-warning',
    border: 'border-ui-warning/50',
    icon: '🟡'
  },
  baixa: {
    label: 'Baixa (< 60%)',
    bg: 'bg-ui-danger-soft',
    text: 'text-ui-danger',
    border: 'border-ui-danger/50',
    icon: '🔴'
  }
};

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ state, onSelectPlayer }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AttendancePeriod>('30d');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | AttendanceCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState<'taxa' | 'nome' | 'presencas'>('taxa');
  const [sortDirection] = useState<'asc' | 'desc'>('asc');

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
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-ui-surface via-ui-inset to-ui-brand/40 border border-ui-brand/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-brand/20 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-base sm:text-lg font-bold text-ui-text font-['Chakra_Petch'] uppercase tracking-wider">
                Acompanhamento de Assiduidade
              </h3>
            </div>
            <p className="text-xs font-mono text-ui-muted mt-1">
              Avaliação de presenças nos treinos baseada estritamente em registos reais de assiduidade.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="ui-inset flex items-center gap-1 p-1 shrink-0">
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
                  selectedPeriod === tab.id
                    ? 'bg-ui-brand text-ui-brand-ink shadow-sm'
                    : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="ui-inset p-3">
            <span className="text-[10px] uppercase font-mono text-ui-muted block">Assiduidade Global</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-ui-brand font-['Chakra_Petch']">
                {attendanceData.totalTrainingsEvaluated > 0 ? `${attendanceData.teamAverageRate}%` : '—'}
              </span>
              {attendanceData.totalTrainingsEvaluated > 0 && attendanceData.teamTrend !== 'insuficiente' && (
                <span
                  className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                    attendanceData.teamTrend === 'melhorou'
                      ? 'text-ui-success'
                      : attendanceData.teamTrend === 'diminuiu'
                        ? 'text-ui-danger'
                        : 'text-ui-muted'
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
            <span className="text-[10px] text-ui-muted font-mono block mt-0.5">
              vs período anterior ({attendanceData.previousTeamAverageRate}%)
            </span>
          </div>

          <div className="ui-inset p-3">
            <span className="text-[10px] uppercase font-mono text-ui-muted block">Treinos Avaliados</span>
            <span className="text-2xl font-extrabold text-ui-text font-['Chakra_Petch'] mt-1 block">
              {attendanceData.totalTrainingsEvaluated}
            </span>
            <span className="text-[10px] text-ui-muted font-mono block mt-0.5">Sessões com presenças fechadas</span>
          </div>

          <div className="ui-inset p-3">
            <span className="text-[10px] uppercase font-mono text-ui-success block">Excelente / Boa (≥75%)</span>
            <span className="text-2xl font-extrabold text-ui-success font-['Chakra_Petch'] mt-1 block">
              {attendanceData.categoryCounts.excelente + attendanceData.categoryCounts.boa}
            </span>
            <span className="text-[10px] text-ui-muted font-mono block mt-0.5">Atletas com alto compromisso</span>
          </div>

          <div className="ui-inset p-3">
            <span className="text-[10px] uppercase font-mono text-ui-danger block">Atenção / Baixa (&lt;75%)</span>
            <span className="text-2xl font-extrabold text-ui-danger font-['Chakra_Petch'] mt-1 block">
              {attendanceData.categoryCounts.atencao + attendanceData.categoryCounts.baixa}
            </span>
            <span className="text-[10px] text-ui-muted font-mono block mt-0.5">Requerem acompanhamento</span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="ui-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
              categoryFilter === 'todas'
                ? 'bg-ui-brand text-ui-brand-ink shadow-sm'
                : 'bg-ui-inset text-ui-muted hover:text-ui-text border border-ui-line'
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
                    : 'bg-ui-inset text-ui-muted border-ui-line hover:border-ui-line-strong'
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
          <span className="absolute left-3 top-2.5 text-xs text-ui-muted">🔍</span>
          <input
            type="text"
            placeholder="Pesquisar atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input w-full text-xs"
          />
        </div>
      </div>

      {/* Table / Card List */}
      {sortedPlayers.length === 0 ? (
        <div className="ui-card p-8 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-['Chakra_Petch'] text-ui-brand font-bold">
            Nenhum atleta encontrado para o filtro selecionado.
          </p>
          <p className="text-xs font-mono text-ui-muted mt-1">
            Altere o período temporal ou limpe os filtros de pesquisa.
          </p>
        </div>
      ) : (
        <div className="ui-card overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-ui-inset/80 border-b border-ui-brand/20 text-[10px] font-['Chakra_Petch'] uppercase tracking-wider text-ui-muted font-bold">
            <div className="col-span-5 sm:col-span-4">Atleta</div>
            <div className="col-span-3 sm:col-span-2 text-center">Assiduidade</div>
            <div className="hidden sm:block sm:col-span-2 text-center">Presenças / Total</div>
            <div className="col-span-4 sm:col-span-2 text-center">Tendência</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Ação</div>
          </div>

          {/* Player Rows */}
          <div className="divide-y divide-ui-line/60">
            {sortedPlayers.map((p) => {
              const catCfg = CATEGORY_BADGES[p.category];

              return (
                <div
                  key={p.playerId}
                  onClick={() => onSelectPlayer && onSelectPlayer(p.playerId)}
                  className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-ui-surface-2/40 cursor-pointer transition-colors text-xs font-mono"
                >
                  {/* Name & Position */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-ui-inset border border-ui-brand/30 flex items-center justify-center text-[10px] font-bold text-ui-brand shrink-0">
                      {p.playerNumber !== null && p.playerNumber !== undefined ? `#${p.playerNumber}` : '⚽'}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-ui-text block truncate">{p.playerName}</span>
                      <span className="text-[10px] text-ui-muted block truncate">{p.position || 'Plantel'}</span>
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
                    <span className="text-ui-text font-bold">
                      {p.presences} <span className="text-ui-muted">/ {p.totalTrainings}</span>
                    </span>
                    {p.justifiedAbsences > 0 && (
                      <span className="text-[10px] text-ui-warning block">
                        ({p.justifiedAbsences} justificada{p.justifiedAbsences > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>

                  {/* Trend Indicator */}
                  <div className="col-span-4 sm:col-span-2 text-center">
                    {p.trend === 'insuficiente' ? (
                      <span className="text-[10px] text-ui-muted">Dados insuficientes</span>
                    ) : p.trend === 'melhorou' ? (
                      <span className="text-[11px] text-ui-success font-bold inline-flex items-center gap-0.5">
                        <span>↗</span>
                        <span>+{p.trendDiff}%</span>
                      </span>
                    ) : p.trend === 'diminuiu' ? (
                      <span className="text-[11px] text-ui-danger font-bold inline-flex items-center gap-0.5">
                        <span>↘</span>
                        <span>{p.trendDiff}%</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ui-muted">→ Estável</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPlayer) onSelectPlayer(p.playerId);
                      }}
                      className="ui-btn ui-btn-soft px-2.5 py-1 text-[10px]"
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
