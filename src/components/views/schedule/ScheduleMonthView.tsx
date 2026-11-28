import React from 'react';
import { CalendarEvent } from './types';
import { Icon } from '../../ui/Icon';
import { AddEventButtons } from './AddEventButtons';
import { MONTH_NAMES_PT, WEEKDAY_SHORT_PT } from './constants';

interface ScheduleMonthViewProps {
  activeMonth: number;
  setActiveMonth: (month: number) => void;
  activeYear: number;
  todayStr: string;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  formattedSelectedDate: string;
  eventsByDate: Map<string, CalendarEvent[]>;
  monthMatrix: (number | null)[][];
  selectedDateEvents: CalendarEvent[];
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleGoToday: () => void;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
  onOpenEvent?: (ev: CalendarEvent) => void;
}

export const ScheduleMonthView: React.FC<ScheduleMonthViewProps> = ({
  activeMonth,
  setActiveMonth,
  activeYear,
  todayStr,
  selectedDate,
  setSelectedDate,
  formattedSelectedDate,
  eventsByDate,
  monthMatrix,
  selectedDateEvents,
  handlePrevMonth,
  handleNextMonth,
  handleGoToday,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  renderEventCard,
  onOpenEvent
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
      {/* Month Header Navigator */}
      <div className="ui-card p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="ui-btn ui-btn-secondary h-10 w-10 px-0 touch-manipulation"
              title="Mês anterior"
              aria-label="Mês anterior"
            >
              <Icon name="chevronLeft" className="h-5 w-5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="ui-btn ui-btn-secondary min-h-10 px-4 text-ui-caption touch-manipulation"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="ui-btn ui-btn-secondary h-10 w-10 px-0 touch-manipulation"
              title="Mês seguinte"
              aria-label="Mês seguinte"
            >
              <Icon name="chevronRight" className="h-5 w-5 shrink-0" />
            </button>
          </div>

          <div className="text-right sm:text-center sm:hidden">
            <div className="text-ui-lead font-bold text-ui-text">
              {MONTH_NAMES_PT[activeMonth]} {activeYear}
            </div>
          </div>
        </div>

        <div className="text-center hidden sm:block">
          <div className="text-ui-lead font-bold text-ui-text">
            {MONTH_NAMES_PT[activeMonth]} {activeYear}
          </div>
          <div className="text-ui-caption text-ui-muted">Jogos, treinos, reuniões e indisponibilidades</div>
        </div>

        {/* Jump to Month Picker + Quick Add */}
        <div className="flex items-center gap-1.5 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(parseInt(e.target.value, 10))}
            className="ui-input min-h-10 text-xs"
          >
            {MONTH_NAMES_PT.map((mName, idx) => (
              <option key={idx} value={idx}>
                {mName}
              </option>
            ))}
          </select>

          <AddEventButtons {...add} compact className="gap-1" />
        </div>
      </div>

      {/* Monthly Matrix Grid */}
      <div className="ui-card p-3 sm:p-4 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 mb-2 border-b border-ui-line text-ui-caption font-semibold text-ui-muted">
          {WEEKDAY_SHORT_PT.map((wd, i) => (
            <div key={i} className={i >= 5 ? 'text-ui-text' : ''}>
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="space-y-1 sm:space-y-2">
          {monthMatrix.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1 sm:gap-2">
              {week.map((dayNum, dIdx) => {
                if (dayNum === null) {
                  return <div key={`empty-${dIdx}`} className="ui-inset min-h-[64px] sm:min-h-[85px] opacity-40" />;
                }

                const dateStr = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(
                  2,
                  '0'
                )}`;
                const dayEvs = eventsByDate.get(dateStr) || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                const matchEvents = dayEvs.filter((e) => e.category === 'match');
                const trainingEvents = dayEvs.filter((e) => e.category === 'training');
                const staffEvents = dayEvs.filter((e) => e.category === 'staff_unavailability');
                const clubEvents = dayEvs.filter((e) => e.category === 'club_event');

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[64px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isToday
                        ? 'bg-ui-brand-soft border-ui-brand ring-1 ring-ui-brand'
                        : isSelected
                          ? 'bg-ui-surface-2 border-ui-line-strong ring-1 ring-ui-line-strong'
                          : dayEvs.length > 0
                            ? 'bg-ui-inset/90 border-ui-line-strong/80 hover:border-ui-line-strong'
                            : 'bg-ui-inset/60 border-ui-line/60 hover:border-ui-line-strong'
                    }`}
                  >
                    {/* Day Cell Header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold tabular-nums ${isToday ? 'text-ui-brand' : 'text-ui-text'}`}>
                        {dayNum}
                      </span>

                      {/* Event Indicators / Dot badges */}
                      <div className="flex items-center gap-0.5">
                        {matchEvents.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-ui-brand" title={`${matchEvents.length} Jogos`} />
                        )}
                        {trainingEvents.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-ui-warning"
                            title={`${trainingEvents.length} Treinos`}
                          />
                        )}
                        {clubEvents.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-ui-brand"
                            title={`${clubEvents.length} Reuniões/Formações`}
                          />
                        )}
                        {staffEvents.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-ui-warning"
                            title={`${staffEvents.length} Indisponibilidades`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Event Pills inside Day Cell (Visible on larger screens) */}
                    <div className="space-y-1 mt-1 hidden sm:block">
                      {dayEvs.slice(0, 2).map((ev) => {
                        const isMatch = ev.category === 'match';
                        const isStaff = ev.category === 'staff_unavailability';
                        const isClub = ev.category === 'club_event';
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(dateStr);
                              if (onOpenEvent) onOpenEvent(ev);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] truncate font-semibold cursor-pointer transition-colors ${
                              isMatch
                                ? 'bg-ui-brand-soft text-ui-brand border border-ui-brand/40 hover:border-ui-brand'
                                : isStaff
                                  ? 'bg-ui-warning-soft text-ui-warning border border-ui-warning/40 hover:border-ui-warning'
                                  : isClub
                                    ? 'bg-ui-brand-soft text-ui-brand border border-ui-brand/40 hover:border-ui-brand'
                                    : ev.isCompleted
                                      ? 'bg-ui-success-soft text-ui-success border border-ui-success/40 hover:border-ui-success'
                                      : 'bg-ui-warning-soft text-ui-warning border border-ui-warning/40 hover:border-ui-warning'
                            }`}
                            title={`Clica para abrir / editar: ${ev.title}`}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvs.length > 2 && (
                        <div className="text-[10px] text-ui-muted text-center">+{dayEvs.length - 2} mais</div>
                      )}
                    </div>

                    {/* Mobile Event Counters */}
                    <div className="sm:hidden flex items-center justify-center text-[10px] font-semibold text-ui-muted tabular-nums">
                      {dayEvs.length > 0 && <span>{dayEvs.length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Details Drawer below Month */}
      <div className="ui-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-ui-line">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-brand">
              <Icon name="calendar" className="h-5 w-5 shrink-0" />
            </span>
            <div>
              <h3 className="text-ui-body font-bold text-ui-text first-letter:uppercase">{formattedSelectedDate}</h3>
              <span className="text-ui-caption text-ui-muted">
                {selectedDateEvents.length === 0
                  ? 'Nenhum evento agendado'
                  : `${selectedDateEvents.length} ${
                      selectedDateEvents.length === 1 ? 'evento registado' : 'eventos registados'
                    }`}
              </span>
            </div>
          </div>

          {/* Quick Actions for Selected Date */}
          <AddEventButtons {...add} />
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-3">{selectedDateEvents.map((ev) => renderEventCard(ev))}</div>
        ) : (
          <div className="ui-inset p-6 text-center text-ui-caption text-ui-muted">
            Dia livre na agenda. Usa os botões acima para agendar um jogo, um treino, uma reunião ou uma
            indisponibilidade.
          </div>
        )}
      </div>
    </div>
  );
};
