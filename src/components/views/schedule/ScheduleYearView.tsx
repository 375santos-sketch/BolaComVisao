import React from 'react';
import { CalendarEvent } from './types';
import { MONTH_NAMES_PT, WEEKDAY_SHORT_PT } from './constants';

interface ScheduleYearViewProps {
  activeYear: number;
  setActiveYear: React.Dispatch<React.SetStateAction<number>>;
  setActiveMonth: (m: number) => void;
  setSelectedDate: (d: string) => void;
  setViewMode: (mode: any) => void;
  todayStr: string;
  allEvents: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onOpenScheduleMatch: () => void;
  onOpenScheduleTraining: () => void;
  onOpenClubEventModal: () => void;
  onOpenScheduleStaff: () => void;
}

export const ScheduleYearView: React.FC<ScheduleYearViewProps> = ({
  activeYear,
  setActiveYear,
  setActiveMonth,
  setSelectedDate,
  setViewMode,
  todayStr,
  allEvents,
  eventsByDate,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff
}) => {
  return (
    <div className="space-y-4">
      {/* Year Navigator */}
      <div className="ui-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveYear((prev) => prev - 1)}
            className="ui-btn ui-btn-secondary p-2 px-3 text-xs"
          >
            ◀ {activeYear - 1}
          </button>

          <button
            type="button"
            onClick={() => setActiveYear(new Date().getFullYear())}
            className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
          >
            Ano Atual
          </button>

          <button
            type="button"
            onClick={() => setActiveYear((prev) => prev + 1)}
            className="ui-btn ui-btn-secondary p-2 px-3 text-xs"
          >
            {activeYear + 1} ▶
          </button>
        </div>

        <div className="text-center">
          <div className="text-xl sm:text-2xl font-['Chakra_Petch'] font-black text-white">
            Época / Ano Desportivo {activeYear}
          </div>
          <div className="text-xs font-mono text-cyan-400">
            Visão Geral Anual de Jogos, Treinos, Reuniões e Indisponibilidades
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            type="button"
            onClick={onOpenScheduleMatch}
            className="ui-btn ui-btn-soft p-1.5 px-2.5 text-xs flex items-center gap-1"
            title="Agendar Jogo"
          >
            <span>⚽</span>
            <span>＋ Jogo</span>
          </button>
          <button
            type="button"
            onClick={onOpenScheduleTraining}
            className="ui-btn ui-btn-soft-warning p-1.5 px-2.5 text-xs flex items-center gap-1"
            title="Agendar Treino"
          >
            <span>⚡</span>
            <span>＋ Treino</span>
          </button>
          <button
            type="button"
            onClick={onOpenClubEventModal}
            className="ui-btn ui-btn-soft p-1.5 px-2.5 text-xs flex items-center gap-1"
            title="Reunião / Formação"
          >
            <span>👥</span>
            <span>＋ Reunião</span>
          </button>
          <button
            type="button"
            onClick={onOpenScheduleStaff}
            className="ui-btn ui-btn-soft-warning p-1.5 px-2.5 text-xs flex items-center gap-1"
            title="Indisponível (Equipa)"
          >
            <span>🚫</span>
            <span>＋ Indisp.</span>
          </button>
        </div>
      </div>

      {/* 12 Mini Months Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {MONTH_NAMES_PT.map((mName, mIdx) => {
          const firstDay = new Date(activeYear, mIdx, 1);
          const lastDay = new Date(activeYear, mIdx + 1, 0);
          const totalDays = lastDay.getDate();
          const startOffset = (firstDay.getDay() + 6) % 7;

          // Count events for this month
          const monthEvents = allEvents.filter((ev) => {
            const parts = ev.date.split('-');
            return parseInt(parts[0], 10) === activeYear && parseInt(parts[1], 10) === mIdx + 1;
          });

          const mMatches = monthEvents.filter((e) => e.category === 'match');
          const mTrainings = monthEvents.filter((e) => e.category === 'training');
          const mClubs = monthEvents.filter((e) => e.category === 'club_event');
          const mStaff = monthEvents.filter((e) => e.category === 'staff_unavailability');

          return (
            <div
              key={mIdx}
              className="ui-card p-3.5 transition-all flex flex-col justify-between cursor-pointer"
              onClick={() => {
                setActiveMonth(mIdx);
                setViewMode('mes');
              }}
            >
              <div>
                {/* Month Card Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="font-['Chakra_Petch'] font-bold text-white uppercase text-sm">{mName}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                    {monthEvents.length} ev.
                  </span>
                </div>

                {/* Mini Weekday Headers */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-mono text-slate-500 mb-1">
                  {WEEKDAY_SHORT_PT.map((wd, i) => (
                    <span key={i}>{wd[0]}</span>
                  ))}
                </div>

                {/* Mini Calendar Days */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-mono">
                  {/* Leading offset */}
                  {Array.from({ length: startOffset }).map((_, i) => (
                    <span key={`off-${i}`} className="p-1 opacity-20">
                      -
                    </span>
                  ))}

                  {/* Days */}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${activeYear}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(
                      2,
                      '0'
                    )}`;
                    const hasEvs = eventsByDate.get(dateStr);
                    const hasMatch = hasEvs && hasEvs.some((e) => e.category === 'match');
                    const hasTr = hasEvs && hasEvs.some((e) => e.category === 'training');
                    const hasClub = hasEvs && hasEvs.some((e) => e.category === 'club_event');
                    const hasSt = hasEvs && hasEvs.some((e) => e.category === 'staff_unavailability');
                    const isToday = dateStr === todayStr;

                    return (
                      <span
                        key={dayNum}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(dateStr);
                          setActiveMonth(mIdx);
                          setViewMode('dia');
                        }}
                        className={`p-1 rounded transition-all ${
                          isToday
                            ? 'bg-cyan-400 text-slate-950 font-black'
                            : hasMatch && hasTr
                              ? 'bg-gradient-to-br from-cyan-500 to-amber-500 text-slate-950 font-bold'
                              : hasMatch
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-bold'
                                : hasTr
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/60 font-bold'
                                  : hasClub
                                    ? 'bg-purple-950 text-purple-300 border border-purple-500/60 font-bold'
                                    : hasSt
                                      ? 'bg-orange-950 text-orange-300 border border-orange-500/60 font-bold'
                                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={dateStr}
                      >
                        {dayNum}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Month Card Footer Stats */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 flex-wrap gap-1">
                <span>⚽ {mMatches.length}</span>
                <span>⚡ {mTrainings.length}</span>
                <span>👥 {mClubs.length}</span>
                <span>🚫 {mStaff.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
