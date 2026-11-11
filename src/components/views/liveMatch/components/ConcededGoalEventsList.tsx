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
      <div className="ui-card p-4 text-center text-sm text-ui-muted">
        Nenhum golo sofrido registado neste jogo (Baliza inviolada! 🧤).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {concededGoals.map((g) => (
        <div key={g.id} className="ui-card flex items-center justify-between p-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ui-danger/10 text-ui-danger font-bold flex items-center justify-center text-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ui-text text-sm">Golo de {opponentName || 'Adversário'}</span>
                {g.minute && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-ui-surface-2 text-ui-text font-mono font-medium">
                    {String(g.minute).endsWith("'") ? g.minute : `${g.minute}'`}
                  </span>
                )}
                {g.period && <span className="text-[11px] text-ui-muted font-medium">({g.period})</span>}
              </div>
              <div className="text-xs text-ui-muted flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-ui-danger-soft text-ui-danger border border-ui-danger/50 text-[10px]">
                  {g.goalType || 'Bola jogada'}
                </span>
                {g.notes && <span className="text-ui-muted italic truncate max-w-xs">{g.notes}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditGoal(g)}
              className="p-1.5 rounded-lg text-ui-muted hover:text-ui-text hover:bg-ui-surface-2 transition-colors text-xs"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => onDeleteGoal(g.id)}
              className="p-1.5 rounded-lg text-ui-danger hover:text-ui-danger hover:bg-ui-danger-soft transition-colors text-xs"
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
