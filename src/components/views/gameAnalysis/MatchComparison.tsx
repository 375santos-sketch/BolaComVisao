import React, { useState, useMemo } from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';
import { homeFirstScore } from '../../../lib/utils';

interface MatchComparisonProps {
  analysis: AggregatedAnalysis;
  onOpenMatch?: (matchId: string) => void;
}

export const MatchComparison: React.FC<MatchComparisonProps> = ({ analysis, onOpenMatch }) => {
  const { opponentStats, filteredMatches } = analysis;
  const [selectedOpponent, setSelectedOpponent] = useState<string>(
    opponentStats.length > 0 ? opponentStats[0].opponent : ''
  );

  const formGuide = useMemo(() => {
    return filteredMatches
      .filter((m) => m.finished)
      .slice(-5)
      .map((m) => {
        const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
        const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
        const res: 'V' | 'E' | 'D' = sc > co ? 'V' : sc < co ? 'D' : 'E';
        return {
          id: m.id,
          date: m.date,
          opponent: m.opponent,
          location: m.location,
          result: res,
          score: homeFirstScore(sc, co, m.location !== 'fora', ' - ')
        };
      });
  }, [filteredMatches]);

  const currentOpponentStat = opponentStats.find((o) => o.opponent === selectedOpponent);

  return (
    <div className="space-y-6">
      {/* 1. Guia de Forma Recente: Últimos 5 Jogos (Item 12) */}
      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
              <span>📈</span>
              <span>Guia de Forma Recente (Últimos Jogos)</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">Sequência de resultados e momento competitivo da equipa</p>
          </div>
        </div>

        {formGuide.length === 0 ? (
          <div className="text-center py-6 text-xs text-ui-muted">
            Nenhum jogo finalizado encontrado no período selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {formGuide.map((item, idx) => {
              const bgBadge =
                item.result === 'V'
                  ? 'bg-ui-success/20 text-ui-success border-ui-success/40'
                  : item.result === 'E'
                    ? 'bg-ui-warning/20 text-ui-warning border-ui-warning/40'
                    : 'bg-ui-danger/20 text-ui-danger border-ui-danger/40';

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenMatch && onOpenMatch(item.id)}
                  className="ui-inset p-3.5 flex flex-col justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-ui-muted font-mono">{item.date || `Jogo #${idx + 1}`}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg border font-mono ${bgBadge}`}>
                      {item.result}
                    </span>
                  </div>

                  <div className="my-1">
                    <div className="text-xs font-bold text-ui-text truncate group-hover:text-ui-brand transition-colors">
                      {item.opponent}
                    </div>
                    <div className="text-[10px] text-ui-muted">{item.location === 'casa' ? '🏠 Casa' : '✈️ Fora'}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-ui-line/60 mt-2">
                    <span className="text-sm font-['Chakra_Petch'] font-black text-ui-text">{item.score}</span>
                    <span className="text-[10px] text-ui-brand font-bold group-hover:underline">Ver ›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Análise Head-to-Head por Adversário (Item 12) */}
      <div className="ui-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-ui-line">
          <div>
            <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
              <span>⚔️</span>
              <span>Comparação Direta por Adversário (Head-to-Head)</span>
            </h3>
            <p className="text-xs text-ui-muted mt-0.5">
              Histórico de confrontos, golos e aproveitamento contra cada equipa
            </p>
          </div>

          {opponentStats.length > 0 && (
            <div className="w-full sm:w-64">
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
                className="ui-input w-full text-xs"
              >
                {opponentStats.map((opp) => (
                  <option key={opp.opponent} value={opp.opponent}>
                    ⚔️ {opp.opponent} ({opp.matchesCount} jogos)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {opponentStats.length === 0 ? (
          <div className="text-center py-6 text-xs text-ui-muted">Nenhum adversário encontrado no filtro atual.</div>
        ) : currentOpponentStat ? (
          <div className="space-y-4">
            {/* Summary Row for Selected Opponent */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="ui-inset p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-ui-muted block mb-1">Confrontos</span>
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-text">
                  {currentOpponentStat.matchesCount}
                </span>
                <span className="text-[10px] text-ui-muted block mt-1">
                  {currentOpponentStat.wins}V - {currentOpponentStat.draws}E - {currentOpponentStat.losses}D
                </span>
              </div>

              <div className="ui-inset p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-ui-muted block mb-1">Aproveitamento</span>
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-brand">
                  {currentOpponentStat.winRate}%
                </span>
                <span className="text-[10px] text-ui-brand/80 block mt-1">Taxa de Vitória</span>
              </div>

              <div className="ui-inset p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-ui-muted block mb-1">
                  Golos Marcados / Sofridos
                </span>
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-success">
                  {currentOpponentStat.goalsScored}
                  <span className="text-ui-muted text-sm font-normal"> - </span>
                  <span className="text-ui-danger">{currentOpponentStat.goalsConceded}</span>
                </span>
                <span className="text-[10px] text-ui-muted block mt-1">
                  Saldo:{' '}
                  {currentOpponentStat.goalDifference > 0
                    ? `+${currentOpponentStat.goalDifference}`
                    : currentOpponentStat.goalDifference}
                </span>
              </div>

              <div className="ui-inset p-3.5 text-center">
                <span className="text-[10px] uppercase font-bold text-ui-muted block mb-1">Jogos sem Sofrer</span>
                <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-warning">
                  {(currentOpponentStat.last5Matches || []).filter((m) => m.conceded === 0).length}
                </span>
                <span className="text-[10px] text-ui-muted block mt-1">Clean Sheets</span>
              </div>
            </div>

            {/* List of Matches Against Selected Opponent */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-ui-text block">
                Histórico de Jogos contra {currentOpponentStat.opponent}:
              </span>

              {(currentOpponentStat.last5Matches || []).map((m) => {
                const badgeColor =
                  m.result === 'V'
                    ? 'bg-ui-success/20 text-ui-success border-ui-success/30'
                    : m.result === 'E'
                      ? 'bg-ui-warning/20 text-ui-warning border-ui-warning/30'
                      : 'bg-ui-danger/20 text-ui-danger border-ui-danger/30';

                return (
                  <div
                    key={m.matchId}
                    onClick={() => onOpenMatch && onOpenMatch(m.matchId)}
                    className="ui-inset p-3 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border font-mono ${badgeColor}`}>
                        {m.result}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-ui-text">
                          {currentOpponentStat.opponent || 'Adversário'}
                        </div>
                        <div className="text-[10px] text-ui-muted">
                          {m.date || 'Data N/D'} • {m.location === 'casa' ? '🏠 Casa' : '✈️ Fora'} • {m.type || 'Jogo'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-['Chakra_Petch'] font-black text-ui-text font-mono">
                        {homeFirstScore(m.scored, m.conceded, m.location !== 'fora', ' - ')}
                      </span>
                      <span className="text-ui-muted text-xs">›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
