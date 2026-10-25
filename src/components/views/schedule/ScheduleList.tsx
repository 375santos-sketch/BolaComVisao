import React from 'react';
import { CalendarEvent } from './types';

interface ScheduleListProps {
  filteredEvents: CalendarEvent[];
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
  onOpenScheduleMatch: () => void;
  onOpenScheduleTraining: () => void;
  onOpenClubEventModal: () => void;
  onOpenScheduleStaff: () => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  filteredEvents,
  renderEventCard,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff
}) => {
  return (
    <div className="space-y-3">
      {/* Quick Action Header for Lista View */}
      <div className="ui-card p-3.5 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-mono text-slate-300">
          📋 Lista com <strong className="text-cyan-300">{filteredEvents.length}</strong>{' '}
          {filteredEvents.length === 1 ? 'evento' : 'eventos'}:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenScheduleMatch}
            className="ui-btn ui-btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
          >
            <span>⚽</span>
            <span>＋ Jogo</span>
          </button>
          <button
            type="button"
            onClick={onOpenScheduleTraining}
            className="ui-btn ui-btn-warning px-3 py-1.5 text-xs flex items-center gap-1"
          >
            <span>⚡</span>
            <span>＋ Treino</span>
          </button>
          <button
            type="button"
            onClick={onOpenClubEventModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
          >
            <span>👥</span>
            <span>＋ Reunião / Formação</span>
          </button>
          <button
            type="button"
            onClick={onOpenScheduleStaff}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
          >
            <span>🚫</span>
            <span>＋ Indisponível (Equipa Técnica)</span>
          </button>
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        filteredEvents.map((ev) => renderEventCard(ev))
      ) : (
        <div className="ui-card p-8 text-center font-mono text-xs text-slate-400">
          Nenhum evento corresponde ao filtro atual.
        </div>
      )}
    </div>
  );
};
