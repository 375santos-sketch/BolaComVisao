import React from 'react';
import { CalendarEvent } from './types';
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
  return (
    <div className="space-y-4">
      {/* Month Header Navigator */}
      <div className="ui-card p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="ui-btn ui-btn-secondary p-2 px-3 min-h-[38px] text-sm touch-manipulation"
              title="Mês Anterior"
            >
              ◀
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="ui-btn ui-btn-secondary px-3 py-1.5 min-h-[38px] text-xs touch-manipulation"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="ui-btn ui-btn-secondary p-2 px-3 min-h-[38px] text-sm touch-manipulation"
              title="Próximo Mês"
            >
              ▶
            </button>
          </div>

          <div className="text-right sm:text-center sm:hidden">
            <div className="text-base font-['Chakra_Petch'] font-black text-ui-text tracking-wide">
              {MONTH_NAMES_PT[activeMonth]} {activeYear}
            </div>
          </div>
        </div>

        <div className="text-center hidden sm:block">
          <div className="text-lg sm:text-xl font-['Chakra_Petch'] font-black text-ui-text tracking-wide">
            {MONTH_NAMES_PT[activeMonth]} {activeYear}
          </div>
          <div className="text-xs font-mono text-ui-muted">Calendário de Jogos, Treinos & Equipa Técnica</div>
        </div>

        {/* Jump to Month Picker + Quick Add */}
        <div className="flex items-center gap-1.5 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(parseInt(e.target.value, 10))}
            className="ui-input min-h-[36px] text-xs"
          >
            {MONTH_NAMES_PT.map((mName, idx) => (
              <option key={idx} value={idx}>
                {mName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenScheduleMatch(selectedDate)}
              className="ui-btn ui-btn-soft p-1.5 px-2.5 min-h-[36px] text-xs flex items-center gap-1 touch-manipulation"
              title="Agendar Jogo"
            >
              <span>⚽</span>
              <span className="inline">＋ Jogo</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScheduleTraining(selectedDate)}
              className="ui-btn ui-btn-soft-warning p-1.5 px-2.5 min-h-[36px] text-xs flex items-center gap-1 touch-manipulation"
              title="Agendar Treino"
            >
              <span>⚡</span>
              <span className="inline">＋ Treino</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenClubEventModal(selectedDate)}
              className="ui-btn ui-btn-soft p-1.5 px-2 min-h-[36px] text-xs flex items-center gap-1 touch-manipulation"
              title="Reunião / Formação"
            >
              <span>👥</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScheduleStaff(selectedDate)}
              className="ui-btn ui-btn-soft-warning p-1.5 px-2 min-h-[36px] text-xs flex items-center gap-1 touch-manipulation"
              title="Indisponível (Equipa Técnica)"
            >
              <span>🚫</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Matrix Grid */}
      <div className="ui-card p-3 sm:p-4 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 mb-2 border-b border-ui-line text-xs font-['Chakra_Petch'] font-bold uppercase text-ui-muted">
          {WEEKDAY_SHORT_PT.map((wd, i) => (
            <div key={i} className={i >= 5 ? 'text-ui-warning' : ''}>
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
                        ? 'bg-ui-inset border-ui-brand shadow-[0_0_12px_rgba(0,210,255,0.25)] ring-1 ring-ui-brand'
                        : isSelected
                          ? 'bg-ui-inset border-ui-warning shadow-md ring-1 ring-ui-warning'
                          : dayEvs.length > 0
                            ? 'bg-ui-inset/90 border-ui-line-strong/80 hover:border-ui-line-strong'
                            : 'bg-ui-inset/60 border-ui-line/60 hover:border-ui-line-strong'
                    }`}
                  >
                    {/* Day Cell Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-mono ${
                          isToday
                            ? 'text-ui-brand font-black'
                            : isSelected
                              ? 'text-ui-warning font-black'
                              : 'text-ui-text'
                        }`}
                      >
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
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono truncate font-bold cursor-pointer hover:scale-105 transition-all shadow-sm ${
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
                            {isMatch ? '⚽ ' : isStaff ? '🚫 ' : isClub ? '👥 ' : '⚡ '}
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvs.length > 2 && (
                        <div className="text-[8px] font-mono text-ui-muted text-center">+{dayEvs.length - 2} mais</div>
                      )}
                    </div>

                    {/* Mobile Event Counters */}
                    <div className="sm:hidden flex items-center justify-center gap-1 text-[9px] font-mono flex-wrap">
                      {matchEvents.length > 0 && <span className="text-ui-brand">⚽{matchEvents.length}</span>}
                      {trainingEvents.length > 0 && <span className="text-ui-warning">⚡{trainingEvents.length}</span>}
                      {clubEvents.length > 0 && <span className="text-ui-brand">👥{clubEvents.length}</span>}
                      {staffEvents.length > 0 && <span className="text-ui-warning">🚫{staffEvents.length}</span>}
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
            <span className="p-2 rounded-xl bg-ui-brand/20 text-ui-brand border border-ui-brand/40 text-base">📅</span>
            <div>
              <h3 className="text-base font-['Chakra_Petch'] font-black text-ui-text capitalize">
                {formattedSelectedDate}
              </h3>
              <span className="text-xs font-mono text-ui-muted">
                {selectedDateEvents.length === 0
                  ? 'Nenhum evento agendado'
                  : `${selectedDateEvents.length} ${
                      selectedDateEvents.length === 1 ? 'evento registado' : 'eventos registados'
                    }`}
              </span>
            </div>
          </div>

          {/* Quick Actions for Selected Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenScheduleMatch(selectedDate)}
              className="ui-btn ui-btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <span>⚽</span>
              <span>＋ Jogo</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleTraining(selectedDate)}
              className="ui-btn ui-btn-warning px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <span>⚡</span>
              <span>＋ Treino</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenClubEventModal(selectedDate)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-ui-brand to-ui-brand hover:from-ui-brand hover:to-ui-brand text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
            >
              <span>👥</span>
              <span>＋ Reunião / Formação</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleStaff(selectedDate)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-ui-warning to-ui-danger hover:from-ui-warning hover:to-ui-danger text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1"
            >
              <span>🚫</span>
              <span>＋ Indisponível</span>
            </button>
          </div>
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-3">{selectedDateEvents.map((ev) => renderEventCard(ev))}</div>
        ) : (
          <div className="ui-inset p-6 text-center font-mono text-xs text-ui-muted">
            Dia livre na agenda. Clica em <strong>"+ Jogo"</strong>, <strong>"+ Treino"</strong>,{' '}
            <strong>"+ Reunião / Formação"</strong> ou <strong>"+ Indisponível"</strong> para agendar eventos para esta
            data.
          </div>
        )}
      </div>
    </div>
  );
};
