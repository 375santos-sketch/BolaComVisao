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
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
            <span>🚩</span>
            <span>Análise de Cantos</span>
          </h3>
          <p className="text-xs text-ui-muted mt-0.5">Estatísticas acumuladas de cantos a favor e contra</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Cantos a Favor */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-brand block mb-1">🚩 Cantos a Favor</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-text">{cornersForTotal}</span>
          <span className="text-xs text-ui-muted block mt-1">
            Média: <strong className="text-ui-brand">{cornersForAvg || '—'}</strong> / jogo ({cornersForMatchesCount}{' '}
            jogos registados)
          </span>
        </div>

        {/* Cantos Sofridos */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-danger block mb-1">🚩 Cantos Sofridos (Contra)</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-text">{cornersAgainstTotal}</span>
          <span className="text-xs text-ui-muted block mt-1">
            Média: <strong className="text-ui-danger">{cornersAgainstAvg || '—'}</strong> / jogo (
            {cornersAgainstMatchesCount} jogos registados)
          </span>
        </div>

        {/* Eficácia de Golo de Canto */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-warning block mb-1">🎯 Eficácia de Canto</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-warning">{cornerGoalsScored}</span>
          <span className="text-xs text-ui-muted block mt-1">
            Golos de canto (<strong className="text-ui-warning">{cornerConversionRate}%</strong> conversão)
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
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
            <span>⚠️</span>
            <span>Análise de Faltas</span>
          </h3>
          <p className="text-xs text-ui-muted mt-0.5">Equilíbrio de faltas cometidas e faltas sofridas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Faltas Cometidas */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-warning block mb-1">⚠️ Faltas Cometidas</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-text">{foulsCommittedTotal}</span>
          <span className="text-xs text-ui-muted block mt-1">
            Média: <strong className="text-ui-warning">{foulsCommittedAvg || '—'}</strong> / jogo (
            {foulsCommittedMatchesCount} jogos)
          </span>
        </div>

        {/* Faltas Sofridas */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-success block mb-1">🩹 Faltas Sofridas</span>
          <span className="text-3xl font-['Chakra_Petch'] font-black text-ui-text">{foulsSufferedTotal}</span>
          <span className="text-xs text-ui-muted block mt-1">
            Média: <strong className="text-ui-success">{foulsSufferedAvg || '—'}</strong> / jogo (
            {foulsSufferedMatchesCount} jogos)
          </span>
        </div>

        {/* Rácio Disciplinar */}
        <div className="ui-inset p-4 text-center">
          <span className="text-xs font-bold text-ui-brand block mb-1">⚖️ Saldo Disciplinar</span>
          <span
            className={`text-3xl font-['Chakra_Petch'] font-black ${
              balance >= 0 ? 'text-ui-success' : 'text-ui-danger'
            }`}
          >
            {balance > 0 ? `+${balance}` : balance}
          </span>
          <span className="text-xs text-ui-muted block mt-1">
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
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-ui-line">
        <div>
          <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text flex items-center gap-2">
            <span>🟨🟥</span>
            <span>Amostragem de Cartões & Disciplina</span>
          </h3>
          <p className="text-xs text-ui-muted mt-0.5">Total de cartões acumulados e média por partida</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <span className="bg-ui-warning/20 text-ui-warning px-2.5 py-1 rounded-lg border border-ui-warning/30">
            🟨 {yellowCardsTotal}
          </span>
          <span className="bg-ui-danger/20 text-ui-danger px-2.5 py-1 rounded-lg border border-ui-danger/30">
            🟥 {redCardsTotal}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="ui-inset p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ui-muted block">Total de Cartões</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-text">
              {yellowCardsTotal + redCardsTotal}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-ui-muted block">Média por Jogo</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-brand">{cardsPerMatchAvg}</span>
          </div>
        </div>

        <div className="ui-inset p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ui-muted block">Jogadores Advertidos</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-warning">{cardedPlayers.length}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-ui-muted block">Total Jogos Analisados</span>
            <span className="text-2xl font-['Chakra_Petch'] font-black text-ui-text">{totalMatches}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
