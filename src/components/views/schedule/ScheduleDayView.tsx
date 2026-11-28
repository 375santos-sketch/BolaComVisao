import React from 'react';
import { DateTimePT } from '../../ui/DateTimePT';
import { CalendarEvent } from './types';
import { Icon } from '../../ui/Icon';
import { AddEventButtons } from './AddEventButtons';

interface ScheduleDayViewProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  setActiveYear: React.Dispatch<React.SetStateAction<number>>;
  setActiveMonth: React.Dispatch<React.SetStateAction<number>>;
  todayStr: string;
  formattedSelectedDate: string;
  selectedDateEvents: CalendarEvent[];
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleGoToday: () => void;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
}

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  selectedDate,
  setSelectedDate,
  setActiveYear,
  setActiveMonth,
  todayStr,
  formattedSelectedDate,
  selectedDateEvents,
  handlePrevDay,
  handleNextDay,
  handleGoToday,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  renderEventCard
}) => {
  const add = {
    date: selectedDate,
    onOpenScheduleMatch,
    onOpenScheduleTraining,
    onOpenClubEventModal,
    onOpenScheduleStaff
  };
  return (
    <div className="space-y-4">
      {/* Day Navigation Controls */}
      <div className="ui-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="ui-btn ui-btn-secondary h-10 w-10 px-0"
            title="Dia anterior"
            aria-label="Dia anterior"
          >
            <Icon name="chevronLeft" className="h-5 w-5 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleGoToday}
            className={`ui-btn min-h-10 px-4 text-ui-caption ${
              selectedDate === todayStr ? 'ui-btn-primary' : 'ui-btn-secondary'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={handleNextDay}
            className="ui-btn ui-btn-secondary h-10 w-10 px-0"
            title="Dia seguinte"
            aria-label="Dia seguinte"
          >
            <Icon name="chevronRight" className="h-5 w-5 shrink-0" />
          </button>
        </div>

        <div className="text-center sm:text-right">
          <div className="text-ui-lead font-bold text-ui-text first-letter:uppercase">{formattedSelectedDate}</div>
          <div className="text-ui-caption text-ui-muted">
            {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'evento' : 'eventos'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DateTimePT
            type="date"
            label="Data"
            value={selectedDate}
            onChange={(v) => {
              if (v) {
                setSelectedDate(v);
                const dt = new Date(v + 'T12:00:00');
                setActiveYear(dt.getFullYear());
                setActiveMonth(dt.getMonth());
              }
            }}
            inputClassName="ui-input text-xs"
          />
        </div>
      </div>

      {/* Events List for Day */}
      {selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((ev) => renderEventCard(ev))}

          {/* Quick Actions Footer for Day View */}
          <div className="ui-card p-3.5 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-ui-caption text-ui-muted">Adicionar a este dia</span>
            <AddEventButtons {...add} />
          </div>
        </div>
      ) : (
        <div className="ui-card p-8 text-center">
          <Icon name="calendar" className="mx-auto mb-3 h-8 w-8 text-ui-muted" />
          <h3 className="text-ui-body font-bold text-ui-text mb-1">Sem eventos neste dia</h3>
          <p className="text-ui-caption text-ui-muted max-w-md mx-auto mb-4">
            Podes agendar um jogo, um treino, uma reunião ou formação, ou marcar uma indisponibilidade da equipa
            técnica.
          </p>
          <AddEventButtons {...add} className="justify-center" />
        </div>
      )}
    </div>
  );
};
