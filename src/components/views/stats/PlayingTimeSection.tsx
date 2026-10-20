import React, { useMemo, useState } from 'react';
import { Match, Player } from '../../../types';
import { computeSeasonPlayingTime, PLAYING_TIME_TARGET } from '../../../lib/playingTime';

interface PlayingTimeSectionProps {
  matches: Match[];
  roster: Player[];
  category?: string;
}

/** Season playing time per player, players below the target first. */
export const PlayingTimeSection: React.FC<PlayingTimeSectionProps> = ({ matches, roster, category }) => {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => computeSeasonPlayingTime(matches, roster, category), [matches, roster, category]);
  const withGames = rows.filter((r) => r.matchesCalledUp > 0);
  if (withGames.length === 0) return null;

  const below = withGames.filter((r) => r.belowTarget);
  const visible = showAll ? withGames : withGames.slice(0, 8);
  const targetPct = Math.round(PLAYING_TIME_TARGET * 100);

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="card-title" style={{ marginBottom: 0 }}>
          ⏱️ Minutos de jogo
        </div>
        <span className="text-[10px] font-mono text-slate-400">Objetivo: {targetPct}% dos minutos possíveis</span>
      </div>

      {below.length > 0 ? (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200">
          <strong>{below.length}</strong> {below.length === 1 ? 'atleta está' : 'atletas estão'} abaixo de {targetPct}%
          dos minutos possíveis: {below.map((r) => r.name).join(', ')}.
        </div>
      ) : (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200">
          Todos os atletas convocados jogaram pelo menos {targetPct}% dos minutos possíveis. 👏
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
            {visible.map((r) => {
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

      {withGames.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[11px] text-cyan-300 hover:underline"
        >
          {showAll ? 'Mostrar menos' : `Ver todos (${withGames.length})`}
        </button>
      )}
    </div>
  );
};
