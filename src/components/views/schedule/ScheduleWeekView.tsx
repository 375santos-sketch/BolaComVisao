import React from 'react';
import { CalendarEvent } from './types';
import { MONTH_NAMES_PT } from './constants';
import { EmptyState } from '../../ui/EmptyState';

interface WeekDayItem {
  dateStr: string;
  dayNum: number;
  dayName: string;
}

interface ScheduleWeekViewProps {
  weekDays: WeekDayItem[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  todayStr: string;
  activeYear: number;
  eventsByDate: Map<string, CalendarEvent[]>;
  selectedDateEvents: CalendarEvent[];
  formattedSelectedDate: string;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  onGoToday?: () => void;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
  onOpenEvent?: (ev: CalendarEvent) => void;
}

/** One colour per kind of event, the same in the dots, the chips and the legend. */
const KIND: Record<CalendarEvent['category'], { label: string; dot: string; chip: string }> = {
  training: { label: 'Treino', dot: 'bg-ui-success', chip: 'border-l-ui-success' },
  match: { label: 'Jogo', dot: 'bg-ui-brand', chip: 'border-l-ui-brand' },
  club_event: { label: 'Reunião', dot: 'bg-ui-warning', chip: 'border-l-ui-warning' },
  staff_unavailability: { label: 'Indisponível', dot: 'bg-ui-danger', chip: 'border-l-ui-danger' }
};

const shortMonth = (iso: string) => MONTH_NAMES_PT[new Date(`${iso}T12:00:00`).getMonth()].slice(0, 3).toLowerCase();

/**
 * Agenda → Semana: the seven days in a row (dots on the phone, the events themselves on wider screens) and, under
 * them, everything of the day chosen.
 */
export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  weekDays,
  selectedDate,
  setSelectedDate,
  todayStr,
  eventsByDate,
  selectedDateEvents,
  formattedSelectedDate,
  handlePrevWeek,
  handleNextWeek,
  onGoToday,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  renderEventCard,
  onOpenEvent
}) => {
  const first = weekDays[0].dateStr;
  const last = weekDays[6].dateStr;
  const inThisWeek = todayStr >= first && todayStr <= last;
  return (
    <div className="space-y-3">
      <section aria-label="Semana" className="ui-card p-2.5 sm:p-3">
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={handlePrevWeek}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          >
            ‹
          </button>
          <h2 className="flex-1 text-center text-ui-body font-extrabold text-ui-text">
            {weekDays[0].dayNum} {shortMonth(first)} – {weekDays[6].dayNum} {shortMonth(last)}
          </h2>
          <button
            type="button"
            onClick={handleNextWeek}
            aria-label="Semana seguinte"
            className="flex h-8 w-8 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
          >
            ›
          </button>
          {onGoToday && !inThisWeek && (
            <button type="button" onClick={onGoToday} className="ui-btn ui-btn-soft px-2.5 py-1 text-ui-caption">
              Hoje
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekDays.map((wd) => {
            const events = eventsByDate.get(wd.dateStr) || [];
            const isToday = wd.dateStr === todayStr;
            const isSelected = wd.dateStr === selectedDate;
            return (
              <div
                key={wd.dateStr}
                className={`flex min-w-0 flex-col rounded-ui-sm border transition-colors md:min-h-[150px] ${
                  isSelected
                    ? 'border-ui-brand bg-ui-brand-soft'
                    : isToday
                      ? 'border-ui-line-strong bg-ui-surface-2'
                      : 'border-ui-line hover:border-ui-line-strong'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate(wd.dateStr)}
                  aria-pressed={isSelected}
                  aria-label={`${wd.dayName} ${wd.dayNum}: ${events.length ? `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}` : 'livre'}`}
                  className="flex flex-col items-center gap-0.5 px-0.5 py-2 md:items-start md:px-2"
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-ui-brand' : 'text-ui-muted'}`}
                  >
                    {wd.dayName.slice(0, 3)}
                  </span>
                  <span
                    className={`ui-figure text-ui-lead ${
                      isToday ? 'text-ui-brand' : isSelected ? 'text-ui-text' : 'text-ui-text'
                    }`}
                  >
                    {wd.dayNum}
                  </span>
                  {/* Phone: one dot per event */}
                  <span className="flex h-2 items-center gap-0.5 md:hidden" aria-hidden>
                    {events.slice(0, 4).map((ev) => (
                      <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${KIND[ev.category].dot}`} />
                    ))}
                  </span>
                </button>
                {/* Wider screens: the events themselves */}
                <ul className="hidden flex-1 space-y-1 px-1.5 pb-1.5 md:block">
                  {events.slice(0, 3).map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(ev.date);
                          onOpenEvent?.(ev);
                        }}
                        title={ev.title}
                        className={`w-full rounded-[6px] border-l-[3px] bg-ui-surface-2 px-1.5 py-1 text-left hover:bg-ui-surface-3 ${KIND[ev.category].chip}`}
                      >
                        <span className="block text-[10px] font-bold text-ui-muted">{ev.time || '—'}</span>
                        <span className="block truncate text-[11px] font-bold text-ui-text">{ev.title}</span>
                      </button>
                    </li>
                  ))}
                  {events.length > 3 && (
                    <li className="px-1 text-[10px] font-bold text-ui-muted">+{events.length - 3}</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        <ul
          className="mt-2.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ui-muted"
          aria-label="Legenda"
        >
          {Object.values(KIND).map((k) => (
            <li key={k.label} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${k.dot}`} aria-hidden /> {k.label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Dia escolhido" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="text-ui-body font-extrabold text-ui-text first-letter:uppercase">{formattedSelectedDate}</h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onOpenScheduleTraining(selectedDate)}
              className="ui-btn ui-btn-soft px-2.5 py-1 text-ui-caption"
            >
              + Treino
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleMatch(selectedDate)}
              className="ui-btn ui-btn-secondary px-2.5 py-1 text-ui-caption"
            >
              + Jogo
            </button>
            <button
              type="button"
              onClick={() => onOpenClubEventModal(selectedDate)}
              className="ui-btn ui-btn-secondary px-2.5 py-1 text-ui-caption"
              title="Adicionar Reunião / Formação"
            >
              + Reunião
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleStaff(selectedDate)}
              className="ui-btn ui-btn-secondary hidden px-2.5 py-1 text-ui-caption sm:inline-flex"
              title="Adicionar Indisponibilidade"
            >
              + Indisponível
            </button>
          </div>
        </div>
        {selectedDateEvents.length ? (
          <div className="space-y-2">{selectedDateEvents.map(renderEventCard)}</div>
        ) : (
          <EmptyState compact icon="calendar" title="Dia livre" text="Sem treinos, jogos ou reuniões neste dia." />
        )}
      </section>
    </div>
  );
};
