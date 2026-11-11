import React, { useState } from 'react';
import { CalendarViewMode, EventFilterType, ScheduleStats } from './types';
import { CompactSelect } from '../../ui/CompactSelect';
import { Icon } from '../../ui/Icon';

interface ScheduleFiltersProps {
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  eventTypeFilter: EventFilterType;
  setEventTypeFilter: (filter: EventFilterType) => void;
  stats: ScheduleStats;
  onImportPrint: () => void;
  onShareCalendar: () => void;
  calendarLinkActive?: boolean;
}

const VIEWS: [CalendarViewMode, string][] = [
  ['dia', 'Dia'],
  ['semana', 'Semana'],
  ['mes', 'Mês'],
  ['lista', 'Lista']
];

/**
 * How the Agenda is shown (day, week, month, list) and what it shows (everything, games, trainings…). The year view
 * and the two less frequent actions live in the "⋯" menu.
 */
export const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  viewMode,
  setViewMode,
  eventTypeFilter,
  setEventTypeFilter,
  stats,
  onImportPrint,
  onShareCalendar,
  calendarLinkActive
}) => {
  const [menu, setMenu] = useState(false);
  const item =
    'flex w-full items-center gap-2 rounded-ui-sm px-3 py-2 text-left text-ui-body text-ui-text hover:bg-ui-surface-2';
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Vista da agenda" className="ui-card flex gap-0.5 p-1">
        {VIEWS.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            aria-pressed={viewMode === mode}
            onClick={() => setViewMode(mode)}
            className={`rounded-ui-sm px-2.5 py-1.5 text-ui-caption font-bold transition-colors sm:px-3.5 ${
              viewMode === mode ? 'bg-ui-surface-3 text-ui-text' : 'text-ui-muted hover:text-ui-text'
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
        className="ml-auto min-w-0 shrink rounded-ui-sm border border-ui-line px-2.5 py-2 text-ui-caption"
        options={[
          ['all', 'Tudo'],
          ['matches', `Jogos (${stats.matchesCount})`],
          ['trainings', `Treinos (${stats.trainingsCount})`],
          ['events', `Reuniões (${stats.clubEventsCount})`],
          ['unavailability', `Equipa técnica (${stats.staffCount})`]
        ]}
      />
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          aria-label="Mais opções da agenda"
          className={`flex h-9 w-9 items-center justify-center rounded-ui-sm border border-ui-line text-ui-muted hover:text-ui-text ${
            viewMode === 'anual' ? 'bg-ui-surface-3 text-ui-text' : ''
          }`}
        >
          <Icon name="more" className="h-4 w-4" />
        </button>
        {menu && (
          <div
            role="menu"
            className="ui-card absolute right-0 top-11 z-30 w-64 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            onClick={() => setMenu(false)}
          >
            <button type="button" role="menuitem" className={item} onClick={() => setViewMode('anual')}>
              <Icon name="calendar" className="h-4 w-4 text-ui-muted" /> Vista do ano
            </button>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={onImportPrint}
              aria-label="Importar jogos de um print do calendário"
            >
              <Icon name="plus" className="h-4 w-4 text-ui-muted" /> Importar jogos de um print
            </button>
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={onShareCalendar}
              aria-label="Calendário para os pais"
            >
              <Icon name="users" className="h-4 w-4 text-ui-muted" /> Calendário para os pais
              {calendarLinkActive && <span className="ui-badge ui-badge-success ml-auto">ativo</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
