import React, { useState } from 'react';
import { AppState, Match } from '../../types';
import { t } from '../../i18n/dict';
import { calculateMatchScore, getMatchElapsedMs } from '../../lib/utils';
import { getLineupSize } from '../../lib/constants';
import { getNowTimeString } from '../../lib/matchPhaseUtils';
import { Header } from '../Header';
import { useLiveMatch } from './liveMatch/hooks/useLiveMatch';
import { LiveMatchScore } from './liveMatch/components/LiveMatchScore';
import { GoalEventsList } from './liveMatch/components/GoalEventsList';
import { ConcededGoalEventsList } from './liveMatch/components/ConcededGoalEventsList';
import { SubstitutionEventsList } from './liveMatch/components/SubstitutionEventsList';
import { CardEventsList } from './liveMatch/components/CardEventsList';
import { MatchStatsSection } from './liveMatch/components/MatchStatsSection';
import { GoalModal } from './liveMatch/components/GoalModal';
import { ConcededGoalModal } from './liveMatch/components/ConcededGoalModal';
import { SubstitutionModal } from './liveMatch/components/SubstitutionModal';
import { CardModal } from './liveMatch/components/CardModal';
import { CaptainModal } from './liveMatch/components/CaptainModal';
import { QuickBenchMode } from './liveMatch/components/QuickBenchMode';
import { LivePlayingTimePanel } from './liveMatch/components/LivePlayingTimePanel';
import { LineupModal } from './liveMatch/components/LineupModal';
import { MatchClock } from './liveMatch/components/MatchClock';
import { MatchTimeline } from './gameCenter/MatchTimeline';
import { GameChecklistModal } from './gameCenter/GameChecklistModal';
import { PostMatchSummaryModal } from './gameCenter/PostMatchSummaryModal';
import { generateMatchSheetPDF } from '../../lib/pdfUtils';

