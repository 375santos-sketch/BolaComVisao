import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS, STATUS_CONFIG } from './types';
import { SquadPositionBadge } from './SquadPositionBadge';
import { computeAge, getPositionRank } from '../../../lib/utils';
import { returnSuffix } from '../../../lib/availability';

interface SquadListViewProps {
  state: AppState;
  sortedRoster: Player[];
  sortBy: SquadSortBy;
  sortDirection: SquadSortDirection;
  onSelectPlayer: (id: string) => void;
  onEditPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
}

export const SquadListView: React.FC<SquadListViewProps> = ({
  state,
  sortedRoster,
  sortBy,
  sortDirection,
  onSelectPlayer,
  onEditPlayer,
  onRemovePlayer
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

    return (
      <div
        key={player.id}
        onClick={() => onSelectPlayer(player.id)}
        className="bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 rounded-xl px-3 py-2 sm:py-2.5 transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.15)]"
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* 1. FOTO */}
          <div className="shrink-0 relative">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-cyan-500/40 group-hover:border-cyan-300 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-cyan-500/30 group-hover:border-cyan-400 flex items-center justify-center text-base sm:text-lg text-cyan-400 font-bold shadow-inner">
                👤
              </div>
            )}
          </div>

          {/* 2. POSIÇÃO */}
          <div className="shrink-0">
            <SquadPositionBadge posStr={player.positions} />
          </div>

          {/* 3. Nº (Número de Camisola) */}
          <div className="shrink-0">
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs shadow-sm">
              {player.number !== null && player.number !== undefined ? `#${player.number}` : 'S/N'}
            </span>
          </div>

          {/* 4. NOME */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-xs sm:text-sm text-white font-['Chakra_Petch'] leading-tight group-hover:text-cyan-300 transition-colors truncate">
                {player.name}
              </h3>
              {hasLowAttendance && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold bg-red-950 border border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                  title={`Alerta: Menos de 50% de presenças nos treinos (${attendancePct}%)`}
                >
                  <span>🚨</span>
                  <span>{attendancePct}% Treinos</span>
                </span>
              )}
              {player.birthDate && (
                <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                  ({computeAge(player.birthDate)} anos)
                </span>
              )}
            </div>
            {(player.status === 'lesionado' || player.status === 'suspenso') && (
              <div className={`sm:hidden text-[10px] font-mono font-bold mt-0.5 ${st.text}`}>
                {st.icon} {st.label}
                {returnSuffix(player)}
              </div>
            )}
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5 flex items-center gap-2">
              <span className="hidden sm:inline">{player.positions || 'Jogador'}</span>
              {player.dominantFoot && (
                <span className="hidden sm:inline text-cyan-300/80">• Pé {player.dominantFoot}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${st.bg} ${st.text} ${st.border}`}
          >
            <span>{st.icon}</span>
            <span>
              {st.label}
              {returnSuffix(player)}
            </span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlayer(player.id);
            }}
            className="px-2 py-1 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-mono text-[11px] font-bold transition-colors hidden xs:inline-flex items-center gap-1"
            title="Ver Ficha Completa"
          >
            <span>👁️</span>
            <span className="hidden md:inline">Ficha</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditPlayer(player);
            }}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-white transition-colors text-xs"
            title="Editar Jogador"
          >
            ✏️
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemovePlayer(player.id);
            }}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 transition-colors text-xs"
            title="Remover Jogador"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  };

  if (sortBy === 'posicao') {
    return (
      <div className="space-y-6">
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
              {/* Tactical Group Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs sm:text-sm uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>{group.label}</span>
                  <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                    {groupPlayers.length}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  Foto • Posição • Nº • Nome
                </span>
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
      <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs sm:text-sm uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>{sortBy === 'numero' ? '🔢 Ordenado por Número da Camisola' : '🔤 Ordenado por Nome do Atleta'}</span>
          <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
            {sortedRoster.length} Atletas
          </span>
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
