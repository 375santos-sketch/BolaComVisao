import React, { useState, useEffect } from 'react';
import { AppState, Exercise, Training } from '../../types';
import { t } from '../../i18n/dict';
import { playerLabel, uid } from '../../lib/utils';
import { Header } from '../Header';
import { generateTrainingsStatsPDF } from '../../lib/pdfUtils';
import { exportSeasonStatsExcel } from '../../lib/exportUtils';
import { ExerciseLibrarySection } from './trainings/ExerciseLibrarySection';
import { getAllPDFDocuments } from '../../lib/pdfLibraryDB';
import { getNextTrainingNumber } from '../../lib/trainingNumbering';
import { TrainingFormData, TrainingsTab } from './trainings/types';
import { useTrainings } from './trainings/hooks/useTrainings';
import { useTrainingFilters } from './trainings/hooks/useTrainingFilters';
import { TrainingHeader } from './trainings/TrainingHeader';
import { TrainingList } from './trainings/TrainingList';
import { TrainingAttendance } from './trainings/TrainingAttendance';
import { TrainingEditor } from './trainings/TrainingEditor';
import { TrainingBatchModal } from './trainings/TrainingBatchModal';

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
  initialTab = 'list'
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
  const [pdfLibraryCount, setPdfLibraryCount] = useState<number>(0);

  useEffect(() => {
    getAllPDFDocuments()
      .then((docs) => setPdfLibraryCount(docs.length))
      .catch(() => {});
  }, [activeTab]);

  const {
    eligiblePlayers,
    totalTrainings,
    completedCount,
    scheduledCount,
    playerStats,
    teamAvgPct,
    topAttendant,
    handleQuickToggleAbsence,
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
  const handleCreateTrainingWithExercise = (exercise: Exercise) => {
    const block = {
      id: uid(),
      exerciseId: exercise.id,
      title: exercise.name,
      category: exercise.category,
      durationMinutes: exercise.durationMinutes || 15,
      notes: exercise.description || exercise.tacticalObjectives || ''
    };

    const today = new Date().toISOString().split('T')[0];
    const typeMap: Record<string, string> = {
      aquecimento: '🎯 Geral',
      tecnica: '⚽ Técnico / Finalização',
      tatica: '⚡ Tático',
      jogo: '🏆 Jogo-Treino',
      bolas_paradas: '🛡️ Bolas Paradas',
      fisico: '🏃 Físico / Condição'
    };

    setCreationMode('single');
    setTrainingForm({
      date: today,
      time: '19:00',
      location: '',
      type: (exercise.category && typeMap[exercise.category]) || '⚡ Tático',
      notes: exercise.description ? `Foco: ${exercise.name}\n${exercise.description}` : `Foco: ${exercise.name}`,
      absences: [],
      completed: false,
      durationMinutes: 90,
      sessionObjective: exercise.tacticalObjectives || `Trabalho de ${exercise.name}`,
      sessionBlocks: [block]
    });
  };

  const handleOpenCreateForm = (mode: 'single' | 'batch') => {
    if (mode === 'batch') {
      setShowBatchModal(true);
      return;
    }

    setCreationMode('single');
    const today = new Date().toISOString().split('T')[0];
    const nextNumber = getNextTrainingNumber(state.trainings || [], state.lastTrainingNumber);
    setTrainingForm({
      trainingNumber: nextNumber,
      date: today,
      time: '19:00',
      location: '',
      type: '⚡ Tático',
      notes: '',
      absences: [],
      completed: false,
      durationMinutes: 90,
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
      durationMinutes: tr.sessionPlan?.totalDurationMinutes || 90,
      sessionObjective: tr.sessionPlan?.objective || '',
      sessionBlocks: tr.sessionPlan?.blocks ? [...tr.sessionPlan.blocks] : []
    });
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

    const newTraining: Training = {
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
              totalDurationMinutes: trainingForm.durationMinutes || 90,
              blocks: trainingForm.sessionBlocks
            }
          : undefined
    };

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
        title={activeTab === 'library' ? 'Biblioteca de Exercícios' : t(state.lang, 'tr_title')}
        lang={state.lang}
        currentTab={activeTab === 'library' ? 'biblioteca' : 'treinos'}
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
        pdfLibraryCount={pdfLibraryCount}
        completedCount={completedCount}
      />

      {activeTab === 'library' ? (
        <ExerciseLibrarySection
          state={state}
          onUpdateState={onUpdateState}
          onShowToast={onShowToast}
          onShowConfirm={onShowConfirm}
          onCreateTrainingWithExercise={handleCreateTrainingWithExercise}
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
        />
      )}

      {/* BATCH SEASON PLANNER MODAL */}
      <TrainingBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        existingTrainings={state.trainings || []}
        onGenerate={(newTrainings) => {
          handleBatchGenerated(newTrainings);
          setShowBatchModal(false);
        }}
      />
    </div>
  );
};
