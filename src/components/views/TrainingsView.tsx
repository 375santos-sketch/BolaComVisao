import React, { useState } from 'react';
import { AppState, Training } from '../../types';
import { t } from '../../i18n/dict';
import { playerLabel, uid } from '../../lib/utils';
import { Header } from '../Header';
import { generateTrainingsStatsPDF } from '../../lib/pdfUtils';
import { exportSeasonStatsExcel } from '../../lib/exportUtils';
import { getNextTrainingNumber } from '../../lib/trainingNumbering';
import { TrainingFormData, TrainingsTab } from './trainings/types';
import { useTrainings } from './trainings/hooks/useTrainings';
import { useTrainingFilters } from './trainings/hooks/useTrainingFilters';
import { TrainingHeader } from './trainings/TrainingHeader';
import { ExerciseLibrary } from './trainings/ExerciseLibrary';
import { TrainingList } from './trainings/TrainingList';
import { TrainingAttendance } from './trainings/TrainingAttendance';
import { TrainingEditor } from './trainings/TrainingEditor';
import { TrainingBatchModal } from './trainings/TrainingBatchModal';
import { TodayTrainingModal } from './trainings/TodayTrainingModal';
import { addDaysISO, localDateISO, trainingForToday, withAttendance } from '../../lib/trainingQuick';
import { firstTrainingTime, teamSettings, trainingSlot } from '../../lib/teamSettings';

interface TrainingsViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
  initialTab?: TrainingsTab;
  /** Opens "Treino de hoje" straight away (shortcut on the home screen). */
  openToday?: boolean;
}

