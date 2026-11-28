import React from 'react';
import { Icon } from '../../ui/Icon';
import { DateTimePT } from '../../ui/DateTimePT';
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
        <div className="flex items-center justify-between border-b border-ui-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-ui-body font-bold text-ui-text">
              {editingStaffId ? 'Editar indisponibilidade' : 'Indisponibilidade da equipa técnica'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowStaffModal(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
            aria-label="Fechar"
          >
            <Icon name="x" className="h-5 w-5 shrink-0" />
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
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
              Membro da equipa técnica <span className="text-ui-warning">*</span>
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
                <span className="text-ui-caption text-ui-muted">Sugestões</span>
                {state.staffMembers.slice(0, 4).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, name: member.name })}
                    className="ui-btn ui-btn-secondary min-h-8 px-2.5 text-ui-caption"
                  >
                    <Icon name="user" className="h-3.5 w-3.5 shrink-0" />
                    {member.name} ({member.role})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">
                Data de início <span className="text-ui-warning">*</span>
              </label>
              <DateTimePT
                type="date"
                label="Data"
                value={staffForm.date}
                onChange={(v) => setStaffForm({ ...staffForm, date: v })}
                inputClassName="ui-input w-full text-xs"
              />
            </div>

            <div>
              <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Data de fim (opcional)</label>
              <DateTimePT
                type="date"
                label="Data de fim"
                min={staffForm.date}
                value={staffForm.endDate || ''}
                onChange={(v) => setStaffForm({ ...staffForm, endDate: v })}
                inputClassName="ui-input w-full text-xs"
              />
              <span className="text-ui-caption text-ui-muted mt-1 block">
                Deixar vazio para indisponibilidade de apenas 1 dia
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-ui-caption font-semibold text-ui-muted block mb-1.5">Motivo (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Motivos profissionais, Formação UEFA, Pessoais..."
              value={staffForm.reason}
              onChange={(e) => setStaffForm({ ...staffForm, reason: e.target.value })}
              className="ui-input w-full text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-ui-line">
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
                <Icon name="trash" className="h-4 w-4 shrink-0" />
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
                className="ui-btn ui-btn-primary px-5 py-2.5 min-h-[44px] text-xs flex items-center gap-1.5"
              >
                {editingStaffId ? 'Guardar alterações' : 'Registar indisponibilidade'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
