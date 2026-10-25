import React, { useState } from 'react';
import { AggregatedAnalysis, StandardGoalType, AnalysisFilters as IAnalysisFilters } from '../../../lib/gameAnalysis';
import { InsightsSection } from './InsightsSection';
import { ShotsSection } from './ShotsSection';
import { Player } from '../../../types';

interface SimplifiedOverviewProps {
  analysis: AggregatedAnalysis;
  players?: Player[];
  myClub: string;
  filters?: IAnalysisFilters;
  onFilterChange?: (updated: Partial<IAnalysisFilters>) => void;
  availableSeasons?: string[];
  onOpenPlayer?: (playerId: string) => void;
  onSelectGoalType?: (type: StandardGoalType) => void;
  onOpenDetailedAnalysis: () => void;
  onOpenCoachReport?: () => void;
}

/** "16–30' (1ª Parte)" → "16–30'": the halves are already shown above, and the long label overflowed on phones. */
const shortPeriodLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, '');

export const SimplifiedOverview: React.FC<SimplifiedOverviewProps> = ({
  analysis,
  players: _players = [],
  myClub: _myClub,
  filters,
  onFilterChange,
  availableSeasons = [],
  onSelectGoalType,
  onOpenDetailedAnalysis,
  onOpenCoachReport
}) => {
  const {
    filteredMatches,
    finishedMatchesCount,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    goalDifference,
    avgGoalsScored,
    avgGoalsConceded,
    cleanSheets,
    cornersForTotal,
    cornersForAvg,
    cornersAgainstTotal,
    cornersAgainstAvg,
    yellowCardsTotal,
    redCardsTotal,
    cardsPerMatchAvg,
    firstGoalMetrics,
    timingWindows,
    scoredOriginBreakdown,
    concededOriginBreakdown,
    goalTypes,
    concededGoalTypes,
    timePeriodList,
    insights,
    configuredHalfDuration
  } = analysis;

  const totalCards = yellowCardsTotal + redCardsTotal;

  // Filter mode helper
  const [filterMode, setFilterMode] = useState<'season' | 'last5' | 'last10' | 'all'>('season');

  // Half time breakdown
  const firstHalfScored = timePeriodList.filter((p) => p.half === 1).reduce((acc, p) => acc + p.scored, 0);
  const firstHalfConceded = timePeriodList.filter((p) => p.half === 1).reduce((acc, p) => acc + p.conceded, 0);
  const secondHalfScored = timePeriodList
    .filter((p) => p.half === 2 || p.half === 'extra')
    .reduce((acc, p) => acc + p.scored, 0);
  const secondHalfConceded = timePeriodList
    .filter((p) => p.half === 2 || p.half === 'extra')
    .reduce((acc, p) => acc + p.conceded, 0);

  // Top scored and conceded types
  const topScoredTypes = [...goalTypes].filter((gt) => gt.count > 0).sort((a, b) => b.count - a.count);
  const topConcededTypes = [...concededGoalTypes].filter((gt) => gt.count > 0).sort((a, b) => b.count - a.count);

  // Max for period bars
  const maxPeriodVal = Math.max(...timePeriodList.map((p) => Math.max(p.scored, p.conceded)), 1);

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl mx-auto" id="simplified-iphone-overview">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. HEADER & INLINE FILTERS: [ Época ▼ ] [ 2026/27 ▼ ] */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="ui-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-black font-['Chakra_Petch'] text-white uppercase tracking-wider">
                ANÁLISE
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredMatches.length} {filteredMatches.length === 1 ? 'jogo registado' : 'jogos registados'} •{' '}
              <span className="text-emerald-400 font-bold">{wins}V</span> -{' '}
              <span className="text-amber-400 font-bold">{draws}E</span> -{' '}
              <span className="text-rose-400 font-bold">{losses}D</span>
            </p>
          </div>

          {/* Inline Selectors [ Época ▼ ] [ 2026/27 ▼ ] */}
          <div className="flex items-center gap-2">
            {/* Filter Mode Selector */}
            <div className="relative">
              <select
                value={filterMode}
                onChange={(e) => {
                  const mode = e.target.value as 'season' | 'last5' | 'last10' | 'all';
                  setFilterMode(mode);
                  if (onFilterChange) {
                    if (mode === 'all') {
                      onFilterChange({ season: 'todas' });
                    }
                  }
                }}
                className="ui-input appearance-none text-xs"
              >
                <option value="season">📅 Por Época</option>
                <option value="last5">⚡ Últimos 5 Jogos</option>
                <option value="last10">⚡ Últimos 10 Jogos</option>
                <option value="all">🌐 Todas as Épocas</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 text-[10px] pointer-events-none">
                ▼
              </span>
            </div>

            {/* Season Selector Dropdown */}
            {filterMode === 'season' && (
              <div className="relative">
                <select
                  value={filters?.season || 'todas'}
                  onChange={(e) => onFilterChange && onFilterChange({ season: e.target.value })}
                  className="ui-input appearance-none text-xs"
                >
                  <option value="todas">Todas as Épocas</option>
                  {availableSeasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-400 text-[10px] pointer-events-none">
                  ▼
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. OS 4 CARDS PRINCIPAIS (GRID 2x2 NO IPHONE / MOBILE) */}
      {/* ┌────────┐ ┌────────┐ */}
      {/* │ ⚽ 54   │ │ 🔴 27  │ */}
      {/* │ Marcados│ │ Sofridos│ */}
      {/* └────────┘ └────────┘ */}
      {/* ┌────────┐ ┌────────┐ */}
      {/* │ 🚩 142  │ │ 🟨 37  │ */}
      {/* │ Cantos  │ │ Cartões│ */}
      {/* └────────┘ └────────┘ */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4" id="iphone-primary-metric-cards">
        {/* Card 1: ⚽ Marcados */}
        <div className="ui-card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-emerald-400 font-black">
                <span className="text-base">⚽</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                {avgGoalsScored}/j
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-['Chakra_Petch'] font-black text-white leading-none my-1">
              {goalsScored}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              Marcados
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Saldo:</span>
            <span className={`font-bold font-mono ${goalDifference >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
            </span>
          </div>
        </div>

        {/* Card 2: 🔴 Sofridos */}
        <div className="ui-card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-rose-400 font-black">
                <span className="text-base">🔴</span>
              </span>
              <span className="text-[11px] font-mono text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full font-bold">
                {avgGoalsConceded}/j
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-['Chakra_Petch'] font-black text-white leading-none my-1">
              {goalsConceded}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              Sofridos
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Jogos a zeros:</span>
            <span className="font-bold font-mono text-cyan-300">
              {cleanSheets} ({finishedMatchesCount > 0 ? Math.round((cleanSheets / finishedMatchesCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Card 3: 🚩 Cantos */}
        <div className="ui-card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-cyan-400 font-black">
                <span className="text-base">🚩</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full font-bold">
                {cornersForAvg !== null ? `${cornersForAvg}/j` : '—'}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-['Chakra_Petch'] font-black text-white leading-none my-1">
              {cornersForTotal}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              Cantos
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Contra:</span>
            <span className="font-bold font-mono text-amber-300">
              {cornersAgainstTotal} ({cornersAgainstAvg !== null ? `${cornersAgainstAvg}/j` : '—'})
            </span>
          </div>
        </div>

        {/* Card 4: 🟨 Cartões */}
        <div className="ui-card p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-amber-400 font-black">
                <span className="text-base">🟨</span>
              </span>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                {cardsPerMatchAvg}/j
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-['Chakra_Petch'] font-black text-white leading-none my-1">
              {totalCards}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              Cartões
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Amarelos/Verm:</span>
            <span className="font-bold font-mono text-slate-300">
              {yellowCardsTotal} <span className="text-amber-400">🟨</span> • {redCardsTotal}{' '}
              <span className="text-rose-400">🟥</span>
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. ⚽ COMO MARCAMOS [gráfico] */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="ui-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5">
          <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <span className="text-emerald-400">⚽</span> Como Marcamos
          </h2>
          <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            {goalsScored} {goalsScored === 1 ? 'golo' : 'golos'}
          </span>
        </div>

        {/* Proporção: Bola Corrida vs Bola Parada */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-cyan-300">
              Bola Corrida: {scoredOriginBreakdown.openPlayPercentage}% ({scoredOriginBreakdown.openPlayCount})
            </span>
            <span className="text-amber-300">
              Bola Parada: {scoredOriginBreakdown.setPiecePercentage}% ({scoredOriginBreakdown.setPieceCount})
            </span>
          </div>
          <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${scoredOriginBreakdown.openPlayCount}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada: ${scoredOriginBreakdown.setPieceCount}`}
            />
          </div>
        </div>

        {/* Gráfico de barras horizontais por tipo */}
        <div className="space-y-2">
          {topScoredTypes.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">Sem golos marcados registados.</p>
          ) : (
            topScoredTypes.map((gt) => {
              const isSetPiece = gt.category === 'bola_parada';
              return (
                <div
                  key={gt.type}
                  onClick={() => onSelectGoalType && onSelectGoalType(gt.type)}
                  className="ui-inset p-2.5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                      <span className="font-bold text-slate-200">{gt.type}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-emerald-400 font-bold">{gt.count}</span>
                      <span className="text-slate-400 text-xs font-bold w-9 text-right">{gt.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSetPiece ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${gt.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. 🔴 COMO SOFREMOS [gráfico] */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="ui-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5">
          <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <span className="text-rose-400">🔴</span> Como Sofremos
          </h2>
          <span className="text-xs font-bold font-mono text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
            {goalsConceded} {goalsConceded === 1 ? 'golo' : 'golos'}
          </span>
        </div>

        {/* Proporção Sofridos: Bola Corrida vs Bola Parada */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-cyan-300">
              Bola Corrida: {concededOriginBreakdown.openPlayPercentage}% ({concededOriginBreakdown.openPlayCount})
            </span>
            <span className="text-amber-300">
              Bola Parada: {concededOriginBreakdown.setPiecePercentage}% ({concededOriginBreakdown.setPieceCount})
            </span>
          </div>
          <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${concededOriginBreakdown.openPlayCount}`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada: ${concededOriginBreakdown.setPieceCount}`}
            />
          </div>
        </div>

        {/* Gráfico de barras horizontais por tipo sofrido */}
        <div className="space-y-2">
          {topConcededTypes.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">Sem golos sofridos registados.</p>
          ) : (
            topConcededTypes.map((gt) => {
              const isSetPiece = gt.category === 'bola_parada';
              return (
                <div key={gt.type} className="ui-inset p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-rose-400'}`} />
                      <span className="font-bold text-slate-200">{gt.type}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-rose-400 font-bold">{gt.count}</span>
                      <span className="text-slate-400 text-xs font-bold w-9 text-right">{gt.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSetPiece ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${gt.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. ⏱️ QUANDO MARCAMOS [gráfico] */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="ui-card p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <span className="text-cyan-400">⏱️</span> Quando Marcamos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              1.º Golo Médio:{' '}
              <strong className="text-emerald-400">
                {firstGoalMetrics.firstGoalScoredAvgMin !== null ? `${firstGoalMetrics.firstGoalScoredAvgMin}'` : '—'}
              </strong>{' '}
              • Sofrido:{' '}
              <strong className="text-rose-400">
                {firstGoalMetrics.firstGoalConcededAvgMin !== null
                  ? `${firstGoalMetrics.firstGoalConcededAvgMin}'`
                  : '—'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Marcados
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Sofridos
            </span>
          </div>
        </div>

        {/* 1.ª vs 2.ª Parte Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="ui-inset p-3 text-center">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              1.ª Parte (0–{configuredHalfDuration}')
            </div>
            <div className="flex items-center justify-center gap-3">
              <div>
                <span className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-emerald-400">
                  {firstHalfScored}
                </span>
                <span className="text-[9px] text-slate-400 block font-bold">MARCADOS</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-rose-400">
                  {firstHalfConceded}
                </span>
                <span className="text-[9px] text-slate-400 block font-bold">SOFRIDOS</span>
              </div>
            </div>
          </div>

          <div className="ui-inset p-3 text-center">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              2.ª Parte ({configuredHalfDuration + 1}–{configuredHalfDuration * 2}'+)
            </div>
            <div className="flex items-center justify-center gap-3">
              <div>
                <span className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-emerald-400">
                  {secondHalfScored}
                </span>
                <span className="text-[9px] text-slate-400 block font-bold">MARCADOS</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-rose-400">
                  {secondHalfConceded}
                </span>
                <span className="text-[9px] text-slate-400 block font-bold">SOFRIDOS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico temporal por períodos */}
        <div className="space-y-2 pt-1">
          {timePeriodList.map((p) => {
            const scoredWidth = maxPeriodVal > 0 ? (p.scored / maxPeriodVal) * 100 : 0;
            const concededWidth = maxPeriodVal > 0 ? (p.conceded / maxPeriodVal) * 100 : 0;

            return (
              <div key={p.key} className="ui-inset p-2 flex items-center gap-2.5 text-xs">
                <span className="w-14 shrink-0 font-mono font-bold text-slate-300 text-[11px]" title={p.label}>
                  {shortPeriodLabel(p.label)}
                </span>

                <div className="flex-1 space-y-1">
                  {/* Scored bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${scoredWidth}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-mono font-bold text-emerald-400 text-[11px]">{p.scored}</span>
                  </div>

                  {/* Conceded bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: `${concededWidth}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-mono font-bold text-rose-400 text-[11px]">{p.conceded}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {analysis.goalsWithoutMinuteCount > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">
            {analysis.goalsWithoutMinuteCount === 1
              ? '1 golo sem minuto registado não entra neste gráfico.'
              : `${analysis.goalsWithoutMinuteCount} golos sem minuto registado não entram neste gráfico.`}
          </p>
        )}

        {/* Destaque Pico Ofensivo & Risco */}
        {(timingWindows.mostScoredPeriod || timingWindows.mostConcededPeriod) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800">
            {timingWindows.mostScoredPeriod && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Pico Ofensivo</div>
                  <div className="text-xs font-bold text-white">
                    {timingWindows.mostScoredPeriod.label} ({timingWindows.mostScoredPeriod.count} golos)
                  </div>
                </div>
              </div>
            )}
            {timingWindows.mostConcededPeriod && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="text-[10px] font-bold text-rose-400 uppercase">Pico de Risco Defensivo</div>
                  <div className="text-xs font-bold text-white">
                    {timingWindows.mostConcededPeriod.label} ({timingWindows.mostConcededPeriod.count} golos sofridos)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 🎯 REMATES (só os jogos com remates registados) */}
      <ShotsSection matches={analysis.filteredMatches} />

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. 🧠 O QUE OS DADOS DIZEM [insights] */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <InsightsSection insights={insights} />
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 7. E DEPOIS: "Ver análise detalhada" (BOTÃO PROEMINENTE) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="pt-2 pb-6">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/60 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-white">
                Ver Análise Detalhada
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Aceda à cronologia minuto-a-minuto, bolas paradas, confronto direto, atletas e exportação em PDF/Excel.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {onOpenCoachReport && (
              <button
                type="button"
                onClick={onOpenCoachReport}
                className="ui-btn ui-btn-secondary w-full sm:w-auto px-4 py-3 text-xs flex items-center justify-center gap-2"
              >
                <span>📄 Relatório PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenDetailedAnalysis}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <span>Ver Análise Detalhada</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
