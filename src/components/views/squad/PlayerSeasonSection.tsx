import React from 'react';
import { PlayerSeason } from '../../../lib/playerSeason';
import { absenceReasonLabel } from '../../../lib/trainingQuick';
import { PLAYING_TIME_TARGET } from '../../../lib/playingTime';
import { homeFirstScore } from '../../../lib/utils';
import { PlayerEvolutionCharts } from './PlayerEvolutionCharts';

const ddmm = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');

const Tile: React.FC<{ value: React.ReactNode; label: string; tone?: string }> = ({ value, label, tone }) => (
  <div className="ui-inset p-2">
    <div className={`text-lg font-extrabold ${tone || 'text-ui-text'}`}>{value}</div>
    <div className="text-[9px] text-ui-muted uppercase">{label}</div>
  </div>
);

/** The athlete's season: games and minutes, goals, training attendance with absence reasons, latest games. */
export const PlayerSeasonSection: React.FC<{
  data: PlayerSeason;
  /** The figures are already at the top of the athlete's sheet (Resumo): show only the charts and the lists. */
  hideTiles?: boolean;
}> = ({ data, hideTiles = false }) => {
  const { games, trainings } = data;
  const sharePct = Math.round(games.share * 100);
  const lowMinutes = games.availableMinutes > 0 && games.share < PLAYING_TIME_TARGET;

  return (
    <section aria-label="Época do atleta" className="space-y-3">
      {!hideTiles && (
        <h4 className="text-xs font-['Chakra_Petch'] font-bold text-ui-brand uppercase tracking-wider">
          📊 Época {data.season || ''}
        </h4>
      )}

      <div className={`grid grid-cols-3 gap-2 text-center text-xs font-mono ${hideTiles ? 'hidden' : ''}`}>
        <Tile value={`${games.played}/${games.calledUp}`} label="Jogou / convoc." />
        <Tile value={games.starts} label="Titular" />
        <Tile
          value={`${games.minutes}'`}
          label={`${sharePct}% dos minutos`}
          tone={lowMinutes ? 'text-ui-warning' : 'text-ui-text'}
        />
        <Tile value={data.goals} label="Golos" tone="text-ui-brand" />
        <Tile value={data.assists} label="Assistências" tone="text-ui-brand" />
        <Tile
          value={trainings.rate === null ? '—' : `${trainings.rate}%`}
          label={`Treinos ${trainings.present}/${trainings.held}`}
          tone={trainings.rate !== null && trainings.rate < 70 ? 'text-ui-danger' : 'text-ui-success'}
        />
      </div>

      {(data.yellowCards > 0 || data.redCards > 0 || data.ratingAverage !== null) && (
        <p className="text-[11px] font-mono text-ui-muted">
          {data.yellowCards > 0 || data.redCards > 0
            ? `Cartões: ${data.yellowCards} amarelo(s), ${data.redCards} vermelho(s)`
            : 'Sem cartões'}
          {data.ratingAverage !== null ? ` · Avaliação média ${data.ratingAverage}` : ''}
        </p>
      )}

      <PlayerEvolutionCharts data={data} />

      <div>
        <div className="text-[11px] font-mono uppercase text-ui-brand font-bold mb-1">Últimos jogos</div>
        {data.recentGames.length === 0 ? (
          <p className="text-[11px] text-ui-muted font-mono">Ainda sem jogos nesta época.</p>
        ) : (
          <ul aria-label="Últimos jogos" className="space-y-1 text-[11px] font-mono">
            {data.recentGames.map((g) => (
              <li
                key={g.matchId}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-ui-inset border border-ui-line"
              >
                <span className="text-ui-text truncate">
                  {ddmm(g.date)} {g.home ? 'vs' : '@'} {g.opponent}{' '}
                  <span className="text-ui-muted">{homeFirstScore(g.scored, g.conceded, g.home)}</span>
                </span>
                <span className="shrink-0 text-right">
                  {!g.calledUp ? (
                    <span className="text-ui-muted">não convocado</span>
                  ) : (
                    <>
                      <span className={g.minutes === 0 ? 'text-ui-warning' : 'text-ui-text'}>{g.minutes}'</span>
                      {g.started ? <span className="text-ui-success"> · tit.</span> : null}
                      {g.goals > 0 ? <span className="text-ui-brand"> · {g.goals} golo(s)</span> : null}
                      {g.assists > 0 ? <span className="text-ui-brand"> · {g.assists} assist.</span> : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-[11px] font-mono uppercase text-ui-brand font-bold mb-1">
          Faltas aos treinos ({data.absences.length})
        </div>
        {data.absences.length === 0 ? (
          <p className="text-[11px] text-ui-muted font-mono">
            {trainings.held > 0 ? 'Sem faltas nesta época. 👏' : 'Ainda sem treinos nesta época.'}
          </p>
        ) : (
          <ul aria-label="Faltas aos treinos" className="space-y-1 text-[11px] font-mono">
            {data.absences.map((a) => (
              <li
                key={`${a.date}-${a.trainingNumber ?? ''}`}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-ui-inset border border-ui-line"
              >
                <span className="text-ui-text">
                  {ddmm(a.date)}
                  {a.trainingNumber ? ` · Treino ${a.trainingNumber}` : ''}
                </span>
                <span className={a.reason ? 'text-ui-warning' : 'text-ui-muted'}>{absenceReasonLabel(a.reason)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