export const TrainingsView: React.FC<TrainingsViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowConfirm,
  onShowToast,
  initialTab = 'list',
  openToday = false
}) => {
  const [activeTab, setActiveTab] = useState<TrainingsTab>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  const [trainingForm, setTrainingForm] = useState<TrainingFormData | null>(null);
  const [creationMode, setCreationMode] = useState<'single' | 'batch'>('single');
  const [expandedTraining, setExpandedTraining] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [todayTraining, setTodayTraining] = useState<{ training: Training; isNew: boolean } | null>(() =>
    openToday
      ? trainingForToday(
          state.trainings || [],
          state.lastTrainingNumber,
          localDateISO(),
          trainingSlot(teamSettings(state), localDateISO())
        )
      : null
  );

  const {
    eligiblePlayers,
    totalTrainings,
    completedCount,
    scheduledCount,
    playerStats,
    teamAvgPct,
    topAttendant,
    handleQuickToggleAbsence,
    handleSetAbsenceReason,
    handleSaveTodayTraining,
    handleRepeatTraining,
    handleSetStatus,
    handleToggleComplete,
    handleDeleteTraining,
    handleBatchGenerated
  } = useTrainings(state, onUpdateState, onShowToast);

  const { listFilter, setListFilter, listSearch, setListSearch, filteredTrainingsList } = useTrainingFilters(
    state.trainings || []
  );

  const getPlayerName = (id: string) => {
    const p = (state.roster || []).find((x) => x.id === id);
    return p ? playerLabel(p) : 'Atleta';
  };

  // Pre-load training with an exercise drill from Library

  const handleOpenCreateForm = (mode: 'single' | 'batch') => {
    if (mode === 'batch') {
      setShowBatchModal(true);
      return;
    }

    setCreationMode('single');
    const today = localDateISO();
    const nextNumber = getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber);
    const slot = trainingSlot(teamSettings(state), today);
    setTrainingForm({
      trainingNumber: nextNumber,
      date: today,
      time: slot.time || firstTrainingTime(teamSettings(state)),
      location: '',
      type: '⚡ Tático',
      notes: '',
      absences: [],
      completed: false,
      durationMinutes: slot.durationMinutes,
      sessionObjective: '',
      sessionBlocks: []
    });
  };

  const handleOpenEditForm = (tr: Training) => {
    setCreationMode('single');
    setTrainingForm({
      id: tr.id,
      trainingNumber: tr.trainingNumber,
      date: tr.date,
      time: tr.time || '',
      location: tr.location || '',
      type: tr.type || '⚡ Tático',
      notes: tr.notes || '',
      absences: tr.absences || [],
      completed: tr.completed !== false,
      durationMinutes:
        tr.sessionPlan?.totalDurationMinutes || tr.durationMinutes || teamSettings(state).trainingMinutes,
      sessionObjective: tr.sessionPlan?.objective || '',
      sessionBlocks: tr.sessionPlan?.blocks ? [...tr.sessionPlan.blocks] : []
    });
  };

  // Duplicar: a new training with everything copied (plan, place, time, notes), one week later by default; the
  // coach changes the date and whatever else before saving
  const handleDuplicateTraining = (tr: Training) => {
    setCreationMode('single');
    let date = addDaysISO(tr.date, 7);
    while (date < localDateISO()) date = addDaysISO(date, 7);
    setTrainingForm({
      trainingNumber: getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber),
      date,
      time: tr.time || '',
      location: tr.location || '',
      type: tr.type || '⚡ Tático',
      notes: tr.notes || '',
      absences: [],
      completed: false,
      durationMinutes:
        tr.sessionPlan?.totalDurationMinutes || tr.durationMinutes || teamSettings(state).trainingMinutes,
      sessionObjective: tr.sessionPlan?.objective || '',
      sessionBlocks: (tr.sessionPlan?.blocks || []).map((b) => ({ ...b, id: uid() }))
    });
    onShowToast('📑 Cópia do treino aberta: muda a data e o que for preciso e guarda.');
  };

  const handleSaveTraining = (forceStatus?: boolean) => {
    if (!trainingForm) return;

    if (!trainingForm.date) {
      onShowToast('Por favor seleciona a data do treino.');
      return;
    }

    const finalCompleted = forceStatus !== undefined ? forceStatus : trainingForm.completed;

    let finalTrainingNumber: number;
    let newMaxNumber = state.lastTrainingNumber || 0;

    if (!trainingForm.id) {
      // New training: automatically assign next sequential number
      finalTrainingNumber = getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber);
      newMaxNumber = Math.max(newMaxNumber, finalTrainingNumber);
    } else {
      // Existing training: keep its permanent number
      const existing = (state.trainings || []).find((t) => t.id === trainingForm.id);
      finalTrainingNumber =
        existing?.trainingNumber ||
        trainingForm.trainingNumber ||
        getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber);
      newMaxNumber = Math.max(newMaxNumber, finalTrainingNumber);
    }

    const previous = trainingForm.id ? (state.trainings || []).find((t) => t.id === trainingForm.id) : undefined;
    const draft: Training = {
      id: trainingForm.id || uid(),
      trainingNumber: finalTrainingNumber,
      date: trainingForm.date,
      time: trainingForm.time || undefined,
      location: trainingForm.location || undefined,
      type: trainingForm.type || undefined,
      notes: trainingForm.notes || undefined,
      absences: trainingForm.absences,
      completed: finalCompleted,
      sessionPlan:
        trainingForm.sessionObjective || trainingForm.sessionBlocks.length > 0
          ? {
              objective: trainingForm.sessionObjective || undefined,
              totalDurationMinutes: trainingForm.durationMinutes || teamSettings(state).trainingMinutes,
              blocks: trainingForm.sessionBlocks
            }
          : undefined
    };
    // Absence reasons are set on the attendance grid: keep those of players still absent.
    const newTraining = withAttendance(draft, draft.absences, previous?.absenceReasons);

    let updated: Training[];
    if (trainingForm.id) {
      updated = (state.trainings || []).map((t) => (t.id === trainingForm.id ? newTraining : t));
      onShowToast(`Treino ${finalTrainingNumber ? `Nº ${finalTrainingNumber}` : ''} atualizado com sucesso! 💾`);
    } else {
      updated = [newTraining, ...(state.trainings || [])];
      onShowToast(
        finalCompleted
          ? `🎉 Treino ${finalTrainingNumber ? `Nº ${finalTrainingNumber}` : ''} registado e concluído!`
          : `📅 Treino ${finalTrainingNumber ? `Nº ${finalTrainingNumber}` : ''} agendado com sucesso!`
      );
    }

    onUpdateState({
      trainings: updated,
      lastTrainingNumber: newMaxNumber
    });
    setTrainingForm(null);
  };

  const handleExportPDF = () => {
    if (completedCount === 0) {
      onShowToast('Ainda não existem treinos concluídos para exportar no relatório.');
      return;
    }
    try {
      generateTrainingsStatsPDF(state);
      onShowToast('Relatório Oficial de Assiduidade em PDF gerado com sucesso! 📄');
    } catch {
      onShowToast('Erro ao gerar o PDF de assiduidade.');
    }
  };

  const handleExportExcel = () => {
    if (completedCount === 0) {
      onShowToast('Ainda não existem treinos concluídos para exportar.');
      return;
    }
    try {
      exportSeasonStatsExcel(state);
      onShowToast('Ficheiro Excel (.xlsx) exportado com sucesso! 📊');
    } catch {
      onShowToast('Erro ao exportar folha Excel.');
    }
  };

  // If Training Editor is active
  if (trainingForm) {
    return (
      <TrainingEditor
        trainingForm={trainingForm}
        setTrainingForm={setTrainingForm}
        state={state}
        onUpdateState={onUpdateState}
        onNavigate={onNavigate}
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        onShowToast={onShowToast}
        creationMode={creationMode}
        setCreationMode={setCreationMode}
        eligiblePlayers={eligiblePlayers}
        onSaveTraining={handleSaveTraining}
        onBatchGenerated={(newTrainings) => {
          handleBatchGenerated(newTrainings);
          setTrainingForm(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-28">
      <Header
        title={t(state.lang, 'tr_title')}
        lang={state.lang}
        currentTab="treinos"
        onNavigate={onNavigate}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
      />

      {/* Main Tab Segmented Switcher */}
      <TrainingHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTrainings={totalTrainings}
        completedCount={completedCount}
      />

      {activeTab === 'library' ? (
        <ExerciseLibrary
          exercises={state.exerciseLibrary || []}
          trainings={state.trainings || []}
          onSave={(exerciseLibrary) => onUpdateState({ exerciseLibrary })}
          onShowToast={onShowToast}
        />
      ) : activeTab === 'stats' ? (
        <TrainingAttendance
          state={state}
          completedCount={completedCount}
          scheduledCount={scheduledCount}
          teamAvgPct={teamAvgPct}
          topAttendant={topAttendant}
          playerStats={playerStats}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onGoToList={() => setActiveTab('list')}
        />
      ) : (
        <TrainingList
          state={state}
          trainings={filteredTrainingsList}
          eligiblePlayers={eligiblePlayers}
          getPlayerName={getPlayerName}
          listFilter={listFilter}
          setListFilter={setListFilter}
          listSearch={listSearch}
          setListSearch={setListSearch}
          scheduledCount={scheduledCount}
          completedCount={completedCount}
          totalTrainings={totalTrainings}
          expandedTraining={expandedTraining}
          setExpandedTraining={setExpandedTraining}
          onOpenCreateForm={handleOpenCreateForm}
          onOpenEditForm={handleOpenEditForm}
          onSetStatus={handleSetStatus}
          onToggleComplete={handleToggleComplete}
          onQuickToggleAbsence={handleQuickToggleAbsence}
          onSetAbsenceReason={handleSetAbsenceReason}
          onRepeatTraining={handleRepeatTraining}
          onDuplicateTraining={handleDuplicateTraining}
          onOpenToday={() =>
            setTodayTraining(
              trainingForToday(
                state.trainings || [],
                state.lastTrainingNumber,
                localDateISO(),
                trainingSlot(teamSettings(state), localDateISO())
              )
            )
          }
          onDeleteTraining={(id) => {
            onShowConfirm('Tens a certeza que queres eliminar este treino?', () => handleDeleteTraining(id));
          }}
          onClearAllTrainings={() => {
            onShowConfirm(`Tens a certeza que queres eliminar os ${totalTrainings} treinos desta equipa?`, () => {
              onUpdateState({ trainings: [] });
              onShowToast('Todos os treinos foram eliminados.');
            });
          }}
          onShowToast={onShowToast}
          onUpdateState={onUpdateState}
        />
      )}

      {todayTraining && (
        <TodayTrainingModal
          training={todayTraining.training}
          isNew={todayTraining.isNew}
          players={eligiblePlayers}
          onClose={() => setTodayTraining(null)}
          onSave={(training) => {
            handleSaveTodayTraining(training);
            setTodayTraining(null);
          }}
        />
      )}

      {/* BATCH SEASON PLANNER MODAL */}
      <TrainingBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        existingTrainings={state.trainings || []}
        trainingSchedule={teamSettings(state)}
        onGenerate={(newTrainings) => {
          handleBatchGenerated(newTrainings);
          setShowBatchModal(false);
        }}
      />
    </div>
  );
};
