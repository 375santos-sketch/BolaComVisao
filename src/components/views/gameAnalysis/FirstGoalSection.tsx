import React from 'react';
import { FirstGoalDetailedAnalysis } from '../../../lib/gameAnalysis';

interface FirstGoalSectionProps {
  firstGoalImpact: FirstGoalDetailedAnalysis;
}

export const FirstGoalSection: React.FC<FirstGoalSectionProps> = ({ firstGoalImpact }) => {
  const {
    scoredFirstMatches,
    scoredFirstWins,
    scoredFirstDraws,
    scoredFirstLosses,
    scoredFirstWinRate,
    avgScoredFirstMinute,
    concededFirstMatches,
    concededFirstComebackWins,
    concededFirstComebackDraws,
    concededFirstLosses,
    concededFirstWinRate,
    concededFirstComebackRate,
    avgConcededFirstMinute,
    goallessMatches
  } = firstGoalImpact;

  const totalEvaluated = scoredFirstMatches + concededFirstMatches + goallessMatches;

  if (totalEvaluated === 0) {
    return null;
  }

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden" id="first-goal-section">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>⭐</span>
            <span>Marcámos Primeiro — O Que Aconteceu?</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Análise do impacto tático e psicológico de abrir o marcador vs sofrer primeiro
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          Amostra: <strong className="text-cyan-300">{totalEvaluated} jogos</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* BLOCO 1: QUANDO MARCÁMOS PRIMEIRO */}
        <div className="bg-gradient-to-br from-slate-950/90 to-emerald-950/20 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚽</span>
                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-300 font-['Chakra_Petch']">
                  Marcámos Primeiro
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {scoredFirstMatches} {scoredFirstMatches === 1 ? 'jogo' : 'jogos'}
              </span>
            </div>

            {scoredFirstMatches === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Sem jogos em que a equipa tenha inaugurado o marcador.</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-4 bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-500/20">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Taxa de Vitória</span>
                    <span className="text-3xl font-['Chakra_Petch'] font-black text-emerald-400">
                      {scoredFirstWinRate}%
                    </span>
                  </div>
                  {avgScoredFirstMinute !== null && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Minuto Médio</span>
                      <span className="text-lg font-mono font-bold text-emerald-300">
                        {avgScoredFirstMinute}'
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Desfecho das Partidas:
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">VITÓRIAS</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-emerald-400">
                        {scoredFirstWins}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({scoredFirstMatches > 0 ? Math.round((scoredFirstWins / scoredFirstMatches) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">EMPATES</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-amber-400">
                        {scoredFirstDraws}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({scoredFirstMatches > 0 ? Math.round((scoredFirstDraws / scoredFirstMatches) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-rose-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">DERROTAS</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-rose-400">
                        {scoredFirstLosses}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({scoredFirstMatches > 0 ? Math.round((scoredFirstLosses / scoredFirstMatches) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {scoredFirstMatches > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 font-medium">
              💡 {scoredFirstWinRate >= 75
                ? 'Excelente capacidade de controlo e gestão de vantagem no marcador.'
                : scoredFirstLosses > 0 || scoredFirstDraws > 0
                ? 'Oportunidade para reforçar a maturidade defensiva após inaugurar o marcador.'
                : 'A equipa converteu todas as vantagens inauguradas.'}
            </div>
          )}
        </div>

        {/* BLOCO 2: QUANDO SOFREMOS PRIMEIRO */}
        <div className="bg-gradient-to-br from-slate-950/90 to-rose-950/20 border border-rose-500/30 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h4 className="text-sm font-black uppercase tracking-wider text-rose-300 font-['Chakra_Petch']">
                  Sofremos Primeiro
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                {concededFirstMatches} {concededFirstMatches === 1 ? 'jogo' : 'jogos'}
              </span>
            </div>

            {concededFirstMatches === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">Sem jogos em que o adversário tenha inaugurado o marcador.</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-4 bg-slate-900/80 p-3.5 rounded-2xl border border-rose-500/20">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Capacidade de Reação</span>
                    <span className="text-3xl font-['Chakra_Petch'] font-black text-rose-400">
                      {concededFirstComebackRate}%
                    </span>
                  </div>
                  {avgConcededFirstMinute !== null && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Minuto Médio</span>
                      <span className="text-lg font-mono font-bold text-rose-300">
                        {avgConcededFirstMinute}'
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Desfecho das Partidas:
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">REVIRAVOLTAS</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-emerald-400">
                        {concededFirstComebackWins}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({concededFirstWinRate}%)
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-amber-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">EMPATES</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-amber-400">
                        {concededFirstComebackDraws}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({concededFirstMatches > 0 ? Math.round((concededFirstComebackDraws / concededFirstMatches) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-rose-500/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">DERROTAS</span>
                      <span className="text-xl font-['Chakra_Petch'] font-black text-rose-400">
                        {concededFirstLosses}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ({concededFirstMatches > 0 ? Math.round((concededFirstLosses / concededFirstMatches) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {concededFirstMatches > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 font-medium">
              💡 {concededFirstComebackRate >= 50
                ? 'Elevado poder de superação mental e resiliência tática para pontuar após desvantagem.'
                : 'A equipa sente dificuldades quando começa a perder, sendo crucial entrar com foco máximo.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
