import React from 'react';
import { CalendarViewMode, EventFilterType, ScheduleStats } from './types';
import { CompactSelect } from '../../ui/CompactSelect';

interface ScheduleFiltersProps {
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  eventTypeFilter: EventFilterType;
  setEventTypeFilter: (filter: EventFilterType) => void;
  stats: ScheduleStats;
}

const VIEWS: [CalendarViewMode, string][] = [
  ['lista', 'Lista'],
  ['dia', 'Dia'],
  ['semana', 'Semana'],
  ['mes', 'Mês'],
  ['anual', 'Ano']
];

/** How the Agenda is shown (list, day, week, month, year) and what it shows (everything, games, trainings…). */
export const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  viewMode,
  setViewMode,
  eventTypeFilter,
  setEventTypeFilter,
  stats
}) => (
  <div className="flex items-center gap-1.5">
    <div role="group" aria-label="Vista da agenda" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {VIEWS.map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          aria-pressed={viewMode === mode}
          onClick={() => setViewMode(mode)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            viewMode === mode
              ? 'border-slate-600 bg-slate-800 text-white'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
    <CompactSelect
      label="Mostrar na agenda"
      value={eventTypeFilter}
      onChange={(v) => setEventTypeFilter(v as EventFilterType)}
      className="ml-auto shrink-0 rounded-full border border-slate-800 px-3 py-1.5 text-xs"
      options={[
        ['all', 'Tudo'],
        ['matches', `Jogos (${stats.matchesCount})`],
        ['trainings', `Treinos (${stats.trainingsCount})`],
        ['events', `Reuniões (${stats.clubEventsCount})`],
        ['unavailability', `Equipa técnica (${stats.staffCount})`]
      ]}
    />
  </div>
);
