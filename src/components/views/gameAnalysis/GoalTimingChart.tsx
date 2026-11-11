import React from 'react';
import { AggregatedAnalysis, TimePeriodStat } from '../../../lib/gameAnalysis';

interface GoalTimingChartProps {
  analysis: AggregatedAnalysis;
  onSelectPeriod: (period: TimePeriodStat) => void;
}

export const GoalTimingChart: React.FC<GoalTimingChartProps> = ({ analysis, onSelectPeriod }) => {
  const { timePeriodList, goalsScored, goalsConceded, configuredHalfDuration, timingWindows } = analysis;

  const half1Periods = timePeriodList.filter((p) => p.half === 1);
  const half2Periods = timePeriodList.filter((p) => p.half === 2 || p.half === 'extra');

  const half1Scored = half1Periods.reduce((acc, p) => acc + p.scored, 0);
  const half1Conceded = half1Periods.reduce((acc, p) => acc + p.conceded, 0);
  const half2Scored = half2Periods.reduce((acc, p) => acc + p.scored, 0);
  const half2Conceded = half2Periods.reduce((acc, p) => acc + p.conceded, 0);

  const maxVal = Math.max(...timePeriodList.map((p) => Math.max(p.scored, p.conceded)), 1);

  return (
    <div className="space-y-6">
      {/* 1. Visão Global 1.ª Parte vs 2.ª Parte */}
      <div className="ui-card p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
              <span>⏱️</span>
              <span>Distribuição por Partes ({configuredHalfDuration * 2}' Jogo)</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">Comparação direta de rendimento entre a 1.ª e a 2.ª parte</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-ui-success flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-success"></span> Marcados
            </span>
            <span className="text-ui-danger flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-ui-danger"></span> Sofridos
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1.ª Parte */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ui-text">1.ª Parte (0–{configuredHalfDuration}')</span>
              <span className="text-xs font-bold text-ui-muted">
                Saldo:{' '}
                <strong className={half1Scored - half1Conceded >= 0 ? 'text-ui-success' : 'text-ui-danger'}>
                  {half1Scored - half1Conceded >= 0 ? `+${half1Scored - half1Conceded}` : half1Scored - half1Conceded}
                </strong>
              </span>
            </div>

            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-success">{half1Scored}</span>
                <span className="text-[10px] text-ui-muted block">
                  Marcados ({goalsScored > 0 ? Math.round((half1Scored / goalsScored) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xl text-ui-muted font-bold">:</div>
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-danger">{half1Conceded}</span>
                <span className="text-[10px] text-ui-muted block">
                  Sofridos ({goalsConceded > 0 ? Math.round((half1Conceded / goalsConceded) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* 2.ª Parte */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ui-text">
                2.ª Parte ({configuredHalfDuration + 1}–{configuredHalfDuration * 2}'+)
              </span>
              <span className="text-xs font-bold text-ui-muted">
                Saldo:{' '}
                <strong className={half2Scored - half2Conceded >= 0 ? 'text-ui-success' : 'text-ui-danger'}>
                  {half2Scored - half2Conceded >= 0 ? `+${half2Scored - half2Conceded}` : half2Scored - half2Conceded}
                </strong>
              </span>
            </div>

            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-success">{half2Scored}</span>
                <span className="text-[10px] text-ui-muted block">
                  Marcados ({goalsScored > 0 ? Math.round((half2Scored / goalsScored) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xl text-ui-muted font-bold">:</div>
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-danger">{half2Conceded}</span>
                <span className="text-[10px] text-ui-muted block">
                  Sofridos ({goalsConceded > 0 ? Math.round((half2Conceded / goalsConceded) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Períodos Detalhados do Jogo (Item 2 & 3) */}
      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
              <span>📊</span>
              <span>Golos por Período de Jogo</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">Clique em qualquer período para consultar todos os lances</p>
          </div>

          <div className="ui-inset text-xs text-ui-muted font-bold px-3 py-1.5">
            Duração configurada: <span className="text-ui-brand font-black">{configuredHalfDuration}m / parte</span>
          </div>
        </div>

        {/* Visual Period Bars */}
        <div className="space-y-2.5">
          {timePeriodList.map((p) => {
            const isBestScored = timingWindows.mostScoredPeriod?.periodKey === p.key;
            const isWorstConceded = timingWindows.mostConcededPeriod?.periodKey === p.key;

            return (
              <div
                key={p.key}
                onClick={() => onSelectPeriod(p)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isBestScored
                    ? 'bg-ui-success-soft border-ui-success/40 hover:border-ui-success'
                    : isWorstConceded
                      ? 'bg-ui-danger-soft border-ui-danger/40 hover:border-ui-danger'
                      : 'bg-ui-inset/60 border-ui-line hover:border-ui-brand/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ui-text font-mono">{p.label}</span>
                    {isBestScored && (
                      <span className="text-[10px] bg-ui-success/20 text-ui-success font-bold px-2 py-0.5 rounded-md">
                        🔥 Janela mais eficaz
                      </span>
                    )}
                    {isWorstConceded && (
                      <span className="text-[10px] bg-ui-danger/20 text-ui-danger font-bold px-2 py-0.5 rounded-md">
                        ⚠️ Janela mais frágil
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-ui-success font-bold">⚽ {p.scored} marcados</span>
                    <span className="text-ui-danger font-bold">🥅 {p.conceded} sofridos</span>
                    <span className="text-ui-muted">›</span>
                  </div>
                </div>

                {/* Comparative Double Horizontal Bar */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Scored Bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-2 bg-ui-surface rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-ui-success rounded-full transition-all duration-300"
                        style={{ width: `${(p.scored / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-ui-muted w-4 text-right">{p.scored}</span>
                  </div>

                  {/* Conceded Bar */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-ui-muted w-4 text-left">{p.conceded}</span>
                    <div className="flex-1 h-2 bg-ui-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ui-danger rounded-full transition-all duration-300"
                        style={{ width: `${(p.conceded / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
