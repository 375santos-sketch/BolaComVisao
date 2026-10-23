import { useState } from 'react';
import { AppState, Match, GoalEvent, CardEvent, SubEvent, GoalType, MatchPeriod } from '../../../../types';
import { uid, formatMinute, sortPlayerObjs, getMatchElapsedMs } from '../../../../lib/utils';
import { getLineupSize } from '../../../../lib/constants';
import {
  getMatchPhase,
  getMatchSquad,
  derivePeriodAndHalfFromPhase,
  getCurrentPlayersOnPitch,
  getPlayersAtEndOfFirstHalf,
  getNowTimestamp,
  getNowTimeString,
  getSuggestedMinute,
  getNominalHalfDuration,
  computeMinuteInHalf
} from '../../../../lib/matchPhaseUtils';

export interface UseLiveMatchProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast?: (msg: string) => void;
}

export function useLiveMatch({ state, onUpdateState, onShowToast }: UseLiveMatchProps) {
  // Current active match
  const match = state.matches.find((m) => !m.finished) || null;

  // Players called up for this match (whole active squad when there is no usable call-up)
  const eligiblePlayers = sortPlayerObjs(getMatchSquad(state.roster, match));
  // Default player for a new goal or card: the first one on the pitch (the whole squad before kick-off).
  const firstOnPitch = (): string => {
    const onPitch = match ? getCurrentPlayersOnPitch(match) : [];
    return (eligiblePlayers.find((p) => onPitch.includes(p.id)) || eligiblePlayers[0])?.id || '';
  };

  // 1. Goal Scored Modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalEvent | null>(null);
  const [goalMinute, setGoalMinute] = useState('');
  const [goalPeriod, setGoalPeriod] = useState<MatchPeriod>('1.ª parte');
  const [goalScorerId, setGoalScorerId] = useState('');
  const [goalAssistId, setGoalAssistId] = useState('none');
  const [goalType, setGoalType] = useState<GoalType>('Bola jogada');

  // 2. Conceded Goal Modal state
  const [showConcededModal, setShowConcededModal] = useState(false);
  const [editingConcededGoal, setEditingConcededGoal] = useState<GoalEvent | null>(null);
  const [concededMinute, setConcededMinute] = useState('');
  const [concededPeriod, setConcededPeriod] = useState<MatchPeriod>('1.ª parte');
  const [concededGoalType, setConcededGoalType] = useState<GoalType>('Bola jogada');
  const [concededNotes, setConcededNotes] = useState('');

  // 3. Substitution Modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<SubEvent | null>(null);
  const [subMinute, setSubMinute] = useState('');
  const [subPeriod, setSubPeriod] = useState<MatchPeriod>('2.ª parte');
  const [subOutId, setSubOutId] = useState('');
  const [subInId, setSubInId] = useState('');

  // 4. Card Modal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardEvent | null>(null);
  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardColor, setCardColor] = useState<'Amarelo' | 'Vermelho'>('Amarelo');
  const [cardMinute, setCardMinute] = useState('');
  const [cardPeriod, setCardPeriod] = useState<MatchPeriod>('1.ª parte');

  // 5. Captain and Finish Modals
  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const updateMatchInState = (updatedMatch: Match) => {
    const newMatches = state.matches.map((x) => (x.id === updatedMatch.id ? updatedMatch : x));
    onUpdateState({ matches: newMatches });
  };

  // Scored Goals Handlers
  const openAddGoalModal = () => {
    if (match && getMatchPhase(match) === 'intervalo') {
      if (onShowToast) onShowToast('⏸️ Durante o intervalo apenas são permitidas substituições.');
      return;
    }
    const currentPhase = getMatchPhase(match);
    const derived = derivePeriodAndHalfFromPhase(currentPhase);
    const suggested = getSuggestedMinute(match, state.category);
    setEditingGoal(null);
    setGoalMinute(suggested || '');
    setGoalPeriod(derived.period);
    setGoalScorerId(firstOnPitch() || 'autogolo');
    setGoalAssistId('none');
    setGoalType('Bola jogada');
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal: GoalEvent) => {
    setEditingGoal(goal);
    setGoalMinute(goal.minute ? String(goal.minute).replace("'", '') : '');
    setGoalPeriod((goal.period as MatchPeriod) || (goal.half === 2 ? '2.ª parte' : '1.ª parte'));
    setGoalScorerId(goal.scorerId || (eligiblePlayers.length > 0 ? eligiblePlayers[0].id : 'autogolo'));
    setGoalAssistId(goal.assistId || 'none');
    setGoalType((goal.goalType as GoalType) || 'Bola jogada');
    setShowGoalModal(true);
  };

  const handleSaveGoal = () => {
    if (!match) return;
    if (!goalScorerId) {
      if (onShowToast) onShowToast('Selecione o marcador do golo ou Auto Golo.');
      return;
    }

    const formattedMin = goalMinute.trim() ? formatMinute(goalMinute.trim()) : null;
    const isAutoGolo = goalScorerId === 'autogolo';
    const D = getNominalHalfDuration(match, state.category);

    if (editingGoal) {
      // Ao editar, mantém a parte/half que já tinha
      const finalPeriod = (editingGoal.period as MatchPeriod) || (editingGoal.half === 2 ? '2.ª parte' : '1.ª parte');
      const finalHalf: 1 | 2 = editingGoal.half || (finalPeriod === '2.ª parte' ? 2 : 1);
      const minInHalf = computeMinuteInHalf(goalMinute.trim(), finalHalf, D);

      const updatedGoals = match.goals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              scorerId: goalScorerId,
              assistId: isAutoGolo || goalAssistId === 'none' ? null : goalAssistId,
              minute: formattedMin,
              minuteBase: g.minuteBase || 'game',
              minuteInHalf: minInHalf,
              period: finalPeriod,
              half: finalHalf,
              goalType: goalType
            }
          : g
      );
      updateMatchInState({ ...match, goals: updatedGoals });
      if (onShowToast) onShowToast('Golo atualizado ✓');
    } else {
      // Novo registo: período e half derivados automaticamente de match.phase
      const currentPhase = getMatchPhase(match);
      const derived = derivePeriodAndHalfFromPhase(currentPhase);
      const finalPeriod = derived.period;
      const finalHalf = derived.half;
      const minInHalf = computeMinuteInHalf(goalMinute.trim(), finalHalf, D);

      const newGoal: GoalEvent = {
        id: uid(),
        type: 'scored',
        scorerId: goalScorerId,
        assistId: isAutoGolo || goalAssistId === 'none' ? null : goalAssistId,
        minute: formattedMin,
        minuteBase: 'game',
        minuteInHalf: minInHalf,
        period: finalPeriod,
        half: finalHalf,
        goalType: goalType
      };
      updateMatchInState({ ...match, goals: [...match.goals, newGoal] });
      if (onShowToast) onShowToast(isAutoGolo ? '⚽ Auto Golo registado!' : '⚽ Golo registado!');
    }

    setShowGoalModal(false);
    setEditingGoal(null);
  };

  /**
   * One-tap goal (quick mode): the scorer is the athlete tapped; minute and half come from the clock. Assist and
   * origin stay empty (the end-of-game checklist reminds to fill them). Returns the new goal so it can be undone.
   */
  const handleQuickGoalBy = (scorerId: string): GoalEvent | null => {
    if (!match) return null;
    const phase = getMatchPhase(match);
    if (phase !== 'parte1' && phase !== 'parte2') {
      if (onShowToast) onShowToast('O golo com um toque só funciona com o jogo a decorrer.');
      return null;
    }
    const { period, half } = derivePeriodAndHalfFromPhase(phase);
    const suggested = getSuggestedMinute(match, state.category) || '';
    const goal: GoalEvent = {
      id: uid(),
      type: 'scored',
      scorerId,
      assistId: null,
      minute: suggested ? formatMinute(suggested) : null,
      minuteBase: 'game',
      minuteInHalf: computeMinuteInHalf(suggested, half, getNominalHalfDuration(match, state.category)),
      period,
      half
    };
    updateMatchInState({ ...match, goals: [...match.goals, goal] });
    return goal;
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      goals: match.goals.filter((g) => g.id !== goalId)
    });
    if (onShowToast) onShowToast('Golo removido');
  };

  // Conceded Goals Handlers
  const openAddConcededModal = () => {
    if (match && getMatchPhase(match) === 'intervalo') {
      if (onShowToast) onShowToast('⏸️ Durante o intervalo apenas são permitidas substituições.');
      return;
    }
    const currentPhase = getMatchPhase(match);
    const derived = derivePeriodAndHalfFromPhase(currentPhase);
    const suggested = getSuggestedMinute(match, state.category);
    setEditingConcededGoal(null);
    setConcededMinute(suggested || '');
    setConcededPeriod(derived.period);
    setConcededGoalType('Bola jogada');
    setConcededNotes('');
    setShowConcededModal(true);
  };

  const openEditConcededModal = (goal: GoalEvent) => {
    setEditingConcededGoal(goal);
    setConcededMinute(goal.minute ? String(goal.minute).replace("'", '') : '');
    setConcededPeriod((goal.period as MatchPeriod) || (goal.half === 2 ? '2.ª parte' : '1.ª parte'));
    setConcededGoalType((goal.goalType as GoalType) || 'Bola jogada');
    setConcededNotes(goal.notes || '');
    setShowConcededModal(true);
  };

  const handleSaveConcededGoal = () => {
    if (!match) return;
    const formattedMin = concededMinute.trim() ? formatMinute(concededMinute.trim()) : null;
    const D = getNominalHalfDuration(match, state.category);

    if (editingConcededGoal) {
      // Ao editar, mantém a parte/half que já tinha
      const finalPeriod =
        (editingConcededGoal.period as MatchPeriod) || (editingConcededGoal.half === 2 ? '2.ª parte' : '1.ª parte');
      const finalHalf: 1 | 2 = editingConcededGoal.half || (finalPeriod === '2.ª parte' ? 2 : 1);
      const minInHalf = computeMinuteInHalf(concededMinute.trim(), finalHalf, D);

      const updatedGoals = match.goals.map((g) =>
        g.id === editingConcededGoal.id
          ? {
              ...g,
              minute: formattedMin,
              minuteBase: g.minuteBase || 'game',
              minuteInHalf: minInHalf,
              period: finalPeriod,
              half: finalHalf,
              goalType: concededGoalType,
              notes: concededNotes.trim() || undefined
            }
          : g
      );
      updateMatchInState({ ...match, goals: updatedGoals });
      if (onShowToast) onShowToast('Golo sofrido atualizado ✓');
    } else {
      // Novo registo: período e half derivados automaticamente de match.phase
      const currentPhase = getMatchPhase(match);
      const derived = derivePeriodAndHalfFromPhase(currentPhase);
      const finalPeriod = derived.period;
      const finalHalf = derived.half;
      const minInHalf = computeMinuteInHalf(concededMinute.trim(), finalHalf, D);

      const newGoal: GoalEvent = {
        id: uid(),
        type: 'conceded',
        scorerId: null,
        assistId: null,
        minute: formattedMin,
        minuteBase: 'game',
        minuteInHalf: minInHalf,
        period: finalPeriod,
        half: finalHalf,
        goalType: concededGoalType,
        notes: concededNotes.trim() || undefined
      };
      updateMatchInState({ ...match, goals: [...match.goals, newGoal] });
      if (onShowToast) onShowToast('🛡️ Golo sofrido registado.');
    }

    setShowConcededModal(false);
    setEditingConcededGoal(null);
  };

  const handleDeleteConcededGoal = (goalId: string) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      goals: match.goals.filter((g) => g.id !== goalId)
    });
    if (onShowToast) onShowToast('Golo sofrido removido');
  };

  // Substitution Handlers
  const openAddSubModal = () => {
    if (!match) return;
    const currentPhase = getMatchPhase(match);
    const onPitchIds = new Set(getCurrentPlayersOnPitch(match));
    const availableOut = eligiblePlayers.filter((p) => onPitchIds.has(p.id));
    const availableIn = eligiblePlayers.filter((p) => !onPitchIds.has(p.id));

    setEditingSub(null);
    if (currentPhase === 'intervalo') {
      setSubMinute('INT');
      setSubPeriod('Intervalo');
    } else {
      const derived = derivePeriodAndHalfFromPhase(currentPhase);
      const suggested = getSuggestedMinute(match, state.category);
      setSubMinute(suggested || '');
      setSubPeriod(derived.period);
    }

    setSubOutId(availableOut[0]?.id || eligiblePlayers[0]?.id || '');
    setSubInId(availableIn[0]?.id || eligiblePlayers[1]?.id || '');
    setShowSubModal(true);
  };

  const openEditSubModal = (sub: SubEvent) => {
    setEditingSub(sub);
    setSubMinute(sub.minute ? String(sub.minute).replace("'", '') : '');
    setSubPeriod((sub.period as MatchPeriod) || (sub.half === 2 ? '2.ª parte' : '1.ª parte'));
    setSubOutId(sub.outId);
    setSubInId(sub.inId);
    setShowSubModal(true);
  };

  const handleSaveBatchSubs = (
    pairs: Array<{ outId: string; inId: string }>,
    minuteVal: string,
    periodVal: MatchPeriod
  ) => {
    if (!match) return;
    const D = getNominalHalfDuration(match, state.category);

    if (editingSub) {
      const p = pairs[0];
      if (!p || !p.outId || !p.inId || p.outId === p.inId) {
        if (onShowToast) onShowToast('Selecione dois jogadores distintos.');
        return;
      }
      // Ao editar, mantém o período/half original a menos que tenha sido alterado explicitamente
      const isHalftime =
        periodVal === 'Intervalo' ||
        minuteVal.trim().toUpperCase() === 'INT' ||
        minuteVal.toLowerCase().includes('intervalo');
      const formattedMin = isHalftime ? 'INT' : minuteVal.trim() ? formatMinute(minuteVal.trim()) : null;
      const finalPeriod = (editingSub.period as MatchPeriod) || periodVal;
      const finalHalf: 1 | 2 = editingSub.half || (isHalftime ? 1 : finalPeriod === '2.ª parte' ? 2 : 1);
      const minInHalf = computeMinuteInHalf(minuteVal.trim(), finalHalf, D);

      const updatedSubs = (match.subs || []).map((s) =>
        s.id === editingSub.id
          ? {
              ...s,
              outId: p.outId,
              inId: p.inId,
              minute: formattedMin,
              minuteBase: s.minuteBase || 'game',
              minuteInHalf: minInHalf,
              period: finalPeriod,
              half: finalHalf,
              isHalftime: isHalftime || undefined
            }
          : s
      );
      updateMatchInState({ ...match, subs: updatedSubs });
      if (onShowToast) onShowToast('Substituição atualizada ✓');
    } else {
      if (!pairs || pairs.length === 0) {
        if (onShowToast) onShowToast('Adicione pelo menos uma substituição.');
        return;
      }

      for (let i = 0; i < pairs.length; i++) {
        const p = pairs[i];
        if (!p.outId || !p.inId) {
          if (onShowToast) onShowToast(`Preencha todos os campos da substituição #${i + 1}.`);
          return;
        }
        if (p.outId === p.inId) {
          if (onShowToast) onShowToast(`Na substituição #${i + 1}, o mesmo jogador não pode sair e entrar.`);
          return;
        }
      }

      const outs = pairs.map((p) => p.outId);
      const ins = pairs.map((p) => p.inId);
      if (new Set(outs).size !== outs.length) {
        if (onShowToast) onShowToast('O mesmo jogador não pode sair mais do que uma vez em simultâneo.');
        return;
      }
      if (new Set(ins).size !== ins.length) {
        if (onShowToast) onShowToast('O mesmo jogador não pode entrar mais do que uma vez em simultâneo.');
        return;
      }

      // Preenche period e half automaticamente a partir de match.phase
      const currentPhase = getMatchPhase(match);
      const isIntervaloPhase = currentPhase === 'intervalo';
      const derived = derivePeriodAndHalfFromPhase(currentPhase);

      const isHalftime = isIntervaloPhase || minuteVal.trim().toUpperCase() === 'INT';
      const formattedMin = isHalftime ? 'INT' : formatMinute(minuteVal.trim());
      const finalPeriod: MatchPeriod = isIntervaloPhase ? 'Intervalo' : derived.period;
      const finalHalf: 1 | 2 = isIntervaloPhase ? 1 : derived.half;
      const minInHalf = computeMinuteInHalf(minuteVal.trim(), finalHalf, D);

      const newSubs: SubEvent[] = pairs.map((p) => ({
        id: uid(),
        outId: p.outId,
        inId: p.inId,
        minute: formattedMin,
        minuteBase: 'game',
        minuteInHalf: minInHalf,
        period: finalPeriod,
        half: finalHalf,
        isHalftime: isHalftime || undefined
      }));

      updateMatchInState({ ...match, subs: [...(match.subs || []), ...newSubs] });
      if (onShowToast) {
        if (newSubs.length > 1) {
          onShowToast(`🔄 ${newSubs.length} substituições registadas em simultâneo!`);
        } else {
          onShowToast('🔄 Substituição registada!');
        }
      }
    }

    setShowSubModal(false);
    setEditingSub(null);
  };

  const handleSaveSub = () => {
    handleSaveBatchSubs([{ outId: subOutId, inId: subInId }], subMinute, subPeriod);
  };

  const handleDeleteSub = (subId: string) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      subs: (match.subs || []).filter((s) => s.id !== subId)
    });
    if (onShowToast) onShowToast('Substituição removida');
  };

  // Card Handlers
  const openAddCardModal = () => {
    if (match && getMatchPhase(match) === 'intervalo') {
      if (onShowToast) onShowToast('⏸️ Durante o intervalo apenas são permitidas substituições.');
      return;
    }
    const currentPhase = getMatchPhase(match);
    const derived = derivePeriodAndHalfFromPhase(currentPhase);
    const suggested = getSuggestedMinute(match, state.category);
    setEditingCard(null);
    setCardMinute(suggested || '');
    setCardPeriod(derived.period);
    setCardPlayerId(firstOnPitch());
    setCardColor('Amarelo');
    setShowCardModal(true);
  };

  const openEditCardModal = (card: CardEvent) => {
    setEditingCard(card);
    setCardMinute(card.minute ? String(card.minute).replace("'", '') : '');
    setCardPeriod((card.period as MatchPeriod) || (card.half === 2 ? '2.ª parte' : '1.ª parte'));
    setCardPlayerId(card.playerId);
    setCardColor(card.color);
    setShowCardModal(true);
  };

  const handleSaveCard = () => {
    if (!match) return;
    if (!cardPlayerId) {
      if (onShowToast) onShowToast('Selecione o jogador sancionado.');
      return;
    }

    const formattedMin = cardMinute.trim() ? formatMinute(cardMinute.trim()) : null;
    const D = getNominalHalfDuration(match, state.category);

    if (editingCard) {
      // Ao editar, mantém a parte/half que já tinha
      const finalPeriod = (editingCard.period as MatchPeriod) || (editingCard.half === 2 ? '2.ª parte' : '1.ª parte');
      const finalHalf: 1 | 2 = editingCard.half || (finalPeriod === '2.ª parte' ? 2 : 1);
      const minInHalf = computeMinuteInHalf(cardMinute.trim(), finalHalf, D);

      const updatedCards = (match.cards || []).map((c) =>
        c.id === editingCard.id
          ? {
              ...c,
              playerId: cardPlayerId,
              color: cardColor,
              minute: formattedMin,
              minuteBase: c.minuteBase || 'game',
              minuteInHalf: minInHalf,
              period: finalPeriod,
              half: finalHalf
            }
          : c
      );
      updateMatchInState({ ...match, cards: updatedCards });
      if (onShowToast) onShowToast('Cartão disciplinar atualizado ✓');
    } else {
      // Novo registo: período e half derivados automaticamente de match.phase
      const currentPhase = getMatchPhase(match);
      const derived = derivePeriodAndHalfFromPhase(currentPhase);
      const finalPeriod = derived.period;
      const finalHalf = derived.half;
      const minInHalf = computeMinuteInHalf(cardMinute.trim(), finalHalf, D);

      const newCard: CardEvent = {
        id: uid(),
        playerId: cardPlayerId,
        color: cardColor,
        minute: formattedMin,
        minuteBase: 'game',
        minuteInHalf: minInHalf,
        period: finalPeriod,
        half: finalHalf
      };
      updateMatchInState({ ...match, cards: [...(match.cards || []), newCard] });
      if (onShowToast)
        onShowToast(cardColor === 'Vermelho' ? '🟥 Cartão Vermelho registado!' : '🟨 Cartão Amarelo registado!');
    }

    setShowCardModal(false);
    setEditingCard(null);
  };

  const handleDeleteCard = (cardId: string) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      cards: (match.cards || []).filter((c) => c.id !== cardId)
    });
    if (onShowToast) onShowToast('Cartão removido');
  };

  // Phase Transition & Lineup Handlers
  const handleUpdateLineup = (lineup7: string[]) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      lineup: lineup7
    });
    if (onShowToast) onShowToast('👥 Titulares da 1.ª parte guardados ✓');
  };

  const handleUpdateSecondHalfLineup = (lineup7: string[]) => {
    if (!match) return;
    updateMatchInState({
      ...match,
      lineupSecondHalf: lineup7
    });
    if (onShowToast) onShowToast('👥 Titulares da 2.ª parte guardados ✓');
  };

  const handleStartFirstHalf = (starting7?: string[]) => {
    if (!match) return;
    const lineupSize = getLineupSize(match);
    const finalLineup = starting7 || match.lineup || [];
    if (finalLineup.length !== lineupSize) {
      if (onShowToast)
        onShowToast(`⚠️ É obrigatório selecionar exatamente ${lineupSize} titulares para iniciar a 1.ª parte.`);
      return false;
    }

    const nowStr = getNowTimeString();
    const updatedTimer = match.timer
      ? {
          ...match.timer,
          isRunning: true,
          lastStartTs: getNowTimestamp()
        }
      : {
          isRunning: true,
          elapsedMs: 0,
          lastStartTs: getNowTimestamp()
        };

    updateMatchInState({
      ...match,
      lineup: finalLineup,
      matchPhase: 'parte1',
      timer: updatedTimer,
      timeline: {
        ...(match.timeline || {}),
        kickoff: match.timeline?.kickoff || nowStr
      }
    });

    if (onShowToast) onShowToast('🏁 1.ª Parte iniciada!');
    return true;
  };

  const handleGoToHalftime = () => {
    if (!match) return;
    const nowStr = getNowTimeString();
    const elapsed = getMatchElapsedMs(match);
    const updatedTimer = match.timer
      ? {
          ...match.timer,
          isRunning: false,
          elapsedMs: elapsed,
          lastStartTs: null,
          half1DurationMs: elapsed
        }
      : {
          isRunning: false,
          elapsedMs: 0,
          lastStartTs: null,
          half1DurationMs: 0
        };

    updateMatchInState({
      ...match,
      matchPhase: 'intervalo',
      timer: updatedTimer,
      timeline: {
        ...(match.timeline || {}),
        halftime: match.timeline?.halftime || nowStr
      }
    });

    if (onShowToast) onShowToast('⏸️ Intervalo iniciado!');
  };

  const handleStartSecondHalf = (secondHalf7: string[]) => {
    if (!match) return;
    const lineupSize = getLineupSize(match);
    if (secondHalf7.length !== lineupSize) {
      if (onShowToast) onShowToast(`⚠️ É obrigatório selecionar exatamente ${lineupSize} titulares para a 2.ª parte.`);
      return false;
    }

    const nowStr = getNowTimeString();
    const updatedTimer = match.timer
      ? {
          ...match.timer,
          isRunning: true,
          lastStartTs: getNowTimestamp()
        }
      : {
          isRunning: true,
          elapsedMs: match.timer?.elapsedMs || 0,
          lastStartTs: getNowTimestamp()
        };

    updateMatchInState({
      ...match,
      lineupSecondHalf: secondHalf7,
      matchPhase: 'parte2',
      timer: updatedTimer,
      timeline: {
        ...(match.timeline || {}),
        secondHalfStart: match.timeline?.secondHalfStart || nowStr
      }
    });

    if (onShowToast) onShowToast('▶️ 2.ª Parte iniciada!');
    return true;
  };

  const matchPhase = getMatchPhase(match);
  const playersOnPitch = match ? getCurrentPlayersOnPitch(match) : [];
  const playersAtEndOfFirstHalf = match ? getPlayersAtEndOfFirstHalf(match) : [];
  const suggestedMinute = getSuggestedMinute(match, state.category);

  return {
    match,
    matchPhase,
    suggestedMinute,
    playersOnPitch,
    playersAtEndOfFirstHalf,
    eligiblePlayers,
    updateMatchInState,

    // Phase transitions & Lineups
    handleStartFirstHalf,
    handleGoToHalftime,
    handleStartSecondHalf,
    handleUpdateLineup,
    handleUpdateSecondHalfLineup,

    // Goal Scored
    showGoalModal,
    setShowGoalModal,
    editingGoal,
    goalMinute,
    setGoalMinute,
    goalPeriod,
    setGoalPeriod,
    goalScorerId,
    setGoalScorerId,
    goalAssistId,
    setGoalAssistId,
    goalType,
    setGoalType,
    openAddGoalModal,
    openEditGoalModal,
    handleSaveGoal,
    handleDeleteGoal,
    handleQuickGoalBy,

    // Goal Conceded
    showConcededModal,
    setShowConcededModal,
    editingConcededGoal,
    concededMinute,
    setConcededMinute,
    concededPeriod,
    setConcededPeriod,
    concededGoalType,
    setConcededGoalType,
    concededNotes,
    setConcededNotes,
    openAddConcededModal,
    openEditConcededModal,
    handleSaveConcededGoal,
    handleDeleteConcededGoal,

    // Subs
    showSubModal,
    setShowSubModal,
    editingSub,
    subMinute,
    setSubMinute,
    subPeriod,
    setSubPeriod,
    subOutId,
    setSubOutId,
    subInId,
    setSubInId,
    openAddSubModal,
    openEditSubModal,
    handleSaveSub,
    handleSaveBatchSubs,
    handleDeleteSub,

    // Cards
    showCardModal,
    setShowCardModal,
    editingCard,
    cardPlayerId,
    setCardPlayerId,
    cardColor,
    setCardColor,
    cardMinute,
    setCardMinute,
    cardPeriod,
    setCardPeriod,
    openAddCardModal,
    openEditCardModal,
    handleSaveCard,
    handleDeleteCard,

    // Captain & Finishing
    showCaptainModal,
    setShowCaptainModal,
    showFinishModal,
    setShowFinishModal,
    isFinishing,
    setIsFinishing
  };
}
