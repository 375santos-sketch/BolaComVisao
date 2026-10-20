import React from 'react';
import { Training } from '../../../types';
import { BatchTrainingSection } from './BatchTrainingSection';

interface TrainingBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTrainings: Training[];
  onGenerate: (newTrainings: Training[]) => void;
}

export const TrainingBatchModal: React.FC<TrainingBatchModalProps> = ({
  isOpen,
  onClose,
  existingTrainings,
  onGenerate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-xl bg-slate-900 border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl shadow-[0_0_40px_rgba(0,210,255,0.25)] max-h-[92dvh] sm:max-h-[88dvh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-cyan-500/20 p-4 sm:p-5 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="font-['Chakra_Petch'] font-black text-base text-white uppercase tracking-wider">
                Adicionar Vários Treinos por Período
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Gera grelha completa de treinos por período, dias da semana e horários
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <BatchTrainingSection
            isModal
            existingTrainings={existingTrainings}
            onGenerate={onGenerate}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};
