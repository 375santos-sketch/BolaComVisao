import React, { useEffect, useState } from 'react';
import { Match, Player } from '../../../../types';
import { getPlayersOnPitchAtEndOfHalf, playerLabel } from '../../../../lib/utils';
import { getMatchPhase, getNominalHalfDuration } from '../../../../lib/matchPhaseUtils';
import { getLiveMatchMinutes, PLAYING_TIME_TARGET } from '../../../../lib/playingTime';

interface LivePlayingTimePanelProps {
  match: Match;
  roster: Player[];
  category?: string;
}

/**
 * Live minutes per called-up player, with a warning for bench players who must come on soon
 * to reach the playing-time target (half of the match by default).
 */
export const LivePlayingTimePanel: React.FC<LivePlayingTimePanelProps> = ({ match, roster, category }) => {
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const phase = getMatchPhase(match);
  if (phase === 'nao_iniciado') return null;

  const { played, elapsedMinutes } = getLiveMatchMinutes(match);
  const totalMinutes = 2 * getNominalHalfDuration(match, category);
  const targetMinutes = Math.round(totalMinutes * PLAYING_TIME_TARGET);
  const onPitch = new Set(getPlayersOnPitchAtEndOfHalf(match, phase === 'parte1' ? 1 : 2));

  const rows = Object.entries(played)
    .map(([id, minutes]) => {
      const player = roster.find((p) => p.id === id);
      const isOnPitch = onPitch.has(id);
      const missing = Math.max(0, targetMinutes - minutes);
      // Latest game minute a bench player can come on and still reach the target
      const latestEntry = totalMinutes - missing;
      return {
        id,
        label: player ? playerLabel(player) : 'Atleta',
        minutes,
        isOnPitch,
        missing,
        latestEntry,
        urgent: !isOnPitch && missing > 0 && latestEntry - elapsedMinutes <= 10
      };
    })
    .sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label, 'pt-PT'));

  const urgent = rows.filter((r) => r.urgent);
  const notPlayedYet = rows.filter((r) => r.minutes === 0 && !r.isOnPitch);

  return (
    <div className="ui-card text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        aria-expanded={expanded}
      >
        <span className="font-bold text-slate-200 font-['Chakra_Petch'] uppercase tracking-wide">
          ⏱️ Minutos em jogo
        </span>
        <span className="text-slate-400 font-mono">
          {notPlayedYet.length > 0 ? `${notPlayedYet.length} ainda sem jogar · ` : ''}
          {expanded ? 'Esconder' : 'Ver todos'}
        </span>
      </button>

      {urgent.length > 0 && (
        <div className="mx-3 mb-3 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 space-y-1">
          <div className="font-bold">Para jogarem pelo menos metade do jogo ({targetMinutes}&apos;):</div>
          {urgent.map((r) => (
            <div key={r.id}>
              • <strong>{r.label}</strong>{' '}
              {r.latestEntry > elapsedMinutes
                ? `tem de entrar até ao minuto ${r.latestEntry}`
                : `já não chega aos ${targetMinutes}' (pode jogar no máximo mais ${Math.max(0, totalMinutes - elapsedMinutes)}')`}
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <ul className="px-3 pb-3 space-y-1.5">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.minutes / Math.max(1, totalMinutes)) * 100));
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${r.isOnPitch ? 'bg-emerald-400' : 'bg-slate-600'}`}
                  title={r.isOnPitch ? 'Em campo' : 'No banco'}
                />
                <span className="flex-1 truncate text-slate-200">{r.label}</span>
                <span className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <span
                    className={`block h-full ${r.minutes >= targetMinutes ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-9 text-right font-mono text-slate-300">{r.minutes}&apos;</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
