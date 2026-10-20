import React from 'react';
import { OutcomeGroupStats } from '../../../lib/gameAnalysis';

interface OutcomeComparisonProps {
  winsProfile: OutcomeGroupStats;
  drawsProfile: OutcomeGroupStats;
  lossesProfile: OutcomeGroupStats;
  totalMatches: number;
}

export const OutcomeComparison: React.FC<OutcomeComparisonProps> = ({
  winsProfile,
  drawsProfile,
  lossesProfile,
  totalMatches
}) => {
  if (totalMatches === 0) return null;

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5" id="outcome-comparison-section">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>⭐</span>
            <span>Como Ganhamos, Empatamos e Perdemos?</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Descoberta de padrões estatísticos e comportamentais por resultado
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Total: <strong className="text-white">{totalMatches} jogos analisados</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* 1. NAS NOSSAS VITÓRIAS */}
        <div className="bg-gradient-to-b from-slate-950/90 to-emerald-950/20 border border-emerald-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-300 font-['Chakra_Petch']">
                  Nas Nossas Vitórias
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {winsProfile.matchCount} jogos ({winsProfile.percentage}%)
              </span>
            </div>

            {winsProfile.matchCount === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Sem vitórias no período selecionado.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⚽ Golos por jogo</span>
                  <span className="text-emerald-400 font-black font-mono text-sm">{winsProfile.avgGoalsScored}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🛡️ Golos sofridos/jogo</span>
                  <span className="text-emerald-300 font-bold font-mono">{winsProfile.avgGoalsConceded}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🚩 Cantos a favor/jogo</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {winsProfile.avgCornersFor !== null ? winsProfile.avgCornersFor : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🩹 Faltas sofridas/jogo</span>
                  <span className="text-emerald-300 font-bold font-mono">
                    {winsProfile.avgFoulsSuffered !== null ? winsProfile.avgFoulsSuffered : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🎯 Marcaram 1.º</span>
                  <span className="text-emerald-400 font-black font-mono">
                    {winsProfile.scoredFirstCount} ({winsProfile.scoredFirstRate}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🚩 Golos de bola parada</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {winsProfile.scoredSetPieceCount} ({winsProfile.scoredSetPieceRate}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {winsProfile.matchCount > 0 && (
            <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-slate-300 font-medium">
              💡 Padrão de vitória: Volume ofensivo elevado ({winsProfile.avgGoalsScored} golos/jogo) e entrada autoritária a inaugurar o marcador em {winsProfile.scoredFirstRate}% dos jogos.
            </div>
          )}
        </div>

        {/* 2. NOS EMPATES */}
        <div className="bg-gradient-to-b from-slate-950/90 to-amber-950/20 border border-amber-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-amber-300 font-['Chakra_Petch']">
                  Nos Empates
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                {drawsProfile.matchCount} jogos ({drawsProfile.percentage}%)
              </span>
            </div>

            {drawsProfile.matchCount === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Sem empates registados.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⚽ Golos por jogo</span>
                  <span className="text-amber-400 font-black font-mono text-sm">{drawsProfile.avgGoalsScored}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🛡️ Golos sofridos/jogo</span>
                  <span className="text-amber-300 font-bold font-mono">{drawsProfile.avgGoalsConceded}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🚩 Cantos a favor/jogo</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {drawsProfile.avgCornersFor !== null ? drawsProfile.avgCornersFor : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🩹 Faltas sofridas/jogo</span>
                  <span className="text-emerald-300 font-bold font-mono">
                    {drawsProfile.avgFoulsSuffered !== null ? drawsProfile.avgFoulsSuffered : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⏱️ Sofreram após os 60'</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {drawsProfile.concededAfter60Count} ({drawsProfile.concededAfter60Rate}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🟨 Cartões/jogo</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {(drawsProfile.avgYellowCards + drawsProfile.avgRedCards).toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {drawsProfile.matchCount > 0 && (
            <div className="mt-4 pt-3 border-t border-amber-500/20 text-[11px] text-slate-300 font-medium">
              💡 Padrão de empate: Partidas de alta disputa com equilíbrio de golos ({drawsProfile.avgGoalsScored} vs {drawsProfile.avgGoalsConceded}).
            </div>
          )}
        </div>

        {/* 3. NAS DERROTAS (COMO PERDEMOS) */}
        <div className="bg-gradient-to-b from-slate-950/90 to-rose-950/20 border border-rose-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-rose-300 font-['Chakra_Petch']">
                  Nas Nossas Derrotas
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                {lossesProfile.matchCount} jogos ({lossesProfile.percentage}%)
              </span>
            </div>

            {lossesProfile.matchCount === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Sem derrotas no registo atual. Excelente!</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🛡️ Sofreram primeiro</span>
                  <span className="text-rose-400 font-black font-mono text-sm">
                    {lossesProfile.concededFirstCount} jogos ({lossesProfile.concededFirstRate}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⏱️ Sofreram após os 60'</span>
                  <span className="text-rose-300 font-bold font-mono">
                    {lossesProfile.concededAfter60Count} jogos ({lossesProfile.concededAfter60Rate}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🚩 Sofreram de bola parada</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {lossesProfile.concededSetPieceCount} jogos ({lossesProfile.concededSetPieceRate}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⚽ Golos marcados/jogo</span>
                  <span className="text-slate-400 font-bold font-mono">{lossesProfile.avgGoalsScored}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">🥅 Golos sofridos/jogo</span>
                  <span className="text-rose-400 font-black font-mono">{lossesProfile.avgGoalsConceded}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium">⚠️ Faltas cometidas/jogo</span>
                  <span className="text-amber-300 font-bold font-mono">
                    {lossesProfile.avgFoulsCommitted !== null ? lossesProfile.avgFoulsCommitted : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {lossesProfile.matchCount > 0 && (
            <div className="mt-4 pt-3 border-t border-rose-500/20 text-[11px] text-slate-300 font-medium">
              💡 Padrão de derrota identificado: Em {lossesProfile.concededFirstCount} das {lossesProfile.matchCount} derrotas a equipa sofreu primeiro, e em {lossesProfile.concededAfter60Count} sofreu golos na reta final da partida.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
