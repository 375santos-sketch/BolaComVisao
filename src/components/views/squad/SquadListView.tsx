import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS, STATUS_CONFIG } from './types';
import { getPositionRank } from '../../../lib/utils';
import { returnSuffix } from '../../../lib/availability';

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
  const completedTrainings = (state.trainings || []).filter((tr) => tr.completed !== false);
  const totalTrainingsCount = completedTrainings.length;
  const attendanceThreshold = state.notificationSettings?.attendanceThreshold || 50;

  const renderPlayerRow = (player: Player) => {
    const st = STATUS_CONFIG[player.status || 'disponivel'];
    const playerAbsences = completedTrainings.filter((tr) => (tr.absences || []).includes(player.id)).length;
    const playerPresences = Math.max(0, totalTrainingsCount - playerAbsences);
    const attendancePct = totalTrainingsCount > 0 ? Math.round((playerPresences / totalTrainingsCount) * 100) : 0;
    const hasLowAttendance = totalTrainingsCount >= 1 && attendancePct < attendanceThreshold;

    const unavailable = player.status === 'lesionado' || player.status === 'suspenso' || player.status === 'inativo';
    const hasNumber = player.number !== null && player.number !== undefined && `${player.number}` !== '';
    const details = [player.positions || 'Jogador', unavailable ? `${st.label}${returnSuffix(player)}` : '']
      .filter(Boolean)
      .join(' · ');

    return (
      <div
        key={player.id}
        onClick={() => onSelectPlayer(player.id)}
        className="ui-card px-3 py-2.5 flex items-center gap-3 cursor-pointer group"
      >
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt=""
            className="w-11 h-11 shrink-0 rounded-full object-cover border-2 border-slate-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="ui-inset w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-base font-bold text-white font-['Chakra_Petch']">
            {hasNumber ? player.number : '–'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="!font-sans !normal-case !tracking-normal font-bold text-sm text-white leading-tight truncate group-hover:text-cyan-300">
            {player.photoUrl && hasNumber && <span className="text-slate-400 mr-1">{player.number}</span>}
            {player.name}
          </h3>
          <div className={`text-xs truncate mt-0.5 ${unavailable ? st.text : 'text-slate-400'}`}>{details}</div>
        </div>
        {unavailable ? (
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${st.bg} ${st.text}`}>
            {st.label}
          </span>
        ) : (
          hasLowAttendance && (
            <span
              className="shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
              title={`Presenças nos treinos: ${attendancePct}%`}
            >
              Treinos {attendancePct}%
            </span>
          )
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditPlayer(player);
          }}
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-white"
          title="Editar Jogador"
          aria-label={`Editar ${player.name}`}
        >
          ✏️
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
              <div className="flex items-center justify-between text-slate-400 font-bold text-xs uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <span>{group.label}</span>
                  <span className="text-xs text-slate-500 font-bold">{groupPlayers.length}</span>
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
      <div className="flex items-center justify-between text-slate-400 font-bold text-xs uppercase tracking-wide">
        <div className="flex items-center gap-2">
          <span>{sortBy === 'numero' ? '🔢 Ordenado por Número da Camisola' : '🔤 Ordenado por Nome do Atleta'}</span>
          <span className="text-xs text-slate-500 font-bold">{sortedRoster.length} Atletas</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
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
