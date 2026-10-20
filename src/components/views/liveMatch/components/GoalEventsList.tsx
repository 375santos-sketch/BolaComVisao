import React from 'react';
import { GoalEvent, Player } from '../../../../types';
import { playerLabel } from '../../../../lib/utils';

interface GoalEventsListProps {
  goals: GoalEvent[];
  roster: Player[];
  onEditGoal: (goal: GoalEvent) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalEventsList: React.FC<GoalEventsListProps> = ({ goals, roster, onEditGoal, onDeleteGoal }) => {
  const scoredGoals = goals.filter((g) => g.type === 'scored');

  const getPlayerName = (id: string | null) => {
    if (!id || id === 'none') return 'Sem assistência';
    if (id === 'autogolo' || id === 'auto_golo') return 'Auto Golo';
    const p = roster.find((x) => x.id === id);
    return p ? playerLabel(p, 'Sem nome') : '—';
  };

  if (scoredGoals.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-center text-sm text-slate-500">
        Nenhum golo marcado registado neste jogo.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scoredGoals.map((g) => {
        const isAutoGolo = g.scorerId === 'autogolo';
        const scorerName = isAutoGolo ? 'Auto Golo' : getPlayerName(g.scorerId);
        const assistName = g.assistId ? getPlayerName(g.assistId) : null;

        return (
          <div
            key={g.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm">
                ⚽
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{scorerName}</span>
                  {g.minute && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
                      {String(g.minute).endsWith("'") ? g.minute : `${g.minute}'`}
                    </span>
                  )}
                  {g.period && <span className="text-[11px] text-slate-400 font-medium">({g.period})</span>}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px]">
                    {g.goalType || 'Bola jogada'}
                  </span>
                  {assistName && assistName !== 'Sem assistência' && (
                    <span>
                      👟 Assistência: <strong className="text-slate-300">{assistName}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditGoal(g)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteGoal(g.id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors text-xs"
                title="Remover"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
