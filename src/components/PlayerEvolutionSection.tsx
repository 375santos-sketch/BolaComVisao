import React, { useState } from 'react';
import { AppState, Player, PlayerEvolutionMetrics } from '../types';
import { calculatePlayerEvolution } from '../lib/intelligenceEngine';

interface PlayerEvolutionSectionProps {
  state: AppState;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onShowToast: (msg: string) => void;
}

export const PlayerEvolutionSection: React.FC<PlayerEvolutionSectionProps> = ({
  state,
  selectedPlayerId,
  onSelectPlayer,
  onNavigate,
  onShowToast
}) => {
  const activePlayers = (state.roster || []).filter((p) => p.active !== false);
  const [currentSelectedId, setCurrentSelectedId] = useState<string>(selectedPlayerId || activePlayers[0]?.id || '');

  const selectedPlayer = activePlayers.find((p) => p.id === currentSelectedId) || activePlayers[0];

  const evolutionData: PlayerEvolutionMetrics | null = selectedPlayer
    ? calculatePlayerEvolution(selectedPlayer, state)
    : null;

  // Calculamos a evolução de todos os atletas para o resumo do plantel
  const allEvolutions = activePlayers.map((p) => ({
    player: p,
    metrics: calculatePlayerEvolution(p, state)
  }));

  const positiveTrendPlayers = allEvolutions.filter(
    (e) => e.metrics.ratingTrend === 'positiva' || e.metrics.attendanceTrend === 'melhorou'
  );

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* Top Banner / Explanatory Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 border border-cyan-500/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Evolução & Rendimento Individual
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Acompanhamento longitudinal do atleta em relação ao seu próprio percurso histórico (sem rankings
              públicos).
            </p>
          </div>

          {/* Quick Player Dropdown / Switcher */}
          <div className="min-w-[200px]">
            <select
              value={currentSelectedId}
              onChange={(e) => {
                setCurrentSelectedId(e.target.value);
                if (onSelectPlayer) onSelectPlayer(e.target.value);
              }}
              className="w-full bg-slate-950 border border-cyan-500/40 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
            >
              {activePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number !== null && p.number !== undefined ? `#${p.number} - ` : ''}
                  {p.name} ({p.positions || 'Plantel'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Highlight Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Atletas com Evolução Positiva</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-['Chakra_Petch'] mt-1 block">
              {positiveTrendPlayers.length} / {activePlayers.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Subida de notas ou assiduidade</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Jogos Registados</span>
            <span className="text-2xl font-extrabold text-white font-['Chakra_Petch'] mt-1 block">
              {(state.matches || []).filter((m) => m.finished).length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Base de dados oficial de partidas</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Treinos Registados</span>
            <span className="text-2xl font-extrabold text-white font-['Chakra_Petch'] mt-1 block">
              {(state.trainings || []).filter((t) => t.completed !== false).length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Sessões com presenças fechadas</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20">
            <span className="text-[10px] uppercase font-mono text-cyan-300 block">Foco da Análise</span>
            <span className="text-sm font-bold text-white font-mono mt-1 block truncate">
              {selectedPlayer ? selectedPlayer.name : 'Selecionar'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
              {selectedPlayer?.positions || 'Plantel'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Selected Player Evolution Card */}
      {evolutionData && selectedPlayer ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-5 shadow-sm">
          {/* Header with Photo & Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3">
              {selectedPlayer.photoUrl ? (
                <img
                  src={selectedPlayer.photoUrl}
                  alt={selectedPlayer.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-400 shadow-md shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center text-xl font-bold font-mono text-cyan-300 shrink-0">
                  {selectedPlayer.number !== null && selectedPlayer.number !== undefined
                    ? `#${selectedPlayer.number}`
                    : '⚽'}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-white font-['Chakra_Petch']">{selectedPlayer.name}</h4>
                  {selectedPlayer.number !== null && selectedPlayer.number !== undefined && (
                    <span className="bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-extrabold text-xs px-2 py-0.5 rounded-md">
                      #{selectedPlayer.number}
                    </span>
                  )}
                </div>
                <div className="text-xs text-cyan-300 font-mono mt-0.5">
                  {selectedPlayer.positions || 'Posição Não Definida'} • Pé: {selectedPlayer.dominantFoot || 'Direito'}
                </div>
              </div>
            </div>

            {/* Confidence Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Nível de Confiança:</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border ${
                  evolutionData.confidence === 'alta'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : evolutionData.confidence === 'media'
                      ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {evolutionData.confidence === 'alta'
                  ? 'Alta (Dados Reais)'
                  : evolutionData.confidence === 'media'
                    ? 'Média (Poucos Jogos)'
                    : 'Dados Insuficientes'}
              </span>
            </div>
          </div>

          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* Assiduidade */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Assiduidade Treinos</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-cyan-300 font-['Chakra_Petch']">
                  {evolutionData.totalTrainings > 0 ? `${evolutionData.attendanceRate}%` : '—'}
                </span>
                {evolutionData.totalTrainings > 0 && (
                  <span
                    className={`text-xs font-bold ${
                      evolutionData.attendanceTrend === 'melhorou'
                        ? 'text-emerald-400'
                        : evolutionData.attendanceTrend === 'diminuiu'
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {evolutionData.attendanceTrend === 'melhorou'
                      ? '↗ +' + evolutionData.periodComparison.attendanceDiff + '%'
                      : evolutionData.attendanceTrend === 'diminuiu'
                        ? '↘ ' + evolutionData.periodComparison.attendanceDiff + '%'
                        : '→'}
                  </span>
                )}
              </div>
            </div>

            {/* Avaliação Média */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Avaliação Média</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-amber-300 font-['Chakra_Petch']">
                  {evolutionData.avgRating > 0 ? `${evolutionData.avgRating}/5` : 'N/D'}
                </span>
                {evolutionData.ratingTrend !== 'insuficiente' && (
                  <span
                    className={`text-xs font-bold ${
                      evolutionData.ratingTrend === 'positiva'
                        ? 'text-emerald-400'
                        : evolutionData.ratingTrend === 'negativa'
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {evolutionData.ratingTrend === 'positiva'
                      ? '↗ +' + evolutionData.ratingDiff
                      : evolutionData.ratingTrend === 'negativa'
                        ? '↘ ' + evolutionData.ratingDiff
                        : '→'}
                  </span>
                )}
              </div>
            </div>

            {/* Jogos & Titularidades */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Jogos / Titularidades</div>
              <div className="text-xl font-bold text-white font-['Chakra_Petch'] mt-1">
                {evolutionData.totalMatches}{' '}
                <span className="text-xs text-slate-400">({evolutionData.starts} titular)</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{evolutionData.minutes} minutos jogados</div>
            </div>

            {/* Ações Decisivas (Golos / Assistências) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Golos / Assistências</div>
              <div className="text-xl font-bold text-cyan-400 font-['Chakra_Petch'] mt-1">
                ⚽ {evolutionData.goals} <span className="text-xs text-slate-400">👟 {evolutionData.assists}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                🟨 {evolutionData.yellowCards} 🟥 {evolutionData.redCards} cartões
              </div>
            </div>
          </div>

          {/* Temporal Comparison Block: 1ª Metade vs 2ª Metade */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-3">
            <h5 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider">
              ⚖️ Comparação Temporal (Próprio Percurso do Atleta)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Evolução de Avaliação:</span>
                  <span className="text-slate-300 font-bold">
                    {evolutionData.periodComparison.prevAvgRating > 0
                      ? `${evolutionData.periodComparison.prevAvgRating}`
                      : 'N/D'}{' '}
                    ➔{' '}
                    {evolutionData.periodComparison.currentAvgRating > 0
                      ? `${evolutionData.periodComparison.currentAvgRating}`
                      : 'N/D'}
                  </span>
                </div>
                <div
                  className={`text-sm font-bold font-['Chakra_Petch'] ${
                    evolutionData.periodComparison.ratingDiff > 0
                      ? 'text-emerald-400'
                      : evolutionData.periodComparison.ratingDiff < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                  }`}
                >
                  {evolutionData.periodComparison.ratingDiff > 0 ? '+' : ''}
                  {evolutionData.periodComparison.ratingDiff}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Evolução de Assiduidade:</span>
                  <span className="text-slate-300 font-bold">
                    {evolutionData.periodComparison.prevAttendance}% ➔{' '}
                    {evolutionData.periodComparison.currentAttendance}%
                  </span>
                </div>
                <div
                  className={`text-sm font-bold font-['Chakra_Petch'] ${
                    evolutionData.periodComparison.attendanceDiff > 0
                      ? 'text-emerald-400'
                      : evolutionData.periodComparison.attendanceDiff < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                  }`}
                >
                  {evolutionData.periodComparison.attendanceDiff > 0 ? '+' : ''}
                  {evolutionData.periodComparison.attendanceDiff}%
                </div>
              </div>
            </div>
          </div>

          {/* Ratings History Sparkline Chart (SVG) */}
          {evolutionData.ratingsHistory.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider">
                  📉 Histórico de Avaliações por Jogo (1 a 5)
                </h5>
                <span className="text-[10px] font-mono text-slate-500">
                  {evolutionData.ratingsHistory.length} avaliações registadas
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-2 h-20 pt-4 px-2 bg-slate-900/60 rounded-lg border border-slate-800/80 overflow-x-auto scrollbar-none">
                  {evolutionData.ratingsHistory.map((item, idx) => {
                    const heightPct = Math.max(15, (item.rating / 5) * 100);
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 flex-1 min-w-[32px] group relative">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-blue-400 group-hover:brightness-125 transition-all relative flex items-center justify-center text-[10px] font-bold text-slate-950"
                          style={{ height: `${heightPct}%` }}
                        >
                          {item.rating}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[40px]">
                          {item.opponent.slice(0, 4)}
                        </span>

                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute -top-8 bg-slate-950 border border-cyan-400 text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                          {item.opponent} ({item.rating}/5)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Deterministic Factual Summary Box */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <div className="text-[10px] font-['Chakra_Petch'] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <span>💡</span>
              <span>Resumo Automático Baseado em Dados</span>
            </div>
            <p className="text-xs text-slate-200 font-mono leading-relaxed">{evolutionData.summaryText}</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <p className="text-xs font-mono text-slate-400">Nenhum atleta selecionado para análise.</p>
        </div>
      )}
    </div>
  );
};
