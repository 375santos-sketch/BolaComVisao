import React from 'react';
import { AppState, Player } from '../../../types';
import { SquadSortBy, SquadSortDirection, POSITION_GROUPS, STATUS_CONFIG } from './types';
import { SquadPositionBadge } from './SquadPositionBadge';
import { getPositionRank } from '../../../lib/utils';
import { returnSuffix } from '../../../lib/availability';

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
  sortedRoster,
  sortBy,
  sortDirection,
  onSelectPlayer,
  onEditPlayer,
  onRemovePlayer
}) => {
  const renderPlayerCard = (player: Player) => {
    const st = STATUS_CONFIG[player.status || 'disponivel'];

    return (
      <div
        key={player.id}
        className="bg-slate-900/95 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-3.5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,210,255,0.18)] flex flex-col justify-between gap-3 group relative text-left"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs px-2.5 py-0.5 rounded-lg shadow-sm shrink-0">
              {player.number !== null && player.number !== undefined ? `#${player.number}` : 'S/N'}
            </span>
            <SquadPositionBadge posStr={player.positions} />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEditPlayer(player)}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-400 hover:text-white transition-colors text-xs"
              title="Editar Jogador"
            >
              ✏️
            </button>
            <button
              onClick={() => onRemovePlayer(player.id)}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 transition-colors text-xs"
              title="Remover Jogador"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="shrink-0 relative">
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="w-12 h-12 rounded-xl object-cover border border-cyan-500/50 shadow-md group-hover:border-cyan-400 transition-colors"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-500/30 group-hover:border-cyan-400 flex items-center justify-center text-lg text-cyan-400 font-bold shadow-inner transition-colors">
                👤
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="font-bold text-sm text-white font-['Chakra_Petch'] leading-tight truncate group-hover:text-cyan-300 transition-colors mb-1"
              title={player.name}
            >
              {player.name}
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border inline-flex items-center gap-1 ${st.bg} ${st.text} ${st.border}`}
            >
              <span>{st.icon}</span>
              <span>
                {st.label}
                {returnSuffix(player)}
              </span>
            </span>
          </div>
        </div>

        <button
          onClick={() => onSelectPlayer(player.id)}
          className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 hover:border-cyan-300 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <span>👁️</span>
          <span>Ver Ficha Completa</span>
        </button>
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
              <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs sm:text-sm uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>{group.label}</span>
                  <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                    {groupPlayers.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20 text-cyan-400 font-['Chakra_Petch'] font-bold text-xs sm:text-sm uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span>{sortBy === 'numero' ? '🔢 Ordenado por Número da Camisola' : '🔤 Ordenado por Nome do Atleta'}</span>
          <span className="text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
            {sortedRoster.length} Atletas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{sortedRoster.map(renderPlayerCard)}</div>
    </div>
  );
};
