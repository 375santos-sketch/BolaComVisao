import React, { useState, useMemo } from 'react';
import { Match, Player } from '../types';
import { computeTopScorersAndAssisters } from '../lib/gameAnalysis';

export type GoalsAssistsTab = 'marcadores' | 'assistentes' | 'participacoes' | 'todos';

interface SquadGoalsAndAssistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  roster: Player[];
  clubName?: string;
  category?: string;
  season?: string;
  initialTab?: GoalsAssistsTab;
  onSelectPlayer?: (playerId: string) => void;
}

export const SquadGoalsAndAssistsModal: React.FC<SquadGoalsAndAssistsModalProps> = ({
  isOpen,
  onClose,
  matches,
  roster,
  clubName = 'Dragões de Alferrarede',
  category = 'Sub-11',
  initialTab = 'marcadores',
  onSelectPlayer
}) => {
  const [activeTab, setActiveTab] = useState<GoalsAssistsTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep active tab in sync if initialTab changes on open (adjusted during render, not in an effect)
  const [syncedOpen, setSyncedOpen] = useState(isOpen);
  const [syncedTab, setSyncedTab] = useState(initialTab);
  if (isOpen !== syncedOpen || initialTab !== syncedTab) {
    setSyncedOpen(isOpen);
    setSyncedTab(initialTab);
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute stats for all squad members
  const { allSquadStats } = useMemo(() => {
    return computeTopScorersAndAssisters(matches || [], roster || []);
  }, [matches, roster]);

  // Total metrics
  const totalSquadCount = (roster || []).filter((p) => p && p.active !== false).length;
  const totalGoals = useMemo(() => {
    return allSquadStats.reduce((sum, p) => sum + p.goals, 0);
  }, [allSquadStats]);
  const totalAssists = useMemo(() => {
    return allSquadStats.reduce((sum, p) => sum + p.assists, 0);
  }, [allSquadStats]);

  // Filter & sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let list = [...allSquadStats];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const matchName = p.playerName.toLowerCase().includes(q);
        const matchNum = p.playerNumber !== null && String(p.playerNumber).includes(q);
        const matchPos = p.position.toLowerCase().includes(q);
        return matchName || matchNum || matchPos;
      });
    }

    // Sort order
    if (activeTab === 'marcadores') {
      list.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
        return a.playerName.localeCompare(b.playerName, 'pt-PT');
      });
    } else if (activeTab === 'assistentes') {
      list.sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
        return a.playerName.localeCompare(b.playerName, 'pt-PT');
      });
    } else if (activeTab === 'participacoes') {
      list.sort((a, b) => {
        if (b.totalContributions !== a.totalContributions) return b.totalContributions - a.totalContributions;
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return a.playerName.localeCompare(b.playerName, 'pt-PT');
      });
    } else {
      // 'todos' - sort by shirt number, then name
      list.sort((a, b) => {
        if (a.playerNumber !== null && b.playerNumber !== null) return a.playerNumber - b.playerNumber;
        if (a.playerNumber !== null) return -1;
        if (b.playerNumber !== null) return 1;
        return a.playerName.localeCompare(b.playerName, 'pt-PT');
      });
    }

    return list;
  }, [allSquadStats, searchQuery, activeTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {activeTab === 'marcadores' ? '⚽' : activeTab === 'assistentes' ? '🎯' : '📊'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-white uppercase tracking-wider">
                  {activeTab === 'marcadores'
                    ? 'Melhores Marcadores do Plantel'
                    : activeTab === 'assistentes'
                      ? 'Melhores Assistentes do Plantel'
                      : activeTab === 'participacoes'
                        ? 'Participações em Golos (G+A)'
                        : 'Golos e Assistências do Plantel'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {clubName} {category ? `• ${category}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {totalSquadCount} Jogadores no Plantel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lista oficial com a quantidade individual de golos e assistências de cada atleta do plantel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border border-slate-700"
              title="Imprimir listagem"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-slate-700"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-2.5 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total de Golos</div>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                {totalGoals} {totalGoals === 1 ? 'golo' : 'golos'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-2.5 flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Assistências</div>
              <div className="text-base sm:text-lg font-black font-mono text-cyan-400">
                {totalAssists} {totalAssists === 1 ? 'assistência' : 'assistências'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-2.5 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Participações (G+A)</div>
              <div className="text-base sm:text-lg font-black font-mono text-purple-400">
                {totalGoals + totalAssists} ações
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-blue-500/20 rounded-2xl p-2.5 flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Plantel Ativo</div>
              <div className="text-base sm:text-lg font-black font-mono text-blue-400">{totalSquadCount} Atletas</div>
            </div>
          </div>
        </div>

        {/* CONTROLS: TABS + SEARCH */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('marcadores')}
              className={`px-3 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'marcadores'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>⚽</span>
              <span>Melhores Marcadores</span>
            </button>

            <button
              onClick={() => setActiveTab('assistentes')}
              className={`px-3 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'assistentes'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>🎯</span>
              <span>Melhores Assistentes</span>
            </button>

            <button
              onClick={() => setActiveTab('participacoes')}
              className={`px-3 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'participacoes'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>⭐</span>
              <span>Total G+A</span>
            </button>

            <button
              onClick={() => setActiveTab('todos')}
              className={`px-3 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'todos'
                  ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20 font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>🔤</span>
              <span>Todos os Atletas</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar atleta ou nº..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* LIST / TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {filteredAndSortedPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              Nenhum jogador encontrado para os critérios pesquisados.
            </div>
          ) : (
            filteredAndSortedPlayers.map((player, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.º`;
              const isTop3 = idx < 3;
              const hasGoals = player.goals > 0;
              const hasAssists = player.assists > 0;

              return (
                <div
                  key={player.playerId}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isTop3 && (hasGoals || hasAssists)
                      ? 'bg-slate-950/90 border-slate-700 hover:border-cyan-500/50 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  {/* LEFT: RANK, AVATAR, NAME, DETAILS */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black text-sm'
                          : idx === 1
                            ? 'bg-slate-300 text-slate-950 font-black text-sm'
                            : idx === 2
                              ? 'bg-amber-700 text-white font-black text-sm'
                              : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {medal}
                    </div>

                    {/* Player Photo or Number */}
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.playerName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-slate-300 shrink-0">
                        {player.playerNumber != null ? `#${player.playerNumber}` : '⚽'}
                      </div>
                    )}

                    {/* Name & Position */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{player.playerName}</span>
                        {player.playerNumber != null && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold shrink-0">
                            #{player.playerNumber}
                          </span>
                        )}
                        {player.status && player.status !== 'disponivel' && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                              player.status === 'lesionado'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : player.status === 'suspenso'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {player.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-cyan-300">{player.position}</span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {player.matchesPlayed} {player.matchesPlayed === 1 ? 'jogo realizado' : 'jogos realizados'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: STATS PILLS (GOLOS & ASSISTÊNCIAS) + ACTION */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Golos */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                        activeTab === 'marcadores'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-sm">⚽</span>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-emerald-400">{player.goals}</div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {player.goals === 1 ? 'golo' : 'golos'}
                        </div>
                      </div>
                    </div>

                    {/* Assistências */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                        activeTab === 'assistentes'
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-sm">🎯</span>
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-cyan-400">{player.assists}</div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {player.assists === 1 ? 'assistência' : 'assistências'}
                        </div>
                      </div>
                    </div>

                    {/* Total G+A */}
                    <div className="px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-right min-w-[54px] hidden xs:block">
                      <div className="text-xs font-mono font-black text-purple-300">{player.totalContributions}</div>
                      <div className="text-[9px] text-slate-400 font-mono">G+A</div>
                    </div>

                    {/* Action Button to Open Player Card */}
                    {onSelectPlayer && (
                      <button
                        onClick={() => {
                          onSelectPlayer(player.playerId);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-all border border-slate-700 shrink-0"
                        title="Ver perfil completo do atleta"
                      >
                        Ver Atleta ➔
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER NOTE */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>
              Apenas atletas oficiais do plantel dos <strong className="text-white">{clubName}</strong> (
              {totalSquadCount} jogadores) são contabilizados.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all w-full sm:w-auto text-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
