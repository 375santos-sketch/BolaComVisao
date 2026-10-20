import React from 'react';
import { Match, Player } from '../../../../types';

interface QuickBenchModeProps {
  match: Match;
  myClubName: string;
  roster: Player[];
  onQuickGoalScored: () => void;
  onQuickGoalConceded: () => void;
  onQuickSub: () => void;
  onQuickCard: () => void;
  // Cantos & Faltas
  onAddCorner: () => void;
  onRemoveCorner?: () => void;
  onAddFoul: () => void;
  onRemoveFoul?: () => void;
  onAddOpponentCorner: () => void;
  onRemoveOpponentCorner?: () => void;
  onAddOpponentFoul: () => void;
  onRemoveOpponentFoul?: () => void;
  // Remates (a favor e contra, dentro e fora da área)
  onAddShotInBoxFor: () => void;
  onRemoveShotInBoxFor?: () => void;
  onAddShotOutBoxFor: () => void;
  onRemoveShotOutBoxFor?: () => void;
  onAddShotInBoxAgainst: () => void;
  onRemoveShotInBoxAgainst?: () => void;
  onAddShotOutBoxAgainst: () => void;
  onRemoveShotOutBoxAgainst?: () => void;
}

export const QuickBenchMode: React.FC<QuickBenchModeProps> = ({
  match,
  myClubName,
  roster,
  onQuickGoalScored,
  onQuickGoalConceded,
  onQuickSub,
  onQuickCard,
  onAddCorner,
  onRemoveCorner,
  onAddFoul,
  onRemoveFoul,
  onAddOpponentCorner,
  onRemoveOpponentCorner,
  onAddOpponentFoul,
  onRemoveOpponentFoul,
  onAddShotInBoxFor,
  onRemoveShotInBoxFor,
  onAddShotOutBoxFor,
  onRemoveShotOutBoxFor,
  onAddShotInBoxAgainst,
  onRemoveShotInBoxAgainst,
  onAddShotOutBoxAgainst,
  onRemoveShotOutBoxAgainst
}) => {
  const scoredGoals = (match.goals || []).filter((g) => g.type === 'scored');
  const concededGoals = (match.goals || []).filter((g) => g.type === 'conceded');
  const scoredCount = scoredGoals.length;
  const concededCount = concededGoals.length;

  // Remates valores
  const shotsInBoxFor = match.rematesDentroArea ?? match.shotsInBoxFor ?? 0;
  const shotsOutBoxFor = match.rematesForaArea ?? match.shotsOutBoxFor ?? 0;
  const totalShotsFor = shotsInBoxFor + shotsOutBoxFor;

  const shotsInBoxAgainst = match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0;
  const shotsOutBoxAgainst = match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0;
  const totalShotsAgainst = shotsInBoxAgainst + shotsOutBoxAgainst;

  // Lista dos últimos acontecimentos (últimos 3 golos/cartões)
  const recentGoals = [...(match.goals || [])].reverse().slice(0, 3);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Placar Rápido Minimalista */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex-1 text-center">
          <span className="text-[11px] text-slate-400 font-mono uppercase block truncate max-w-[130px] sm:max-w-none mx-auto">
            {myClubName}
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-400 mt-0.5">
            {scoredCount}
          </div>
        </div>

        <div className="px-3 text-xl font-mono text-slate-600 font-bold">—</div>

        <div className="flex-1 text-center">
          <span className="text-[11px] text-slate-400 font-mono uppercase block truncate max-w-[130px] sm:max-w-none mx-auto">
            {match.opponent || 'Adversário'}
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-rose-400 mt-0.5">
            {concededCount}
          </div>
        </div>
      </div>

      {/* 2. Botões de Ação Principal em Toque Único (Golos) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickGoalScored}
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
        >
          <span className="text-2xl">⚽</span>
          <span>+1 Golo Marcado</span>
        </button>

        <button
          onClick={onQuickGoalConceded}
          className="p-4 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 transition-all"
        >
          <span className="text-2xl">🔴</span>
          <span>+1 Golo Sofrido</span>
        </button>
      </div>

      {/* 3. Ações de Banco: Substituição e Cartão */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickSub}
          className="p-3.5 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-['Chakra_Petch'] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
        >
          <span className="text-xl">🔄</span>
          <span>Substituição</span>
        </button>

        <button
          onClick={onQuickCard}
          className="p-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-['Chakra_Petch'] font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
        >
          <span className="text-xl">🟨</span>
          <span>Cartão</span>
        </button>
      </div>

      {/* 4. CONTADORES DE REMATES: A FAVOR E CONTRA (DENTRO E FORA DA ÁREA) */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="text-xs font-black text-cyan-300 uppercase tracking-wider font-['Chakra_Petch']">
              Remates à Baliza
            </span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-300">
            Nós: <span className="text-cyan-400 font-black">{totalShotsFor}</span> vs Adv:{' '}
            <span className="text-rose-400 font-black">{totalShotsAgainst}</span>
          </div>
        </div>

        {/* 4.1 Remates a Favor */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
            Remates a Favor (Nossa Equipa): Total {totalShotsFor}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Remates a Favor - Dentro da Área */}
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[10px] text-emerald-300 uppercase font-mono block truncate font-bold">
                  🎯 Dentro da Área
                </span>
                <span className="text-lg font-black font-mono text-white">{shotsInBoxFor}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRemoveShotInBoxFor && (
                  <button
                    onClick={onRemoveShotInBoxFor}
                    title="Decrementar Remate a Favor (Dentro da Área)"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotInBoxFor}
                  title="Adicionar Remate a Favor (Dentro da Área)"
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base border border-emerald-500/40 flex items-center justify-center transition-all active:scale-90 shadow-md shadow-emerald-950"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Remates a Favor - Fora da Área */}
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-teal-500/30 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[10px] text-teal-300 uppercase font-mono block truncate font-bold">
                  🎯 Fora da Área
                </span>
                <span className="text-lg font-black font-mono text-white">{shotsOutBoxFor}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRemoveShotOutBoxFor && (
                  <button
                    onClick={onRemoveShotOutBoxFor}
                    title="Decrementar Remate a Favor (Fora da Área)"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotOutBoxFor}
                  title="Adicionar Remate a Favor (Fora da Área)"
                  className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-base border border-teal-500/40 flex items-center justify-center transition-all active:scale-90 shadow-md shadow-teal-950"
                >
                  +1
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4.2 Remates Contra */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block font-mono">
            Remates Contra (Adversário): Total {totalShotsAgainst}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Remates Contra - Dentro da Área */}
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[10px] text-rose-300 uppercase font-mono block truncate font-bold">
                  🛡️ Dentro da Área
                </span>
                <span className="text-lg font-black font-mono text-white">{shotsInBoxAgainst}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRemoveShotInBoxAgainst && (
                  <button
                    onClick={onRemoveShotInBoxAgainst}
                    title="Decrementar Remate Contra (Dentro da Área)"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotInBoxAgainst}
                  title="Adicionar Remate Contra (Dentro da Área)"
                  className="w-9 h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-base border border-rose-500/40 flex items-center justify-center transition-all active:scale-90 shadow-md shadow-rose-950"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Remates Contra - Fora da Área */}
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-orange-500/30 flex items-center justify-between">
              <div className="min-w-0 pr-1">
                <span className="text-[10px] text-orange-300 uppercase font-mono block truncate font-bold">
                  🛡️ Fora da Área
                </span>
                <span className="text-lg font-black font-mono text-white">{shotsOutBoxAgainst}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onRemoveShotOutBoxAgainst && (
                  <button
                    onClick={onRemoveShotOutBoxAgainst}
                    title="Decrementar Remate Contra (Fora da Área)"
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotOutBoxAgainst}
                  title="Adicionar Remate Contra (Fora da Área)"
                  className="w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-base border border-orange-500/40 flex items-center justify-center transition-all active:scale-90 shadow-md shadow-orange-950"
                >
                  +1
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Contadores Rápidos com + e -: Cantos & Faltas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Cantos Favor */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚩 Cantos (Nós)</span>
            <span className="text-xl font-black font-mono text-cyan-400">{match.cantos || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveCorner && (
              <button
                onClick={onRemoveCorner}
                title="Decrementar Canto"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
              >
                -
              </button>
            )}
            <button
              onClick={onAddCorner}
              title="Adicionar Canto"
              className="w-9 h-9 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-black text-base border border-cyan-500/40 flex items-center justify-center transition-all active:scale-90"
            >
              +1
            </button>
          </div>
        </div>

        {/* Cantos Adv */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚩 Cantos (Adv)</span>
            <span className="text-xl font-black font-mono text-rose-400">{match.cantosAdv || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveOpponentCorner && (
              <button
                onClick={onRemoveOpponentCorner}
                title="Decrementar Canto Adv"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
              >
                -
              </button>
            )}
            <button
              onClick={onAddOpponentCorner}
              title="Adicionar Canto Adv"
              className="w-9 h-9 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-black text-base border border-rose-500/40 flex items-center justify-center transition-all active:scale-90"
            >
              +1
            </button>
          </div>
        </div>

        {/* Faltas Favor */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚨 Faltas (Nós)</span>
            <span className="text-xl font-black font-mono text-amber-400">{match.faltas || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveFoul && (
              <button
                onClick={onRemoveFoul}
                title="Decrementar Falta"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
              >
                -
              </button>
            )}
            <button
              onClick={onAddFoul}
              title="Adicionar Falta"
              className="w-9 h-9 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-black text-base border border-amber-500/40 flex items-center justify-center transition-all active:scale-90"
            >
              +1
            </button>
          </div>
        </div>

        {/* Faltas Adv */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚨 Faltas (Adv)</span>
            <span className="text-xl font-black font-mono text-slate-300">{match.faltasAdv || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveOpponentFoul && (
              <button
                onClick={onRemoveOpponentFoul}
                title="Decrementar Falta Adv"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm border border-slate-700 flex items-center justify-center transition-all active:scale-90"
              >
                -
              </button>
            )}
            <button
              onClick={onAddOpponentFoul}
              title="Adicionar Falta Adv"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-base border border-slate-700 flex items-center justify-center transition-all active:scale-90"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* 6. Mini Feed dos Últimos Golos do Jogo */}
      {recentGoals.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
            Últimos Golos Registados:
          </span>
          <div className="flex flex-wrap gap-2">
            {recentGoals.map((g, idx) => {
              const scorerPlayer = g.scorerId ? roster.find((p) => p.id === g.scorerId) : null;
              const scorerName = scorerPlayer ? scorerPlayer.name : g.scorer || (g.type === 'scored' ? 'Nossa Equipa' : match.opponent);
              return (
                <span
                  key={idx}
                  className={`text-xs px-2.5 py-1 rounded-xl font-mono flex items-center gap-1.5 border ${
                    g.type === 'scored'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <span>{g.type === 'scored' ? '⚽' : '🔴'}</span>
                  <span>{g.minute ? (String(g.minute).endsWith("'") ? g.minute : `${g.minute}'`) : '-'}</span>
                  <strong className="font-bold">{scorerName}</strong>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
