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
        <div className="bg-gradient-to-r from-ui-brand/80 via-ui-surface to-ui-brand/80 border border-ui-brand/50 rounded-3xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-ui-brand/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <span className="text-[10px] text-ui-brand font-black uppercase tracking-wider block">
                  Análise Dedicada do Filtro Ativo
                </span>
                <span className="text-base sm:text-lg font-black text-ui-text">{eventTypeLabel}</span>
              </div>
            </div>
            <span className="text-xs bg-ui-brand text-ui-brand-ink px-3 py-1 rounded-full font-black shadow">
              {filterMetrics.totalOccurrences} registos encontrados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="ui-card p-2.5">
              <span className="text-[10px] text-ui-muted font-bold block uppercase">⏱️ Minuto Médio</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-ui-brand">
                {filterMetrics.avgMinute !== null ? `${filterMetrics.avgMinute}'` : '—'}
              </span>
            </div>

            <div className="ui-card p-2.5">
              <span className="text-[10px] text-ui-muted font-bold block uppercase">📊 Média / Jogo</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-ui-text">{filterMetrics.avgPerMatch}</span>
            </div>

            <div className="ui-card p-2.5">
              <span className="text-[10px] text-ui-muted font-bold block uppercase">🏟️ Jogos c/ Ocorrência</span>
              <span className="text-xl font-['Chakra_Petch'] font-black text-ui-success">
                {filterMetrics.matchOccurrenceRate}%
              </span>
              <span className="text-[10px] text-ui-muted block font-medium">
                ({filterMetrics.matchesWithOccurrencesCount}/{filterMetrics.totalMatchesAnalyzed})
              </span>
            </div>

            <div className="ui-card p-2.5">
              <span className="text-[10px] text-ui-muted font-bold block uppercase">🔥 Período Mais Frequente</span>
              <span className="text-xs font-black text-ui-warning truncate block mt-1">
                {filterMetrics.mostFrequentPeriod ? filterMetrics.mostFrequentPeriod.label : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alert for unclassified goals if any (Item 5) */}
      {unclassifiedGoalsCount > 0 && activeEventType === 'todos' && (
        <div className="bg-ui-warning-soft border border-ui-warning/30 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-ui-warning">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Existem <strong className="text-ui-text font-bold">{unclassifiedGoalsCount} golos</strong> sem tipo
              específico atribuído (classificados como "Outro / Não categorizado").
            </span>
          </div>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Jogos & Resultados */}
        <div className="ui-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-ui-muted text-xs font-bold uppercase tracking-wider mb-2">
            <span>🏟️ Jogos</span>
            <span className="text-ui-brand font-black">{winPercentage}% V</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-text">{filteredMatches.length}</span>
            <span className="text-xs text-ui-muted">({finishedMatchesCount} finalizados)</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs font-bold">
            <div className="bg-ui-success/10 text-ui-success rounded-lg py-1">
              <span className="text-[10px] block opacity-75">V</span>
              {wins}
            </div>
            <div className="bg-ui-warning/10 text-ui-warning rounded-lg py-1">
              <span className="text-[10px] block opacity-75">E</span>
              {draws}
            </div>
            <div className="bg-ui-danger/10 text-ui-danger rounded-lg py-1">
              <span className="text-[10px] block opacity-75">D</span>
              {losses}
            </div>
          </div>
        </div>

        {/* Card 2: Golos, Médias por Jogo e Minuto Médio (Item 9) */}
        <div className="ui-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-ui-muted text-xs font-bold uppercase tracking-wider mb-2">
            <span>⚽ Golos</span>
            <span
              className={`font-black ${
                goalDifference > 0 ? 'text-ui-success' : goalDifference < 0 ? 'text-ui-danger' : 'text-ui-muted'
              }`}
            >
              {goalDifference > 0 ? `+${goalDifference}` : goalDifference} saldo
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-success">{goalsScored}</span>
            <span className="text-sm font-bold text-ui-muted">-</span>
            <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-danger">{goalsConceded}</span>
          </div>

          <div className="mt-3 space-y-1 text-xs text-ui-muted border-t border-ui-line/80 pt-2 font-medium">
            <div className="flex justify-between">
              <span>Média / Jogo:</span>
              <span>
                <strong className="text-ui-success">{avgGoalsScored}</strong> vs{' '}
                <strong className="text-ui-danger">{avgGoalsConceded}</strong>
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-ui-muted">
              <span>⏱️ Minuto Médio:</span>
              <span>
                <strong className="text-ui-success">{avgMinuteScored !== null ? `${avgMinuteScored}'` : '—'}</strong> vs{' '}
                <strong className="text-ui-danger">{avgMinuteConceded !== null ? `${avgMinuteConceded}'` : '—'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Primeiro Golo & Entrada em Jogo (Item 5 & 9) */}
        <div className="ui-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-ui-muted text-xs font-bold uppercase tracking-wider mb-2">
            <span>⏱️ 1.º Golo Médio</span>
            <span className="text-ui-warning font-black">Entrada</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-ui-muted block font-bold">A Favor</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-success">
                {firstGoalMetrics.firstGoalScoredAvgMin !== null ? `${firstGoalMetrics.firstGoalScoredAvgMin}'` : '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ui-muted block font-bold">Sofrido</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-danger">
                {firstGoalMetrics.firstGoalConcededAvgMin !== null
                  ? `${firstGoalMetrics.firstGoalConcededAvgMin}'`
                  : '—'}
              </span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-ui-muted flex items-center justify-between border-t border-ui-line/80 pt-2">
            <span>Ao marcar 1.º:</span>
            <span className="text-ui-brand font-bold">
              {firstGoalMetrics.scoredFirstWinRate}% vitórias ({firstGoalMetrics.scoredFirstWinCount}/
              {firstGoalMetrics.scoredFirstCount})
            </span>
          </div>
        </div>

        {/* Card 4: Disciplina, Cantos & Faltas Registadas (Item 6 & 7) */}
        <div className="ui-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-ui-muted text-xs font-bold uppercase tracking-wider mb-2">
            <span>🚩 Cantos & Disciplina</span>
            <span className="text-ui-brand font-black">{cleanSheets} Clean Sheets</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-ui-muted block font-bold">Cantos Médios (Favor)</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-brand">
                {cornersForAvg !== null ? cornersForAvg : '—'}
              </span>
              {cornersForMatchesCount > 0 && (
                <span className="text-[10px] text-ui-muted ml-1">({cornersForMatchesCount}j)</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ui-muted block font-bold">Faltas / Cartões</span>
              <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-warning">
                {foulsCommittedAvg !== null ? foulsCommittedAvg : `${yellowCardsTotal + redCardsTotal}`}
              </span>
              <span className="text-[10px] text-ui-muted block">
                🟨 {yellowCardsTotal} | 🟥 {redCardsTotal}
              </span>
            </div>
          </div>

          <div className="mt-3 h-2 bg-ui-inset rounded-full overflow-hidden flex">
            <div
              className="bg-ui-brand h-full transition-all"
              style={{ width: `${scoredOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${scoredOriginBreakdown.openPlayCount} golos (${scoredOriginBreakdown.openPlayPercentage}%)`}
            />
            <div
              className="bg-ui-warning h-full transition-all"
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
            <div className="bg-gradient-to-r from-ui-success/40 to-ui-surface border border-ui-success/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="text-2xl p-2 rounded-xl bg-ui-success/20 text-ui-success">🔥</div>
              <div>
                <div className="text-[11px] font-bold text-ui-success uppercase tracking-wider">
                  Janela de Maior Eficácia Ofensiva
                </div>
                <div className="text-sm font-bold text-ui-text">
                  Marcamos mais:{' '}
                  <span className="text-ui-success font-black">{timingWindows.mostScoredPeriod.label}</span> —{' '}
                  <strong className="text-ui-success">{timingWindows.mostScoredPeriod.count} golos</strong>
                </div>
              </div>
            </div>
          )}

          {timingWindows.mostConcededPeriod && (
            <div className="bg-gradient-to-r from-ui-danger/40 to-ui-surface border border-ui-danger/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="text-2xl p-2 rounded-xl bg-ui-danger/20 text-ui-danger">⚠️</div>
              <div>
                <div className="text-[11px] font-bold text-ui-danger uppercase tracking-wider">
                  Janela de Maior Risco Defensivo
                </div>
                <div className="text-sm font-bold text-ui-text">
                  Sofremos mais:{' '}
                  <span className="text-ui-danger font-black">{timingWindows.mostConcededPeriod.label}</span> —{' '}
                  <strong className="text-ui-danger">{timingWindows.mostConcededPeriod.count} golos</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
