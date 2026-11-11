import React, { useState } from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';
import { Match, Player } from '../../../types';
import { SquadGoalsAndAssistsModal, GoalsAssistsTab } from '../../SquadGoalsAndAssistsModal';

interface PlayerAnalysisProps {
  analysis: AggregatedAnalysis;
  players?: Player[];
  matches?: Match[];
  clubName?: string;
  category?: string;
  season?: string;
  onOpenPlayer?: (playerId: string) => void;
}

export const PlayerAnalysis: React.FC<PlayerAnalysisProps> = ({
  analysis,
  players = [],
  matches = [],
  clubName = 'O Meu Clube',
  category = 'Sub-11',
  season = '',
  onOpenPlayer
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<GoalsAssistsTab>('marcadores');
  const { topScorers, topAssisters, cardedPlayers } = analysis;

  const activePlayers = React.useMemo(() => (players || []).filter((p) => p && p.active !== false), [players]);
  const activePlayerIds = React.useMemo(() => new Set(activePlayers.map((p) => p.id)), [activePlayers]);

  const squadTopScorers = React.useMemo(() => {
    if (activePlayers.length === 0) return topScorers;
    return topScorers.filter((sc) => activePlayerIds.has(sc.playerId));
  }, [topScorers, activePlayers.length, activePlayerIds]);

  const squadTopAssisters = React.useMemo(() => {
    if (activePlayers.length === 0) return topAssisters;
    return topAssisters.filter((as) => activePlayerIds.has(as.playerId));
  }, [topAssisters, activePlayers.length, activePlayerIds]);

  const squadCardedPlayers = React.useMemo(() => {
    if (activePlayers.length === 0) return cardedPlayers;
    return cardedPlayers.filter((cp) => activePlayerIds.has(cp.playerId));
  }, [cardedPlayers, activePlayers.length, activePlayerIds]);

  const getPlayer = (id: string) => activePlayers.find((p) => p.id === id) || players.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Melhores Marcadores */}
        <div className="ui-card p-5 flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setModalTab('marcadores');
                setShowModal(true);
              }}
              className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para ver a lista completa de golos e assistências"
            >
              <div>
                <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2 group-hover/hdr:text-ui-success transition-colors">
                  <span className="group-hover/hdr:scale-110 transition-transform">⚽</span>
                  <span>Melhores Marcadores</span>
                </h3>
                <p className="text-xs text-ui-muted mt-0.5">Ranking de golos e distribuição por jogador</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ui-success bg-ui-success/10 px-3 py-1 rounded-xl border border-ui-success/20">
                  {squadTopScorers.length} marcadores
                </span>
                <span className="text-ui-muted group-hover/hdr:text-ui-success text-sm transition-colors">➔</span>
              </div>
            </div>

            {squadTopScorers.length === 0 ? (
              <div className="text-center py-6 text-xs text-ui-muted">
                Nenhum golo registado nos jogos selecionados.
              </div>
            ) : (
              <div className="space-y-2">
                {squadTopScorers.slice(0, 8).map((sc, idx) => {
                  const p = getPlayer(sc.playerId);
                  const name = p?.name || `Jogador #${sc.playerId.slice(0, 4)}`;
                  const num = p?.number;

                  return (
                    <div
                      key={sc.playerId}
                      onClick={() => {
                        setModalTab('marcadores');
                        setShowModal(true);
                      }}
                      className="ui-inset p-3 flex items-center justify-between transition-all cursor-pointer group"
                      title="Clique para ver detalhes do atleta na lista completa"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono ${
                            idx === 0
                              ? 'bg-ui-warning text-ui-brand-ink shadow-sm'
                              : idx === 1
                                ? 'bg-ui-line-strong text-ui-brand-ink'
                                : idx === 2
                                  ? 'bg-ui-warning text-ui-text'
                                  : 'bg-ui-surface-2 text-ui-muted'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-ui-text flex items-center gap-1.5 group-hover:text-ui-success transition-colors">
                            {name}
                            {num && <span className="text-[10px] font-mono text-ui-muted">#{num}</span>}
                          </div>
                          <div className="text-[10px] text-ui-muted flex items-center gap-1.5 font-mono">
                            <span className="text-ui-success font-bold">{sc.count} ⚽</span>
                            <span>•</span>
                            <span className="text-ui-brand font-bold">{sc.assistsCount || 0} 🎯</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-['Chakra_Petch'] font-black text-ui-success font-mono">
                            {sc.count} ⚽
                          </span>
                          <div className="text-[10px] text-ui-brand font-mono">{sc.assistsCount || 0} assist.</div>
                        </div>
                        <span className="text-ui-muted text-xs group-hover:text-ui-success">›</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setModalTab('marcadores');
              setShowModal(true);
            }}
            className="ui-btn ui-btn-soft-success w-full mt-4 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
          >
            <span>Ver lista completa de marcadores e assistências ({activePlayers.length} atletas)</span>
            <span>➔</span>
          </button>
        </div>

        {/* 2. Melhores Assistentes */}
        <div className="ui-card p-5 flex flex-col justify-between">
          <div>
            <div
              onClick={() => {
                setModalTab('assistentes');
                setShowModal(true);
              }}
              className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line cursor-pointer group/hdr hover:opacity-95 transition-opacity"
              title="Clique para ver a lista completa de assistências e golos"
            >
              <div>
                <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2 group-hover/hdr:text-ui-brand transition-colors">
                  <span className="group-hover/hdr:scale-110 transition-transform">👟</span>
                  <span>Líderes de Assistências</span>
                </h3>
                <p className="text-xs text-ui-muted mt-0.5">Ranking de passes para golo</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ui-brand bg-ui-brand/10 px-3 py-1 rounded-xl border border-ui-brand/20">
                  {squadTopAssisters.length} assistentes
                </span>
                <span className="text-ui-muted group-hover/hdr:text-ui-brand text-sm transition-colors">➔</span>
              </div>
            </div>

            {squadTopAssisters.length === 0 ? (
              <div className="text-center py-6 text-xs text-ui-muted">
                Nenhuma assistência registada nos jogos selecionados.
              </div>
            ) : (
              <div className="space-y-2">
                {squadTopAssisters.slice(0, 8).map((as, idx) => {
                  const p = getPlayer(as.playerId);
                  const name = p?.name || `Jogador #${as.playerId.slice(0, 4)}`;
                  const num = p?.number;
                  const scorerItem = squadTopScorers.find((x) => x.playerId === as.playerId);
                  const playerGoals = scorerItem ? scorerItem.count : 0;

                  return (
                    <div
                      key={as.playerId}
                      onClick={() => {
                        setModalTab('assistentes');
                        setShowModal(true);
                      }}
                      className="ui-inset p-3 flex items-center justify-between transition-all cursor-pointer group"
                      title="Clique para ver detalhes do atleta na lista completa"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono ${
                            idx === 0
                              ? 'bg-ui-brand text-ui-brand-ink shadow-sm'
                              : idx === 1
                                ? 'bg-ui-line-strong text-ui-brand-ink'
                                : idx === 2
                                  ? 'bg-ui-warning text-ui-text'
                                  : 'bg-ui-surface-2 text-ui-muted'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-ui-text flex items-center gap-1.5 group-hover:text-ui-brand transition-colors">
                            {name}
                            {num && <span className="text-[10px] font-mono text-ui-muted">#{num}</span>}
                          </div>
                          <div className="text-[10px] text-ui-muted flex items-center gap-1.5 font-mono">
                            <span className="text-ui-brand font-bold">{as.count} 🎯</span>
                            <span>•</span>
                            <span className="text-ui-success font-bold">{playerGoals} ⚽</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-['Chakra_Petch'] font-black text-ui-brand font-mono">
                            {as.count} 👟
                          </span>
                          <div className="text-[10px] text-ui-success font-mono">
                            {playerGoals} {playerGoals === 1 ? 'golo' : 'golos'}
                          </div>
                        </div>
                        <span className="text-ui-muted text-xs group-hover:text-ui-brand">›</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setModalTab('assistentes');
              setShowModal(true);
            }}
            className="ui-btn ui-btn-soft w-full mt-4 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
          >
            <span>Ver lista completa de assistências e golos ({activePlayers.length} atletas)</span>
            <span>➔</span>
          </button>
        </div>
      </div>

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
      <SquadGoalsAndAssistsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        matches={matches}
        roster={players}
        clubName={clubName}
        category={category}
        season={season}
        initialTab={modalTab}
        onSelectPlayer={(playerId) => onOpenPlayer && onOpenPlayer(playerId)}
      />
    </div>
  );
};