interface LiveMatchViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast?: (msg: string) => void;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast
}) => {
  const [matchMode, setMatchMode] = useState<'quick' | 'detailed' | 'timeline'>('quick');
  const [activeTab, setActiveTab] = useState<'events' | 'subs' | 'cards' | 'stats'>('events');
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [completedMatchSummary, setCompletedMatchSummary] = useState<Match | null>(null);
  const [showLineupFirstHalfModal, setShowLineupFirstHalfModal] = useState<boolean>(false);
  const [showLineupSecondHalfModal, setShowLineupSecondHalfModal] = useState<boolean>(false);

  const {
    match,
    matchPhase,
    suggestedMinute,
    playersAtEndOfFirstHalf,
    eligiblePlayers,
    updateMatchInState,

    // Phase transitions & Lineups
    handleStartFirstHalf,
    handleGoToHalftime,
    handleStartSecondHalf,
    handleUpdateLineup,

    // Goals
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

    // Conceded
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

    // Captain & Finish
    showCaptainModal,
    setShowCaptainModal,
    setShowFinishModal,
    setIsFinishing
  } = useLiveMatch({ state, onUpdateState, onShowToast });

  if (!match) {
    return (
      <div className="pb-28 animate-fadeIn">
        <Header
          title={t(state.lang, 'match_curr')}
          lang={state.lang}
          onGoHome={() => onNavigate('home')}
          onOpenSettings={onOpenSettings}
          onOpenDatabase={() => onNavigate('teams')}
          onOpenNotifications={onOpenNotifications}
          onOpenSync={onOpenSync}
          unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
          syncInfo={state.syncInfo}
          clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
        />
        <div className="text-center mt-12 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto shadow-xl">
            <span className="text-4xl block mb-3">⏱️</span>
            <h3 className="text-lg font-bold text-white mb-2">Nenhum jogo em direto a decorrer</h3>
            <p className="text-sm text-slate-400 mb-6">
              Inicie um jogo a partir do calendário ou crie uma nova partida para acompanhar os acontecimentos ao
              minuto.
            </p>
            <button
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all w-full"
              onClick={() => onNavigate('calendario')}
            >
              {t(state.lang, 'match_goto_sch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');
  const captainObj = match.capitao ? state.roster.find((p) => p.id === match.capitao) : null;
  const captainName = captainObj ? captainObj.name : null;

  const handleFinishMatchConfirm = () => {
    setIsFinishing(true);
    const finalScore = calculateMatchScore(match);
    const nowTime = getNowTimeString();
    const totalElapsed = getMatchElapsedMs(match);
    const half1DurationMs = match.timer?.half1DurationMs ?? Math.floor(totalElapsed / 2);
    const half2DurationMs = match.timer?.half2DurationMs ?? Math.max(0, totalElapsed - half1DurationMs);

    const updatedTimer = {
      ...(match.timer || { elapsedMs: 0, lastStartTs: null }),
      isRunning: false,
      elapsedMs: totalElapsed,
      lastStartTs: null,
      half1DurationMs,
      half2DurationMs
    };

    const updatedTimeline = {
      ...(match.timeline || {}),
      fullTime: match.timeline?.fullTime || nowTime
    };

    const finishedMatch: Match = {
      ...match,
      finished: true,
      timer: updatedTimer,
      timeline: updatedTimeline,
      finalScore
    };

    const updatedMatches = state.matches.map((x) => (x.id === match.id ? finishedMatch : x));
    onUpdateState({ matches: updatedMatches });

    setIsFinishing(false);
    setShowFinishModal(false);
    setShowChecklistModal(false);
    setCompletedMatchSummary(finishedMatch);
    setShowSummaryModal(true);

    if (onShowToast) {
      onShowToast('🏁 Jogo terminado e gravado com sucesso no histórico!');
    }
  };

  // Quick increment/decrement handlers for bench mode
  const handleQuickAddCorner = () => {
    updateMatchInState({ ...match, cantos: (match.cantos || 0) + 1 });
  };
  const handleQuickRemoveCorner = () => {
    updateMatchInState({ ...match, cantos: Math.max(0, (match.cantos || 0) - 1) });
  };
  const handleQuickAddOpponentCorner = () => {
    updateMatchInState({ ...match, cantosAdv: (match.cantosAdv || 0) + 1 });
  };
  const handleQuickRemoveOpponentCorner = () => {
    updateMatchInState({ ...match, cantosAdv: Math.max(0, (match.cantosAdv || 0) - 1) });
  };
  const handleQuickAddFoul = () => {
    updateMatchInState({ ...match, faltas: (match.faltas || 0) + 1 });
  };
  const handleQuickRemoveFoul = () => {
    updateMatchInState({ ...match, faltas: Math.max(0, (match.faltas || 0) - 1) });
  };
  const handleQuickAddOpponentFoul = () => {
    updateMatchInState({ ...match, faltasAdv: (match.faltasAdv || 0) + 1 });
  };
  const handleQuickRemoveOpponentFoul = () => {
    updateMatchInState({ ...match, faltasAdv: Math.max(0, (match.faltasAdv || 0) - 1) });
  };

  // Quick remates handlers (dentro e fora da área)
  const handleQuickAddShotInBoxFor = () => {
    const next = (match.rematesDentroArea ?? match.shotsInBoxFor ?? 0) + 1;
    updateMatchInState({ ...match, rematesDentroArea: next, shotsInBoxFor: next });
  };
  const handleQuickRemoveShotInBoxFor = () => {
    const next = Math.max(0, (match.rematesDentroArea ?? match.shotsInBoxFor ?? 0) - 1);
    updateMatchInState({ ...match, rematesDentroArea: next, shotsInBoxFor: next });
  };

  const handleQuickAddShotOutBoxFor = () => {
    const next = (match.rematesForaArea ?? match.shotsOutBoxFor ?? 0) + 1;
    updateMatchInState({ ...match, rematesForaArea: next, shotsOutBoxFor: next });
  };
  const handleQuickRemoveShotOutBoxFor = () => {
    const next = Math.max(0, (match.rematesForaArea ?? match.shotsOutBoxFor ?? 0) - 1);
    updateMatchInState({ ...match, rematesForaArea: next, shotsOutBoxFor: next });
  };

  const handleQuickAddShotInBoxAgainst = () => {
    const next = (match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0) + 1;
    updateMatchInState({ ...match, rematesDentroAreaAdv: next, shotsInBoxAgainst: next });
  };
  const handleQuickRemoveShotInBoxAgainst = () => {
    const next = Math.max(0, (match.rematesDentroAreaAdv ?? match.shotsInBoxAgainst ?? 0) - 1);
    updateMatchInState({ ...match, rematesDentroAreaAdv: next, shotsInBoxAgainst: next });
  };

  const handleQuickAddShotOutBoxAgainst = () => {
    const next = (match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0) + 1;
    updateMatchInState({ ...match, rematesForaAreaAdv: next, shotsOutBoxAgainst: next });
  };
  const handleQuickRemoveShotOutBoxAgainst = () => {
    const next = Math.max(0, (match.rematesForaAreaAdv ?? match.shotsOutBoxAgainst ?? 0) - 1);
    updateMatchInState({ ...match, rematesForaAreaAdv: next, shotsOutBoxAgainst: next });
  };

  const lineupSize = getLineupSize(match);
  const convocadosIds = match?.convocados || [];
  const hasFewConvocados = convocadosIds.length < lineupSize;
  const availableForLineup = hasFewConvocados
    ? eligiblePlayers
    : eligiblePlayers.filter((p) => convocadosIds.includes(p.id));

  const starting1stHalfCount = match?.lineup?.length || 0;
  const isLineup1stHalfReady = starting1stHalfCount === lineupSize;

  return (
    <div className="pb-32 animate-fadeIn max-w-4xl mx-auto px-2 sm:px-4 space-y-4">
      <Header
        title={t(state.lang, 'match_curr')}
        lang={state.lang}
        onGoHome={() => onNavigate('home')}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={() => onNavigate('teams')}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
        syncInfo={state.syncInfo}
        clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
        hasActiveMatch={true}
      />

      {/* PAINEL DE FASE E BOTÃO ÚNICO DE ESTADO (Visível nos 3 modos: Rápido, Detalhado, Cronologia) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Badge do Estado Atual */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Fase:</span>
            {matchPhase === 'nao_iniciado' && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Pré-Jogo (Não Iniciado)</span>
              </span>
            )}
            {matchPhase === 'parte1' && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>1.ª Parte a Decorrer</span>
              </span>
            )}
            {matchPhase === 'intervalo' && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Intervalo</span>
              </span>
            )}
            {matchPhase === 'parte2' && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>2.ª Parte a Decorrer</span>
              </span>
            )}
          </div>

          {/* Botões dos Titulares */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowLineupFirstHalfModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1.5 font-mono shadow-sm"
              title={`Gerir ${lineupSize} Titulares da 1.ª Parte`}
            >
              <span>👥 Titulares 1.ª P:</span>
              <strong className={`font-black ${isLineup1stHalfReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {starting1stHalfCount}/{lineupSize}
              </strong>
            </button>

            {(match.lineupSecondHalf?.length || 0) > 0 && (
              <button
                onClick={() => setShowLineupSecondHalfModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1.5 font-mono shadow-sm"
                title={`Ver ${lineupSize} Titulares da 2.ª Parte`}
              >
                <span>👥 Titulares 2.ª P:</span>
                <strong className="text-emerald-400 font-black">
                  {match.lineupSecondHalf?.length}/{lineupSize}
                </strong>
              </button>
            )}

            {hasFewConvocados && (
              <span className="text-[10px] text-amber-400 font-mono px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                ⚠️ Poucos convocados ({convocadosIds.length}/{lineupSize})
              </span>
            )}
          </div>
        </div>

        {/* Relógio do Jogo (MatchClock visível nos 3 modos) */}
        <MatchClock match={match} />

        {/* Minutos de jogo por atleta e alertas de tempo de jogo */}
        <LivePlayingTimePanel match={match} roster={state.roster || []} category={state.category} />

        {/* Mensagem e bloqueio específico durante o intervalo */}
        {matchPhase === 'intervalo' && (
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3 text-xs text-cyan-200">
            <span className="text-xl">⏸️</span>
            <div className="flex-1">
              <strong className="block font-bold text-cyan-300 font-['Chakra_Petch'] uppercase tracking-wide">
                Intervalo de Jogo
              </strong>
              <span>
                Apenas são permitidas substituições (minuto 'INT'). Golos, golos sofridos e cartões estão bloqueados
                durante o intervalo.
              </span>
            </div>
          </div>
        )}

        {/* BOTÃO ÚNICO DE FASE (Grande) */}
        {matchPhase === 'nao_iniciado' && (
          <div className="space-y-1.5">
            <button
              onClick={() => {
                if (!isLineup1stHalfReady) {
                  setShowLineupFirstHalfModal(true);
                } else {
                  handleStartFirstHalf();
                }
              }}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base font-['Chakra_Petch'] uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2.5 ${
                isLineup1stHalfReady
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-slate-950 shadow-emerald-500/25 active:scale-98 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-98'
              }`}
            >
              <span className="text-xl">▶️</span>
              <span>
                {isLineup1stHalfReady
                  ? 'Iniciar 1.ª parte'
                  : `Selecionar ${lineupSize} Titulares (${starting1stHalfCount}/${lineupSize}) para Iniciar`}
              </span>
            </button>
            {!isLineup1stHalfReady && (
              <p className="text-[11px] text-amber-400/90 text-center font-mono">
                ⚠️ É obrigatório escolher os {lineupSize} titulares para poder iniciar a 1.ª parte.
              </p>
            )}
          </div>
        )}

        {matchPhase === 'parte1' && (
          <button
            onClick={handleGoToHalftime}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base font-['Chakra_Petch'] uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-slate-950 shadow-xl shadow-amber-500/25 transition-all active:scale-98 flex items-center justify-center gap-2.5"
          >
            <span className="text-xl">⏸️</span>
            <span>Intervalo</span>
          </button>
        )}

        {matchPhase === 'intervalo' && (
          <button
            onClick={() => setShowLineupSecondHalfModal(true)}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base font-['Chakra_Petch'] uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-slate-950 shadow-xl shadow-emerald-500/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 animate-pulse"
          >
            <span className="text-xl">▶️</span>
            <span>Iniciar 2.ª parte</span>
          </button>
        )}

        {/* Quando matchPhase === 'parte2', o botão de fase desaparece e o jogo termina via 'Terminar Jogo' no rodapé */}
      </div>

      {/* Mode Switcher: Modo Rápido (Banco) vs Modo Detalhado vs Cronologia */}
      <div className="flex items-center justify-between p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={() => setMatchMode('quick')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            matchMode === 'quick'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>⚡</span>
          <span>Modo Banco (Rápido)</span>
        </button>

        <button
          onClick={() => setMatchMode('detailed')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            matchMode === 'detailed'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>📝</span>
          <span>Modo Detalhado</span>
        </button>

        <button
          onClick={() => setMatchMode('timeline')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            matchMode === 'timeline'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>⏱️</span>
          <span>Cronologia</span>
        </button>
      </div>

      {/* Render selected mode */}
      {matchMode === 'quick' && (
        <QuickBenchMode
          match={match}
          myClubName={myClub}
          roster={state.roster || []}
          onQuickGoalScored={openAddGoalModal}
          onQuickGoalConceded={openAddConcededModal}
          onQuickSub={openAddSubModal}
          onQuickCard={openAddCardModal}
          onAddCorner={handleQuickAddCorner}
          onRemoveCorner={handleQuickRemoveCorner}
          onAddFoul={handleQuickAddFoul}
          onRemoveFoul={handleQuickRemoveFoul}
          onAddOpponentCorner={handleQuickAddOpponentCorner}
          onRemoveOpponentCorner={handleQuickRemoveOpponentCorner}
          onAddOpponentFoul={handleQuickAddOpponentFoul}
          onRemoveOpponentFoul={handleQuickRemoveOpponentFoul}
          onAddShotInBoxFor={handleQuickAddShotInBoxFor}
          onRemoveShotInBoxFor={handleQuickRemoveShotInBoxFor}
          onAddShotOutBoxFor={handleQuickAddShotOutBoxFor}
          onRemoveShotOutBoxFor={handleQuickRemoveShotOutBoxFor}
          onAddShotInBoxAgainst={handleQuickAddShotInBoxAgainst}
          onRemoveShotInBoxAgainst={handleQuickRemoveShotInBoxAgainst}
          onAddShotOutBoxAgainst={handleQuickAddShotOutBoxAgainst}
          onRemoveShotOutBoxAgainst={handleQuickRemoveShotOutBoxAgainst}
        />
      )}

      {matchMode === 'detailed' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Scoreboard & Quick Action Triggers */}
          <LiveMatchScore
            match={match}
            myClubName={myClub}
            lang={state.lang}
            onOpenAddGoal={openAddGoalModal}
            onOpenAddConceded={openAddConcededModal}
            onOpenAddSub={openAddSubModal}
            onOpenAddCard={openAddCardModal}
            onOpenCaptainModal={() => setShowCaptainModal(true)}
            captainName={captainName}
          />

          {/* Interactive Tabs Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>⚽</span>
              <span>Golos ({match.goals?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('subs')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'subs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🔄</span>
              <span>Substituições ({match.subs?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'cards'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>🟨</span>
              <span>Disciplina ({match.cards?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>📊</span>
              <span>Estatísticas</span>
            </button>
          </div>

          {/* Tab Panels */}
          <div className="space-y-4">
            {activeTab === 'events' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Golos Marcados</h4>
                    <button
                      onClick={openAddGoalModal}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      + Adicionar Golo
                    </button>
                  </div>
                  <GoalEventsList
                    goals={match.goals || []}
                    roster={state.roster || []}
                    onEditGoal={openEditGoalModal}
                    onDeleteGoal={handleDeleteGoal}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Golos Sofridos</h4>
                    <button
                      onClick={openAddConcededModal}
                      className="text-xs text-red-400 hover:underline font-semibold"
                    >
                      + Adicionar Golo Sofrido
                    </button>
                  </div>
                  <ConcededGoalEventsList
                    goals={match.goals || []}
                    opponentName={match.opponent}
                    onEditGoal={openEditConcededModal}
                    onDeleteGoal={handleDeleteConcededGoal}
                  />
                </div>
              </div>
            )}

            {activeTab === 'subs' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Registo de Substituições</h4>
                  <button onClick={openAddSubModal} className="text-xs text-blue-400 hover:underline font-semibold">
                    + Adicionar Substituição
                  </button>
                </div>
                <SubstitutionEventsList
                  subs={match.subs || []}
                  roster={state.roster || []}
                  onEditSub={openEditSubModal}
                  onDeleteSub={handleDeleteSub}
                />
              </div>
            )}

            {activeTab === 'cards' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sanções Disciplinares</h4>
                  <button onClick={openAddCardModal} className="text-xs text-amber-400 hover:underline font-semibold">
                    + Adicionar Cartão
                  </button>
                </div>
                <CardEventsList
                  cards={match.cards || []}
                  roster={state.roster || []}
                  onEditCard={openEditCardModal}
                  onDeleteCard={handleDeleteCard}
                />
              </div>
            )}

            {activeTab === 'stats' && <MatchStatsSection match={match} onUpdateMatch={updateMatchInState} />}
          </div>
        </div>
      )}

      {matchMode === 'timeline' && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl animate-fadeIn space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
            Cronologia Ao Minuto
          </h3>
          <MatchTimeline
            match={match}
            onEditGoal={(g) => (g.type === 'scored' ? openEditGoalModal(g) : openEditConcededModal(g))}
            onEditCard={openEditCardModal}
            onEditSub={openEditSubModal}
          />
        </div>
      )}

      {/* Finish Match Bottom CTA with Checklist Pre-Validation */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Validação de dados com checklist integrada e resumo em 30 segundos pós-jogo.
        </div>
        <button
          onClick={() => setShowChecklistModal(true)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-sm font-['Chakra_Petch'] uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>📋</span>
          <span>Validar e Terminar Jogo</span>
        </button>
      </div>

      {/* Modals */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        editingGoal={editingGoal}
        eligiblePlayers={eligiblePlayers}
        goalMinute={goalMinute}
        setGoalMinute={setGoalMinute}
        suggestedMinute={suggestedMinute}
        goalPeriod={goalPeriod}
        setGoalPeriod={setGoalPeriod}
        goalScorerId={goalScorerId}
        setGoalScorerId={setGoalScorerId}
        goalAssistId={goalAssistId}
        setGoalAssistId={setGoalAssistId}
        goalType={goalType}
        setGoalType={setGoalType}
        onSave={handleSaveGoal}
      />

      <ConcededGoalModal
        isOpen={showConcededModal}
        onClose={() => setShowConcededModal(false)}
        editingConcededGoal={editingConcededGoal}
        opponentName={match.opponent}
        concededMinute={concededMinute}
        setConcededMinute={setConcededMinute}
        suggestedMinute={suggestedMinute}
        concededPeriod={concededPeriod}
        setConcededPeriod={setConcededPeriod}
        concededGoalType={concededGoalType}
        setConcededGoalType={setConcededGoalType}
        concededNotes={concededNotes}
        setConcededNotes={setConcededNotes}
        onSave={handleSaveConcededGoal}
      />

      <SubstitutionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        editingSub={editingSub}
        eligiblePlayers={eligiblePlayers}
        subOutId={subOutId}
        setSubOutId={setSubOutId}
        subInId={subInId}
        setSubInId={setSubInId}
        subMinute={subMinute}
        setSubMinute={setSubMinute}
        suggestedMinute={suggestedMinute}
        subPeriod={subPeriod}
        setSubPeriod={setSubPeriod}
        onSave={handleSaveSub}
        onSaveBatch={handleSaveBatchSubs}
      />

      <CardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        editingCard={editingCard}
        eligiblePlayers={eligiblePlayers}
        cardPlayerId={cardPlayerId}
        setCardPlayerId={setCardPlayerId}
        cardColor={cardColor}
        setCardColor={setCardColor}
        cardMinute={cardMinute}
        setCardMinute={setCardMinute}
        suggestedMinute={suggestedMinute}
        cardPeriod={cardPeriod}
        setCardPeriod={setCardPeriod}
        onSave={handleSaveCard}
      />

      <CaptainModal
        isOpen={showCaptainModal}
        onClose={() => setShowCaptainModal(false)}
        eligiblePlayers={eligiblePlayers}
        currentCaptainId={match.capitao}
        onSelectCaptain={(pId) => {
          updateMatchInState({ ...match, capitao: pId });
          if (onShowToast) {
            onShowToast(pId ? 'Capitão definido ✓' : 'Capitão removido');
          }
        }}
      />

      {/* Titulares da 1.ª Parte Modal */}
      <LineupModal
        isOpen={showLineupFirstHalfModal}
        onClose={() => setShowLineupFirstHalfModal(false)}
        half={1}
        availablePlayers={availableForLineup}
        convocadosIds={convocadosIds}
        lineupSize={lineupSize}
        initialSelection={match.lineup || []}
        onConfirm={(selectedN) => {
          handleUpdateLineup(selectedN);
          setShowLineupFirstHalfModal(false);
        }}
        canCancel={true}
      />

      {/* Titulares da 2.ª Parte Modal */}
      <LineupModal
        isOpen={showLineupSecondHalfModal}
        onClose={() => setShowLineupSecondHalfModal(false)}
        half={2}
        availablePlayers={availableForLineup}
        convocadosIds={convocadosIds}
        lineupSize={lineupSize}
        initialSelection={
          match.lineupSecondHalf && match.lineupSecondHalf.length === lineupSize
            ? match.lineupSecondHalf
            : playersAtEndOfFirstHalf.length === lineupSize
              ? playersAtEndOfFirstHalf
              : match.lineup || []
        }
        onConfirm={(selectedN) => {
          handleStartSecondHalf(selectedN);
          setShowLineupSecondHalfModal(false);
        }}
        canCancel={true}
      />

      {/* Checklist Modal */}
      <GameChecklistModal
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        match={match}
        onConfirmFinish={handleFinishMatchConfirm}
        onOpenEditField={(fieldKey) => {
          setShowChecklistModal(false);
          if (fieldKey === 'goals') {
            setMatchMode('detailed');
            setActiveTab('events');
          } else if (fieldKey === 'stats') {
            setMatchMode('detailed');
            setActiveTab('stats');
          }
        }}
      />

      {/* 30-Second Summary Modal */}
      {completedMatchSummary && (
        <PostMatchSummaryModal
          isOpen={showSummaryModal}
          onClose={() => {
            setShowSummaryModal(false);
            onNavigate('jogos');
          }}
          match={completedMatchSummary}
          myClubName={myClub}
          state={state}
          onGeneratePdf={() => {
            generateMatchSheetPDF(completedMatchSummary, state);
          }}
          onGenerateExcel={async () => {
            const { exportMatchSheetExcel } = await import('../../lib/exportUtils');
            exportMatchSheetExcel(completedMatchSummary, state);
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
