import React from 'react';
import { StaffFormData } from './types';
import { AppState } from '../../../types';

interface ScheduleStaffModalProps {
  showStaffModal: boolean;
  setShowStaffModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingStaffId: string | null;
  staffForm: StaffFormData;
  setStaffForm: React.Dispatch<React.SetStateAction<StaffFormData>>;
  state: AppState;
  handleSaveStaffModal: () => void;
  handleDeleteStaff?: (id: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
}

export const ScheduleStaffModal: React.FC<ScheduleStaffModalProps> = ({
  showStaffModal,
  setShowStaffModal,
  editingStaffId,
  staffForm,
  setStaffForm,
  state,
  handleSaveStaffModal,
  handleDeleteStaff,
  onShowConfirm
}) => {
  if (!showStaffModal) return null;

  return (
    <div className="ui-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ui-card max-w-lg w-full p-5 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚫</span>
            <h3 className="text-base font-black text-white font-['Chakra_Petch']">
              {editingStaffId ? 'Editar Indisponibilidade' : 'Registar Indisponibilidade de Equipa Técnica'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowStaffModal(false)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveStaffModal();
          }}
          className="space-y-4"
        >
          {/* Member Name */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5">
              Membro da Equipa Técnica <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Treinador Principal, Treinador Adjunto..."
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className="ui-input w-full text-sm"
              autoFocus
            />

            {/* Quick Suggestions from Staff Members if available */}
            {state.staffMembers && state.staffMembers.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">Sugestões:</span>
                {state.staffMembers.slice(0, 4).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, name: member.name })}
                    className="ui-btn ui-btn-secondary px-2 py-0.5 text-[10px]"
                  >
                    👤 {member.name} ({member.role})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">
                Data de Início <span className="text-orange-400">*</span>
              </label>
              <input
                type="date"
                value={staffForm.date}
                onChange={(e) => setStaffForm({ ...staffForm, date: e.target.value })}
                className="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5">Data de Fim (Opcional)</label>
              <input
                type="date"
                min={staffForm.date}
                value={staffForm.endDate}
                onChange={(e) => setStaffForm({ ...staffForm, endDate: e.target.value })}
                className="ui-input w-full text-xs"
              />
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                Deixar vazio para indisponibilidade de apenas 1 dia
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5">Motivo / Justificação (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Motivos profissionais, Formação UEFA, Pessoais..."
              value={staffForm.reason}
              onChange={(e) => setStaffForm({ ...staffForm, reason: e.target.value })}
              className="ui-input w-full text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
            {editingStaffId && handleDeleteStaff && onShowConfirm ? (
              <button
                type="button"
                onClick={() => {
                  onShowConfirm(
                    `Tens a certeza que desejas eliminar a indisponibilidade de ${staffForm.name || 'membro da equipa técnica'}?`,
                    () => {
                      handleDeleteStaff(editingStaffId);
                      setShowStaffModal(false);
                    }
                  );
                }}
                className="ui-btn ui-btn-soft-danger px-4 py-2 min-h-[40px] text-xs flex items-center gap-1.5"
                title="Eliminar indisponibilidade"
              >
                <span>🗑️</span>
                <span>Eliminar Indisponibilidade</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="ui-btn ui-btn-secondary px-4 py-2 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white text-xs font-['Chakra_Petch'] font-black uppercase transition-all"
              >
                {editingStaffId ? 'Guardar Alterações' : 'Registar Indisponibilidade'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
