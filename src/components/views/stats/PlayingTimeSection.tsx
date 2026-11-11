import React, { useMemo, useState } from 'react';
import { Match, Player } from '../../../types';
import { computeSeasonPlayingTime, gamesMissingStarters, getCalledUpPlayers } from '../../../lib/playingTime';
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

  const below = withGames.filter((r) => r.fewestMinutes);

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="card-title" style={{ marginBottom: 0 }}>
          ⏱️ Minutos de jogo
        </div>
        <span className="text-[10px] font-mono text-ui-muted">
          % conv. = minutos ÷ minutos dos jogos em que foi convocado
        </span>
      </div>

      {below.length > 0 && (
        <div className="mb-3 p-2.5 rounded-xl bg-ui-warning-soft border border-ui-warning/40 text-[11px] text-ui-warning">
          Com menos minutos nos jogos em que foram convocados: {below.map((r) => r.name).join(', ')}. É só um alerta:
          quem joga decide o treinador.
        </div>
      )}

      {missing.length > 0 && (
        <div
          className="mb-3 p-2.5 rounded-xl bg-ui-danger-soft border border-ui-danger/40 text-[11px] text-ui-danger space-y-2"
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
            <tr className="text-ui-muted font-mono text-left">
              <th className="py-1 pr-2 font-normal">Atleta</th>
              <th className="py-1 px-1 font-normal text-right">Min.</th>
              <th
                className="py-1 px-1 font-normal text-right"
                title="Percentagem dos minutos de todos os jogos da época"
              >
                % época
              </th>
              <th
                className="py-1 px-1 font-normal text-right"
                title="Percentagem dos minutos dos jogos em que foi convocado (conta para a falta de minutos)"
              >
                % conv.
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
                <tr key={r.playerId} className="border-t border-ui-line">
                  <td className="py-1.5 pr-2 text-ui-text">
                    <span className="text-ui-muted font-mono mr-1">{r.number ?? ''}</span>
                    {r.name}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-ui-text">{r.minutes}&apos;</td>
                  <td className="py-1.5 px-1 text-right font-mono text-ui-text">{pct}%</td>
                  <td
                    className={`py-1.5 px-1 text-right font-mono font-bold ${
                      r.matchesCalledUp === 0
                        ? 'text-ui-muted'
                        : r.fewestMinutes
                          ? 'text-ui-warning'
                          : 'text-ui-success'
                    }`}
                  >
                    {r.matchesCalledUp ? `${Math.round(r.callupShare * 100)}%` : '—'}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-ui-text">
                    {r.matchesPlayed}/{r.matchesCalledUp}
                  </td>
                  <td className="py-1.5 pl-1 text-right font-mono text-ui-text">{r.starts}</td>
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
