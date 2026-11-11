import React, { useState } from 'react';
import { AppState, Match } from '../../types';
import { t } from '../../i18n/dict';
import { calculateMatchScore } from '../../lib/utils';
import { getLineupSize } from '../../lib/constants';
import { getMatchCallup, getNowTimeString } from '../../lib/matchPhaseUtils';
import { Header } from '../Header';
import { useLiveMatch } from './liveMatch/hooks/useLiveMatch';
import { LiveScoreboard } from './liveMatch/components/LiveScoreboard';
import { announceMatchChange } from '../../services/push';
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
import { HalftimePlanPanel } from './liveMatch/components/HalftimePlanPanel';
import { LineupModal } from './liveMatch/components/LineupModal';
import { MatchTimeline } from './gameCenter/MatchTimeline';
import { GameChecklistModal } from './gameCenter/GameChecklistModal';
import { withFinalDurations } from '../../lib/matchChecklist';

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
  onShowConfirm,
  onShowToast
}) => {
  const [liveTab, setLiveTab] = useState<'campo' | 'numeros' | 'cronologia'>('campo');
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [showLineupFirstHalfModal, setShowLineupFirstHalfModal] = useState<boolean>(false);
  const [showLineupSecondHalfModal, setShowLineupSecondHalfModal] = useState<boolean>(false);
  // 2nd-half picker pre-filled from the halftime suggestion
  const [secondHalfPreset, setSecondHalfPreset] = useState<string[] | null>(null);

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
    handleQuickGoalBy,

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
    setIsFinishing,
    playersOnPitch,
    handleTogglePause,
    lastAction,
    undoLastAction
  } = useLiveMatch({ state, onUpdateState, onShowToast });

  const myClub = state.myClubName && state.myClubName.trim() !== '' ? state.myClubName : t(state.lang, 'def_club');

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
          <div className="ui-card p-8 max-w-md mx-auto">
            <span className="text-4xl block mb-3">⏱️</span>
            <h3 className="text-lg font-bold text-ui-text mb-2">Nenhum jogo em direto a decorrer</h3>
            <p className="text-sm text-ui-muted mb-6">
              Inicie um jogo a partir do calendário ou crie uma nova partida para acompanhar os acontecimentos ao
              minuto.
            </p>
            <button className="ui-btn ui-btn-warning px-6 py-3 text-sm w-full" onClick={() => onNavigate('calendario')}>
              {t(state.lang, 'match_goto_sch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const captainObj = match.capitao ? state.roster.find((p) => p.id === match.capitao) : null;
  const captainName = captainObj ? captainObj.name : null;

  const handleFinishMatchConfirm = () => {
    setIsFinishing(true);
    const finalScore = calculateMatchScore(match);
    const nowTime = getNowTimeString();
    const updatedTimer = withFinalDurations(match).timer;

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
    announceMatchChange(state, match, finishedMatch);

    setIsFinishing(false);
    setShowFinishModal(false);
    setShowChecklistModal(false);
    // The end of the game opens the game's page in Resultados: summary, events and everything to share
    onNavigate('jogos', finishedMatch.id);

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
  // Matches started before the fix did not store the call-up: getMatchCallup falls back to the Agenda copy.
  const convocadosIds = match ? getMatchCallup(match) : [];
  const hasFewConvocados = convocadosIds.length < lineupSize;
  const availableForLineup = hasFewConvocados
    ? eligiblePlayers
    : eligiblePlayers.filter((p) => convocadosIds.includes(p.id));

  const starting1stHalfCount = match?.lineup?.length || 0;
  const isLineup1stHalfReady = starting1stHalfCount === lineupSize;

  return (
    <div className="modo-jogo pb-36 animate-fadeIn max-w-4xl mx-auto px-2 sm:px-4 space-y-3">
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

      {/* The scoreboard stays on top: score, clock, part of the game, pause */}
      <LiveScoreboard
        match={match}
        myClubName={myClub}
        onTogglePause={matchPhase === 'parte1' || matchPhase === 'parte2' ? handleTogglePause : undefined}
      />

      {/* Before kick-off and at half time: the line-up and the next step */}
      {(matchPhase === 'nao_iniciado' || matchPhase === 'intervalo') && (
        <section aria-label="Parte do jogo" className="ui-card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLineupFirstHalfModal(true)}
              className="ui-btn ui-btn-secondary px-3 py-1.5 text-ui-caption"
              title={`Gerir ${lineupSize} Titulares da 1.ª Parte`}
            >
              Titulares 1.ª parte{' '}
              <strong className={isLineup1stHalfReady ? 'text-ui-success' : 'text-ui-warning'}>
                {starting1stHalfCount}/{lineupSize}
              </strong>
            </button>
            {hasFewConvocados && (
              <span className="ui-badge ui-badge-warning">
                Poucos convocados ({convocadosIds.length}/{lineupSize})
              </span>
            )}
          </div>

          {matchPhase === 'nao_iniciado' && (
            <>
              <button
                type="button"
                onClick={() => (isLineup1stHalfReady ? handleStartFirstHalf() : setShowLineupFirstHalfModal(true))}
                className={`ui-btn w-full py-4 text-ui-lead font-extrabold ${
                  isLineup1stHalfReady ? 'ui-btn-success' : 'ui-btn-primary'
                }`}
              >
                {isLineup1stHalfReady
                  ? 'Iniciar 1.ª parte'
                  : `Selecionar ${lineupSize} Titulares (${starting1stHalfCount}/${lineupSize}) para Iniciar`}
              </button>
              {!isLineup1stHalfReady && (
                <p className="text-center text-ui-caption text-ui-muted">
                  Escolhe os {lineupSize} titulares para poder iniciar a 1.ª parte.
                </p>
              )}
            </>
          )}

          {matchPhase === 'intervalo' && (
            <>
              <p className="text-ui-caption text-ui-muted">
                No intervalo só se registam substituições. Golos e cartões ficam para a 2.ª parte.
              </p>
              <HalftimePlanPanel
                match={match}
                matches={state.matches || []}
                roster={state.roster || []}
                category={state.category}
                onUseSuggestion={(ids) => {
                  setSecondHalfPreset(ids);
                  setShowLineupSecondHalfModal(true);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setSecondHalfPreset(null);
                  setShowLineupSecondHalfModal(true);
                }}
                className="ui-btn ui-btn-success w-full py-4 text-ui-lead font-extrabold"
              >
                Iniciar 2.ª parte
              </button>
            </>
          )}
        </section>
      )}

      {/* Goals, substitution and card: the four big buttons, and the one-tap goal */}
      {matchPhase !== 'nao_iniciado' && (
        <QuickBenchMode
          section="pad"
          match={match}
          myClubName={myClub}
          roster={state.roster || []}
          onQuickGoalScored={openAddGoalModal}
          onQuickGoalBy={handleQuickGoalBy}
          onUndoGoal={handleDeleteGoal}
          onEditGoal={openEditGoalModal}
          onQuickGoalConceded={openAddConcededModal}
          onQuickSub={openAddSubModal}
          onQuickCard={openAddCardModal}
          onAddCorner={handleQuickAddCorner}
          onAddFoul={handleQuickAddFoul}
          onAddOpponentCorner={handleQuickAddOpponentCorner}
          onAddOpponentFoul={handleQuickAddOpponentFoul}
          onAddShotInBoxFor={handleQuickAddShotInBoxFor}
          onAddShotOutBoxFor={handleQuickAddShotOutBoxFor}
          onAddShotInBoxAgainst={handleQuickAddShotInBoxAgainst}
          onAddShotOutBoxAgainst={handleQuickAddShotOutBoxAgainst}
        />
      )}

      {/* Em campo · Números · Cronologia */}
      <div role="group" aria-label="Partes do jogo ao vivo" className="flex gap-1 border-b border-ui-line">
        {(
          [
            ['campo', 'Em campo'],
            ['numeros', 'Números'],
            ['cronologia', 'Cronologia']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={liveTab === id}
            onClick={() => setLiveTab(id)}
            className={`-mb-px flex-1 border-b-2 px-2 py-2.5 text-ui-body font-bold transition-colors ${
              liveTab === id ? 'border-ui-brand text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {liveTab === 'campo' && (
        <div className="space-y-3">
          <LivePlayingTimePanel match={match} roster={state.roster || []} category={state.category} defaultExpanded />
          {matchPhase === 'nao_iniciado' && (
            <p className="ui-inset p-3 text-ui-caption text-ui-muted">
              Os minutos de cada atleta aparecem aqui quando o jogo começar.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {matchPhase !== 'nao_iniciado' && (
              <button
                type="button"
                onClick={() => setShowLineupFirstHalfModal(true)}
                className="ui-btn ui-btn-secondary px-3 py-1.5 text-ui-caption"
              >
                Titulares 1.ª parte {starting1stHalfCount}/{lineupSize}
              </button>
            )}
            {(match.lineupSecondHalf?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => setShowLineupSecondHalfModal(true)}
                className="ui-btn ui-btn-secondary px-3 py-1.5 text-ui-caption"
                title={`Ver ${lineupSize} Titulares da 2.ª Parte`}
              >
                Titulares 2.ª parte {match.lineupSecondHalf?.length}/{lineupSize}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCaptainModal(true)}
              className="ui-btn ui-btn-secondary px-3 py-1.5 text-ui-caption"
            >
              Capitão: {captainName || 'escolher'}
            </button>
          </div>
          <div className="ui-card space-y-2 p-3">
            <div className="flex items-center justify-between">
              <h3 className="ui-kicker">Substituições ({match.subs?.length || 0})</h3>
              <button type="button" onClick={openAddSubModal} className="text-ui-caption font-bold text-ui-brand">
                + Adicionar
              </button>
            </div>
            <SubstitutionEventsList
              subs={match.subs || []}
              roster={state.roster || []}
              onEditSub={openEditSubModal}
              onDeleteSub={handleDeleteSub}
            />
          </div>
          <div className="ui-card space-y-2 p-3">
            <div className="flex items-center justify-between">
              <h3 className="ui-kicker">Cartões ({match.cards?.length || 0})</h3>
              <button type="button" onClick={openAddCardModal} className="text-ui-caption font-bold text-ui-brand">
                + Adicionar
              </button>
            </div>
            <CardEventsList
              cards={match.cards || []}
              roster={state.roster || []}
              onEditCard={openEditCardModal}
              onDeleteCard={handleDeleteCard}
            />
          </div>
        </div>
      )}

      {liveTab === 'numeros' && (
        <div className="space-y-3">
          <QuickBenchMode
            section="numbers"
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
          <MatchStatsSection match={match} onUpdateMatch={updateMatchInState} />
        </div>
      )}

      {liveTab === 'cronologia' && (
        <div className="space-y-3">
          <div className="ui-card p-4">
            <MatchTimeline
              match={match}
              onEditGoal={(g) => (g.type === 'scored' ? openEditGoalModal(g) : openEditConcededModal(g))}
              onEditCard={openEditCardModal}
              onEditSub={openEditSubModal}
              players={state.roster}
            />
          </div>
          <div className="ui-card space-y-2 p-3">
            <h3 className="ui-kicker">Golos marcados</h3>
            <GoalEventsList
              goals={match.goals || []}
              roster={state.roster || []}
              onEditGoal={openEditGoalModal}
              onDeleteGoal={handleDeleteGoal}
            />
            <h3 className="ui-kicker pt-2">Golos sofridos</h3>
            <ConcededGoalEventsList
              goals={match.goals || []}
              opponentName={match.opponent}
              onEditGoal={openEditConcededModal}
              onDeleteGoal={handleDeleteConcededGoal}
            />
          </div>
        </div>
      )}

      {/* End of a part: its own action, with a confirmation (no longer a big button next to Pausa) */}
      <div className="space-y-2 pt-2">
        {matchPhase === 'parte1' && (
          <button
            type="button"
            onClick={() => onShowConfirm('Terminar a 1.ª parte e começar o intervalo?', handleGoToHalftime)}
            className="ui-btn ui-btn-secondary w-full py-3 text-ui-body font-bold"
          >
            Terminar 1.ª parte (intervalo)
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowChecklistModal(true)}
          className={`ui-btn w-full py-3 text-ui-body font-bold ${
            matchPhase === 'parte2' ? 'ui-btn-primary' : 'ui-btn-ghost text-ui-muted'
          }`}
        >
          Validar e Terminar Jogo
        </button>
      </div>

      {/* ↩︎ Desfazer: the last action, in a small bar above the menu */}
      {lastAction && (
        <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex max-w-md justify-center px-3 lg:bottom-6 lg:pl-60">
          <div className="ui-card flex items-center gap-3 px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <span className="truncate text-ui-caption text-ui-muted">Último: {lastAction.label}</span>
            <button
              type="button"
              aria-label={`↩︎ Desfazer: ${lastAction.label}`}
              onClick={() => {
                const undone = undoLastAction();
                if (undone) onShowToast(`Desfeito: ${undone}`);
              }}
              className="ui-btn ui-btn-soft px-3 py-1 text-ui-caption font-bold"
            >
              Desfazer
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        editingGoal={editingGoal}
        eligiblePlayers={eligiblePlayers}
        onPitchIds={playersOnPitch}
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
        onPitchIds={playersOnPitch}
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
        onPitchIds={playersOnPitch}
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
          secondHalfPreset
            ? secondHalfPreset
            : match.lineupSecondHalf && match.lineupSecondHalf.length === lineupSize
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
        category={state.category}
        onConfirmFinish={handleFinishMatchConfirm}
        onSetLocation={(location) => updateMatchInState({ ...match, location })}
        onOpenEditField={(fieldKey) => {
          setShowChecklistModal(false);
          if (fieldKey === 'lineup') {
            setShowLineupFirstHalfModal(true);
          } else if (fieldKey === 'subs') {
            setLiveTab('campo');
          } else if (fieldKey === 'goals') {
            setLiveTab('cronologia');
          } else if (fieldKey === 'stats') {
            setLiveTab('numeros');
          }
        }}
      />
    </div>
  );
};
