import React, { lazy, Suspense, useMemo, useState } from 'react';
import { AppState } from '../../types';
import { Header } from '../Header';
import { CalendarEvent } from './schedule/types';
import { MONTH_NAMES_PT, WEEKDAY_NAMES_PT } from './schedule/constants';
import { useScheduleEvents } from './schedule/hooks/useScheduleEvents';
import { useScheduleModals } from './schedule/hooks/useScheduleModals';
import { ScheduleFilters } from './schedule/ScheduleFilters';
import { ScheduleDayView } from './schedule/ScheduleDayView';
import { ScheduleWeekView } from './schedule/ScheduleWeekView';
import { ScheduleMonthView } from './schedule/ScheduleMonthView';
import { ScheduleYearView } from './schedule/ScheduleYearView';
import { ScheduleList } from './schedule/ScheduleList';
import { ScheduleEventCard } from './schedule/ScheduleEventCard';
import { ScheduleMatchModal } from './schedule/ScheduleMatchModal';
import { ScheduleTrainingModal } from './schedule/ScheduleTrainingModal';
import { ScheduleStaffModal } from './schedule/ScheduleStaffModal';
import { ScheduleClubEventModal } from './schedule/ScheduleClubEventModal';
import { ScheduleFab } from './schedule/ScheduleFab';
import { CalendarShareModal } from './schedule/CalendarShareModal';
import { AgendaTabs } from './schedule/AgendaTabs';

const FixturePrintModal = lazy(() =>
  import('./schedule/FixturePrintModal').then((m) => ({ default: m.FixturePrintModal }))
);

export type { CalendarEvent };

