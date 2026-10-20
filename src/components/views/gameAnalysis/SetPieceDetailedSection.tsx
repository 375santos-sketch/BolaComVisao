import React from 'react';
import { SetPieceDetailedBreakdown } from '../../../lib/gameAnalysis';

interface SetPieceAnalysisViewProps {
  setPieces: SetPieceDetailedBreakdown;
  goalsScored: number;
  goalsConceded: number;
}

export const SetPieceDetailedSection: React.FC<SetPieceAnalysisViewProps> = ({
  setPieces,
  goalsScored,
  goalsConceded
}) => {
  const {
    scoredCorner,
    scoredFreekick,
    scoredPenalty,
    scoredGoalKick,
    scoredTotal,
    scoredRate,
    concededCorner,
    concededFreekick,
    concededPenalty,
    concededGoalKick,
    concededTotal,
    concededRate,
    netBalance,
    offensiveProductionIndex,
    defensiveVulnerabilityIndex
  } = setPieces;

  return (
    <section
      className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5"
      id="set-piece-detailed-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>🚩</span>
            <span>Análise Tática de Bola Parada</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Produção ofensiva vs vulnerabilidade defensiva em esquemas táticos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            Saldo Líquido:{' '}
            <strong
              className={`px-2 py-0.5 rounded-lg ${netBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}
            >
              {netBalance >= 0 ? `+${netBalance}` : netBalance} golos
            </strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* BLOCO 1: PRODUÇÃO OFENSIVA (GOLOS MARCADOS DE BOLA PARADA) */}
        <div className="bg-gradient-to-br from-slate-950/90 to-emerald-950/20 border border-emerald-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-300 font-['Chakra_Petch']">
                  Produção Ofensiva
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {scoredRate}% dos golos ({scoredTotal}/{goalsScored})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Golos de Canto</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-white">{scoredCorner}</span>
                </div>
                <span className="text-xl">🚩</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Golos de Livre</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-white">{scoredFreekick}</span>
                </div>
                <span className="text-xl">🎯</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Golos de Penálti</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-white">{scoredPenalty}</span>
                </div>
                <span className="text-xl">⚽</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Pontapé de Baliza</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-white">{scoredGoalKick}</span>
                </div>
                <span className="text-xl">👟</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Índice de Ameaça Ofensiva:</span>
              <span className="font-mono font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                {offensiveProductionIndex}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-slate-300">
            💡 Dica de treino:{' '}
            {scoredRate >= 30
              ? 'Manter as rotinas de bloqueios e segundo poste que têm demonstrado alta eficácia.'
              : 'Oportunidade para desenhar 2 a 3 variantes ensaiadas de cantos e livres laterais nos treinos.'}
          </div>
        </div>

        {/* BLOCO 2: VULNERABILIDADE DEFENSIVA (GOLOS SOFRIDOS DE BOLA PARADA) */}
        <div className="bg-gradient-to-br from-slate-950/90 to-rose-950/20 border border-rose-500/30 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h4 className="text-sm font-black uppercase tracking-wider text-rose-300 font-['Chakra_Petch']">
                  Vulnerabilidade Defensiva
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                {concededRate}% dos sofridos ({concededTotal}/{goalsConceded})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Sofridos de Canto</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{concededCorner}</span>
                </div>
                <span className="text-xl">🚩</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Sofridos de Livre</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{concededFreekick}</span>
                </div>
                <span className="text-xl">🎯</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Sofridos de Penálti</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{concededPenalty}</span>
                </div>
                <span className="text-xl">⚽</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Pontapé de Baliza</span>
                  <span className="text-2xl font-['Chakra_Petch'] font-black text-rose-400">{concededGoalKick}</span>
                </div>
                <span className="text-xl">👟</span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-rose-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Avaliação de Solidez Defensiva:</span>
              <span
                className={`font-mono font-black px-2.5 py-1 rounded-lg ${
                  defensiveVulnerabilityIndex === 'Risco Elevado'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {defensiveVulnerabilityIndex}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-500/20 text-[11px] text-slate-300">
            💡 Foco de treino:{' '}
            {concededTotal > 0
              ? 'Reforçar marcação individual/zona mista e ataque agressivo à 1.ª bola defensiva aérea.'
              : 'Excelente postura e concentração sem consentir golos de esquemas táticos adversários.'}
          </div>
        </div>
      </div>
    </section>
  );
};
