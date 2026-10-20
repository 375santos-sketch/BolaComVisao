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

  const maxVal = Math.max(
    ...timePeriodList.map((p) => Math.max(p.scored, p.conceded)),
    1
  );

  return (
    <div className="space-y-6">
      {/* 1. Visão Global 1.ª Parte vs 2.ª Parte */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
              <span>⏱️</span>
              <span>Distribuição por Partes ({configuredHalfDuration * 2}' Jogo)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparação direta de rendimento entre a 1.ª e a 2.ª parte
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Marcados
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Sofridos
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1.ª Parte */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">1.ª Parte (0–{configuredHalfDuration}')</span>
              <span className="text-xs font-bold text-slate-400">
                Saldo: <strong className={half1Scored - half1Conceded >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {half1Scored - half1Conceded >= 0 ? `+${half1Scored - half1Conceded}` : half1Scored - half1Conceded}
                </strong>
              </span>
            </div>

            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-emerald-400">{half1Scored}</span>
                <span className="text-[10px] text-slate-400 block">
                  Marcados ({goalsScored > 0 ? Math.round((half1Scored / goalsScored) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xl text-slate-600 font-bold">:</div>
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{half1Conceded}</span>
                <span className="text-[10px] text-slate-400 block">
                  Sofridos ({goalsConceded > 0 ? Math.round((half1Conceded / goalsConceded) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* 2.ª Parte */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">2.ª Parte ({configuredHalfDuration + 1}–{configuredHalfDuration * 2}'+)</span>
              <span className="text-xs font-bold text-slate-400">
                Saldo: <strong className={half2Scored - half2Conceded >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {half2Scored - half2Conceded >= 0 ? `+${half2Scored - half2Conceded}` : half2Scored - half2Conceded}
                </strong>
              </span>
            </div>

            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-emerald-400">{half2Scored}</span>
                <span className="text-[10px] text-slate-400 block">
                  Marcados ({goalsScored > 0 ? Math.round((half2Scored / goalsScored) * 100) : 0}%)
                </span>
              </div>
              <div className="text-xl text-slate-600 font-bold">:</div>
              <div className="text-center">
                <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{half2Conceded}</span>
                <span className="text-[10px] text-slate-400 block">
                  Sofridos ({goalsConceded > 0 ? Math.round((half2Conceded / goalsConceded) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Períodos Detalhados do Jogo (Item 2 & 3) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
              <span>📊</span>
              <span>Golos por Período de Jogo</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em qualquer período para consultar todos os lances
            </p>
          </div>

          <div className="text-xs text-slate-400 font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            Duração configurada: <span className="text-cyan-400 font-black">{configuredHalfDuration}m / parte</span>
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
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                    : isWorstConceded
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono">{p.label}</span>
                    {isBestScored && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                        🔥 Janela mais eficaz
                      </span>
                    )}
                    {isWorstConceded && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-md">
                        ⚠️ Janela mais frágil
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-400 font-bold">⚽ {p.scored} marcados</span>
                    <span className="text-rose-400 font-bold">🥅 {p.conceded} sofridos</span>
                    <span className="text-slate-500">›</span>
                  </div>
                </div>

                {/* Comparative Double Horizontal Bar */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Scored Bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${(p.scored / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 w-4 text-right">{p.scored}</span>
                  </div>

                  {/* Conceded Bar */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 w-4 text-left">{p.conceded}</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
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
