import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS } from './types';
import { getPositionRank } from '../../../lib/utils';
import { squadIndicators, pctLabel } from '../../../lib/squadIndicators';
import { Avatar } from '../../ui/Avatar';
import { AvailabilityPill } from '../../ui/AvailabilityPill';
import { Icon } from '../../ui/Icon';
import { GroupHead } from './GroupHead';

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
  onSelectPlayer
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
      <button
        key={player.id}
        type="button"
        onClick={() => onSelectPlayer(player.id)}
        aria-label={`${player.name}: abrir a ficha`}
        className="group flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ui-surface-2"
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
        <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-ui-subtle" />
      </button>
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
              <GroupHead label={group.label} count={groupPlayers.length} />
              <div className="ui-card divide-y divide-ui-line overflow-hidden">{groupPlayers.map(renderPlayerRow)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Non-position sort (plain linear list)
  return (
    <div className="space-y-4">
      <GroupHead label={sortBy === 'numero' ? 'Por número da camisola' : 'Por nome'} count={sortedRoster.length} />
      <div className="ui-card divide-y divide-ui-line overflow-hidden">{sortedRoster.map(renderPlayerRow)}</div>
    </div>
  );
};
