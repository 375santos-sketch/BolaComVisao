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
  clubName = 'O Meu Clube',
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
      className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ui-card w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-ui-line bg-ui-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-ui-success/20 border border-ui-success/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {activeTab === 'marcadores' ? '⚽' : activeTab === 'assistentes' ? '🎯' : '📊'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-ui-text ">
                  {activeTab === 'marcadores'
                    ? 'Melhores Marcadores do Plantel'
                    : activeTab === 'assistentes'
                      ? 'Melhores Assistentes do Plantel'
                      : activeTab === 'participacoes'
                        ? 'Participações em Golos (G+A)'
                        : 'Golos e Assistências do Plantel'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold bg-ui-brand/10 text-ui-brand border border-ui-brand/30">
                  {clubName} {category ? `• ${category}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold bg-ui-success/10 text-ui-success border border-ui-success/30">
                  {totalSquadCount} Jogadores no Plantel
                </span>
              </div>
              <p className="text-xs text-ui-muted mt-1">
                Lista oficial com a quantidade individual de golos e assistências de cada atleta do plantel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => window.print()}
              className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
              title="Imprimir listagem"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="ui-btn ui-btn-secondary w-9 h-9 flex items-center justify-center text-sm"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-ui-inset/60 border-b border-ui-line/80">
          <div className="ui-card p-2.5 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <div className="text-[10px] tabular-nums uppercase text-ui-muted font-bold">Total de Golos</div>
              <div className="text-base sm:text-lg font-black tabular-nums text-ui-success">
                {totalGoals} {totalGoals === 1 ? 'golo' : 'golos'}
              </div>
            </div>
          </div>

          <div className="ui-card p-2.5 flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-[10px] tabular-nums uppercase text-ui-muted font-bold">Total Assistências</div>
              <div className="text-base sm:text-lg font-black tabular-nums text-ui-brand">
                {totalAssists} {totalAssists === 1 ? 'assistência' : 'assistências'}
              </div>
            </div>
          </div>

          <div className="ui-card p-2.5 flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-[10px] tabular-nums uppercase text-ui-muted font-bold">Participações (G+A)</div>
              <div className="text-base sm:text-lg font-black tabular-nums text-ui-brand">
                {totalGoals + totalAssists} ações
              </div>
            </div>
          </div>

          <div className="ui-card p-2.5 flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <div className="text-[10px] tabular-nums uppercase text-ui-muted font-bold">Plantel Ativo</div>
              <div className="text-base sm:text-lg font-black tabular-nums text-ui-brand">
                {totalSquadCount} Atletas
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS: TABS + SEARCH */}
        <div className="p-3 sm:p-4 border-b border-ui-line bg-ui-surface/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('marcadores')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'marcadores'
                  ? 'bg-ui-success text-ui-brand-ink shadow-md shadow-ui-success/20 font-black'
                  : 'bg-ui-surface-2 text-ui-text hover:text-ui-text hover:bg-ui-surface-3'
              }`}
            >
              <span>⚽</span>
              <span>Melhores Marcadores</span>
            </button>

            <button
              onClick={() => setActiveTab('assistentes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'assistentes'
                  ? 'bg-ui-brand text-ui-brand-ink shadow-md shadow-ui-brand/20 font-black'
                  : 'bg-ui-surface-2 text-ui-text hover:text-ui-text hover:bg-ui-surface-3'
              }`}
            >
              <span>🎯</span>
              <span>Melhores Assistentes</span>
            </button>

            <button
              onClick={() => setActiveTab('participacoes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'participacoes'
                  ? 'bg-ui-brand text-ui-brand-ink shadow-md shadow-ui-brand/20 font-black'
                  : 'bg-ui-surface-2 text-ui-text hover:text-ui-text hover:bg-ui-surface-3'
              }`}
            >
              <span>⭐</span>
              <span>Total G+A</span>
            </button>

            <button
              onClick={() => setActiveTab('todos')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'todos'
                  ? 'bg-ui-brand text-ui-brand-ink shadow-md shadow-ui-brand/20 font-black'
                  : 'bg-ui-surface-2 text-ui-text hover:text-ui-text hover:bg-ui-surface-3'
              }`}
            >
              <span>🔤</span>
              <span>Todos os Atletas</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ui-muted">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar atleta ou nº..."
              className="ui-input w-full text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ui-muted hover:text-ui-text"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* LIST / TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {filteredAndSortedPlayers.length === 0 ? (
            <div className="text-center py-12 text-ui-muted text-xs tabular-nums">
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
                      ? 'bg-ui-inset/90 border-ui-line-strong hover:border-ui-brand/50 shadow-md'
                      : 'bg-ui-inset/50 border-ui-line/80 hover:border-ui-line-strong hover:bg-ui-surface/60'
                  }`}
                >
                  {/* LEFT: RANK, AVATAR, NAME, DETAILS */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center tabular-nums font-bold text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-ui-warning text-ui-brand-ink shadow-sm font-black text-sm'
                          : idx === 1
                            ? 'bg-ui-line-strong text-ui-brand-ink font-black text-sm'
                            : idx === 2
                              ? 'bg-ui-warning text-ui-text font-black text-sm'
                              : 'bg-ui-surface-2/80 text-ui-muted'
                      }`}
                    >
                      {medal}
                    </div>

                    {/* Player Photo or Number */}
                    {player.photoUrl ? (
                      <img
                        src={player.photoUrl}
                        alt={player.playerName}
                        className="w-10 h-10 rounded-xl object-cover border border-ui-line-strong shrink-0"
                      />
                    ) : (
                      <div className="ui-inset w-10 h-10 flex items-center justify-center tabular-nums font-bold text-xs text-ui-text shrink-0">
                        {player.playerNumber != null ? `#${player.playerNumber}` : '⚽'}
                      </div>
                    )}

                    {/* Name & Position */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ui-text truncate">{player.playerName}</span>
                        {player.playerNumber != null && (
                          <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-ui-surface-2 text-ui-text font-bold shrink-0">
                            #{player.playerNumber}
                          </span>
                        )}
                        {player.status && player.status !== 'disponivel' && (
                          <span
                            className={`text-[9px] tabular-nums px-1.5 py-0.2 rounded font-bold uppercase ${
                              player.status === 'lesionado'
                                ? 'bg-ui-danger/20 text-ui-danger border border-ui-danger/30'
                                : player.status === 'suspenso'
                                  ? 'bg-ui-warning/20 text-ui-warning border border-ui-warning/30'
                                  : 'bg-ui-surface-3 text-ui-text'
                            }`}
                          >
                            {player.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ui-muted flex items-center gap-2 mt-0.5">
                        <span className="tabular-nums text-ui-brand">{player.position}</span>
                        <span>•</span>
                        <span className="text-ui-muted">
                          {player.matchesPlayed} {player.matchesPlayed === 1 ? 'jogo realizado' : 'jogos realizados'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: STATS PILLS (GOLOS & ASSISTÊNCIAS) + ACTION */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ui-line">
                    {/* Golos */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                        activeTab === 'marcadores'
                          ? 'bg-ui-success/15 border-ui-success/40 text-ui-success font-bold'
                          : 'bg-ui-surface border-ui-line text-ui-text'
                      }`}
                    >
                      <span className="text-sm">⚽</span>
                      <div className="text-right">
                        <div className="text-xs tabular-nums font-black text-ui-success">{player.goals}</div>
                        <div className="text-[9px] text-ui-muted tabular-nums">
                          {player.goals === 1 ? 'golo' : 'golos'}
                        </div>
                      </div>
                    </div>

                    {/* Assistências */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                        activeTab === 'assistentes'
                          ? 'bg-ui-brand/15 border-ui-brand/40 text-ui-brand font-bold'
                          : 'bg-ui-surface border-ui-line text-ui-text'
                      }`}
                    >
                      <span className="text-sm">🎯</span>
                      <div className="text-right">
                        <div className="text-xs tabular-nums font-black text-ui-brand">{player.assists}</div>
                        <div className="text-[9px] text-ui-muted tabular-nums">
                          {player.assists === 1 ? 'assistência' : 'assistências'}
                        </div>
                      </div>
                    </div>

                    {/* Total G+A */}
                    <div className="px-2.5 py-1.5 rounded-xl bg-ui-brand-soft border border-ui-brand/30 text-ui-brand text-right min-w-[54px] hidden xs:block">
                      <div className="text-xs tabular-nums font-black text-ui-brand">{player.totalContributions}</div>
                      <div className="text-[9px] text-ui-muted tabular-nums">G+A</div>
                    </div>

                    {/* Action Button to Open Player Card */}
                    {onSelectPlayer && (
                      <button
                        onClick={() => {
                          onSelectPlayer(player.playerId);
                          onClose();
                        }}
                        className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs shrink-0"
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
        <div className="p-3 sm:p-4 border-t border-ui-line bg-ui-inset/80 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ui-muted tabular-nums">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>
              Apenas atletas oficiais do plantel dos <strong className="text-ui-text">{clubName}</strong> (
              {totalSquadCount} jogadores) são contabilizados.
            </span>
          </div>

          <button onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2 text-xs w-full sm:w-auto text-center">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
