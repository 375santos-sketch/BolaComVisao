import { useMemo } from 'react';
import { AppState, Training } from '../../../../types';
import { sortPlayerObjs } from '../../../../lib/utils';
import { allocateBatchTrainingNumbers } from '../../../../lib/trainingNumbering';

export function useTrainings(
  state: AppState,
  onUpdateState: (updates: Partial<AppState>) => void,
  onShowToast: (msg: string) => void
) {
  const eligiblePlayers = useMemo(() => {
    return sortPlayerObjs((state.roster || []).filter((p) => p.active !== false));
  }, [state.roster]);

  const completedTrainings = useMemo(() => {
    return (state.trainings || []).filter((tr) => tr.completed !== false);
  }, [state.trainings]);

  const scheduledTrainings = useMemo(() => {
    return (state.trainings || []).filter((tr) => tr.completed === false);
  }, [state.trainings]);

  const totalTrainings = (state.trainings || []).length;
  const completedCount = completedTrainings.length;
  const scheduledCount = scheduledTrainings.length;

  const playerStats = useMemo(() => {
    return eligiblePlayers.map((p) => {
      const absences = completedTrainings.filter((tr) => (tr.absences || []).includes(p.id)).length;
      const presences = Math.max(0, completedCount - absences);
      const pct = completedCount > 0 ? Math.round((presences / completedCount) * 100) : 100;
      return {
        player: p,
        presences,
        absences,
        totalCompleted: completedCount,
        pct
      };
    });
  }, [eligiblePlayers, completedTrainings, completedCount]);

  const totalPresencesSum = useMemo(() => {
    return playerStats.reduce((sum, item) => sum + item.presences, 0);
  }, [playerStats]);

  const maxPossible = eligiblePlayers.length * completedCount;
  const teamAvgPct = maxPossible > 0 ? Math.round((totalPresencesSum / maxPossible) * 100) : 0;

  const topAttendant = useMemo(() => {
    return [...playerStats].sort((a, b) => b.pct - a.pct || b.presences - a.presences)[0];
  }, [playerStats]);

  // Quick inline toggle absence on card directly
  const handleQuickToggleAbsence = (trainingId: string, playerId: string) => {
    const updated = (state.trainings || []).map((tr) => {
      if (tr.id === trainingId) {
        const currentAbs = tr.absences || [];
        const isAbs = currentAbs.includes(playerId);
        const newAbs = isAbs ? currentAbs.filter((id) => id !== playerId) : [...currentAbs, playerId];
        return { ...tr, absences: newAbs };
      }
      return tr;
    });
    onUpdateState({ trainings: updated });
  };

  // Quick Direct Set Status on Card
  const handleSetStatus = (trainingId: string, completed: boolean) => {
    const updated = (state.trainings || []).map((tr) => {
      if (tr.id === trainingId) {
        return { ...tr, completed };
      }
      return tr;
    });

    onUpdateState({ trainings: updated });

    if (completed) {
      onShowToast('✓ Treino concluído! Agora contabilizado nas estatísticas de assiduidade.');
    } else {
      onShowToast('🟡 Treino marcado como agendado (fora das estatísticas até ser concluído).');
    }
  };

  const handleToggleComplete = (trainingId: string, currentCompleted: boolean) => {
    handleSetStatus(trainingId, !currentCompleted);
  };

  const handleDeleteTraining = (id: string) => {
    const updated = (state.trainings || []).filter((t) => t.id !== id);
    // Note: permanent numbering - lastTrainingNumber is preserved so future trainings keep incrementing
    onUpdateState({ trainings: updated });
    onShowToast('Treino eliminado com sucesso.');
  };

  const handleBatchGenerated = (newTrainings: Training[]) => {
    // Allocate sequential training numbers for the batch
    const { numbers, newMaxNumber } = allocateBatchTrainingNumbers(
      state.trainings || [],
      newTrainings.length,
      state.lastTrainingNumber
    );

    const numberedTrainings: Training[] = newTrainings.map((t, idx) => ({
      ...t,
      trainingNumber: t.trainingNumber || numbers[idx]
    }));

    const merged = [...numberedTrainings, ...(state.trainings || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    onUpdateState({
      trainings: merged,
      lastTrainingNumber: Math.max(state.lastTrainingNumber || 0, newMaxNumber)
    });
    onShowToast(`🎉 ${newTrainings.length} treinos adicionados com sucesso ao plano da época!`);
  };

  return {
    eligiblePlayers,
    completedTrainings,
    scheduledTrainings,
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
  };
}
