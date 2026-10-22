import React, { useMemo, useState } from 'react';
import { AppState } from '../../types';
import {
  GOAL_BLOCKS,
  PanelFilter,
  PanelScope,
  panelMatches,
  panelOptions,
  panelSpan,
  playerPanel,
  teamPanel
} from '../../lib/statsPanel';
import { sortPlayerObjs } from '../../lib/utils';
import { BarChart } from './BarChart';

// Categorical slots 1 and 2 of the validated dark palette (checked against the app surface #0f172a).
const OURS = '#3987e5';
const THEIRS = '#d95926';

const SCOPES: { id: PanelScope; label: string }[] = [
  { id: 'epoca', label: 'Época' },
  { id: 'jogo', label: 'Jogo' },
  { id: 'confronto', label: 'Confronto' },
  { id: 'fase', label: 'Fase' },
  { id: 'periodo', label: 'Período' }
];

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const short = (name: string) => (name.length > 9 ? `${name.slice(0, 8)}…` : name);

const Tile: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
    <div className="text-lg font-extrabold text-white font-mono">{value}</div>
    <div className="text-[10px] text-slate-400 uppercase">{label}</div>
  </div>
);

interface StatsPanelProps {
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  /** Opens on one athlete (from the athlete's sheet); otherwise on the team. */
  initialPlayerId?: string;
}

