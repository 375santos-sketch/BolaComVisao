import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS, STATUS_CONFIG } from './types';
import { getPositionRank } from '../../../lib/utils';
import { returnSuffix } from '../../../lib/availability';
import { squadIndicators, pctLabel } from '../../../lib/squadIndicators';

interface SquadGridViewProps {
  state: AppState;
  sortedRoster: Player[];
  sortBy: SquadSortBy;
  sortDirection: SquadSortDirection;
  onSelectPlayer: (id: string) => void;
  onEditPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
}

export const SquadGridView: React.FC<SquadGridViewProps> = ({
  state,
  sortedRoster,
  sortBy,
  sortDirection,
  onSelectPlayer
}) => {
  const indicators = squadIndicators(state);
  const DOT: Record<string, string> = {
    disponivel: 'bg-ui-success',
    lesionado: 'bg-ui-warning',
    suspenso: 'bg-ui-danger',
    inativo: 'bg-ui-muted'
  };

  /*
   * One athlete per card: picture (or initials), shirt number, name and position; a dot on the picture says if they
   * can play, and below, discreetly, % of trainings and % of minutes when called up, with a small attendance bar.
   * Tapping the card opens the sheet (edit, picture card, PDF and remove are there).
   */
  const renderPlayerCard = (player: Player) => {
    const status = player.status || 'disponivel';
    const ind = indicators.get(player.id) || { callupShare: null, attendance: null };
    const st = STATUS_CONFIG[status];
    const initials = player.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return (
      <button
        key={player.id}
        type="button"
        onClick={() => onSelectPlayer(player.id)}
        aria-label={`${player.name}: abrir a ficha`}
        className="squad-card group"
      >
        {player.number !== null && player.number !== undefined && `${player.number}` !== '' && (
          <span className="absolute left-3 top-2.5 text-ui-caption font-black text-ui-brand">{player.number}</span>
        )}
        <span className="relative">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-ui-line object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ui-line bg-ui-surface-2 text-[20px] font-extrabold text-ui-text">
              {initials || '?'}
            </span>
          )}
          <span
            aria-hidden
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-ui-surface ${DOT[status] || 'bg-ui-success'}`}
          />
        </span>
        <h3
          className="mt-2 w-full truncate text-ui-body font-extrabold text-ui-text group-hover:text-ui-brand"
          title={player.name}
        >
          {player.name}
        </h3>
        <span className="w-full truncate text-ui-caption text-ui-muted">
          {player.positions || 'Jogador'}
          {status !== 'disponivel' && (
            <span className={st.text}>
              {' '}
              · {st.label.toLowerCase()}
              {returnSuffix(player)}
            </span>
          )}
        </span>
        <span className="mt-2 flex gap-3 text-[11px] text-ui-muted">
          {ind.attendance !== null && (
            <span>
              <b className="text-ui-caption text-ui-text">{pctLabel(ind.attendance)}</b> treinos
            </span>
          )}
          {ind.callupShare !== null && (
            <span>
              <b className="text-ui-caption text-ui-text">{pctLabel(ind.callupShare)}</b> min.
            </span>
          )}
        </span>
        {ind.attendance !== null && (
          <span className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ui-line" aria-hidden>
            <span
              className={`block h-full ${status === 'disponivel' ? 'bg-ui-success' : 'bg-ui-warning'}`}
              style={{ width: `${Math.round(ind.attendance * 100)}%` }}
            />
          </span>
        )}
      </button>
    );
  };

  if (sortBy === 'posicao') {
    return (
      <div className="space-y-5">
        {(sortDirection === 'asc' ? POSITION_GROUPS : [...POSITION_GROUPS].reverse()).map((group) => {
          const groupPlayers = sortedRoster.filter((p) => {
            const rank = getPositionRank(p.positions);
            if (group.id === 'outros') {
              return rank >= 14;
            }
            return group.ranks.includes(rank);
          });

          if (groupPlayers.length === 0) return null;

          return (
            <div key={group.id} className="space-y-2.5">
              <div className="flex items-center justify-between px-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ui-muted">
                <div className="flex items-center gap-2">
                  <span>{group.label}</span>
                  <span className="ui-badge">{groupPlayers.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 sm:gap-3">
                {groupPlayers.map(renderPlayerCard)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Non-position sort
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ui-muted">
        <div className="flex items-center gap-2">
          <span>{sortBy === 'numero' ? '🔢 Ordenado por Número da Camisola' : '🔤 Ordenado por Nome do Atleta'}</span>
          <span className="ui-badge">{sortedRoster.length} Atletas</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 sm:gap-3">
        {sortedRoster.map(renderPlayerCard)}
      </div>
    </div>
  );
};
