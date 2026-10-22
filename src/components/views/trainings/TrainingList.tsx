import React from 'react';
import { AbsenceReason, AppState, Player, Training } from '../../../types';
import { t } from '../../../i18n/dict';
import { TrainingCard } from './TrainingCard';
import { TrainingFilters } from './TrainingFilters';
import { TrainingListFilter } from './hooks/useTrainingFilters';

interface TrainingListProps {
  state: AppState;
  trainings: Training[];
  eligiblePlayers: Player[];
  getPlayerName: (id: string) => string;
  listFilter: TrainingListFilter;
  setListFilter: (filter: TrainingListFilter) => void;
  listSearch: string;
  setListSearch: (search: string) => void;
  scheduledCount: number;
  completedCount: number;
  totalTrainings: number;
  expandedTraining: string | null;
  setExpandedTraining: (id: string | null) => void;
  onOpenCreateForm: (mode: 'single' | 'batch') => void;
  onOpenEditForm: (training: Training) => void;
  onSetStatus: (trainingId: string, completed: boolean) => void;
  onToggleComplete: (trainingId: string, currentCompleted: boolean) => void;
  onQuickToggleAbsence: (trainingId: string, playerId: string) => void;
  onSetAbsenceReason: (trainingId: string, playerId: string, reason: AbsenceReason | undefined) => void;
  onRepeatTraining: (trainingId: string) => void;
  onOpenToday: () => void;
  onDeleteTraining: (trainingId: string) => void;
  onClearAllTrainings: () => void;
  onShowToast: (msg: string) => void;
}

export const TrainingList: React.FC<TrainingListProps> = ({
  state,
  trainings,
  eligiblePlayers,
  getPlayerName,
  listFilter,
  setListFilter,
  listSearch,
  setListSearch,
  scheduledCount,
  completedCount,
  totalTrainings,
  expandedTraining,
  setExpandedTraining,
  onOpenCreateForm,
  onOpenEditForm,
  onSetStatus,
  onToggleComplete,
  onQuickToggleAbsence,
  onSetAbsenceReason,
  onRepeatTraining,
  onOpenToday,
  onDeleteTraining,
  onClearAllTrainings,
  onShowToast
}) => {
  return (
    <div className="space-y-3.5 text-left">
      {/* Today's training: attendance in a few taps */}
      <button
        type="button"
        onClick={onOpenToday}
        className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-['Chakra_Petch'] font-black text-base uppercase tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <span>✅</span>
        <span>Treino de hoje</span>
      </button>

      {/* Top Action Bar: Add Single Training + Batch Season Planner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          className="py-3 px-4 rounded-xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
          onClick={() => onOpenCreateForm('single')}
        >
          <span>+</span>
          <span>Inserir Treino Único</span>
        </button>

        <button
          type="button"
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-slate-900 via-cyan-950/60 to-slate-900 hover:border-cyan-400 border border-cyan-500/40 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
          onClick={() => onOpenCreateForm('batch')}
        >
          <span>📅</span>
          <span>Adicionar Vários Treinos (Período)</span>
        </button>
      </div>

      {/* Quick Filter Bar */}
      <TrainingFilters
        listFilter={listFilter}
        setListFilter={setListFilter}
        listSearch={listSearch}
        setListSearch={setListSearch}
        scheduledCount={scheduledCount}
        completedCount={completedCount}
        totalTrainings={totalTrainings}
        displayedCount={trainings.length}
        onClearAllTrainings={onClearAllTrainings}
      />

      {/* Trainings Cards List */}
      {trainings.length > 0 ? (
        <div className="space-y-2.5">
          {trainings.map((tr) => (
            <TrainingCard
              key={tr.id}
              training={tr}
              state={state}
              eligiblePlayers={eligiblePlayers}
              getPlayerName={getPlayerName}
              isExpanded={expandedTraining === tr.id}
              onToggleExpand={() => setExpandedTraining(expandedTraining === tr.id ? null : tr.id)}
              onSetStatus={onSetStatus}
              onToggleComplete={onToggleComplete}
              onQuickToggleAbsence={onQuickToggleAbsence}
              onSetAbsenceReason={onSetAbsenceReason}
              onRepeatTraining={onRepeatTraining}
              onOpenEditForm={onOpenEditForm}
              onDeleteTraining={onDeleteTraining}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 p-6">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-['Chakra_Petch'] text-cyan-300 uppercase font-bold">
            {(state.trainings || []).length === 0
              ? t(state.lang, 'tr_none')
              : 'Nenhum treino encontrado com os filtros selecionados.'}
          </p>
          <p className="text-xs font-mono text-slate-500 mt-1 mb-4">
            Podes inserir cada treino individualmente ou usar o gerador de época para agendar todos os treinos de uma
            vez.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button type="button" onClick={() => onOpenCreateForm('single')} className="btn btn-gold text-xs px-4 py-2">
              + Inserir Treino Único
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateForm('batch')}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase hover:border-cyan-300 transition-all"
            >
              📅 Adicionar Vários Treinos (Período)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
