import React from 'react';
import { GoalEvent, GoalType, MatchPeriod } from '../../../../types';
import { STANDARD_GOAL_TYPES } from '../../../../lib/gameAnalysis/constants';

interface ConcededGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingConcededGoal: GoalEvent | null;
  opponentName: string;
  concededMinute: string;
  setConcededMinute: (val: string) => void;
  suggestedMinute?: string | null;
  concededPeriod?: MatchPeriod;
  setConcededPeriod?: (val: MatchPeriod) => void;
  concededGoalType: GoalType;
  setConcededGoalType: (val: GoalType) => void;
  concededNotes: string;
  setConcededNotes: (val: string) => void;
  onSave: () => void;
}

export const ConcededGoalModal: React.FC<ConcededGoalModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <ConcededGoalModalInner {...props} />;
};

const ConcededGoalModalInner: React.FC<ConcededGoalModalProps> = ({
  onClose,
  editingConcededGoal,
  opponentName,
  concededMinute,
  setConcededMinute,
  suggestedMinute,
  concededGoalType,
  setConcededGoalType,
  concededNotes,
  setConcededNotes,
  onSave
}) => {
  const [isModified, setIsModified] = React.useState(false);

  const showSuggestedLabel =
    !editingConcededGoal &&
    !isModified &&
    Boolean(suggestedMinute) &&
    concededMinute.trim() === suggestedMinute?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-lg font-bold text-white">
              {editingConcededGoal ? 'Editar Golo Sofrido' : 'Registar Golo Sofrido'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 text-xs text-red-200">
          Golo marcado pelo adversário: <strong>{opponentName || 'Adversário'}</strong>
        </div>

        {/* Tipo de Golo Sofrido */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Origem / Tipo de Lance
          </label>
          <select
            value={concededGoalType}
            onChange={(e) => setConcededGoalType(e.target.value as GoalType)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Minuto *
            </label>
            {showSuggestedLabel && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span>🕒</span>
                <span>sugerido pelo relógio</span>
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="ex: 34"
            value={concededMinute}
            onChange={(e) => {
              setConcededMinute(e.target.value);
              setIsModified(true);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
          />
          {!concededMinute.trim() && (
            <p className="text-xs text-rose-400 mt-1">Indica o minuto</p>
          )}
        </div>

        {/* Observações / Notas do Lance */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Análise Tática / Observações (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="ex: Perda em zona 2, desatenção na marcação ao 2º poste..."
            value={concededNotes}
            onChange={(e) => setConcededNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
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
            disabled={!concededMinute.trim()}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-all"
          >
            {editingConcededGoal ? 'Guardar Alterações' : 'Confirmar Golo Sofrido'}
          </button>
        </div>
      </div>
    </div>
  );
};
