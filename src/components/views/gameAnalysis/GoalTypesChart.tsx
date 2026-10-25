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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
              <span>⚽</span>
              <span>Origem dos Golos Marcados ({goalsScored})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Classificação centralizada: Bola Corrida vs Bolas Paradas</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              Bola Corrida ({scoredOriginBreakdown.openPlayPercentage}%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              Bola Parada ({scoredOriginBreakdown.setPiecePercentage}%)
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mb-5">
          <div className="h-3 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida: ${scoredOriginBreakdown.openPlayCount} golos`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${scoredOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada: ${scoredOriginBreakdown.setPieceCount} golos`}
            />
            <div
              className="bg-slate-600 h-full transition-all duration-500"
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
                    ? 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/50 cursor-pointer'
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                    <span className="font-bold text-white">{gt.type}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                      {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-300 font-bold">{gt.count} golos</span>
                    <span className="text-cyan-400 font-black text-xs w-10 text-right">{gt.percentage}%</span>
                  </div>
                </div>

                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-cyan-400'}`}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-rose-400 flex items-center gap-2">
              <span>🛡️</span>
              <span>Como Sofremos os Golos ({goalsConceded})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Análise detalhada de golos sofridos por tipo e contexto</p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-400"></span>
              Bola Corrida ({concededOriginBreakdown.openPlayPercentage}%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              Bola Parada ({concededOriginBreakdown.setPiecePercentage}%)
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="mb-5">
          <div className="h-3 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.openPlayPercentage}%` }}
              title={`Bola Corrida Sofridos: ${concededOriginBreakdown.openPlayCount} golos`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${concededOriginBreakdown.setPiecePercentage}%` }}
              title={`Bola Parada Sofridos: ${concededOriginBreakdown.setPieceCount} golos`}
            />
            <div
              className="bg-slate-600 h-full transition-all duration-500"
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
                  gt.count > 0 ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-white">{gt.type}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                      {isSetPiece ? 'Bola Parada' : 'Bola Corrida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-300 font-bold">{gt.count} golos</span>
                    <span className="text-rose-400 font-black text-xs w-10 text-right">{gt.percentage}%</span>
                  </div>
                </div>

                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSetPiece ? 'bg-amber-400' : 'bg-rose-400'}`}
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
