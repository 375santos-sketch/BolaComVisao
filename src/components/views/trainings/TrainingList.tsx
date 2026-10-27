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
  onDuplicateTraining: (training: Training) => void;
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
  onDuplicateTraining,
  onOpenToday,
  onDeleteTraining,
  onClearAllTrainings,
  onShowToast
}) => {
  return (
    <div className="space-y-3.5 text-left">
      {/* Today's training first; new ones are less frequent */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenToday}
          className="ui-btn ui-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5"
        >
          ✓ Treino de hoje
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-secondary px-3 py-3 text-xs"
          aria-label="Inserir Treino Único"
          title="Inserir um treino"
          onClick={() => onOpenCreateForm('single')}
        >
          + Novo
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-secondary px-3 py-3 text-xs"
          aria-label="Adicionar Vários Treinos (Período)"
          title="Adicionar vários treinos de uma vez (período)"
          onClick={() => onOpenCreateForm('batch')}
        >
          + Vários
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

      {/* Trainings: what is coming, then what was done */}
      {trainings.length > 0 ? (
        <div className="space-y-4">
          {[
            ['Próximos', trainings.filter((tr) => tr.completed === false)],
            ['Feitos', trainings.filter((tr) => tr.completed !== false)]
          ].map(([label, group]) =>
            (group as typeof trainings).length === 0 ? null : (
              <section key={label as string} aria-label={label as string}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label as string}</h3>
                <div className="space-y-2">
                  {(group as typeof trainings).map((tr) => (
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
                      onDuplicateTraining={onDuplicateTraining}
                      onOpenEditForm={onOpenEditForm}
                      onDeleteTraining={onDeleteTraining}
                      onShowToast={onShowToast}
                    />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      ) : (
        <div className="ui-card py-12 text-center p-6">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-slate-200 font-bold">
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
              className="ui-btn ui-btn-soft px-4 py-2 text-xs"
            >
              📅 Adicionar Vários Treinos (Período)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
