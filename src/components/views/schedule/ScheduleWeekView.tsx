import React from 'react';
import { CalendarEvent } from './types';
import { MONTH_NAMES_PT } from './constants';

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
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
  onOpenEvent?: (ev: CalendarEvent) => void;
}

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  weekDays,
  selectedDate,
  setSelectedDate,
  todayStr,
  activeYear,
  eventsByDate,
  selectedDateEvents,
  formattedSelectedDate,
  handlePrevWeek,
  handleNextWeek,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  renderEventCard,
  onOpenEvent
}) => {
  return (
    <div className="space-y-4">
      {/* Week Header Navigator */}
      <div className="ui-card p-3.5 flex items-center justify-between gap-2">
        <button type="button" onClick={handlePrevWeek} className="ui-btn ui-btn-secondary p-2 px-3 text-xs">
          ◀ Semana Anterior
        </button>

        <div className="text-center">
          <div className="text-sm sm:text-base font-['Chakra_Petch'] font-black text-white">
            {weekDays[0].dayNum} de {MONTH_NAMES_PT[new Date(weekDays[0].dateStr + 'T12:00:00').getMonth()]} —{' '}
            {weekDays[6].dayNum} de {MONTH_NAMES_PT[new Date(weekDays[6].dateStr + 'T12:00:00').getMonth()]}{' '}
            {activeYear}
          </div>
          <div className="text-[11px] font-mono text-cyan-400">Semana da Época Desportiva</div>
        </div>

        <button type="button" onClick={handleNextWeek} className="ui-btn ui-btn-secondary p-2 px-3 text-xs">
          Próxima Semana ▶
        </button>
      </div>

      {/* 7 Columns for the week */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
        {weekDays.map((wd) => {
          const dayEvs = eventsByDate.get(wd.dateStr) || [];
          const isToday = wd.dateStr === todayStr;
          const isSelected = wd.dateStr === selectedDate;

          return (
            <div
              key={wd.dateStr}
              onClick={() => setSelectedDate(wd.dateStr)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col ${
                isToday
                  ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                  : isSelected
                    ? 'bg-slate-900 border-amber-400/80 shadow-md'
                    : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Day Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                <div>
                  <span className="text-xs font-bold font-['Chakra_Petch'] text-white block uppercase">
                    {wd.dayName}
                  </span>
                  <span className={`text-base font-black font-mono ${isToday ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {wd.dayNum}
                  </span>
                </div>

                {isToday && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 text-[9px] font-mono font-bold uppercase">
                    Hoje
                  </span>
                )}
              </div>

              {/* Day Events */}
              <div className="space-y-1.5 flex-1 min-h-[90px]">
                {dayEvs.map((ev) => {
                  const isMatch = ev.category === 'match';
                  const isStaff = ev.category === 'staff_unavailability';
                  const isClub = ev.category === 'club_event';
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(ev.date);
                        if (onOpenEvent) onOpenEvent(ev);
                      }}
                      className={`p-2 rounded-xl border text-xs transition-all cursor-pointer hover:scale-102 hover:shadow-lg ${
                        isMatch
                          ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200 hover:border-cyan-300'
                          : isStaff
                            ? 'bg-orange-950/80 border-orange-500/50 text-orange-200 hover:border-orange-300'
                            : isClub
                              ? 'bg-purple-950/80 border-purple-500/50 text-purple-200 hover:border-purple-300'
                              : ev.isCompleted
                                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 hover:border-emerald-300'
                                : 'bg-amber-950/80 border-amber-500/50 text-amber-200 hover:border-amber-300'
                      }`}
                      title={`Clica para abrir / editar: ${ev.title}`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-0.5">
                        <span>{ev.time}h</span>
                        <span>
                          {isMatch ? '⚽ JOGO' : isStaff ? '🚫 INDISPONÍVEL' : isClub ? '👥 EVENTO' : '⚡ TREINO'}
                        </span>
                      </div>
                      <div className="font-bold line-clamp-1 text-[11px] flex items-center justify-between gap-1">
                        <span>{ev.title}</span>
                        <span className="text-[10px] opacity-60">↗</span>
                      </div>
                    </div>
                  );
                })}

                {dayEvs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[11px] font-mono text-slate-600 italic py-4">
                    Livre
                  </div>
                )}
              </div>

              {/* Quick Add on Column Bottom */}
              <div className="pt-2 mt-2 border-t border-slate-800/60 grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScheduleMatch(wd.dateStr);
                  }}
                  className="ui-btn ui-btn-secondary p-1 text-[10px] text-center"
                  title="Adicionar Jogo"
                >
                  + ⚽
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScheduleTraining(wd.dateStr);
                  }}
                  className="ui-btn ui-btn-secondary p-1 text-[10px] text-center"
                  title="Adicionar Treino"
                >
                  + ⚡
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenClubEventModal(wd.dateStr);
                  }}
                  className="ui-btn ui-btn-secondary p-1 text-[10px] text-center"
                  title="Adicionar Reunião / Formação"
                >
                  + 👥
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScheduleStaff(wd.dateStr);
                  }}
                  className="ui-btn ui-btn-secondary p-1 text-[10px] text-center"
                  title="Adicionar Indisponibilidade"
                >
                  + 🚫
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Event Drawer below week */}
      {selectedDateEvents.length > 0 && (
        <div className="ui-card mt-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-800">
            <div className="text-sm font-['Chakra_Petch'] font-bold uppercase text-white flex items-center gap-2">
              <span>📅</span>
              <span>Detalhes de {formattedSelectedDate}:</span>
              <span className="text-xs font-mono text-cyan-400">({selectedDateEvents.length} eventos)</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenScheduleMatch(selectedDate)}
                className="ui-btn ui-btn-primary px-2.5 py-1 text-xs flex items-center gap-1"
              >
                <span>⚽</span>
                <span>＋ Jogo</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenScheduleTraining(selectedDate)}
                className="ui-btn ui-btn-warning px-2.5 py-1 text-xs flex items-center gap-1"
              >
                <span>⚡</span>
                <span>＋ Treino</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenClubEventModal(selectedDate)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>👥</span>
                <span>＋ Reunião / Formação</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenScheduleStaff(selectedDate)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>🚫</span>
                <span>＋ Indisponível</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">{selectedDateEvents.map((ev) => renderEventCard(ev))}</div>
        </div>
      )}
    </div>
  );
};
