import React from 'react';
import { GoalEvent, Player, GoalType, MatchPeriod } from '../../../../types';
import { STANDARD_GOAL_TYPES } from '../../../../lib/gameAnalysis/constants';
import { PlayerOptions } from './PlayerOptions';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal: GoalEvent | null;
  eligiblePlayers: Player[];
  onPitchIds?: string[];
  goalMinute: string;
  setGoalMinute: (val: string) => void;
  suggestedMinute?: string | null;
  goalPeriod?: MatchPeriod;
  setGoalPeriod?: (val: MatchPeriod) => void;
  goalScorerId: string;
  setGoalScorerId: (val: string) => void;
  goalAssistId: string;
  setGoalAssistId: (val: string) => void;
  goalType: GoalType;
  setGoalType: (val: GoalType) => void;
  onSave: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <GoalModalInner {...props} />;
};

const GoalModalInner: React.FC<GoalModalProps> = ({
  onClose,
  editingGoal,
  eligiblePlayers,
  onPitchIds,
  goalMinute,
  setGoalMinute,
  suggestedMinute,
  goalScorerId,
  setGoalScorerId,
  goalAssistId,
  setGoalAssistId,
  goalType,
  setGoalType,
  onSave
}) => {
  const [isModified, setIsModified] = React.useState(false);

  const isAutoGolo = goalScorerId === 'autogolo';
  const showSuggestedLabel =
    !editingGoal && !isModified && Boolean(suggestedMinute) && goalMinute.trim() === suggestedMinute?.trim();

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="ui-card max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ui-line">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <h3 className="text-lg font-bold text-ui-text">
              {editingGoal ? 'Editar Golo Marcado' : 'Registar Golo Marcado'}
            </h3>
          </div>
          <button onClick={onClose} className="text-ui-muted hover:text-ui-text text-xl">
            ✕
          </button>
        </div>

        {/* Marcador do Golo */}
        <div>
          <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider mb-1.5">
            Marcador do Golo *
          </label>
          <select
            value={goalScorerId}
            onChange={(e) => setGoalScorerId(e.target.value)}
            className="ui-input w-full text-sm"
          >
            <option value="autogolo">⚠️ Auto Golo (Adversário)</option>
            <PlayerOptions players={eligiblePlayers} onPitchIds={onPitchIds} />
          </select>
        </div>

        {/* Assistência */}
        {!isAutoGolo && (
          <div>
            <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider mb-1.5">
              Assistência (Passe decisivo)
            </label>
            <select
              value={goalAssistId}
              onChange={(e) => setGoalAssistId(e.target.value)}
              className="ui-input w-full text-sm"
            >
              <option value="none">Sem assistência direta</option>
              <PlayerOptions players={eligiblePlayers.filter((p) => p.id !== goalScorerId)} onPitchIds={onPitchIds} />
            </select>
          </div>
        )}

        {/* Tipo de Golo */}
        <div>
          <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider mb-1.5">
            Origem / Tipo de Golo
          </label>
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
            className="ui-input w-full text-sm"
          >
            {STANDARD_GOAL_TYPES.map((gt) => (
              <option key={gt} value={gt}>
                {gt}
              </option>
            ))}
          </select>
        </div>

        {/* Minuto */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-ui-text uppercase tracking-wider">Minuto *</label>
            {showSuggestedLabel && (
              <span className="text-[10px] text-ui-success font-mono flex items-center gap-1">
                <span>🕒</span>
                <span>sugerido pelo relógio</span>
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="ex: 23 ou 45+2"
            value={goalMinute}
            onChange={(e) => {
              setGoalMinute(e.target.value);
              setIsModified(true);
            }}
            className={`w-full bg-ui-inset border rounded-xl px-3 py-2 text-ui-text text-sm focus:outline-none ${
              !goalMinute.trim()
                ? 'border-ui-line-strong focus:border-ui-success'
                : 'border-ui-line-strong focus:border-ui-success'
            }`}
          />
          {!goalMinute.trim() && <p className="text-xs text-ui-danger mt-1">Indica o minuto</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-line">
          <button onClick={onClose} className="ui-btn ui-btn-secondary px-4 py-2 text-sm">
            Cancelar
          </button>
          <button onClick={onSave} disabled={!goalMinute.trim()} className="ui-btn ui-btn-success px-5 py-2 text-sm">
            {editingGoal ? 'Guardar Alterações' : 'Confirmar Golo'}
          </button>
        </div>
      </div>
    </div>
  );
};
