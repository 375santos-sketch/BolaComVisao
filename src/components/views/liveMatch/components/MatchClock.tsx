import React, { useState, useEffect } from 'react';
import { Match } from '../../../../types';
import { getMatchElapsedMs, formatMatchTime } from '../../../../lib/utils';
import { getSuggestedMinute } from '../../../../lib/matchPhaseUtils';

interface MatchClockProps {
  match: Match;
  className?: string;
}

export const MatchClock: React.FC<MatchClockProps> = ({ match, className = '' }) => {
  // Tick de atualização a cada segundo quando o relógio está a correr
  const [, setTick] = useState(0);

  const isRunning = Boolean(match.timer?.isRunning);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, match.timer?.lastStartTs]);

  // O valor decorrido vem sempre de timer.elapsedMs e timer.lastStartTs (não de contador em memória)
  const elapsedMs = getMatchElapsedMs(match);
  const timeFormatted = formatMatchTime(elapsedMs);
  const suggestedMin = getSuggestedMinute(match);

  return (
    <div
      className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner ${className}`}
    >
      {/* Relógio mm:ss e Estado */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">⏱️</span>
          <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white">{timeFormatted}</span>
        </div>

        {/* Estado: a correr vs parado */}
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>a correr</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>parado</span>
            </span>
          )}
        </div>
      </div>

      {/* Minuto contínuo de jogo sugerido pelo relógio */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Minuto:</span>
        <span
          className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
            suggestedMin
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          {suggestedMin ? `${suggestedMin}'` : '—'}
        </span>
      </div>
    </div>
  );
};
