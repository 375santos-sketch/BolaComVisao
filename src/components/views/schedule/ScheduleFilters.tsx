import React, { useState } from 'react';
import { CalendarViewMode, EventFilterType, ScheduleStats } from './types';

interface ScheduleFiltersProps {
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  eventTypeFilter: EventFilterType;
  setEventTypeFilter: (filter: EventFilterType) => void;
  stats?: ScheduleStats;
  onOpenScheduleMatch?: (date?: string) => void;
  onOpenScheduleTraining?: (date?: string) => void;
  onOpenClubEventModal?: (date?: string) => void;
  onOpenScheduleStaff?: (date?: string) => void;
  selectedDate?: string;
}

export const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  viewMode,
  setViewMode,
  eventTypeFilter,
  setEventTypeFilter,
  stats,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  selectedDate
}) => {
  const [quickAddDropdownOpen, setQuickAddDropdownOpen] = useState(false);

  return (
    <div className="mb-4 bg-slate-950/90 border border-cyan-500/30 p-1.5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-2.5">
      {/* Temporal Views */}
      <div className="grid grid-cols-5 gap-1 w-full md:w-auto">
        <button
          type="button"
          onClick={() => setViewMode('dia')}
          className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
            viewMode === 'dia'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>📅</span>
          <span>Dia</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('semana')}
          className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
            viewMode === 'semana'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>📆</span>
          <span>Semana</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('mes')}
          className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
            viewMode === 'mes'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>🗓️</span>
          <span>Mês</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('anual')}
          className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
            viewMode === 'anual'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>🪐</span>
          <span>Ano</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('lista')}
          className={`py-2 px-3 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
            viewMode === 'lista'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>📋</span>
          <span>Lista</span>
        </button>
      </div>

      {/* Event Category Filters */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => setEventTypeFilter('all')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
            eventTypeFilter === 'all'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Todos
        </button>

        <button
          type="button"
          onClick={() => setEventTypeFilter('matches')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
            eventTypeFilter === 'matches'
              ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <span>⚽</span>
          <span>Jogos {stats ? `(${stats.matchesCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setEventTypeFilter('trainings')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
            eventTypeFilter === 'trainings'
              ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500/50'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <span>⚡</span>
          <span>Treinos {stats ? `(${stats.trainingsCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setEventTypeFilter('events')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
            eventTypeFilter === 'events'
              ? 'bg-purple-950 text-purple-300 font-bold border border-purple-500/50'
              : 'text-slate-400 hover:text-purple-300'
          }`}
        >
          <span>👥</span>
          <span>Reuniões & Formações {stats ? `(${stats.clubEventsCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setEventTypeFilter('unavailability')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 ${
            eventTypeFilter === 'unavailability'
              ? 'bg-orange-950 text-orange-300 font-bold border border-orange-500/50'
              : 'text-slate-400 hover:text-orange-300'
          }`}
        >
          <span>🚫</span>
          <span>Equipa Técnica {stats ? `(${stats.staffCount})` : ''}</span>
        </button>

        {/* Quick Add Dropdown Menu (optional) */}
        {onOpenScheduleMatch && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickAddDropdownOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase shadow-md transition-all flex items-center gap-1.5 border border-emerald-400/60 cursor-pointer"
              id="agenda-quick-add-dropdown-btn"
            >
              <span className="text-sm">＋</span>
              <span>Adicionar...</span>
              <span className="text-[9px] opacity-70">▼</span>
            </button>

            {quickAddDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn space-y-1">
                {onOpenScheduleMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDropdownOpen(false);
                      onOpenScheduleMatch(selectedDate);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-950/70 border border-transparent hover:border-cyan-500/40 text-cyan-300 text-xs font-['Chakra_Petch'] font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="text-base">⚽</span>
                    <span>＋ Agendar Jogo</span>
                  </button>
                )}

                {onOpenScheduleTraining && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDropdownOpen(false);
                      onOpenScheduleTraining(selectedDate);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-950/70 border border-transparent hover:border-amber-500/40 text-amber-300 text-xs font-['Chakra_Petch'] font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="text-base">⚡</span>
                    <span>＋ Agendar Treino</span>
                  </button>
                )}

                {onOpenClubEventModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDropdownOpen(false);
                      onOpenClubEventModal(selectedDate);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-950/70 border border-transparent hover:border-purple-500/40 text-purple-300 text-xs font-['Chakra_Petch'] font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="text-base">👥</span>
                    <span>＋ Reunião / Formação</span>
                  </button>
                )}

                {onOpenScheduleStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDropdownOpen(false);
                      onOpenScheduleStaff(selectedDate);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-950/70 border border-transparent hover:border-orange-500/40 text-orange-300 text-xs font-['Chakra_Petch'] font-bold flex items-center gap-2 transition-all"
                  >
                    <span className="text-base">🚫</span>
                    <span>＋ Indisponível (Equipa)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
