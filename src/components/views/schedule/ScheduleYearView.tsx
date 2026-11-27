import React from 'react';
import { CalendarEvent } from './types';
import { Icon } from '../../ui/Icon';
import { AddEventButtons } from './AddEventButtons';
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
            className="ui-btn ui-btn-secondary min-h-10 px-3 text-ui-caption"
          >
            <Icon name="chevronLeft" className="h-4 w-4 shrink-0" />
            {activeYear - 1}
          </button>

          <button
            type="button"
            onClick={() => setActiveYear(new Date().getFullYear())}
            className="ui-btn ui-btn-secondary min-h-10 px-4 text-ui-caption"
          >
            Ano atual
          </button>

          <button
            type="button"
            onClick={() => setActiveYear((prev) => prev + 1)}
            className="ui-btn ui-btn-secondary min-h-10 px-3 text-ui-caption"
          >
            {activeYear + 1}
            <Icon name="chevronRight" className="h-4 w-4 shrink-0" />
          </button>
        </div>

        <div className="text-center">
          <div className="text-ui-lead font-bold text-ui-text">Ano {activeYear}</div>
          <div className="text-ui-caption text-ui-muted">Jogos, treinos, reuniões e indisponibilidades</div>
        </div>

        <AddEventButtons
          date={todayStr}
          onOpenScheduleMatch={() => onOpenScheduleMatch()}
          onOpenScheduleTraining={() => onOpenScheduleTraining()}
          onOpenClubEventModal={() => onOpenClubEventModal()}
          onOpenScheduleStaff={() => onOpenScheduleStaff()}
          compact
          className="justify-end"
        />
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
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-ui-line">
                  <span className="font-bold text-ui-text text-sm">{mName}</span>
                  <span className="ui-badge ui-badge-brand tabular-nums">
                    {monthEvents.length} {monthEvents.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>

                {/* Mini Weekday Headers */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-ui-muted mb-1">
                  {WEEKDAY_SHORT_PT.map((wd, i) => (
                    <span key={i}>{wd[0]}</span>
                  ))}
                </div>

                {/* Mini Calendar Days */}
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] tabular-nums">
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
                            ? 'bg-ui-brand text-ui-brand-ink font-bold'
                            : hasMatch
                              ? 'bg-ui-brand-soft text-ui-brand border border-ui-brand/60 font-bold'
                              : hasTr
                                ? 'bg-ui-warning-soft text-ui-warning border border-ui-warning/60 font-bold'
                                : hasClub
                                  ? 'bg-ui-brand-soft text-ui-brand border border-ui-brand/60 font-bold'
                                  : hasSt
                                    ? 'bg-ui-warning-soft text-ui-warning border border-ui-warning/60 font-bold'
                                    : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
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
              <div className="mt-3 pt-2 border-t border-ui-line/80 flex items-center justify-between text-[11px] text-ui-muted flex-wrap gap-1 tabular-nums">
                <span>
                  {mMatches.length} {mMatches.length === 1 ? 'jogo' : 'jogos'}
                </span>
                <span>
                  {mTrainings.length} {mTrainings.length === 1 ? 'treino' : 'treinos'}
                </span>
                <span>
                  {mClubs.length} {mClubs.length === 1 ? 'reunião' : 'reuniões'}
                </span>
                <span>{mStaff.length} indisp.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
