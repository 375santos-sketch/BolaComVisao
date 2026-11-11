import React from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';
import { Player } from '../../../types';

interface PlayerAnalysisProps {
  analysis: AggregatedAnalysis;
  players?: Player[];
  onOpenPlayer?: (playerId: string) => void;
}

export const PlayerAnalysis: React.FC<PlayerAnalysisProps> = ({
  analysis,
  players = [],
  onOpenPlayer
}) => {
  const { cardedPlayers } = analysis;

  const activePlayers = React.useMemo(() => (players || []).filter((p) => p && p.active !== false), [players]);
  const activePlayerIds = React.useMemo(() => new Set(activePlayers.map((p) => p.id)), [activePlayers]);

  const squadCardedPlayers = React.useMemo(() => {
    if (activePlayers.length === 0) return cardedPlayers;
    return cardedPlayers.filter((cp) => activePlayerIds.has(cp.playerId));
  }, [cardedPlayers, activePlayers.length, activePlayerIds]);

  const getPlayer = (id: string) => activePlayers.find((p) => p.id === id) || players.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      {/* 3. Registo Disciplinar por Atleta */}
      {squadCardedPlayers.length > 0 && (
        <div className="ui-card p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line">
            <div>
              <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
                <span>🟨🟥</span>
                <span>Registo Disciplinar por Atleta</span>
              </h3>
              <p className="text-xs text-ui-muted mt-0.5">Jogadores advertidos com cartões amarelos e vermelhos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {squadCardedPlayers.map((cp) => {
              const p = getPlayer(cp.playerId);
              const name = p?.name || `Jogador #${cp.playerId.slice(0, 4)}`;
              const num = p?.number;

              return (
                <div
                  key={cp.playerId}
                  onClick={() => onOpenPlayer && onOpenPlayer(cp.playerId)}
                  className="ui-inset p-3 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-ui-text flex items-center gap-1.5">
                      {name}
                      {num && <span className="text-[10px] font-mono text-ui-muted">#{num}</span>}
                    </div>
                    <div className="text-[10px] text-ui-muted">Registo disciplinar</div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    {cp.yellow > 0 && (
                      <span className="bg-ui-warning/20 text-ui-warning px-2 py-0.5 rounded-md font-bold">
                        🟨 {cp.yellow}
                      </span>
                    )}
                    {cp.red > 0 && (
                      <span className="bg-ui-danger/20 text-ui-danger px-2 py-0.5 rounded-md font-bold">
                        🟥 {cp.red}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Lista Completa de Golos e Assistências */}
    </div>
  );
};
