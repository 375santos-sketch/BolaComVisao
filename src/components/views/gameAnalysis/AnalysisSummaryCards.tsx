import React from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';

interface AnalysisSummaryCardsProps {
  analysis: AggregatedAnalysis;
  myClub: string;
}

export const AnalysisSummaryCards: React.FC<AnalysisSummaryCardsProps> = ({ analysis }) => {
  const {
    filteredMatches,
    finishedMatchesCount,
    wins,
    draws,
    losses,
    winPercentage,
    goalsScored,
    goalsConceded,
    goalDifference,
    avgGoalsScored,
    avgGoalsConceded,
    avgMinuteScored,
    avgMinuteConceded,
    unclassifiedGoalsCount,
    cleanSheets,
    firstGoalMetrics,
    timingWindows,
    scoredOriginBreakdown,
    activeEventType,
    eventTypeLabel,
    filterMetrics,
    cornersForAvg,
    cornersForMatchesCount,
    foulsCommittedAvg,
    yellowCardsTotal,
    redCardsTotal
  } = analysis;

  return (
    <div className="space-y-4 mb-6">
      {/* Active Filter Focused Banner if specific event type is filtered (Item 1) */}
      {filterMetrics.isFiltered && (
        <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border border-cyan-500/50 rounded-3xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider block">
                  Análise Dedicada do Filtro Ativo
                </span>
                <span className="text-base sm:text-lg font-black text-white">{eventTypeLabel}</span>
              </div>
            </div>
            <span className="text-xs bg-cyan-500 text-slate-950 px-3 py-1 rounded-full font-black shadow">
              {filterMetrics.totalOccurrences} registos encontrados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">⏱️ Minuto Médio</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-cyan-300">
                {filterMetrics.avgMinute !== null ? `${filterMetrics.avgMinute}'` : '—'}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">📊 Média / Jogo</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-white">{filterMetrics.avgPerMatch}</span>
            </div>

            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">🏟️ Jogos c/ Ocorrência</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-emerald-400">
                {filterMetrics.matchOccurrenceRate}%
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">
                ({filterMetrics.matchesWithOccurrencesCount}/{filterMetrics.totalMatchesAnalyzed})
              </span>
            </div>

            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-2.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">🔥 Período Mais Frequente</span>
              <span className="text-xs font-black text-amber-300 truncate block mt-1">
                {filterMetrics.mostFrequentPeriod ? filterMetrics.mostFrequentPeriod.label : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alert for unclassified goals if any (Item 5) */}
      {unclassifiedGoalsCount > 0 && activeEventType === 'todos' && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Existem <strong className="text-white font-bold">{unclassifiedGoalsCount} golos</strong> sem tipo
              específico atribuído (classificados como "Outro / Não categorizado").
            </span>
          </div>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Jogos & Resultados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🏟️ Jogos</span>
            <span className="text-cyan-400 font-black">{winPercentage}% V</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-['Chakra_Petch'] font-black text-white">{filteredMatches.length}</span>
            <span className="text-xs text-slate-400">({finishedMatchesCount} finalizados)</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs font-bold">
            <div className="bg-emerald-500/10 text-emerald-400 rounded-lg py-1">
              <span className="text-[10px] block opacity-75">V</span>
              {wins}
            </div>
            <div className="bg-amber-500/10 text-amber-400 rounded-lg py-1">
              <span className="text-[10px] block opacity-75">E</span>
              {draws}
            </div>
            <div className="bg-rose-500/10 text-rose-400 rounded-lg py-1">
              <span className="text-[10px] block opacity-75">D</span>
              {losses}
            </div>
          </div>
        </div>

        {/* Card 2: Golos, Médias por Jogo e Minuto Médio (Item 9) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⚽ Golos</span>
            <span
              className={`font-black ${
                goalDifference > 0 ? 'text-emerald-400' : goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {goalDifference > 0 ? `+${goalDifference}` : goalDifference} saldo
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-['Chakra_Petch'] font-black text-emerald-400">{goalsScored}</span>
            <span className="text-sm font-bold text-slate-500">-</span>
            <span className="text-3xl font-['Chakra_Petch'] font-black text-rose-400">{goalsConceded}</span>
          </div>

          <div className="mt-3 space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-medium">
            <div className="flex justify-between">
              <span>Média / Jogo:</span>
              <span>
                <strong className="text-emerald-300">{avgGoalsScored}</strong> vs{' '}
                <strong className="text-rose-300">{avgGoalsConceded}</strong>
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>⏱️ Minuto Médio:</span>
              <span>
                <strong className="text-emerald-400">{avgMinuteScored !== null ? `${avgMinuteScored}'` : '—'}</strong>{' '}
                vs{' '}
                <strong className="text-rose-400">{avgMinuteConceded !== null ? `${avgMinuteConceded}'` : '—'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Primeiro Golo & Entrada em Jogo (Item 5 & 9) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>⏱️ 1.º Golo Médio</span>
            <span className="text-amber-400 font-black">Entrada</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">A Favor</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-emerald-400">
                {firstGoalMetrics.firstGoalScoredAvgMin !== null ? `${firstGoalMetrics.firstGoalScoredAvgMin}'` : '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Sofrido</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">
                {firstGoalMetrics.firstGoalConcededAvgMin !== null
                  ? `${firstGoalMetrics.firstGoalConcededAvgMin}'`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Ao marcar 1.º:</span>
            <span className="text-cyan-300 font-bold">
              {firstGoalMetrics.scoredFirstWinRate}% vitórias ({firstGoalMetrics.scoredFirstWinCount}/
              {firstGoalMetrics.scoredFirstCount})
            </span>
          </div>
        </div>

        {/* Card 4: Disciplina, Cantos & Faltas Registadas (Item 6 & 7) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🚩 Cantos & Disciplina</span>
            <span className="text-cyan-400 font-black">{cleanSheets} Clean Sheets</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Cantos Médios (Favor)</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-cyan-400">
                {cornersForAvg !== null ? cornersForAvg : '—'}
              </span>
              {cornersForMatchesCount > 0 && (
                <span className="text-[10px] text-slate-400 ml-1">({cornersForMatchesCount}j)</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Faltas / Cartões</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-amber-400">
                {foulsCommittedAvg !== null ? foulsCommittedAvg : `${yellowCardsTotal + redCardsTotal}`}
              </span>
              <span className="text-[10px] text-slate-400 block">
                🟨 {yellowCardsTotal} | 🟥 {redCardsTotal}
              </span>
            </div>
          </div>

          <div className="mt-3 h-2 bg-slate-950 rounded-full overflow-hidden flex">
            <div
              className="bg-cyan-400 h-full transition-all"
              style={{ width: `${scoredOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${scoredOriginBreakdown.openPlayCount} golos (${scoredOriginBreakdown.openPlayPercentage}%)`}
            />
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${scoredOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada: ${scoredOriginBreakdown.setPieceCount} golos (${scoredOriginBreakdown.setPiecePercentage}%)`}
            />
          </div>
        </div>
      </div>

      {/* Janela de Maior Eficácia (Item 6: Destaques Automáticos) */}
      {(timingWindows.mostScoredPeriod || timingWindows.mostConcededPeriod) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {timingWindows.mostScoredPeriod && (
            <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="text-2xl p-2 rounded-xl bg-emerald-500/20 text-emerald-400">🔥</div>
              <div>
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Janela de Maior Eficácia Ofensiva
                </div>
                <div className="text-sm font-bold text-white">
                  Marcamos mais:{' '}
                  <span className="text-emerald-300 font-black">{timingWindows.mostScoredPeriod.label}</span> —{' '}
                  <strong className="text-emerald-400">{timingWindows.mostScoredPeriod.count} golos</strong>
                </div>
              </div>
            </div>
          )}

          {timingWindows.mostConcededPeriod && (
            <div className="bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="text-2xl p-2 rounded-xl bg-rose-500/20 text-rose-400">⚠️</div>
              <div>
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  Janela de Maior Risco Defensivo
                </div>
                <div className="text-sm font-bold text-white">
                  Sofremos mais:{' '}
                  <span className="text-rose-300 font-black">{timingWindows.mostConcededPeriod.label}</span> —{' '}
                  <strong className="text-rose-400">{timingWindows.mostConcededPeriod.count} golos</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
