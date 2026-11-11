import React from 'react';
import { CoachReportData, CoachViewPlayerStat } from '../../../lib/gameAnalysis';

interface CoachReportModalProps {
  report: CoachReportData;
  clubName: string;
  category: string;
  onClose: () => void;
  onPrint?: () => void;
  topScorers?: CoachViewPlayerStat[];
  topAssisters?: CoachViewPlayerStat[];
}

export const CoachReportModal: React.FC<CoachReportModalProps> = ({
  report,
  clubName,
  category,
  onClose,
  onPrint,
  topScorers = [],
  topAssisters = []
}) => {
  const {
    seasonLabel,
    totalMatches,
    wins,
    draws,
    losses,
    winRate,
    avgGoalsScored,
    avgGoalsConceded,
    setPieces,
    peakScoringPeriod,
    peakVulnerabilityPeriod,
    avgCardsTotal,
    keyConclusions,
    firstGoalImpact
  } = report;

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="ui-card w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-scaleUp p-5 sm:p-8 space-y-6 text-ui-text">
        {/* HEADER DO RELATÓRIO */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-ui-line">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-ui-brand to-ui-brand flex items-center justify-center text-2xl shadow-lg">
              🧠
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-ui-brand font-mono">
                Relatório do Treinador • Análise da Equipa
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-ui-text font-['Chakra_Petch']">
                {clubName} {category ? `(${category})` : ''}
              </h2>
              <div className="text-xs text-ui-muted font-mono">
                Período: <strong className="text-ui-text">{seasonLabel}</strong> • Jogos Analisados:{' '}
                <strong className="text-ui-brand">{totalMatches}</strong> ({wins}V - {draws}E - {losses}D • {winRate}%
                apr.)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Imprimir / PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 6 INDICADORES CHAVE DO TREINADOR (ESTRUTURA PEDIDA NO ITEM 6) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {/* 1. Ataque */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-success mb-1">
              <span>⚽</span> Ataque
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-ui-text">{avgGoalsScored}</div>
            <div className="text-[11px] text-ui-muted mt-0.5">golos marcados / jogo</div>
          </div>

          {/* 2. Defesa */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-danger mb-1">
              <span>🛡️</span> Defesa
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-ui-text">{avgGoalsConceded}</div>
            <div className="text-[11px] text-ui-muted mt-0.5">golos sofridos / jogo</div>
          </div>

          {/* 3. Bola Parada */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-warning mb-1">
              <span>🚩</span> Bola Parada
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-ui-text">
              {setPieces.scoredRate}%
            </div>
            <div className="text-[11px] text-ui-muted mt-0.5">dos golos marcados ({setPieces.scoredTotal} golos)</div>
          </div>

          {/* 4. Maior Produção */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-brand mb-1">
              <span>⏱️</span> Maior Produção
            </div>
            <div className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-ui-text">
              {peakScoringPeriod ? peakScoringPeriod.label : "0–30'"}
            </div>
            <div className="text-[11px] text-ui-muted mt-0.5">
              {peakScoringPeriod
                ? `${peakScoringPeriod.count} golos (${peakScoringPeriod.percentage}%)`
                : 'Equilibrado'}
            </div>
          </div>

          {/* 5. Maior Vulnerabilidade */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-danger mb-1">
              <span>⚠️</span> Maior Vulnerabilidade
            </div>
            <div className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-ui-text">
              {peakVulnerabilityPeriod ? peakVulnerabilityPeriod.label : 'Sem alerta'}
            </div>
            <div className="text-[11px] text-ui-muted mt-0.5">
              {peakVulnerabilityPeriod
                ? `${peakVulnerabilityPeriod.count} sofridos (${peakVulnerabilityPeriod.percentage}%)`
                : 'Solidez total'}
            </div>
          </div>

          {/* 6. Disciplina */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ui-text mb-1">
              <span>🟨</span> Disciplina
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-ui-text">{avgCardsTotal}</div>
            <div className="text-[11px] text-ui-muted mt-0.5">cartões / jogo</div>
          </div>
        </div>

        {/* COMPARAÇÃO TÁTICA RÁPIDA: QUANDO MARCÁMOS 1.º */}
        {firstGoalImpact.scoredFirstMatches > 0 && (
          <div className="ui-inset p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎯</span>
              <div>
                <strong className="text-ui-text">
                  Quando marcámos primeiro ({firstGoalImpact.scoredFirstMatches} jogos):
                </strong>
                <span className="text-ui-muted block sm:inline sm:ml-1.5">
                  {firstGoalImpact.scoredFirstWins} Vitórias • {firstGoalImpact.scoredFirstDraws} Empates •{' '}
                  {firstGoalImpact.scoredFirstLosses} Derrotas
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-ui-success bg-ui-success/15 border border-ui-success/30 px-3 py-1 rounded-xl">
              {firstGoalImpact.scoredFirstWinRate}% taxa de vitória
            </span>
          </div>
        )}

        {/* DESTAQUES INDIVIDUAIS: TOP 3 MARCADORES E TOP 3 ASSISTENTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Top 3 Marcadores */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-ui-line">
              <div className="flex items-center gap-2">
                <span className="text-base">⚽</span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ui-success font-['Chakra_Petch']">
                    Melhores Marcadores
                  </h4>
                  <p className="text-[10px] text-ui-muted">Os 3 melhores marcadores e a quantidade de golos</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ui-success/10 text-ui-success border border-ui-success/30 font-bold">
                Top 3
              </span>
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2].map((idx) => {
                const s = topScorers[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                if (!s) {
                  return (
                    <div
                      key={`modal-empty-scorer-${idx}`}
                      className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5 text-ui-muted font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-50">{medal}</span>
                        <span className="text-ui-muted text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-ui-muted">0 golos</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`modal-scorer-${s.playerId || idx}`}
                    className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs shrink-0">{medal}</span>
                      {s.playerNumber != null && (
                        <span className="text-[10px] font-mono text-ui-success font-bold bg-ui-success/10 px-1 rounded shrink-0">
                          #{s.playerNumber}
                        </span>
                      )}
                      <span className="text-ui-text font-medium truncate">{s.playerName}</span>
                    </div>
                    <span className="font-mono font-bold text-ui-success shrink-0">
                      {s.count} {s.count === 1 ? 'golo' : 'golos'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 Assistentes */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-ui-line">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ui-brand font-['Chakra_Petch']">
                    Melhores Assistentes
                  </h4>
                  <p className="text-[10px] text-ui-muted">Os 3 melhores assistentes e a quantidade de assistência</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ui-brand/10 text-ui-brand border border-ui-brand/30 font-bold">
                Top 3
              </span>
            </div>
            <div className="space-y-1.5">
              {[0, 1, 2].map((idx) => {
                const a = topAssisters[idx];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                if (!a) {
                  return (
                    <div
                      key={`modal-empty-assister-${idx}`}
                      className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5 text-ui-muted font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-50">{medal}</span>
                        <span className="text-ui-muted text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-ui-muted">0 assistências</span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`modal-assister-${a.playerId || idx}`}
                    className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs shrink-0">{medal}</span>
                      {a.playerNumber != null && (
                        <span className="text-[10px] font-mono text-ui-brand font-bold bg-ui-brand/10 px-1 rounded shrink-0">
                          #{a.playerNumber}
                        </span>
                      )}
                      <span className="text-ui-text font-medium truncate">{a.playerName}</span>
                    </div>
                    <span className="font-mono font-bold text-ui-brand shrink-0">
                      {a.count} {a.count === 1 ? 'assistência' : 'assistências'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PRINCIPAIS CONCLUSÕES AUTOMÁTICAS (3 a 5 frases automáticas de síntese tática) */}
        <div className="bg-gradient-to-br from-ui-inset via-ui-surface to-ui-brand/20 border border-ui-brand/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-ui-line">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-ui-brand font-['Chakra_Petch']">
              Principais Conclusões Táticas
            </h3>
          </div>

          <div className="space-y-2.5">
            {keyConclusions.map((conclusion, idx) => (
              <div
                key={idx}
                className="ui-card p-3 text-xs sm:text-[13px] text-ui-text leading-relaxed font-medium flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-ui-brand/15 text-ui-brand border border-ui-brand/30 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{conclusion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER DO MODAL */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-ui-muted font-mono">BolaComVisão • Inteligência de Treino e Jogo</span>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-primary px-6 py-2.5 text-xs">
            Concluir Análise
          </button>
        </div>
      </div>
    </div>
  );
};
