import React, { useEffect, useState } from 'react';
import { Match } from '../../../../types';
import { formatMatchTime, getMatchElapsedMs } from '../../../../lib/utils';
import { getMatchPhase, getSuggestedMinute } from '../../../../lib/matchPhaseUtils';

const PHASE: Record<string, string> = {
  nao_iniciado: 'Por começar',
  parte1: '1.ª parte',
  intervalo: 'Intervalo',
  parte2: '2.ª parte'
};

/**
 * Modo Jogo: the scoreboard that stays on top while the game is recorded. Score, clock and part of the game, and
 * under them the game's controls side by side: Pausa / Retomar, Terminar 1.ª parte and Terminar jogo. Reads the
 * same clock as before (`timer`).
 */
export const LiveScoreboard: React.FC<{
  match: Match;
  myClubName: string;
  /** During a half: stop and start the clock again. */
  onTogglePause?: () => void;
  /** During the 1st half: go to half time (asks first). */
  onEndFirstHalf?: () => void;
  /** Once the game has started: the end-of-game checklist. */
  onEndGame?: () => void;
}> = ({ match, myClubName, onTogglePause, onEndFirstHalf, onEndGame }) => {
  const [, setTick] = useState(0);
  const isRunning = Boolean(match.timer?.isRunning);
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, match.timer?.lastStartTs]);

  const goals = match.goals || [];
  const ours = goals.filter((g) => g.type === 'scored').length;
  const theirs = goals.filter((g) => g.type === 'conceded').length;
  const phase = getMatchPhase(match);
  const minute = getSuggestedMinute(match);
  const paused = Boolean(onTogglePause) && !isRunning;

  return (
    <div className="sticky top-0 z-30 -mx-2 px-2 pt-1 pb-2 sm:-mx-4 sm:px-4 bg-ui-bg/95 backdrop-blur">
      <section
        aria-label="Placar"
        className={`ui-card grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 ${
          paused ? 'border-ui-warning' : ''
        }`}
      >
        <div className="min-w-0 text-center">
          <p className="truncate text-ui-caption font-bold text-ui-muted">{myClubName}</p>
          <p className="ui-figure text-ui-display leading-none text-ui-brand">{ours}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className={`ui-badge ${phase === 'intervalo' ? 'ui-badge-brand' : paused ? 'ui-badge-warning' : ''}`}>
            {paused ? 'Em pausa' : PHASE[phase] || ''}
          </span>
          <span className="ui-figure tracking-wider text-ui-title text-ui-text">
            {formatMatchTime(getMatchElapsedMs(match))}
          </span>
          <span className="text-ui-caption text-ui-muted">{minute ? `minuto ${minute}'` : '—'}</span>
        </div>
        <div className="min-w-0 text-center">
          <p className="truncate text-ui-caption font-bold text-ui-muted">{match.opponent || 'Adversário'}</p>
          <p className="ui-figure text-ui-display leading-none text-ui-text">{theirs}</p>
        </div>
      </section>
      {(onTogglePause || onEndFirstHalf || onEndGame) && (
        <div role="group" aria-label="Controlo do jogo" className="mt-1.5 flex gap-1.5">
          {onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-pressed={paused}
              aria-label={paused ? '▶️ Retomar o jogo' : '⏸️ Pausa'}
              className={`ui-btn flex-1 px-2 py-2 text-ui-caption font-bold ${
                paused ? 'ui-btn-success' : 'ui-btn-secondary'
              }`}
            >
              {paused ? '▶ Retomar' : '⏸ Pausa'}
            </button>
          )}
          {onEndFirstHalf && (
            <button
              type="button"
              onClick={onEndFirstHalf}
              className="ui-btn ui-btn-secondary flex-1 px-2 py-2 text-ui-caption font-bold"
            >
              Terminar 1.ª parte
            </button>
          )}
          {onEndGame && (
            <button
              type="button"
              onClick={onEndGame}
              className={`ui-btn flex-1 px-2 py-2 text-ui-caption font-bold ${
                phase === 'parte2' ? 'ui-btn-primary' : 'ui-btn-secondary'
              }`}
            >
              Terminar jogo
            </button>
          )}
        </div>
      )}
      {paused && (
        <p role="status" className="mt-1.5 text-center text-ui-caption font-semibold text-ui-warning">
          Jogo em pausa: o tempo está parado. Toca em Retomar quando o jogo recomeçar.
        </p>
      )}
    </div>
  );
};
