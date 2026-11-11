import React, { useState, useEffect } from 'react';
import { Match } from '../../../../types';
import { getMatchElapsedMs, formatMatchTime } from '../../../../lib/utils';
import { getSuggestedMinute } from '../../../../lib/matchPhaseUtils';

interface MatchClockProps {
  match: Match;
  className?: string;
  /** During a half: stop and start the clock again (⏸️ Pausa / ▶️ Retomar). */
  onTogglePause?: () => void;
}

export const MatchClock: React.FC<MatchClockProps> = ({ match, className = '', onTogglePause }) => {
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

  const paused = Boolean(onTogglePause) && !isRunning;

  return (
    <div
      className={`rounded-2xl bg-ui-inset/80 border shadow-inner ${paused ? 'border-ui-warning/70' : 'border-ui-line'} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3">
        {/* Relógio mm:ss e Estado */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">⏱️</span>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-ui-text">
              {timeFormatted}
            </span>
          </div>

          {/* Estado: a correr vs parado */}
          <div className="flex items-center gap-1.5">
            {isRunning ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono uppercase bg-ui-success/20 text-ui-success border border-ui-success/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ui-success animate-ping" />
                <span>a correr</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono uppercase bg-ui-surface-2 text-ui-muted border border-ui-line-strong flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-ui-warning' : 'bg-ui-line-strong'}`} />
                <span>{paused ? 'em pausa' : 'parado'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Minuto contínuo de jogo sugerido pelo relógio */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ui-muted uppercase font-mono font-bold">Minuto:</span>
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
              suggestedMin
                ? 'bg-ui-brand/20 text-ui-brand border-ui-brand/40 shadow-sm'
                : 'bg-ui-surface text-ui-muted border-ui-line'
            }`}
          >
            {suggestedMin ? `${suggestedMin}'` : '—'}
          </span>
        </div>
      </div>
      {onTogglePause && (
        <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
          <button
            type="button"
            onClick={onTogglePause}
            aria-pressed={paused}
            className={`ui-btn w-full py-3 text-base font-black ${paused ? 'ui-btn-success' : 'ui-btn-warning'}`}
          >
            {paused ? '▶️ Retomar o jogo' : '⏸️ Pausa'}
          </button>
          {paused && (
            <p role="status" className="mt-1.5 text-center text-xs font-semibold text-ui-warning">
              Jogo em pausa: o tempo está parado. Toca em Retomar quando o jogo recomeçar.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
