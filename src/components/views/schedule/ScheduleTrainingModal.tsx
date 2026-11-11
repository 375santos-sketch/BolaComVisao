import React, { useState } from 'react';
import { DateTimePT } from '../../ui/DateTimePT';
import { TrainingFormData } from './types';
import { Training } from '../../../types';
import { BatchTrainingSection } from '../trainings/BatchTrainingSection';

interface ScheduleTrainingModalProps {
  showTrainingModal: boolean;
  setShowTrainingModal: (show: boolean) => void;
  editingTrainingId: string | null;
  trainingForm: TrainingFormData;
  setTrainingForm: React.Dispatch<React.SetStateAction<TrainingFormData>>;
  handleSaveTrainingModal: (markCompleted?: boolean) => void;
  existingTrainings?: Training[];
  onSaveBatchTrainings?: (newTrainings: Training[]) => void;
  handleDeleteTraining?: (id: string) => void;
  onShowConfirm?: (msg: string, cb: () => void) => void;
  trainingSchedule?: { trainingTimes: Record<string, string>; trainingMinutes: number };
}

export const ScheduleTrainingModal: React.FC<ScheduleTrainingModalProps> = ({
  showTrainingModal,
  setShowTrainingModal,
  editingTrainingId,
  trainingForm,
  setTrainingForm,
  handleSaveTrainingModal,
  existingTrainings = [],
  onSaveBatchTrainings,
  handleDeleteTraining,
  onShowConfirm,
  trainingSchedule
}) => {
  const [modalMode, setModalMode] = useState<'single' | 'batch'>('single');

  if (!showTrainingModal) return null;

  return (
    <div className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn text-left">
      <div className="bg-ui-surface border-t sm:border border-ui-warning/40 rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-ui-line flex items-center justify-between shrink-0 bg-ui-surface/95">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{modalMode === 'batch' ? '📅' : '⚡'}</span>
            <div>
              <h3 className="text-base sm:text-lg font-['Chakra_Petch'] font-black uppercase text-ui-text">
                {editingTrainingId
                  ? 'Editar Treino'
                  : modalMode === 'batch'
                    ? 'Adicionar Vários Treinos (Período)'
                    : 'Agendar Novo Treino'}
              </h3>
              <p className="text-[11px] font-mono text-ui-muted">
                {editingTrainingId
                  ? 'Alterar dados da sessão'
                  : modalMode === 'batch'
                    ? 'Gerar grelha por período, dias da semana e horários'
                    : 'Criar uma sessão individual de treino'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowTrainingModal(false)}
            className="ui-btn ui-btn-secondary w-8 h-8 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher when creating new */}
        {!editingTrainingId && (
          <div className="p-2 sm:px-5 bg-ui-inset/70 border-b border-ui-line shrink-0">
            <div className="ui-card grid grid-cols-2 gap-1.5 p-1">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'single'
                    ? 'bg-ui-warning text-ui-brand-ink shadow-md'
                    : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                <span>⚡</span>
                <span>Treino Único</span>
              </button>

              <button
                type="button"
                onClick={() => setModalMode('batch')}
                className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  modalMode === 'batch' ? 'bg-ui-brand text-ui-brand-ink shadow-md' : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                <span>📅</span>
                <span>Vários Treinos (Período)</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        {modalMode === 'batch' && !editingTrainingId ? (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain">
            <BatchTrainingSection
              isModal
              existingTrainings={existingTrainings}
              trainingSchedule={trainingSchedule}
              onGenerate={(newTrainings) => {
                if (onSaveBatchTrainings) {
                  onSaveBatchTrainings(newTrainings);
                }
              }}
              onCancel={() => setShowTrainingModal(false)}
            />
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-3 pb-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-ui-text block mb-1">Data *</label>
                  <DateTimePT
                    type="date"
                    label="Data do treino"
                    value={trainingForm.date}
                    onChange={(v) => setTrainingForm({ ...trainingForm, date: v })}
                    inputClassName="ui-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-ui-text block mb-1">Hora *</label>
                  <DateTimePT
                    type="time"
                    label="Hora do treino"
                    value={trainingForm.time}
                    onChange={(v) => setTrainingForm({ ...trainingForm, time: v })}
                    inputClassName="ui-input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-ui-text block mb-1">Tipo / Foco</label>
                  <select
                    value={trainingForm.type}
                    onChange={(e) => setTrainingForm({ ...trainingForm, type: e.target.value })}
                    className="ui-input w-full text-xs"
                  >
                    <option value="⚡ Tático">⚡ Tático</option>
                    <option value="🏃 Físico">🏃 Físico</option>
                    <option value="🎯 Técnico">🎯 Técnico</option>
                    <option value="🧠 Recuperação">🧠 Recuperação</option>
                    <option value="⚽ Jogo Treino">⚽ Jogo Treino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-ui-text block mb-1">Local</label>
                  <input
                    type="text"
                    placeholder="Ex: Campo Principal"
                    value={trainingForm.location}
                    onChange={(e) => setTrainingForm({ ...trainingForm, location: e.target.value })}
                    className="ui-input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-ui-text block mb-1">Objetivos, Exercícios e Notas</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Circulação de bola, transições defensivas e bolas paradas laterais..."
                  value={trainingForm.notes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                  className="ui-input w-full text-xs"
                />
              </div>

              {/* Status Selector */}
              <div className="ui-inset p-3">
                <span className="text-xs font-mono text-ui-muted block mb-2">Estado da Sessão:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrainingForm({ ...trainingForm, completed: false })}
                    className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                      !trainingForm.completed
                        ? 'bg-ui-warning text-ui-brand-ink shadow-md'
                        : 'bg-ui-surface text-ui-muted border border-ui-line'
                    }`}
                  >
                    🟡 Agendado / Planeado
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrainingForm({ ...trainingForm, completed: true })}
                    className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
                      trainingForm.completed
                        ? 'bg-ui-success text-ui-brand-ink shadow-md'
                        : 'bg-ui-surface text-ui-muted border border-ui-line'
                    }`}
                  >
                    🟢 Concluído (Estatísticas)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 bg-ui-inset/95 border-t border-ui-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
              {editingTrainingId && handleDeleteTraining && onShowConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    onShowConfirm('Tens a certeza que desejas eliminar este treino cancelado da agenda?', () => {
                      handleDeleteTraining(editingTrainingId);
                      setShowTrainingModal(false);
                    });
                  }}
                  className="ui-btn ui-btn-soft-danger px-4 py-2.5 min-h-[44px] text-xs flex items-center justify-center gap-1.5"
                  title="Eliminar este treino cancelado da agenda"
                >
                  <span>🗑️</span>
                  <span>Eliminar Treino (Cancelado)</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrainingModal(false)}
                  className="ui-btn ui-btn-secondary px-4 py-2.5 min-h-[44px] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTrainingModal(false)}
                  className="ui-btn ui-btn-soft-warning px-4 py-2.5 min-h-[44px] text-xs flex items-center justify-center"
                >
                  📅 Guardar como Agendado
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTrainingModal(true)}
                  className="ui-btn ui-btn-success px-4 py-2.5 min-h-[44px] text-xs flex items-center justify-center"
                >
                  ✅ Guardar & Concluir
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
