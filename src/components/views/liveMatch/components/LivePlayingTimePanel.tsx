import React, { useEffect, useState } from 'react';
import { Match, Player } from '../../../../types';
import { getPlayersOnPitchAtEndOfHalf, playerLabel } from '../../../../lib/utils';
import { getMatchPhase, getNominalHalfDuration } from '../../../../lib/matchPhaseUtils';
import { FEWEST_MINUTES_COUNT, getLiveMatchMinutes } from '../../../../lib/playingTime';

interface LivePlayingTimePanelProps {
  match: Match;
  roster: Player[];
  category?: string;
  /** Open with everyone listed (the "Em campo" tab of the live game). */
  defaultExpanded?: boolean;
}

/**
 * Live minutes per called-up player, with a warning for bench players who must come on soon
 * to reach the playing-time target (half of the match by default).
 */
export const LivePlayingTimePanel: React.FC<LivePlayingTimePanelProps> = ({
  match,
  roster,
  category,
  defaultExpanded = false
}) => {
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const phase = getMatchPhase(match);
  if (phase === 'nao_iniciado') return null;

  const { played } = getLiveMatchMinutes(match);
  const totalMinutes = 2 * getNominalHalfDuration(match, category);
  const onPitch = new Set(getPlayersOnPitchAtEndOfHalf(match, phase === 'parte1' ? 1 : 2));

  const rows = Object.entries(played)
    .map(([id, minutes]) => {
      const player = roster.find((p) => p.id === id);
      return { id, label: player ? playerLabel(player) : 'Atleta', minutes, isOnPitch: onPitch.has(id) };
    })
    .sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label, 'pt-PT'));

  // Only what the game already holds: goals scored and the card (red over yellow) of each athlete
  const goalsBy = (id: string) => (match.goals || []).filter((g) => g.type === 'scored' && g.scorerId === id).length;
  const cardOf = (id: string) => {
    const cards = (match.cards || []).filter((c) => c.playerId === id);
    return cards.some((c) => c.color === 'Vermelho') ? 'Vermelho' : cards.length ? 'Amarelo' : null;
  };
  // A warning only: the bench players with the fewest minutes in this game, so the coach can decide
  const fewest = rows.filter((r) => !r.isOnPitch).slice(0, FEWEST_MINUTES_COUNT);
  const notPlayedYet = rows.filter((r) => r.minutes === 0 && !r.isOnPitch);

  return (
    <div className="ui-card text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        aria-expanded={expanded}
      >
        <span className="font-bold text-ui-text">Minutos em jogo</span>
        <span className="text-ui-muted font-mono">
          {notPlayedYet.length > 0 ? `${notPlayedYet.length} ainda sem jogar · ` : ''}
          {expanded ? 'Esconder' : 'Ver todos'}
        </span>
      </button>

      {fewest.length > 0 && (
        <p className="mx-3 mb-3 rounded-ui-sm bg-ui-warning-soft p-2.5 text-ui-text">
          <strong className="text-ui-warning">Com menos minutos no banco:</strong>{' '}
          {fewest.map((r) => `${r.label} (${r.minutes}')`).join(' · ')}
        </p>
      )}

      {expanded && (
        <ul className="px-3 pb-3 space-y-1.5">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.minutes / Math.max(1, totalMinutes)) * 100));
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${r.isOnPitch ? 'bg-ui-success' : 'bg-ui-surface-3'}`}
                  title={r.isOnPitch ? 'Em campo' : 'No banco'}
                />
                <span className="flex-1 truncate text-ui-text">
                  {r.label}
                  {goalsBy(r.id) > 0 && (
                    <span className="ml-1" title={`${goalsBy(r.id)} golo(s)`}>
                      {'⚽'.repeat(Math.min(3, goalsBy(r.id)))}
                    </span>
                  )}
                  {cardOf(r.id) && (
                    <span
                      aria-label={`Cartão ${cardOf(r.id)!.toLowerCase()}`}
                      className={`ml-1 inline-block h-2.5 w-2 rounded-[2px] align-middle ${
                        cardOf(r.id) === 'Vermelho' ? 'bg-ui-danger' : 'bg-ui-warning'
                      }`}
                    />
                  )}
                </span>
                <span className="w-20 h-1.5 rounded-full bg-ui-surface-2 overflow-hidden">
                  <span
                    className={`block h-full ${r.isOnPitch ? 'bg-ui-success' : 'bg-ui-line-strong'}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-9 text-right font-mono text-ui-text">{r.minutes}&apos;</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
