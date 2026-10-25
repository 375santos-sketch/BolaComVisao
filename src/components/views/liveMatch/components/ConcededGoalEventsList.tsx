import React from 'react';
import { GoalEvent } from '../../../../types';

interface ConcededGoalEventsListProps {
  goals: GoalEvent[];
  opponentName: string;
  onEditGoal: (goal: GoalEvent) => void;
  onDeleteGoal: (id: string) => void;
}

export const ConcededGoalEventsList: React.FC<ConcededGoalEventsListProps> = ({
  goals,
  opponentName,
  onEditGoal,
  onDeleteGoal
}) => {
  const concededGoals = goals.filter((g) => g.type === 'conceded');

  if (concededGoals.length === 0) {
    return (
      <div className="ui-card p-4 text-center text-sm text-slate-500">
        Nenhum golo sofrido registado neste jogo (Baliza inviolada! 🧤).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {concededGoals.map((g) => (
        <div key={g.id} className="ui-card flex items-center justify-between p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 font-bold flex items-center justify-center text-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Golo de {opponentName || 'Adversário'}</span>
                {g.minute && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
                    {String(g.minute).endsWith("'") ? g.minute : `${g.minute}'`}
                  </span>
                )}
                {g.period && <span className="text-[11px] text-slate-400 font-medium">({g.period})</span>}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/50 text-[10px]">
                  {g.goalType || 'Bola jogada'}
                </span>
                {g.notes && <span className="text-slate-400 italic truncate max-w-xs">{g.notes}</span>}
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
      ))}
    </div>
  );
};
