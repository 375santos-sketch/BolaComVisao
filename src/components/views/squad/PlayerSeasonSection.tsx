import React from 'react';
import { PlayerSeason } from '../../../lib/playerSeason';
import { absenceReasonLabel } from '../../../lib/trainingQuick';
import { PLAYING_TIME_TARGET } from '../../../lib/playingTime';
import { homeFirstScore } from '../../../lib/utils';
import { PlayerEvolutionCharts } from './PlayerEvolutionCharts';

const ddmm = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');

const Tile: React.FC<{ value: React.ReactNode; label: string; tone?: string }> = ({ value, label, tone }) => (
  <div className="ui-inset p-2">
    <div className={`text-lg font-extrabold ${tone || 'text-white'}`}>{value}</div>
    <div className="text-[9px] text-slate-500 uppercase">{label}</div>
  </div>
);

/** The athlete's season: games and minutes, goals, training attendance with absence reasons, latest games. */
export const PlayerSeasonSection: React.FC<{ data: PlayerSeason }> = ({ data }) => {
  const { games, trainings } = data;
  const sharePct = Math.round(games.share * 100);
  const lowMinutes = games.availableMinutes > 0 && games.share < PLAYING_TIME_TARGET;

  return (
    <section aria-label="Época do atleta" className="space-y-3">
      <h4 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider">
        📊 Época {data.season || ''}
      </h4>

      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <Tile value={`${games.played}/${games.calledUp}`} label="Jogou / convoc." />
        <Tile value={games.starts} label="Titular" />
        <Tile
          value={`${games.minutes}'`}
          label={`${sharePct}% dos minutos`}
          tone={lowMinutes ? 'text-amber-300' : 'text-white'}
        />
        <Tile value={data.goals} label="Golos" tone="text-cyan-400" />
        <Tile value={data.assists} label="Assistências" tone="text-cyan-400" />
        <Tile
          value={trainings.rate === null ? '—' : `${trainings.rate}%`}
          label={`Treinos ${trainings.present}/${trainings.held}`}
          tone={trainings.rate !== null && trainings.rate < 70 ? 'text-rose-400' : 'text-emerald-400'}
        />
      </div>

      {(data.yellowCards > 0 || data.redCards > 0 || data.ratingAverage !== null) && (
        <p className="text-[11px] font-mono text-slate-400">
          {data.yellowCards > 0 || data.redCards > 0
            ? `Cartões: ${data.yellowCards} amarelo(s), ${data.redCards} vermelho(s)`
            : 'Sem cartões'}
          {data.ratingAverage !== null ? ` · Avaliação média ${data.ratingAverage}` : ''}
        </p>
      )}

      <PlayerEvolutionCharts data={data} />

      <div>
        <div className="text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1">Últimos jogos</div>
        {data.recentGames.length === 0 ? (
          <p className="text-[11px] text-slate-500 font-mono">Ainda sem jogos nesta época.</p>
        ) : (
          <ul aria-label="Últimos jogos" className="space-y-1 text-[11px] font-mono">
            {data.recentGames.map((g) => (
              <li
                key={g.matchId}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800"
              >
                <span className="text-slate-300 truncate">
                  {ddmm(g.date)} {g.home ? 'vs' : '@'} {g.opponent}{' '}
                  <span className="text-slate-500">{homeFirstScore(g.scored, g.conceded, g.home)}</span>
                </span>
                <span className="shrink-0 text-right">
                  {!g.calledUp ? (
                    <span className="text-slate-500">não convocado</span>
                  ) : (
                    <>
                      <span className={g.minutes === 0 ? 'text-amber-300' : 'text-white'}>{g.minutes}'</span>
                      {g.started ? <span className="text-emerald-400"> · tit.</span> : null}
                      {g.goals > 0 ? <span className="text-cyan-300"> · {g.goals} golo(s)</span> : null}
                      {g.assists > 0 ? <span className="text-cyan-300"> · {g.assists} assist.</span> : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1">
          Faltas aos treinos ({data.absences.length})
        </div>
        {data.absences.length === 0 ? (
          <p className="text-[11px] text-slate-500 font-mono">
            {trainings.held > 0 ? 'Sem faltas nesta época. 👏' : 'Ainda sem treinos nesta época.'}
          </p>
        ) : (
          <ul aria-label="Faltas aos treinos" className="space-y-1 text-[11px] font-mono">
            {data.absences.map((a) => (
              <li
                key={`${a.date}-${a.trainingNumber ?? ''}`}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800"
              >
                <span className="text-slate-300">
                  {ddmm(a.date)}
                  {a.trainingNumber ? ` · Treino ${a.trainingNumber}` : ''}
                </span>
                <span className={a.reason ? 'text-amber-300' : 'text-slate-500'}>{absenceReasonLabel(a.reason)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
