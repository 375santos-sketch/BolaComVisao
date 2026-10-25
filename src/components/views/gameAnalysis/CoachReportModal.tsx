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
      <div className="ui-card w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-scaleUp p-5 sm:p-8 space-y-6 text-slate-100">
        {/* HEADER DO RELATÓRIO */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
              🧠
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-cyan-400 font-mono">
                Relatório do Treinador • Análise da Equipa
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Chakra_Petch']">
                {clubName} {category ? `(${category})` : ''}
              </h2>
              <div className="text-xs text-slate-400 font-mono">
                Período: <strong className="text-slate-200">{seasonLabel}</strong> • Jogos Analisados:{' '}
                <strong className="text-cyan-300">{totalMatches}</strong> ({wins}V - {draws}E - {losses}D • {winRate}%
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
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
              <span>⚽</span> Ataque
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-white">{avgGoalsScored}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">golos marcados / jogo</div>
          </div>

          {/* 2. Defesa */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
              <span>🛡️</span> Defesa
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-white">{avgGoalsConceded}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">golos sofridos / jogo</div>
          </div>

          {/* 3. Bola Parada */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
              <span>🚩</span> Bola Parada
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-white">
              {setPieces.scoredRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">dos golos marcados ({setPieces.scoredTotal} golos)</div>
          </div>

          {/* 4. Maior Produção */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
              <span>⏱️</span> Maior Produção
            </div>
            <div className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-white">
              {peakScoringPeriod ? peakScoringPeriod.label : "0–30'"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {peakScoringPeriod
                ? `${peakScoringPeriod.count} golos (${peakScoringPeriod.percentage}%)`
                : 'Equilibrado'}
            </div>
          </div>

          {/* 5. Maior Vulnerabilidade */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
              <span>⚠️</span> Maior Vulnerabilidade
            </div>
            <div className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-white">
              {peakVulnerabilityPeriod ? peakVulnerabilityPeriod.label : 'Sem alerta'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {peakVulnerabilityPeriod
                ? `${peakVulnerabilityPeriod.count} sofridos (${peakVulnerabilityPeriod.percentage}%)`
                : 'Solidez total'}
            </div>
          </div>

          {/* 6. Disciplina */}
          <div className="ui-inset p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1">
              <span>🟨</span> Disciplina
            </div>
            <div className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black text-white">{avgCardsTotal}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">cartões / jogo</div>
          </div>
        </div>

        {/* COMPARAÇÃO TÁTICA RÁPIDA: QUANDO MARCÁMOS 1.º */}
        {firstGoalImpact.scoredFirstMatches > 0 && (
          <div className="ui-inset p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎯</span>
              <div>
                <strong className="text-white">
                  Quando marcámos primeiro ({firstGoalImpact.scoredFirstMatches} jogos):
                </strong>
                <span className="text-slate-400 block sm:inline sm:ml-1.5">
                  {firstGoalImpact.scoredFirstWins} Vitórias • {firstGoalImpact.scoredFirstDraws} Empates •{' '}
                  {firstGoalImpact.scoredFirstLosses} Derrotas
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-xl">
              {firstGoalImpact.scoredFirstWinRate}% taxa de vitória
            </span>
          </div>
        )}

        {/* DESTAQUES INDIVIDUAIS: TOP 3 MARCADORES E TOP 3 ASSISTENTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Top 3 Marcadores */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">⚽</span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-['Chakra_Petch']">
                    Melhores Marcadores
                  </h4>
                  <p className="text-[10px] text-slate-400">Os 3 melhores marcadores e a quantidade de golos</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
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
                      className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-50">{medal}</span>
                        <span className="text-slate-500 text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-slate-600">0 golos</span>
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
                        <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-1 rounded shrink-0">
                          #{s.playerNumber}
                        </span>
                      )}
                      <span className="text-white font-medium truncate">{s.playerName}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 shrink-0">
                      {s.count} {s.count === 1 ? 'golo' : 'golos'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 Assistentes */}
          <div className="ui-inset p-4">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-['Chakra_Petch']">
                    Melhores Assistentes
                  </h4>
                  <p className="text-[10px] text-slate-400">Os 3 melhores assistentes e a quantidade de assistência</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
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
                      className="ui-card flex items-center justify-between text-xs p-1.5 px-2.5 text-slate-500 font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs shrink-0 opacity-50">{medal}</span>
                        <span className="text-slate-500 text-[11px]">—</span>
                      </div>
                      <span className="text-[11px] text-slate-600">0 assistências</span>
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
                        <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-500/10 px-1 rounded shrink-0">
                          #{a.playerNumber}
                        </span>
                      )}
                      <span className="text-white font-medium truncate">{a.playerName}</span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 shrink-0">
                      {a.count} {a.count === 1 ? 'assistência' : 'assistências'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PRINCIPAIS CONCLUSÕES AUTOMÁTICAS (3 a 5 frases automáticas de síntese tática) */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/20 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300 font-['Chakra_Petch']">
              Principais Conclusões Táticas
            </h3>
          </div>

          <div className="space-y-2.5">
            {keyConclusions.map((conclusion, idx) => (
              <div
                key={idx}
                className="ui-card p-3 text-xs sm:text-[13px] text-slate-200 leading-relaxed font-medium flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{conclusion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER DO MODAL */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 font-mono">BolaComVisão • Inteligência de Treino e Jogo</span>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-primary px-6 py-2.5 text-xs">
            Concluir Análise
          </button>
        </div>
      </div>
    </div>
  );
};
