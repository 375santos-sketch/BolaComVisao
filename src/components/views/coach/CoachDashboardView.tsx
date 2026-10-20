import React, { useState, useMemo } from 'react';
import { AppState, Match } from '../../../types';
import {
  CoachViewFilter,
  CoachFilterMode,
  computeCoachViewData
} from '../../../lib/gameAnalysis';
import { SquadGoalsAndAssistsModal, GoalsAssistsTab } from '../../SquadGoalsAndAssistsModal';

interface CoachDashboardViewProps {
  state: AppState;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenDetailedAnalysis?: (subTab?: string) => void;
  onShowToast?: (msg: string) => void;
}

export const CoachDashboardView: React.FC<CoachDashboardViewProps> = ({
  state,
  onNavigate,
  onOpenDetailedAnalysis,
  onShowToast
}) => {
  const [showGoalsAssistsModal, setShowGoalsAssistsModal] = useState(false);
  const [goalsAssistsModalTab, setGoalsAssistsModalTab] = useState<GoalsAssistsTab>('marcadores');
  const currentSeason = state.season || '2026/27';
  const category = state.category || 'Sub-11';
  const clubName = state.myClubName || 'Dragões de Alferrarede';

  // Filter State
  const [filter, setFilter] = useState<CoachViewFilter>({
    mode: 'season',
    season: currentSeason
  });

  // Extract available seasons, months, opponents and matches
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    if (state.season) set.add(state.season);
    (state.matches || []).forEach((m) => {
      if (m.season) set.add(m.season);
    });
    if (state.seasons) {
      state.seasons.forEach((s) => set.add(s.name));
    }
    return Array.from(set);
  }, [state.matches, state.season, state.seasons]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    (state.matches || []).forEach((m) => {
      if (m.date && m.date.length >= 7) {
        const yyyymm = m.date.slice(0, 7);
        if (!map.has(yyyymm)) {
          const [y, mth] = yyyymm.split('-');
          const dateObj = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, 1);
          const monthName = dateObj.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
          map.set(yyyymm, monthName.charAt(0).toUpperCase() + monthName.slice(1));
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [state.matches]);

  const availableOpponents = useMemo(() => {
    const set = new Set<string>();
    (state.matches || []).forEach((m) => {
      if (m.opponent && m.opponent.trim()) {
        set.add(m.opponent.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [state.matches]);

  const finishedMatchesList = useMemo(() => {
    return (state.matches || [])
      .filter((m) => !!m.finished)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.matches]);

  // Compute Coach View Model
  const coachData = useMemo(() => {
    return computeCoachViewData(state.matches || [], filter, category, currentSeason, state.roster || []);
  }, [state.matches, filter, category, currentSeason, state.roster]);

  const isFiltered = filter.mode !== 'season' || (filter.season && filter.season !== currentSeason);

  const handleResetFilter = () => {
    setFilter({
      mode: 'season',
      season: currentSeason
    });
    onShowToast?.('Filtro reposto para a época atual ✓');
  };

  const handleOpenDetailed = (subTab?: string) => {
    if (onOpenDetailedAnalysis) {
      onOpenDetailedAnalysis(subTab);
    } else {
      onNavigate('analise_jogos', subTab);
    }
  };

  const handleOpenMatch = (matchId: string) => {
    onNavigate('jogos', matchId);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 max-w-5xl mx-auto pb-8 font-sans text-slate-100" id="coach-dashboard-view">
      {/* 1. FILTER BAR (TOP CONTROLS) */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-3 sm:p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-bold text-white uppercase tracking-wide">
                Visão do Treinador
              </h2>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                10s Pulse
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {clubName} • {category}
            </p>
          </div>
        </div>

        {/* Dropdown Filters & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Scope Selector */}
          <div className="relative flex-1 sm:flex-initial min-w-[160px]">
            <select
              value={
                filter.mode === 'season'
                  ? `season:${filter.season || currentSeason}`
                  : filter.mode === 'last5'
                    ? 'last5'
                    : filter.mode === 'last10'
                      ? 'last10'
                      : filter.mode === 'this_month'
                        ? 'this_month'
                        : filter.mode === 'month'
                          ? `month:${filter.month}`
                          : filter.mode === 'opponent'
                            ? `opponent:${filter.opponent}`
                            : filter.mode === 'match'
                              ? `match:${filter.matchId}`
                              : 'season:todas'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'last5') setFilter({ mode: 'last5' });
                else if (val === 'last10') setFilter({ mode: 'last10' });
                else if (val === 'this_month') setFilter({ mode: 'this_month' });
                else if (val.startsWith('season:')) {
                  const s = val.replace('season:', '');
                  setFilter({ mode: 'season', season: s });
                } else if (val.startsWith('month:')) {
                  const m = val.replace('month:', '');
                  setFilter({ mode: 'month', month: m });
                } else if (val.startsWith('opponent:')) {
                  const opp = val.replace('opponent:', '');
                  setFilter({ mode: 'opponent', opponent: opp });
                } else if (val.startsWith('match:')) {
                  const mid = val.replace('match:', '');
                  setFilter({ mode: 'match', matchId: mid });
                }
              }}
              aria-label="Filtro de período para visão do treinador"
              className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-500/60 text-white text-xs font-bold font-['Chakra_Petch'] rounded-2xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer appearance-none"
            >
              <optgroup label="Período & Época">
                {availableSeasons.map((s) => (
                  <option key={`s-${s}`} value={`season:${s}`}>
                    Época {s} {s === currentSeason ? '(Atual)' : ''}
                  </option>
                ))}
                <option value="season:todas">Todas as Épocas</option>
              </optgroup>

              <optgroup label="Jogos Recentes">
                <option value="last5">Últimos 5 Jogos</option>
                <option value="last10">Últimos 10 Jogos</option>
              </optgroup>

              <optgroup label="Calendário Mensal">
                <option value="this_month">Este Mês</option>
                {availableMonths.map(([ym, label]) => (
                  <option key={`m-${ym}`} value={`month:${ym}`}>
                    {label}
                  </option>
                ))}
              </optgroup>

              {availableOpponents.length > 0 && (
                <optgroup label="Por Adversário">
                  {availableOpponents.map((opp) => (
                    <option key={`opp-${opp}`} value={`opponent:${opp}`}>
                      vs {opp}
                    </option>
                  ))}
                </optgroup>
              )}

              {finishedMatchesList.length > 0 && (
                <optgroup label="Jogo Específico">
                  {finishedMatchesList.slice(0, 10).map((m) => (
                    <option key={`m-spec-${m.id}`} value={`match:${m.id}`}>
                      {m.date} - vs {m.opponent}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400 text-xs font-bold">
              ▼
            </div>
          </div>

          {/* Reset Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-colors border border-slate-700 cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Repor filtros para época atual"
            >
              <span>↺</span>
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* 1️⃣ RESULTADO GERAL DA EQUIPA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-['Chakra_Petch']">
              {coachData.filterLabel}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {coachData.finishedMatchesCount} {coachData.finishedMatchesCount === 1 ? 'jogo realizado' : 'jogos realizados'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-['Chakra_Petch'] text-white tracking-tight mt-1 flex items-center gap-3">
            <span>{coachData.recordText}</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-xl font-mono font-bold ${
                coachData.goalDifference > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : coachData.goalDifference < 0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              Saldo: {coachData.goalDifference > 0 ? `+${coachData.goalDifference}` : coachData.goalDifference}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-2xl sm:self-center">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Marcados</span>
            <span className="text-emerald-400 font-bold text-sm">{coachData.goalsScoredTotal}</span>
          </div>
          <div className="w-px h-7 bg-slate-800" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Sofridos</span>
            <span className="text-rose-400 font-bold text-sm">{coachData.goalsConcededTotal}</span>
          </div>
          <div className="w-px h-7 bg-slate-800" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Aprov.</span>
            <span className="text-cyan-400 font-bold text-sm">{coachData.indicators.winRate.value}</span>
          </div>
        </div>
      </div>

      {/* 2️⃣ OS 5 INDICADORES PRINCIPAIS */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-['Chakra_Petch']">
            Indicadores Fundamentais
          </h3>
          <span className="text-[11px] text-cyan-400/80 font-mono">Toque num cartão para ver detalhe</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* INDICADOR 1: GOLOS POR JOGO */}
          <div
            onClick={() => handleOpenDetailed(coachData.indicators.goalsScored.targetAnalysisTab)}
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-4 shadow-md transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            id="coach-indicator-goals-scored"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span>⚽</span>
                  <span className="uppercase text-[11px] tracking-wide">Golos por Jogo</span>
                </span>
                <span className="text-emerald-400 text-xs group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <div className="text-3xl font-black font-['Chakra_Petch'] text-white mt-2">
                {coachData.indicators.goalsScored.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  coachData.indicators.goalsScored.deltaStatus === 'positive'
                    ? 'text-emerald-400'
                    : coachData.indicators.goalsScored.deltaStatus === 'negative'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {coachData.indicators.goalsScored.deltaText}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {coachData.indicators.goalsScored.subtext}
              </div>
            </div>
          </div>

          {/* INDICADOR 2: GOLOS SOFRIDOS POR JOGO */}
          <div
            onClick={() => handleOpenDetailed(coachData.indicators.goalsConceded.targetAnalysisTab)}
            className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/60 rounded-3xl p-4 shadow-md transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            id="coach-indicator-goals-conceded"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span className="uppercase text-[11px] tracking-wide">Golos Sofridos</span>
                </span>
                <span className="text-rose-400 text-xs group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <div className="text-3xl font-black font-['Chakra_Petch'] text-white mt-2">
                {coachData.indicators.goalsConceded.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  coachData.indicators.goalsConceded.deltaStatus === 'positive'
                    ? 'text-emerald-400'
                    : coachData.indicators.goalsConceded.deltaStatus === 'negative'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {coachData.indicators.goalsConceded.deltaText}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {coachData.indicators.goalsConceded.subtext}
              </div>
            </div>
          </div>

          {/* INDICADOR 3: TAXA DE VITÓRIA */}
          <div
            onClick={() => handleOpenDetailed(coachData.indicators.winRate.targetAnalysisTab)}
            className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-3xl p-4 shadow-md transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            id="coach-indicator-win-rate"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span>🏆</span>
                  <span className="uppercase text-[11px] tracking-wide">Taxa de Vitória</span>
                </span>
                <span className="text-cyan-400 text-xs group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <div className="text-3xl font-black font-['Chakra_Petch'] text-white mt-2">
                {coachData.indicators.winRate.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  coachData.indicators.winRate.deltaStatus === 'positive'
                    ? 'text-emerald-400'
                    : coachData.indicators.winRate.deltaStatus === 'negative'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {coachData.indicators.winRate.deltaText}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {coachData.indicators.winRate.subtext}
              </div>
            </div>
          </div>

          {/* INDICADOR 4: CANTOS POR JOGO */}
          <div
            onClick={() => handleOpenDetailed(coachData.indicators.corners.targetAnalysisTab)}
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-3xl p-4 shadow-md transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            id="coach-indicator-corners"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span>🚩</span>
                  <span className="uppercase text-[11px] tracking-wide">Cantos / Jogo</span>
                </span>
                <span className="text-amber-400 text-xs group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <div className="text-3xl font-black font-['Chakra_Petch'] text-white mt-2">
                {coachData.indicators.corners.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  coachData.indicators.corners.deltaStatus === 'positive'
                    ? 'text-emerald-400'
                    : coachData.indicators.corners.deltaStatus === 'negative'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {coachData.indicators.corners.deltaText}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {coachData.indicators.corners.subtext}
              </div>
            </div>
          </div>

          {/* INDICADOR 5: MINUTO MÉDIO DO 1.º GOLO */}
          <div
            onClick={() => handleOpenDetailed(coachData.indicators.firstGoalMinute.targetAnalysisTab)}
            className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 rounded-3xl p-4 shadow-md transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
            id="coach-indicator-first-goal"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span className="uppercase text-[11px] tracking-wide">Min. 1.º Golo</span>
                </span>
                <span className="text-purple-400 text-xs group-hover:translate-x-1 transition-transform">➔</span>
              </div>
              <div className="text-3xl font-black font-['Chakra_Petch'] text-white mt-2">
                {coachData.indicators.firstGoalMinute.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <div className="text-xs font-bold text-slate-300">
                {coachData.indicators.firstGoalMinute.deltaText}
              </div>
              <div className="text-[10px] text-cyan-300/90 mt-0.5 truncate font-medium">
                {coachData.indicators.firstGoalMinute.subtext}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5️⃣ DESTAQUES INDIVIDUAIS: OS 3 MELHORES MARCADORES E OS 3 MELHORES ASSISTENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="coach-top-players-section">
        {/* OS TRÊS MELHORES MARCADORES */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setGoalsAssistsModalTab('marcadores');
                setShowGoalsAssistsModal(true);
              }}
              className="flex items-center justify-between mb-3 cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para abrir a lista completa de marcadores e assistências"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl group-hover/hdr:scale-110 transition-transform">⚽</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 font-['Chakra_Petch'] group-hover/hdr:text-emerald-300 transition-colors">
                    Melhores Marcadores
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Os 3 melhores marcadores ({coachData.filterLabel})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                  {coachData.goalsScoredTotal} {coachData.goalsScoredTotal === 1 ? 'golo total' : 'golos totais'}
                </span>
                <span className="text-slate-500 group-hover/hdr:text-emerald-400 text-xs transition-colors">➔</span>
              </div>
            </div>

            <div className="space-y-2">
              {[0, 1, 2].map((idx) => {
                const scorer = coachData.topScorers[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const rankBg =
                  idx === 0
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : idx === 1
                      ? 'border-slate-400/30 bg-slate-800/30'
                      : 'border-amber-700/30 bg-amber-950/10';

                if (!scorer) {
                  return (
                    <div
                      key={`empty-scorer-${idx}`}
                      className="p-2.5 sm:p-3 rounded-2xl border border-slate-800/50 bg-slate-950/30 flex items-center justify-between gap-3 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base select-none shrink-0 opacity-50">{medal}</span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-slate-500 truncate">
                            —
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            {idx + 1}.º Marcador (sem registo)
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-600">
                          0 golos
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`scorer-${scorer.playerId || idx}`}
                    onClick={() => {
                      setGoalsAssistsModalTab('marcadores');
                      setShowGoalsAssistsModal(true);
                    }}
                    className={`p-2.5 sm:p-3 rounded-2xl border ${rankBg} flex items-center justify-between gap-3 transition-all hover:bg-slate-800/50 hover:scale-[1.01] cursor-pointer group`}
                    title={`Ver atleta na lista completa de marcadores`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base select-none shrink-0">{medal}</span>
                      {scorer.playerNumber != null && (
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          #{scorer.playerNumber}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {scorer.playerName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {scorer.position}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                          {scorer.count}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          {scorer.count === 1 ? 'golo' : 'golos'}
                        </span>
                      </div>
                      <span className="text-slate-600 group-hover:text-emerald-400 text-xs font-bold transition-colors">
                        ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão Ver Lista Completa */}
          <button
            type="button"
            onClick={() => {
              setGoalsAssistsModalTab('marcadores');
              setShowGoalsAssistsModal(true);
            }}
            className="w-full mt-3 py-2 px-3 rounded-2xl bg-slate-950/80 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Ver lista completa de golos e assistências</span>
            <span>➔</span>
          </button>
        </div>

        {/* OS TRÊS MELHORES ASSISTENTES */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setGoalsAssistsModalTab('assistentes');
                setShowGoalsAssistsModal(true);
              }}
              className="flex items-center justify-between mb-3 cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para abrir a lista completa de assistências e golos"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl group-hover/hdr:scale-110 transition-transform">🎯</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400 font-['Chakra_Petch'] group-hover/hdr:text-cyan-300 transition-colors">
                    Melhores Assistentes
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Os 3 melhores assistentes e a quantidade de assistência ({coachData.filterLabel})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                  {coachData.topAssisters.reduce((acc, curr) => acc + curr.count, 0)}{' '}
                  {coachData.topAssisters.reduce((acc, curr) => acc + curr.count, 0) === 1
                    ? 'assistência total'
                    : 'assistências totais'}
                </span>
                <span className="text-slate-500 group-hover/hdr:text-cyan-400 text-xs transition-colors">➔</span>
              </div>
            </div>

            <div className="space-y-2">
              {[0, 1, 2].map((idx) => {
                const assister = coachData.topAssisters[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const rankBg =
                  idx === 0
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : idx === 1
                      ? 'border-slate-400/30 bg-slate-800/30'
                      : 'border-amber-700/30 bg-amber-950/10';

                if (!assister) {
                  return (
                    <div
                      key={`empty-assister-${idx}`}
                      className="p-2.5 sm:p-3 rounded-2xl border border-slate-800/50 bg-slate-950/30 flex items-center justify-between gap-3 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base select-none shrink-0 opacity-50">{medal}</span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-slate-500 truncate">
                            —
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            {idx + 1}.º Assistente (sem registo)
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-600">
                          0 assistências
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`assister-${assister.playerId || idx}`}
                    onClick={() => {
                      setGoalsAssistsModalTab('assistentes');
                      setShowGoalsAssistsModal(true);
                    }}
                    className={`p-2.5 sm:p-3 rounded-2xl border ${rankBg} flex items-center justify-between gap-3 transition-all hover:bg-slate-800/50 hover:scale-[1.01] cursor-pointer group`}
                    title={`Ver atleta na lista completa de assistências`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base select-none shrink-0">{medal}</span>
                      {assister.playerNumber != null && (
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          #{assister.playerNumber}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {assister.playerName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {assister.position}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black font-mono text-cyan-400">
                          {assister.count}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          {assister.count === 1 ? 'assistência' : 'assistências'}
                        </span>
                      </div>
                      <span className="text-slate-600 group-hover:text-cyan-400 text-xs font-bold transition-colors">
                        ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão Ver Lista Completa */}
          <button
            type="button"
            onClick={() => {
              setGoalsAssistsModalTab('assistentes');
              setShowGoalsAssistsModal(true);
            }}
            className="w-full mt-3 py-2 px-3 rounded-2xl bg-slate-950/80 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-500/50 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Ver lista completa de assistências e golos</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* 3️⃣ ÚLTIMOS 5 JOGOS & 4️⃣ TENDÊNCIA DA EQUIPA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ÚLTIMOS 5 JOGOS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
                  Últimos 5 Jogos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('jogos')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
              >
                Ver Todos →
              </button>
            </div>

            {coachData.recentMatches.length > 0 ? (
              <div className="space-y-2">
                {coachData.recentMatches.map((m) => (
                  <div
                    key={m.matchId}
                    onClick={() => handleOpenMatch(m.matchId)}
                    className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`px-2 py-1 rounded-xl text-xs font-mono font-bold shrink-0 ${
                          m.badgeVariant === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : m.badgeVariant === 'rose'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {m.resultLabel}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          vs {m.opponent}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.formattedDate}</div>
                      </div>
                    </div>
                    <span className="text-slate-500 group-hover:text-cyan-400 font-bold text-xs shrink-0">➔</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                Nenhum jogo concluído no filtro selecionado.
              </div>
            )}
          </div>
        </div>

        {/* TENDÊNCIA DA EQUIPA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📈</span>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
                  Tendência da Equipa
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  coachData.trend.status === 'improving'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : coachData.trend.status === 'declining'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {coachData.trend.statusLabel}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4">{coachData.trend.statusDescription}</p>

            {/* Sparkline / Bar visualization */}
            {coachData.trend.matches.length > 0 ? (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                  <span>Golos Marcados (🟢) vs Sofridos (🔴)</span>
                  <span>Últimos Jogos</span>
                </div>

                <div className="grid grid-cols-5 gap-2 items-end h-20 pt-2 pb-1 border-b border-slate-800">
                  {coachData.trend.matches.map((m, idx) => {
                    const maxGoal = Math.max(
                      1,
                      ...coachData.trend.scoredBars,
                      ...coachData.trend.concededBars
                    );
                    const scHeight = Math.max(12, Math.round((m.scored / maxGoal) * 60));
                    const coHeight = Math.max(12, Math.round((m.conceded / maxGoal) * 60));

                    return (
                      <div key={`trend-${m.matchId || idx}`} className="flex flex-col items-center gap-1">
                        <div className="flex items-end gap-1 w-full justify-center">
                          {/* Scored Bar */}
                          <div
                            style={{ height: `${scHeight}px` }}
                            className="w-3 sm:w-4 bg-emerald-500 rounded-t-md flex items-center justify-center text-[9px] font-mono font-bold text-slate-950"
                            title={`Marcados: ${m.scored}`}
                          >
                            {m.scored}
                          </div>
                          {/* Conceded Bar */}
                          <div
                            style={{ height: `${coHeight}px` }}
                            className="w-3 sm:w-4 bg-rose-500 rounded-t-md flex items-center justify-center text-[9px] font-mono font-bold text-white"
                            title={`Sofridos: ${m.conceded}`}
                          >
                            {m.conceded}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                          vs {m.opponent.slice(0, 5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">Sem dados suficientes para gráficos.</div>
            )}
          </div>
        </div>
      </div>

      {/* 5️⃣ PONTOS FORTES & 6️⃣ PONTOS DE ATENÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PONTOS FORTES */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🟢</span>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 font-['Chakra_Petch']">
              Pontos Fortes da Equipa
            </h3>
          </div>

          <div className="space-y-2.5">
            {coachData.strengths.map((str) => (
              <div
                key={str.id}
                onClick={() => handleOpenDetailed(str.targetTab)}
                className="p-3 rounded-2xl bg-slate-950/60 border border-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer flex items-start gap-2.5 group"
              >
                <span className="text-lg shrink-0 mt-0.5">{str.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {str.title}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{str.text}</div>
                </div>
                <span className="text-slate-600 group-hover:text-emerald-400 text-xs font-bold shrink-0 mt-1">➔</span>
              </div>
            ))}
          </div>
        </div>

        {/* PONTOS DE ATENÇÃO */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚠️</span>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 font-['Chakra_Petch']">
              Pontos de Atenção & Treino
            </h3>
          </div>

          <div className="space-y-2.5">
            {coachData.areasOfAttention.map((att) => (
              <div
                key={att.id}
                onClick={() => handleOpenDetailed(att.targetTab)}
                className="p-3 rounded-2xl bg-slate-950/60 border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer flex items-start gap-2.5 group"
              >
                <span className="text-lg shrink-0 mt-0.5">{att.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    {att.title}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{att.text}</div>
                </div>
                <span className="text-slate-600 group-hover:text-amber-400 text-xs font-bold shrink-0 mt-1">➔</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7️⃣ MARCÁMOS PRIMEIRO & 8️⃣ BOLA PARADA & 9️⃣ MOMENTO DO JOGO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 7️⃣ MARCÁMOS PRIMEIRO */}
        <div
          onClick={() => handleOpenDetailed('confronto')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-4 shadow-lg cursor-pointer transition-all hover:scale-[1.01] group flex flex-col justify-between"
          id="coach-first-goal-card"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <span>🎯</span>
                <span className="uppercase text-[11px] tracking-wide">Marcámos Primeiro</span>
              </span>
              <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">➔</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-['Chakra_Petch'] text-white">
              {coachData.firstGoalStats.scoredFirstRate}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Em {coachData.firstGoalStats.scoredFirstCount} de {coachData.firstGoalStats.totalFinishedMatches} jogos
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-3 gap-1 text-center font-mono">
            <div className="bg-slate-950/60 p-1.5 rounded-xl">
              <span className="text-[9px] text-slate-500 uppercase block">Vitórias</span>
              <span className="text-xs font-bold text-emerald-400">
                {coachData.firstGoalStats.scoredFirstWins}
              </span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-xl">
              <span className="text-[9px] text-slate-500 uppercase block">Empates</span>
              <span className="text-xs font-bold text-amber-400">
                {coachData.firstGoalStats.scoredFirstDraws}
              </span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-xl">
              <span className="text-[9px] text-slate-500 uppercase block">Derrotas</span>
              <span className="text-xs font-bold text-rose-400">
                {coachData.firstGoalStats.scoredFirstLosses}
              </span>
            </div>
          </div>
        </div>

        {/* 8️⃣ BOLA PARADA */}
        <div
          onClick={() => handleOpenDetailed('bolas_paradas')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-4 shadow-lg cursor-pointer transition-all hover:scale-[1.01] group flex flex-col justify-between"
          id="coach-set-pieces-card"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <span>🚩</span>
                <span className="uppercase text-[11px] tracking-wide">Bola Parada</span>
              </span>
              <span className="text-amber-400 group-hover:translate-x-1 transition-transform">➔</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Marcados</span>
                <span className="text-2xl font-black font-['Chakra_Petch'] text-emerald-400">
                  {coachData.setPieces.scoredCount}{' '}
                  <span className="text-xs font-normal text-slate-400">({coachData.setPieces.scoredRate}%)</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Sofridos</span>
                <span className="text-2xl font-black font-['Chakra_Petch'] text-rose-400">
                  {coachData.setPieces.concededCount}{' '}
                  <span className="text-xs font-normal text-slate-400">({coachData.setPieces.concededRate}%)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-center">
            <span
              className={`text-[11px] px-3 py-1 rounded-xl font-bold inline-block ${
                coachData.setPieces.status === 'strength'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : coachData.setPieces.status === 'warning'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {coachData.setPieces.statusLabel}
            </span>
          </div>
        </div>

        {/* 9️⃣ MOMENTO DO JOGO */}
        <div
          onClick={() => handleOpenDetailed('periodos')}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-4 shadow-lg cursor-pointer transition-all hover:scale-[1.01] group flex flex-col justify-between"
          id="coach-game-moment-card"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <span>⏱️</span>
                <span className="uppercase text-[11px] tracking-wide">Momento do Jogo</span>
              </span>
              <span className="text-purple-400 group-hover:translate-x-1 transition-transform">➔</span>
            </div>

            <div className="space-y-2">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">Mais Produtivo</span>
                  <span className="text-xs font-bold text-white">
                    {coachData.timing.mostScoredPeriod?.label || '—'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {coachData.timing.mostScoredPeriod ? `${coachData.timing.mostScoredPeriod.count} golos` : '—'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/60 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase block">Mais Vulnerável</span>
                  <span className="text-xs font-bold text-white">
                    {coachData.timing.mostConcededPeriod?.label || '—'}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {coachData.timing.mostConcededPeriod ? `${coachData.timing.mostConcededPeriod.count} golos` : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[10px] text-center text-purple-300/80 font-mono">
            Toque para explorar períodos minuto a minuto
          </div>
        </div>
      </div>

      {/* 🔟 BOTÃO "VER ANÁLISE COMPLETA" */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => handleOpenDetailed()}
          className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm sm:text-base font-['Chakra_Petch'] uppercase tracking-wider shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-3 cursor-pointer group active:scale-[0.99]"
          id="btn-ver-analise-completa"
        >
          <span>📊</span>
          <span>Ver Análise Estatística Completa</span>
          <span className="group-hover:translate-x-1.5 transition-transform">➔</span>
        </button>
      </div>

      {/* Modal de Lista Completa de Marcadores e Assistentes */}
      <SquadGoalsAndAssistsModal
        isOpen={showGoalsAssistsModal}
        onClose={() => setShowGoalsAssistsModal(false)}
        matches={state.matches || []}
        roster={state.roster || []}
        clubName={clubName}
        category={category}
        season={currentSeason}
        initialTab={goalsAssistsModalTab}
        onSelectPlayer={(playerId) => onNavigate('plantel', playerId)}
      />
    </div>
  );
};
