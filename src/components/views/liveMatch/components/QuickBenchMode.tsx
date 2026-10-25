import React, { useState } from 'react';
import { GoalEvent, Match, Player } from '../../../../types';
import { getCurrentPlayersOnPitch, getMatchPhase } from '../../../../lib/matchPhaseUtils';
import { playerLabel } from '../../../../lib/utils';

interface QuickBenchModeProps {
  match: Match;
  myClubName: string;
  roster: Player[];
  onQuickGoalScored: () => void;
  onQuickGoalConceded: () => void;
  onQuickSub: () => void;
  onQuickCard: () => void;
  /** One-tap goal: registers a goal by this athlete at the clock's minute (returns it, for "Desfazer"). */
  onQuickGoalBy?: (playerId: string) => GoalEvent | null;
  onUndoGoal?: (goalId: string) => void;
  onEditGoal?: (goal: GoalEvent) => void;
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
  onQuickGoalBy,
  onUndoGoal,
  onEditGoal,
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

  // One-tap goal: athletes on the pitch right now, and the last goal registered this way (to undo or complete it)
  const [lastQuick, setLastQuick] = useState<GoalEvent | null>(null);
  const phase = getMatchPhase(match);
  const playing = phase === 'parte1' || phase === 'parte2';
  const onPitchIds = playing ? getCurrentPlayersOnPitch(match) : [];
  const onPitch = onPitchIds
    .map((id) => roster.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p))
    .sort((a, b) => (Number(a.number) || 99) - (Number(b.number) || 99));
  const lastStillThere = lastQuick && (match.goals || []).some((g) => g.id === lastQuick.id) ? lastQuick : null;
  const nameOf = (id: string | null) => {
    const p = roster.find((x) => x.id === id);
    return p ? playerLabel(p) : 'Atleta';
  };

  // Lista dos últimos acontecimentos (últimos 3 golos/cartões)
  const recentGoals = [...(match.goals || [])].reverse().slice(0, 3);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Placar Rápido Minimalista */}
      <div className="ui-card p-4 sm:p-5 flex items-center justify-between">
        <div className="flex-1 text-center">
          <span className="text-[11px] text-slate-400 font-mono uppercase block truncate max-w-[130px] sm:max-w-none mx-auto">
            {myClubName}
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-400 mt-0.5">{scoredCount}</div>
        </div>

        <div className="px-3 text-xl font-mono text-slate-600 font-bold">—</div>

        <div className="flex-1 text-center">
          <span className="text-[11px] text-slate-400 font-mono uppercase block truncate max-w-[130px] sm:max-w-none mx-auto">
            {match.opponent || 'Adversário'}
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-rose-400 mt-0.5">{concededCount}</div>
        </div>
      </div>

      {/* 2. Botões de Ação Principal em Toque Único (Golos) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickGoalScored}
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span className="text-2xl">⚽</span>
          <span>+1 Golo Marcado</span>
        </button>

        <button
          onClick={onQuickGoalConceded}
          className="p-4 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <span className="text-2xl">🔴</span>
          <span>+1 Golo Sofrido</span>
        </button>
      </div>

      {/* 2.1 Golo com um toque: tocar em quem marcou */}
      {onQuickGoalBy && playing && onPitch.length > 0 && (
        <section aria-label="Golo com um toque" className="ui-card p-3 space-y-2">
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-['Chakra_Petch']">
            ⚽ Golo com um toque · toque em quem marcou
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {onPitch.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const goal = onQuickGoalBy(p.id);
                  if (goal) setLastQuick(goal);
                }}
                className="ui-btn ui-btn-soft-success px-2 py-2.5 text-xs truncate"
              >
                {playerLabel(p)}
              </button>
            ))}
          </div>
          {lastStillThere && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-[11px] text-emerald-100"
            >
              <span className="truncate">
                ✓ Golo de {nameOf(lastStillThere.scorerId)}
                {lastStillThere.minute ? ` aos ${lastStillThere.minute}` : ''}
              </span>
              <span className="flex gap-1.5 shrink-0">
                {onEditGoal && (
                  <button
                    type="button"
                    onClick={() => onEditGoal(lastStillThere)}
                    className="ui-btn ui-btn-soft-success px-2 py-1"
                  >
                    Assistência/origem
                  </button>
                )}
                {onUndoGoal && (
                  <button
                    type="button"
                    onClick={() => {
                      onUndoGoal(lastStillThere.id);
                      setLastQuick(null);
                    }}
                    className="ui-btn ui-btn-soft-danger px-2 py-1"
                  >
                    Desfazer
                  </button>
                )}
              </span>
            </div>
          )}
        </section>
      )}

      {/* 3. Ações de Banco: Substituição e Cartão */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickSub}
          className="ui-btn ui-btn-soft p-3.5 text-xs flex flex-col items-center justify-center gap-1"
        >
          <span className="text-xl">🔄</span>
          <span>Substituição</span>
        </button>

        <button
          onClick={onQuickCard}
          className="ui-btn ui-btn-soft-warning p-3.5 text-xs flex flex-col items-center justify-center gap-1"
        >
          <span className="text-xl">🟨</span>
          <span>Cartão</span>
        </button>
      </div>

      {/* 4. CONTADORES DE REMATES: A FAVOR E CONTRA (DENTRO E FORA DA ÁREA) */}
      <div className="ui-card p-4 space-y-3.5">
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
            <div className="ui-inset p-2.5 flex items-center justify-between">
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
                    className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotInBoxFor}
                  title="Adicionar Remate a Favor (Dentro da Área)"
                  className="ui-btn ui-btn-success w-9 h-9 text-base flex items-center justify-center"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Remates a Favor - Fora da Área */}
            <div className="ui-inset p-2.5 flex items-center justify-between">
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
                    className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotOutBoxFor}
                  title="Adicionar Remate a Favor (Fora da Área)"
                  className="ui-btn ui-btn-success w-9 h-9 text-base flex items-center justify-center"
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
            <div className="ui-inset p-2.5 flex items-center justify-between">
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
                    className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotInBoxAgainst}
                  title="Adicionar Remate Contra (Dentro da Área)"
                  className="ui-btn ui-btn-danger w-9 h-9 text-base flex items-center justify-center"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Remates Contra - Fora da Área */}
            <div className="ui-inset p-2.5 flex items-center justify-between">
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
                    className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                )}
                <button
                  onClick={onAddShotOutBoxAgainst}
                  title="Adicionar Remate Contra (Fora da Área)"
                  className="ui-btn ui-btn-warning w-9 h-9 text-base flex items-center justify-center"
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
        <div className="ui-card p-3 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚩 Cantos (Nós)</span>
            <span className="text-xl font-black font-mono text-cyan-400">{match.cantos || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveCorner && (
              <button
                onClick={onRemoveCorner}
                title="Decrementar Canto"
                className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
              >
                -
              </button>
            )}
            <button
              onClick={onAddCorner}
              title="Adicionar Canto"
              className="ui-btn ui-btn-soft w-9 h-9 text-base flex items-center justify-center"
            >
              +1
            </button>
          </div>
        </div>

        {/* Cantos Adv */}
        <div className="ui-card p-3 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚩 Cantos (Adv)</span>
            <span className="text-xl font-black font-mono text-rose-400">{match.cantosAdv || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveOpponentCorner && (
              <button
                onClick={onRemoveOpponentCorner}
                title="Decrementar Canto Adv"
                className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
              >
                -
              </button>
            )}
            <button
              onClick={onAddOpponentCorner}
              title="Adicionar Canto Adv"
              className="ui-btn ui-btn-soft-danger w-9 h-9 text-base flex items-center justify-center"
            >
              +1
            </button>
          </div>
        </div>

        {/* Faltas Favor */}
        <div className="ui-card p-3 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚨 Faltas (Nós)</span>
            <span className="text-xl font-black font-mono text-amber-400">{match.faltas || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveFoul && (
              <button
                onClick={onRemoveFoul}
                title="Decrementar Falta"
                className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
              >
                -
              </button>
            )}
            <button
              onClick={onAddFoul}
              title="Adicionar Falta"
              className="ui-btn ui-btn-soft-warning w-9 h-9 text-base flex items-center justify-center"
            >
              +1
            </button>
          </div>
        </div>

        {/* Faltas Adv */}
        <div className="ui-card p-3 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono block truncate">🚨 Faltas (Adv)</span>
            <span className="text-xl font-black font-mono text-slate-300">{match.faltasAdv || 0}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onRemoveOpponentFoul && (
              <button
                onClick={onRemoveOpponentFoul}
                title="Decrementar Falta Adv"
                className="ui-btn ui-btn-secondary w-8 h-8 text-sm flex items-center justify-center"
              >
                -
              </button>
            )}
            <button
              onClick={onAddOpponentFoul}
              title="Adicionar Falta Adv"
              className="ui-btn ui-btn-secondary w-9 h-9 text-base flex items-center justify-center"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      {/* 6. Mini Feed dos Últimos Golos do Jogo */}
      {recentGoals.length > 0 && (
        <div className="ui-inset p-3 space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
            Últimos Golos Registados:
          </span>
          <div className="flex flex-wrap gap-2">
            {recentGoals.map((g, idx) => {
              const scorerPlayer = g.scorerId ? roster.find((p) => p.id === g.scorerId) : null;
              const scorerName = scorerPlayer
                ? scorerPlayer.name
                : g.scorer || (g.type === 'scored' ? 'Nossa Equipa' : match.opponent);
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
