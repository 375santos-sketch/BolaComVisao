import React from 'react';
import { GoalEvent, Player, GoalType, MatchPeriod } from '../../../../types';
import { STANDARD_GOAL_TYPES } from '../../../../lib/gameAnalysis/constants';
import { playerLabel } from '../../../../lib/utils';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGoal: GoalEvent | null;
  eligiblePlayers: Player[];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <h3 className="text-lg font-bold text-white">
              {editingGoal ? 'Editar Golo Marcado' : 'Registar Golo Marcado'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* Marcador do Golo */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Marcador do Golo *
          </label>
          <select
            value={goalScorerId}
            onChange={(e) => setGoalScorerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="autogolo">⚠️ Auto Golo (Adversário)</option>
            <optgroup label="Plantel">
              {eligiblePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Assistência */}
        {!isAutoGolo && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Assistência (Passe decisivo)
            </label>
            <select
              value={goalAssistId}
              onChange={(e) => setGoalAssistId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="none">Sem assistência direta</option>
              <optgroup label="Plantel">
                {eligiblePlayers
                  .filter((p) => p.id !== goalScorerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {playerLabel(p, 'Sem nome')} {p.number ? `(#${p.number})` : ''}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* Tipo de Golo */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Origem / Tipo de Golo
          </label>
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Minuto *</label>
            {showSuggestedLabel && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
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
            className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white text-sm focus:outline-none ${
              !goalMinute.trim()
                ? 'border-slate-700 focus:border-emerald-500'
                : 'border-slate-700 focus:border-emerald-500'
            }`}
          />
          {!goalMinute.trim() && <p className="text-xs text-rose-400 mt-1">Indica o minuto</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!goalMinute.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all"
          >
            {editingGoal ? 'Guardar Alterações' : 'Confirmar Golo'}
          </button>
        </div>
      </div>
    </div>
  );
};
