import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS } from './types';
import { getPositionRank } from '../../../lib/utils';
import { squadIndicators, pctLabel } from '../../../lib/squadIndicators';
import { Avatar } from '../../ui/Avatar';
import { AvailabilityPill } from '../../ui/AvailabilityPill';
import { Icon } from '../../ui/Icon';

interface SquadListViewProps {
  state: AppState;
  sortedRoster: Player[];
  sortBy: SquadSortBy;
  sortDirection: SquadSortDirection;
  onSelectPlayer: (id: string) => void;
  onEditPlayer: (player: Player) => void;
}

export const SquadListView: React.FC<SquadListViewProps> = ({
  state,
  sortedRoster,
  sortBy,
  sortDirection,
  onSelectPlayer,
  onEditPlayer
}) => {
  const indicators = squadIndicators(state);
  const attendanceThreshold = state.notificationSettings?.attendanceThreshold || 50;

  /*
   * One athlete per row: picture or number, name, position and, discreetly, % of minutes when called up and % of
   * trainings (the same figures as the athlete's sheet). Only what needs attention stands out on the right: being
   * injured, suspended or inactive (with the return date), or low attendance.
   */
  const renderPlayerRow = (player: Player) => {
    const ind = indicators.get(player.id) || { callupShare: null, attendance: null };
    const unavailable = player.status === 'lesionado' || player.status === 'suspenso' || player.status === 'inativo';
    const lowAttendance = ind.attendance !== null && ind.attendance * 100 < attendanceThreshold;
    const figures = [
      ind.callupShare === null ? '' : `${pctLabel(ind.callupShare)} conv.`,
      ind.attendance === null ? '' : `${pctLabel(ind.attendance)} treinos`
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <div
        key={player.id}
        onClick={() => onSelectPlayer(player.id)}
        className="ui-card group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:border-ui-line-strong"
      >
        <Avatar name={player.name} photoUrl={player.photoUrl} number={player.number} />
        <div className="min-w-0 flex-1">
          <h3 className="!font-sans !normal-case !tracking-normal truncate text-ui-body font-bold leading-tight text-ui-text group-hover:text-ui-brand">
            {player.photoUrl && player.number !== null && player.number !== undefined && `${player.number}` !== '' && (
              <span className="mr-1 text-ui-muted">{player.number}</span>
            )}
            {player.name}
          </h3>
          <div className="mt-0.5 truncate text-ui-caption text-ui-muted">
            {player.positions || 'Jogador'}
            {figures && <span className="text-ui-muted/80"> · {figures}</span>}
          </div>
        </div>
        {unavailable ? (
          <AvailabilityPill player={player} quiet />
        ) : (
          lowAttendance && (
            <span className="ui-badge ui-badge-warning" title={`Presenças nos treinos: ${pctLabel(ind.attendance)}`}>
              Treinos {pctLabel(ind.attendance)}
            </span>
          )
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditPlayer(player);
          }}
          className="shrink-0 rounded-ui-sm p-1.5 text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          title="Editar Jogador"
          aria-label={`Editar ${player.name}`}
        >
          <Icon name="settings" className="h-4 w-4" />
        </button>
      </div>
    );
  };

  if (sortBy === 'posicao') {
    return (
      <div className="space-y-4">
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
            <div key={group.id} className="space-y-2">
              {/* Tactical Group Header */}
              <div className="flex items-center justify-between px-1 text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">
                <div className="flex items-center gap-2">
                  <span>{group.label.replace(/^\S+\s/, '')}</span>
                  <span className="text-ui-caption font-bold text-ui-muted/70">{groupPlayers.length}</span>
                </div>
              </div>

              <div className="space-y-1.5">{groupPlayers.map(renderPlayerRow)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Non-position sort (plain linear list)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">
        <div className="flex items-center gap-2">
          <span>{sortBy === 'numero' ? '🔢 Ordenado por Número da Camisola' : '🔤 Ordenado por Nome do Atleta'}</span>
          <span className="text-ui-caption font-bold text-ui-muted/70">{sortedRoster.length} Atletas</span>
        </div>
        <span className="text-[10px] font-mono text-ui-muted">
          {sortBy === 'numero'
            ? sortDirection === 'asc'
              ? 'Ordem: #1 ao Maior'
              : 'Ordem: Maior ao #1'
            : sortDirection === 'asc'
              ? 'Ordem: A a Z'
              : 'Ordem: Z a A'}
        </span>
      </div>

      <div className="space-y-1.5">{sortedRoster.map(renderPlayerRow)}</div>
    </div>
  );
};