interface ScheduleViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowConfirm: (msg: string, cb: () => void) => void;
  onShowToast: (msg: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowConfirm,
  onShowToast
}) => {
  const [showCalendarShare, setShowCalendarShare] = useState(false);
  const [showFixturePrint, setShowFixturePrint] = useState(false);
  // Events hook
  const {
    viewMode,
    setViewMode,
    eventTypeFilter,
    setEventTypeFilter,
    todayStr,
    selectedDate,
    setSelectedDate,
    activeYear,
    setActiveYear,
    activeMonth,
    setActiveMonth,
    expandedEventId,
    setExpandedEventId,
    eligiblePlayers,
    allEvents,
    filteredEvents,
    eventsByDate,
    monthMatrix,
    weekDays,
    handlePrevMonth,
    handleNextMonth,
    handleToday
  } = useScheduleEvents(state);

  // Modals hook
  const {
    showMatchModal,
    setShowMatchModal,
    editingMatchId,
    matchForm,
    setMatchForm,
    handleOpenScheduleMatch,
    handleEditScheduledMatch,
    handleSaveMatch,
    handleStartMatch,
    handleDeleteMatch,

    showTrainingModal,
    setShowTrainingModal,
    editingTrainingId,
    trainingForm,
    setTrainingForm,
    handleOpenScheduleTraining,
    handleEditTraining,
    handleSaveTrainingModal,
    handleSaveBatchTrainings,
    handleToggleTrainingStatus,
    handleDeleteTraining,

    showStaffModal,
    setShowStaffModal,
    editingStaffId,
    staffForm,
    setStaffForm,
    handleOpenScheduleStaff,
    handleEditStaffUnavailability,
    handleSaveStaffModal,
    handleDeleteStaffUnavailability,

    showClubEventModal,
    setShowClubEventModal,
    editingClubEventId,
    clubEventForm,
    setClubEventForm,
    handleOpenClubEventModal,
    handleEditClubEvent,
    handleSaveClubEventModal,
    handleToggleClubEventStatus,
    handleDeleteClubEvent,

    showFabMenu,
    setShowFabMenu
  } = useScheduleModals(
    state,
    onUpdateState,
    onNavigate,
    onShowConfirm,
    onShowToast,
    todayStr,
    selectedDate,
    eligiblePlayers
  );

  // Calendar Navigation Handlers for Week & Day
  const handlePrevWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    const newDateStr = d.toISOString().slice(0, 10);
    setSelectedDate(newDateStr);
    setActiveYear(d.getFullYear());
    setActiveMonth(d.getMonth());
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    const newDateStr = d.toISOString().slice(0, 10);
    setSelectedDate(newDateStr);
    setActiveYear(d.getFullYear());
    setActiveMonth(d.getMonth());
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const newDateStr = d.toISOString().slice(0, 10);
    setSelectedDate(newDateStr);
    setActiveYear(d.getFullYear());
    setActiveMonth(d.getMonth());
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const newDateStr = d.toISOString().slice(0, 10);
    setSelectedDate(newDateStr);
    setActiveYear(d.getFullYear());
    setActiveMonth(d.getMonth());
  };

  // Formatted date string for selected date
  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      const dayOfWeekName = WEEKDAY_NAMES_PT[(dt.getDay() + 6) % 7];
      return `${dayOfWeekName}, ${d} de ${MONTH_NAMES_PT[m]} ${y}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  // Computed summary stats
  const stats = useMemo(() => {
    return {
      matchesCount: (state.schedule || []).length,
      trainingsCount: (state.trainings || []).length,
      clubEventsCount: (state.clubEvents || []).length,
      staffCount: (state.staffUnavailability || []).length
    };
  }, [state.schedule, state.trainings, state.clubEvents, state.staffUnavailability]);

  // Helper: Open Event Modal / View based on category
  const handleOpenEvent = (ev: CalendarEvent) => {
    if (ev.category === 'match') {
      if (ev.rawScheduledMatch) {
        handleEditScheduledMatch(ev.rawScheduledMatch);
      } else if (ev.rawFinishedMatch) {
        onNavigate('jogos', ev.rawFinishedMatch.id);
      }
    } else if (ev.category === 'training') {
      if (ev.rawTraining) {
        handleEditTraining(ev.rawTraining);
      }
    } else if (ev.category === 'club_event') {
      if (ev.rawClubEvent) {
        handleEditClubEvent(ev.rawClubEvent);
      }
    } else if (ev.category === 'staff_unavailability') {
      if (ev.rawStaffUnavailability) {
        handleEditStaffUnavailability(ev.rawStaffUnavailability);
      }
    }
  };

  // Helper: Render Event Card
  const renderEventCard = (ev: CalendarEvent) => (
    <ScheduleEventCard
      key={ev.id}
      ev={ev}
      state={state}
      isExpanded={expandedEventId === ev.id}
      setExpandedEventId={setExpandedEventId}
      onNavigate={onNavigate}
      onShowConfirm={onShowConfirm}
      handleConvertScheduledToLiveMatch={handleStartMatch}
      handleEditMatch={handleEditScheduledMatch}
      handleDeleteScheduledMatch={handleDeleteMatch}
      handleEditClubEvent={handleEditClubEvent}
      handleToggleClubEventStatus={handleToggleClubEventStatus}
      handleDeleteClubEvent={handleDeleteClubEvent}
      handleEditStaff={handleEditStaffUnavailability}
      handleDeleteStaff={handleDeleteStaffUnavailability}
      handleToggleTrainingStatus={handleToggleTrainingStatus}
      handleEditTraining={handleEditTraining}
      handleDeleteTraining={handleDeleteTraining}
    />
  );

  return (
    <div className="space-y-3 sm:space-y-4 pb-24 animate-fadeIn">
      {/* Top Main Navigation Header */}
      <Header
        title="Agenda"
        lang={state.lang}
        currentTab="calendario"
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

      <AgendaTabs current="calendario" onNavigate={onNavigate} />

      {/* Summary and the two less frequent actions */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>
          <strong className="text-slate-100">{stats.matchesCount}</strong> jogos
        </span>
        <span>
          <strong className="text-slate-100">{stats.trainingsCount}</strong> treinos
        </span>
        <button
          type="button"
          onClick={() => setShowFixturePrint(true)}
          className="ml-auto font-semibold text-cyan-400 hover:text-cyan-300"
          aria-label="Importar jogos de um print do calendário"
          title="Importar jogos de um print do calendário"
        >
          📷 Importar print
        </button>
        <button
          type="button"
          onClick={() => setShowCalendarShare(true)}
          className="font-semibold text-cyan-400 hover:text-cyan-300"
          aria-label="Calendário para os pais"
          title={
            (state.teams || []).find((t) => t.id === state.activeTeamId)?.calendarToken
              ? 'Calendário para os pais (link ativo)'
              : 'Calendário para os pais (Google / iPhone)'
          }
        >
          Pais
        </button>
      </div>
      {showFixturePrint && (
        <Suspense fallback={null}>
          <FixturePrintModal
            state={state}
            onUpdateState={onUpdateState}
            onShowToast={onShowToast}
            onClose={() => setShowFixturePrint(false)}
          />
        </Suspense>
      )}
      {showCalendarShare && (
        <CalendarShareModal
          state={state}
          onUpdateState={onUpdateState}
          onShowToast={onShowToast}
          onClose={() => setShowCalendarShare(false)}
        />
      )}

      {/* View Switcher & Event Category Filter Pills */}
      <ScheduleFilters
        viewMode={viewMode}
        setViewMode={setViewMode}
        eventTypeFilter={eventTypeFilter}
        setEventTypeFilter={setEventTypeFilter}
        stats={stats}
      />

      {/* VIEW 1: DIA (Daily Timeline & Detailed Event Cards) */}
      {viewMode === 'dia' && (
        <ScheduleDayView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setActiveYear={setActiveYear}
          setActiveMonth={setActiveMonth}
          todayStr={todayStr}
          formattedSelectedDate={formattedSelectedDate}
          selectedDateEvents={selectedDateEvents}
          handlePrevDay={handlePrevDay}
          handleNextDay={handleNextDay}
          handleGoToday={handleToday}
          onOpenScheduleMatch={handleOpenScheduleMatch}
          onOpenScheduleTraining={handleOpenScheduleTraining}
          onOpenClubEventModal={handleOpenClubEventModal}
          onOpenScheduleStaff={handleOpenScheduleStaff}
          renderEventCard={renderEventCard}
        />
      )}

      {/* VIEW 2: SEMANA (7-Day Column Grid) */}
      {viewMode === 'semana' && (
        <ScheduleWeekView
          weekDays={weekDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          todayStr={todayStr}
          activeYear={activeYear}
          eventsByDate={eventsByDate}
          selectedDateEvents={selectedDateEvents}
          formattedSelectedDate={formattedSelectedDate}
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          onOpenScheduleMatch={handleOpenScheduleMatch}
          onOpenScheduleTraining={handleOpenScheduleTraining}
          onOpenClubEventModal={handleOpenClubEventModal}
          onOpenScheduleStaff={handleOpenScheduleStaff}
          renderEventCard={renderEventCard}
          onOpenEvent={handleOpenEvent}
        />
      )}

      {/* VIEW 3: MÊS (Classic Full Monthly Interactive Grid) */}
      {viewMode === 'mes' && (
        <ScheduleMonthView
          activeMonth={activeMonth}
          setActiveMonth={setActiveMonth}
          activeYear={activeYear}
          todayStr={todayStr}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          formattedSelectedDate={formattedSelectedDate}
          eventsByDate={eventsByDate}
          monthMatrix={monthMatrix}
          selectedDateEvents={selectedDateEvents}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          handleGoToday={handleToday}
          onOpenScheduleMatch={handleOpenScheduleMatch}
          onOpenScheduleTraining={handleOpenScheduleTraining}
          onOpenClubEventModal={handleOpenClubEventModal}
          onOpenScheduleStaff={handleOpenScheduleStaff}
          renderEventCard={renderEventCard}
          onOpenEvent={handleOpenEvent}
        />
      )}

      {/* VIEW 4: ANUAL (12-Month Bird's Eye Calendar Matrix) */}
      {viewMode === 'anual' && (
        <ScheduleYearView
          activeYear={activeYear}
          setActiveYear={setActiveYear}
          setActiveMonth={setActiveMonth}
          setSelectedDate={setSelectedDate}
          setViewMode={setViewMode}
          todayStr={todayStr}
          allEvents={allEvents}
          eventsByDate={eventsByDate}
          onOpenScheduleMatch={() => handleOpenScheduleMatch()}
          onOpenScheduleTraining={() => handleOpenScheduleTraining()}
          onOpenClubEventModal={() => handleOpenClubEventModal()}
          onOpenScheduleStaff={() => handleOpenScheduleStaff()}
        />
      )}

      {/* VIEW 5: LISTA (Linear Chronological Agenda Feed) */}
      {viewMode === 'lista' && (
        <ScheduleList filteredEvents={filteredEvents} todayStr={todayStr} renderEventCard={renderEventCard} />
      )}

      {/* MODAL 1: SCHEDULE MATCH */}
      <ScheduleMatchModal
        showMatchModal={showMatchModal}
        setShowMatchModal={setShowMatchModal}
        editingMatchId={editingMatchId}
        matchForm={matchForm}
        setMatchForm={setMatchForm}
        handleSaveMatch={handleSaveMatch}
        handleDeleteMatch={handleDeleteMatch}
        onShowConfirm={onShowConfirm}
      />

      {/* MODAL 2: SCHEDULE TRAINING */}
      <ScheduleTrainingModal
        showTrainingModal={showTrainingModal}
        setShowTrainingModal={setShowTrainingModal}
        editingTrainingId={editingTrainingId}
        trainingForm={trainingForm}
        setTrainingForm={setTrainingForm}
        handleSaveTrainingModal={handleSaveTrainingModal}
        existingTrainings={state.trainings || []}
        onSaveBatchTrainings={handleSaveBatchTrainings}
        handleDeleteTraining={handleDeleteTraining}
        onShowConfirm={onShowConfirm}
      />

      {/* MODAL 3: STAFF UNAVAILABILITY */}
      <ScheduleStaffModal
        showStaffModal={showStaffModal}
        setShowStaffModal={setShowStaffModal}
        editingStaffId={editingStaffId}
        staffForm={staffForm}
        setStaffForm={setStaffForm}
        state={state}
        handleSaveStaffModal={handleSaveStaffModal}
        handleDeleteStaff={handleDeleteStaffUnavailability}
        onShowConfirm={onShowConfirm}
      />

      {/* MODAL 4: CLUB EVENT */}
      <ScheduleClubEventModal
        showClubEventModal={showClubEventModal}
        setShowClubEventModal={setShowClubEventModal}
        editingClubEventId={editingClubEventId}
        clubEventForm={clubEventForm}
        setClubEventForm={setClubEventForm}
        handleSaveClubEventModal={handleSaveClubEventModal}
        handleDeleteClubEvent={handleDeleteClubEvent}
        onShowConfirm={onShowConfirm}
      />

      {/* FLOATING ACTION BUTTON (FAB) */}
      <ScheduleFab
        showFabMenu={showFabMenu}
        setShowFabMenu={setShowFabMenu}
        selectedDate={selectedDate}
        onOpenScheduleMatch={handleOpenScheduleMatch}
        onOpenScheduleTraining={handleOpenScheduleTraining}
        onOpenClubEventModal={handleOpenClubEventModal}
        onOpenScheduleStaff={handleOpenScheduleStaff}
      />
    </div>
  );
};

export default ScheduleView;
