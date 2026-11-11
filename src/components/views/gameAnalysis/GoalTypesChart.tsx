import React from 'react';
import { AggregatedAnalysis, StandardGoalType } from '../../../lib/gameAnalysis';

interface GoalTypesChartProps {
  analysis: AggregatedAnalysis;
  onSelectGoalType?: (type: StandardGoalType) => void;
}

export const GoalTypesChart: React.FC<GoalTypesChartProps> = ({ analysis, onSelectGoalType }) => {
  const { goalTypes, concededGoalTypes, goalsScored, goalsConceded, scoredOriginBreakdown, concededOriginBreakdown } =
    analysis;

  return (
    <div className="space-y-6">
      {/* 1. Origem dos Golos Marcados: Bola Corrida vs Bola Parada (Item 7) */}
      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
              <span>⚽</span>
              <span>Origem dos Golos Marcados ({goalsScored})</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">Classificação centralizada: Bola Corrida vs Bolas Paradas</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-ui-brand">
              <span className="w-3 h-3 rounded-full bg-ui-brand"></span>
              Bola Corrida ({scoredOriginBreakdown.openPlayPercentage}%)
            </span>
            <span className="flex items-center gap-1.5 text-ui-warning">
              <span className="w-3 h-3 rounded-full bg-ui-warning"></span>
              Bola Parada ({scoredOriginBreakdown.setPiecePercentage}%)
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mb-5">
          <div className="h-3 bg-ui-inset rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-ui-brand h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${scoredOriginBreakdown.openPlayCount} golos`}
            />
            <div
              className="bg-ui-warning h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada: ${scoredOriginBreakdown.setPieceCount} golos`}
            />
            <div
              className="bg-ui-surface-3 h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.otherPercentage}%` }}
              title={`Outros: ${scoredOriginBreakdown.otherCount} golos`}
            />
          </div>
        </div>

        {/* Detailed Goal Types Table & Horizontal Progress */}
        <div className="space-y-2.5">
          {goalTypes.map((gt) => {
            const isSetPiece = gt.category === 'bola_parada';
            return (
              <div
                key={gt.type}
                onClick={() => onSelectGoalType && onSelectGoalType(gt.type)}
                className={`p-3 rounded-2xl border transition-all ${
                  gt.count > 0
                    ? 'bg-ui-inset/60 border-ui-line hover:border-ui-brand/50 cursor-pointer'
                    : 'bg-ui-inset/30 border-ui-line/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-ui-warning' : 'bg-ui-brand'}`} />
                    <span className="font-bold text-ui-text">{gt.type}</span>
                    <span className="text-[10px] text-ui-muted bg-ui-surface-2/80 px-2 py-0.5 rounded-md">
                      {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-ui-text font-bold">{gt.count} golos</span>
                    <span className="text-ui-brand font-black text-xs w-10 text-right">{gt.percentage}%</span>
                  </div>
                </div>

                <div className="h-1.5 bg-ui-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSetPiece ? 'bg-ui-warning' : 'bg-ui-brand'}`}
                    style={{ width: `${gt.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Como Sofremos os Golos (Item 9) */}
      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-danger flex items-center gap-2">
              <span>🛡️</span>
              <span>Como Sofremos os Golos ({goalsConceded})</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">Análise detalhada de golos sofridos por tipo e contexto</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-ui-danger">
              <span className="w-3 h-3 rounded-full bg-ui-danger"></span>
              Bola Corrida ({concededOriginBreakdown.openPlayPercentage}%)
            </span>
            <span className="flex items-center gap-1.5 text-ui-warning">
              <span className="w-3 h-3 rounded-full bg-ui-warning"></span>
              Bola Parada ({concededOriginBreakdown.setPiecePercentage}%)
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mb-5">
          <div className="h-3 bg-ui-inset rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-ui-danger h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida Sofridos: ${concededOriginBreakdown.openPlayCount} golos`}
            />
            <div
              className="bg-ui-warning h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada Sofridos: ${concededOriginBreakdown.setPieceCount} golos`}
            />
            <div
              className="bg-ui-surface-3 h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.otherPercentage}%` }}
              title={`Outros: ${concededOriginBreakdown.otherCount} golos`}
            />
          </div>
        </div>

        {/* Detailed Conceded Goal Types Table */}
        <div className="space-y-2.5">
          {concededGoalTypes.map((gt) => {
            const isSetPiece = gt.category === 'bola_parada';
            return (
              <div
                key={`conceded-${gt.type}`}
                className={`p-3 rounded-2xl border transition-all ${
                  gt.count > 0 ? 'bg-ui-inset/60 border-ui-line' : 'bg-ui-inset/30 border-ui-line/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-ui-warning' : 'bg-ui-danger'}`} />
                    <span className="font-bold text-ui-text">{gt.type}</span>
                    <span className="text-[10px] text-ui-muted bg-ui-surface-2/80 px-2 py-0.5 rounded-md">
                      {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-ui-text font-bold">{gt.count} golos</span>
                    <span className="text-ui-danger font-black text-xs w-10 text-right">{gt.percentage}%</span>
                  </div>
                </div>

                <div className="h-1.5 bg-ui-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSetPiece ? 'bg-ui-warning' : 'bg-ui-danger'}`}
                    style={{ width: `${gt.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
