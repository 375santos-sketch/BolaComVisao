import React from 'react';
import { AggregatedAnalysis } from '../../../lib/gameAnalysis';

interface SetPiecesAndDisciplineProps {
  analysis: AggregatedAnalysis;
}

export const CornersAnalysis: React.FC<SetPiecesAndDisciplineProps> = ({ analysis }) => {
  const {
    cornersForTotal,
    cornersForMatchesCount,
    cornersForAvg,
    cornersAgainstTotal,
    cornersAgainstMatchesCount,
    cornersAgainstAvg,
    goalTypes
  } = analysis;

  const cornerGoalsScored = goalTypes.find((gt) => gt.type === 'Canto')?.count || 0;
  const cornerConversionRate = cornersForTotal > 0 ? ((cornerGoalsScored / cornersForTotal) * 100).toFixed(1) : '0';

  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>🚩</span>
            <span>Análise de Cantos</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Estatísticas acumuladas de cantos a favor e contra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Cantos a Favor */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-cyan-400 block mb-1">🚩 Cantos a Favor</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-white">{cornersForTotal}</span>
          <span className="text-xs text-slate-400 block mt-1">
            Média: <strong className="text-cyan-300">{cornersForAvg || '—'}</strong> / jogo ({cornersForMatchesCount}{' '}
            jogos registados)
          </span>
        </div>

        {/* Cantos Sofridos */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-rose-400 block mb-1">🚩 Cantos Sofridos (Contra)</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-white">{cornersAgainstTotal}</span>
          <span className="text-xs text-slate-400 block mt-1">
            Média: <strong className="text-rose-300">{cornersAgainstAvg || '—'}</strong> / jogo (
            {cornersAgainstMatchesCount} jogos registados)
          </span>
        </div>

        {/* Eficácia de Golo de Canto */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-amber-400 block mb-1">🎯 Eficácia de Canto</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-amber-400">{cornerGoalsScored}</span>
          <span className="text-xs text-slate-400 block mt-1">
            Golos de canto (<strong className="text-amber-300">{cornerConversionRate}%</strong> conversão)
          </span>
        </div>
      </div>
    </div>
  );
};

export const FoulsAnalysis: React.FC<SetPiecesAndDisciplineProps> = ({ analysis }) => {
  const {
    foulsCommittedTotal,
    foulsCommittedMatchesCount,
    foulsCommittedAvg,
    foulsSufferedTotal,
    foulsSufferedMatchesCount,
    foulsSufferedAvg
  } = analysis;

  const balance = foulsSufferedTotal - foulsCommittedTotal;

  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>⚠️</span>
            <span>Análise de Faltas</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Equilíbrio de faltas cometidas e faltas sofridas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Faltas Cometidas */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-amber-400 block mb-1">⚠️ Faltas Cometidas</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-white">{foulsCommittedTotal}</span>
          <span className="text-xs text-slate-400 block mt-1">
            Média: <strong className="text-amber-300">{foulsCommittedAvg || '—'}</strong> / jogo (
            {foulsCommittedMatchesCount} jogos)
          </span>
        </div>

        {/* Faltas Sofridas */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-emerald-400 block mb-1">🩹 Faltas Sofridas</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-white">{foulsSufferedTotal}</span>
          <span className="text-xs text-slate-400 block mt-1">
            Média: <strong className="text-emerald-300">{foulsSufferedAvg || '—'}</strong> / jogo (
            {foulsSufferedMatchesCount} jogos)
          </span>
        </div>

        {/* Rácio Disciplinar */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-cyan-400 block mb-1">⚖️ Saldo Disciplinar</span>
          <span
            className={`text-3xl font-['Chakra_Petch'] font-black ${
              balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {balance > 0 ? `+${balance}` : balance}
          </span>
          <span className="text-xs text-slate-400 block mt-1">
            {balance >= 0 ? 'Sofremos mais faltas do que cometemos' : 'Cometemos mais faltas do que sofremos'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CardsAnalysis: React.FC<SetPiecesAndDisciplineProps> = ({ analysis }) => {
  const { yellowCardsTotal, redCardsTotal, cardsPerMatchAvg, cardedPlayers, totalMatches } = analysis;

  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-white flex items-center gap-2">
            <span>🟨🟥</span>
            <span>Amostragem de Cartões & Disciplina</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Total de cartões acumulados e média por partida</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30">
            🟨 {yellowCardsTotal}
          </span>
          <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30">
            🟥 {redCardsTotal}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="ui-inset p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total de Cartões</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-white">
              {yellowCardsTotal + redCardsTotal}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Média por Jogo</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-cyan-400">{cardsPerMatchAvg}</span>
          </div>
        </div>

        <div className="ui-inset p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Jogadores Advertidos</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-amber-400">{cardedPlayers.length}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Jogos Analisados</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-slate-300">{totalMatches}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