/** Interactive statistics panel: team or athlete, by game, head-to-head, phase, season or any period. */
export const StatsPanel: React.FC<StatsPanelProps> = ({ state, onClose, onShowToast, initialPlayerId }) => {
  const options = useMemo(() => panelOptions(state.matches || [], state.season), [state.matches, state.season]);
  const [playerId, setPlayerId] = useState<string>(initialPlayerId || '');
  const [filter, setFilter] = useState<PanelFilter>({ scope: 'epoca', season: state.season });

  const setScope = (scope: PanelScope) =>
    setFilter({
      scope,
      season: state.season,
      matchId: scope === 'jogo' ? options.matches[0]?.id : undefined,
      opponent: scope === 'confronto' ? options.opponents[0] : undefined,
      phase: scope === 'fase' ? options.phases[0] : undefined,
      from: scope === 'periodo' ? `${(state.season || '').slice(0, 4) || new Date().getFullYear()}-07-01` : undefined,
      to: scope === 'periodo' ? new Date().toISOString().slice(0, 10) : undefined
    });

  const games = useMemo(() => panelMatches(state.matches || [], filter), [state.matches, filter]);
  const team = useMemo(() => teamPanel(games, state.roster || []), [games, state.roster]);
  const player = useMemo(
    () => (playerId ? playerPanel(games, state, playerId, panelSpan(filter, games)) : null),
    [games, state, playerId, filter]
  );
  const players = sortPlayerObjs((state.roster || []).filter((p) => p.active !== false));
  const playerName = players.find((p) => p.id === playerId)?.name;

  const exportPowerBi = async () => {
    const { exportPowerBiWorkbook } = await import('../../lib/powerBiExport');
    const name = await exportPowerBiWorkbook(state);
    onShowToast?.(`Ficheiro para o Power BI gerado: ${name}`);
  };

  const select = 'w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white';

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div
        role="dialog"
        aria-label="Painel de estatísticas"
        className="w-full max-w-3xl max-h-[96dvh] overflow-y-auto bg-slate-900 border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl p-4 space-y-4 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
            📊 Painel {playerName ? `· ${playerName}` : '· Equipa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white px-2 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Filters: one row of choices, then the selector of the chosen scope */}
        <div className="space-y-2">
          <select
            aria-label="Equipa ou atleta"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className={select}
          >
            <option value="">Equipa</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number !== null && p.number !== undefined ? `${p.number} – ` : ''}
                {p.name}
              </option>
            ))}
          </select>
          <div role="tablist" aria-label="Que jogos" className="flex flex-wrap gap-1.5">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={filter.scope === s.id}
                onClick={() => setScope(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filter.scope === s.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-950 text-cyan-300/80 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {filter.scope === 'jogo' && (
            <select
              aria-label="Jogo"
              value={filter.matchId || ''}
              onChange={(e) => setFilter({ ...filter, matchId: e.target.value })}
              className={select}
            >
              {options.matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {ddmm(m.date)}/{m.date.slice(0, 4)} · {m.opponent}
                </option>
              ))}
            </select>
          )}
          {filter.scope === 'confronto' && (
            <select
              aria-label="Adversário"
              value={filter.opponent || ''}
              onChange={(e) => setFilter({ ...filter, opponent: e.target.value })}
              className={select}
            >
              {options.opponents.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
          {filter.scope === 'fase' &&
            (options.phases.length === 0 ? (
              <p className="text-xs text-slate-400">Os jogos desta época ainda não têm fase/jornada registada.</p>
            ) : (
              <select
                aria-label="Fase"
                value={filter.phase || ''}
                onChange={(e) => setFilter({ ...filter, phase: e.target.value })}
                className={select}
              >
                {options.phases.map((ph) => (
                  <option key={ph} value={ph}>
                    {ph}
                  </option>
                ))}
              </select>
            ))}
          {filter.scope === 'periodo' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-slate-400">
                De
                <input
                  type="date"
                  value={filter.from || ''}
                  onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                  className={select}
                />
              </label>
              <label className="text-[11px] text-slate-400">
                Até
                <input
                  type="date"
                  value={filter.to || ''}
                  onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                  className={select}
                />
              </label>
            </div>
          )}
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Sem jogos terminados nesta escolha.</p>
        ) : player ? (
          <section aria-label="Números do atleta" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Tile value={`${player.played}/${player.calledUp}`} label="Jogou / convoc." />
              <Tile
                value={`${player.minutes}'`}
                label={
                  player.availableMinutes > 0
                    ? `${Math.round((player.minutes / player.availableMinutes) * 100)}% possíveis`
                    : 'Minutos'
                }
              />
              <Tile value={player.starts} label="Titular" />
              <Tile value={player.goals} label="Golos" />
              <Tile value={player.assists} label="Assistências" />
              <Tile
                value={player.trainings.rate === null ? '—' : `${player.trainings.rate}%`}
                label={`Treinos ${player.trainings.present}/${player.trainings.held}`}
              />
            </div>
            <BarChart
              title="Minutos por jogo"
              categories={player.games.map((g) => short(g.opponent))}
              details={player.games.map(
                (g) => `${ddmm(g.date)} · ${g.opponent}${g.calledUp ? '' : ' (não convocado)'}`
              )}
              series={[{ name: 'Minutos', color: OURS, values: player.games.map((g) => g.minutes) }]}
              unit="'"
            />
            <GamesTable
              head={['Data', 'Adversário', 'Min.', 'Golos', 'Assist.']}
              rows={player.games.map((g) => [
                ddmm(g.date),
                g.opponent,
                g.calledUp ? `${g.minutes}'${g.started ? ' (tit.)' : ''}` : 'não conv.',
                g.goals || '–',
                g.assists || '–'
              ])}
            />
          </section>
        ) : (
          <section aria-label="Números da equipa" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Tile value={team.played} label="Jogos" />
              <Tile value={`${team.wins}-${team.draws}-${team.losses}`} label="V-E-D" />
              <Tile value={`${team.scored}-${team.conceded}`} label="Golos M-S" />
              <Tile
                value={team.shots.games ? `${team.shots.for}-${team.shots.against}` : '—'}
                label={`Remates (${team.shots.games} j.)`}
              />
              <Tile
                value={team.corners.games ? `${team.corners.for}-${team.corners.against}` : '—'}
                label={`Cantos (${team.corners.games} j.)`}
              />
              <Tile value={team.played ? (team.scored / team.played).toFixed(1) : '—'} label="Golos/jogo" />
            </div>
            <BarChart
              title="Golos por jogo"
              categories={team.games.map((g) => short(g.opponent))}
              details={team.games.map((g) => `${ddmm(g.date)} · ${g.opponent} (${g.home ? 'casa' : 'fora'})`)}
              series={[
                { name: 'Marcados', color: OURS, values: team.games.map((g) => g.scored) },
                { name: 'Sofridos', color: THEIRS, values: team.games.map((g) => g.conceded) }
              ]}
            />
            <BarChart
              title="Golos por período do jogo"
              categories={GOAL_BLOCKS}
              series={[
                { name: 'Marcados', color: OURS, values: team.goalsByBlock.scored },
                { name: 'Sofridos', color: THEIRS, values: team.goalsByBlock.conceded }
              ]}
            />
            <GamesTable
              head={['Data', 'Adversário', 'Res.', 'Remates', 'Cantos']}
              rows={team.games.map((g) => [
                ddmm(g.date),
                `${g.opponent}${g.home ? '' : ' (f)'}`,
                `${g.scored}-${g.conceded}`,
                g.shotsFor === undefined ? '–' : `${g.shotsFor}-${g.shotsAgainst ?? 0}`,
                g.cornersFor === undefined ? '–' : `${g.cornersFor}-${g.cornersAgainst ?? 0}`
              ])}
            />
            {team.scorers.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-1">
                  Golos e assistências
                </div>
                <ul className="flex flex-wrap gap-1.5 text-[11px]">
                  {team.scorers.map((s) => (
                    <li
                      key={s.playerId}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      {s.name} <b>{s.goals}</b> golo(s) · <b>{s.assists}</b> assist.
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 max-w-sm">
            Para o Power BI no computador: ficheiro Excel com todos os jogos, golos, minutos, treinos e presenças (sem
            contactos nem datas de nascimento).
          </p>
          <button
            type="button"
            onClick={exportPowerBi}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
          >
            ⬇️ Exportar para Power BI
          </button>
        </div>
      </div>
    </div>
  );
};

const GamesTable: React.FC<{ head: string[]; rows: (string | number)[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto">
    <table aria-label="Jogos" className="w-full text-[11px] font-mono">
      <thead>
        <tr className="text-slate-400 text-left">
          {head.map((h) => (
            <th key={h} className="py-1 pr-2 font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-800 text-slate-200">
            {r.map((c, j) => (
              <td key={j} className="py-1 pr-2 whitespace-nowrap">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
