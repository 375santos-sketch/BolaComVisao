import React, { useMemo, useState } from 'react';
import { Match, Player } from '../../../types';
import {
  computeSeasonPlayingTime,
  gamesMissingStarters,
  getCalledUpPlayers,
  PLAYING_TIME_TARGET
} from '../../../lib/playingTime';
import { getLineupSize } from '../../../lib/constants';
import { LineupModal } from '../liveMatch/components/LineupModal';

interface PlayingTimeSectionProps {
  matches: Match[];
  roster: Player[];
  category?: string;
  /** Saves the first-half starters of a finished game that has none (without them its minutes come out short). */
  onSetStarters?: (matchId: string, lineup: string[]) => void;
}

/** Season playing time of every active athlete (called up or not), most minutes first. */
export const PlayingTimeSection: React.FC<PlayingTimeSectionProps> = ({ matches, roster, category, onSetStarters }) => {
  const [fixing, setFixing] = useState<Match | null>(null);
  const rows = useMemo(() => computeSeasonPlayingTime(matches, roster, category), [matches, roster, category]);
  const missing = useMemo(() => gamesMissingStarters(matches, roster), [matches, roster]);
  const withGames = rows
    .filter((r) => r.availableMinutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'pt-PT'));
  if (withGames.length === 0) return null;

  const below = withGames.filter((r) => r.belowTarget);
  const targetPct = Math.round(PLAYING_TIME_TARGET * 100);

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="card-title" style={{ marginBottom: 0 }}>
          ⏱️ Minutos de jogo
        </div>
        <span className="text-[10px] font-mono text-slate-400">Objetivo: {targetPct}% dos minutos dos jogos</span>
      </div>

      {below.length > 0 ? (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200">
          <strong>{below.length}</strong> {below.length === 1 ? 'atleta está' : 'atletas estão'} abaixo de {targetPct}%
          dos minutos dos jogos: {below.map((r) => r.name).join(', ')}.
        </div>
      ) : (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
          Todos os atletas jogaram pelo menos {targetPct}% dos minutos dos jogos. 👏
        </div>
      )}

      {missing.length > 0 && (
        <div
          className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-200 space-y-2"
          data-testid="missing-starters"
        >
          <p>
            ⚠️ Os minutos não estão completos: {missing.length === 1 ? 'este jogo não tem' : 'estes jogos não têm'} os
            titulares da 1.ª parte registados (por exemplo, jogos importados de uma ficha sem titulares). Sem eles, quem
            começou o jogo perde os minutos até ser substituído.
          </p>
          {missing.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <span>
                {m.date.split('-').reverse().join('/')} vs {m.opponent} · {(m.lineup || []).length}/{getLineupSize(m)}{' '}
                titulares
              </span>
              {onSetStarters && (
                <button
                  type="button"
                  onClick={() => setFixing(m)}
                  className="ui-btn ui-btn-soft-danger shrink-0 px-2.5 py-1"
                >
                  Indicar titulares
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-400 font-mono text-left">
              <th className="py-1 pr-2 font-normal">Atleta</th>
              <th className="py-1 px-1 font-normal text-right">Min.</th>
              <th className="py-1 px-1 font-normal text-right" title="Percentagem dos minutos em que podia ter jogado">
                %
              </th>
              <th className="py-1 px-1 font-normal text-right" title="Jogos em que jogou / jogos em que foi convocado">
                Jogos
              </th>
              <th className="py-1 pl-1 font-normal text-right" title="Jogos como titular">
                Tit.
              </th>
            </tr>
          </thead>
          <tbody>
            {withGames.map((r) => {
              const pct = Math.round(r.share * 100);
              return (
                <tr key={r.playerId} className="border-t border-slate-800">
                  <td className="py-1.5 pr-2 text-slate-200">
                    <span className="text-slate-500 font-mono mr-1">{r.number ?? ''}</span>
                    {r.name}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-slate-300">{r.minutes}&apos;</td>
                  <td
                    className={`py-1.5 px-1 text-right font-mono font-bold ${r.belowTarget ? 'text-amber-300' : 'text-emerald-300'}`}
                  >
                    {pct}%
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-slate-300">
                    {r.matchesPlayed}/{r.matchesCalledUp}
                  </td>
                  <td className="py-1.5 pl-1 text-right font-mono text-slate-300">{r.starts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {fixing && onSetStarters && (
        <LineupModal
          isOpen
          half={1}
          onClose={() => setFixing(null)}
          availablePlayers={roster.filter(
            (p) => p && (p.active !== false || getCalledUpPlayers(fixing).includes(p.id))
          )}
          convocadosIds={getCalledUpPlayers(fixing)}
          lineupSize={getLineupSize(fixing)}
          initialSelection={fixing.lineup || []}
          onConfirm={(ids) => {
            onSetStarters(fixing.id, ids);
            setFixing(null);
          }}
        />
      )}
    </div>
  );
};
