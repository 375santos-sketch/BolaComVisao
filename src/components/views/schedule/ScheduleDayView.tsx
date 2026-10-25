import React from 'react';
import { CalendarEvent } from './types';

interface ScheduleDayViewProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  setActiveYear: React.Dispatch<React.SetStateAction<number>>;
  setActiveMonth: React.Dispatch<React.SetStateAction<number>>;
  todayStr: string;
  formattedSelectedDate: string;
  selectedDateEvents: CalendarEvent[];
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleGoToday: () => void;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  renderEventCard: (ev: CalendarEvent) => React.ReactNode;
}

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  selectedDate,
  setSelectedDate,
  setActiveYear,
  setActiveMonth,
  todayStr,
  formattedSelectedDate,
  selectedDateEvents,
  handlePrevDay,
  handleNextDay,
  handleGoToday,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  renderEventCard
}) => {
  return (
    <div className="space-y-4">
      {/* Day Navigation Controls */}
      <div className="ui-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="ui-btn ui-btn-secondary p-2 text-sm"
            title="Dia Anterior"
          >
            ◀
          </button>

          <button
            type="button"
            onClick={handleGoToday}
            className={`px-3 py-1.5 rounded-xl border text-xs font-['Chakra_Petch'] font-bold uppercase transition-all ${
              selectedDate === todayStr
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-950 border-slate-800 text-cyan-300 hover:border-cyan-500'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={handleNextDay}
            className="ui-btn ui-btn-secondary p-2 text-sm"
            title="Próximo Dia"
          >
            ▶
          </button>
        </div>

        <div className="text-center sm:text-right">
          <div className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-white capitalize">
            {formattedSelectedDate}
          </div>
          <div className="text-xs font-mono text-cyan-400">
            {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'evento registado' : 'eventos registados'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
                const dt = new Date(e.target.value + 'T12:00:00');
                setActiveYear(dt.getFullYear());
                setActiveMonth(dt.getMonth());
              }
            }}
            className="ui-input text-xs"
          />
        </div>
      </div>

      {/* Events List for Day */}
      {selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((ev) => renderEventCard(ev))}

          {/* Quick Actions Footer for Day View */}
          <div className="ui-card p-3.5 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">
              Adicionar outro evento para <strong className="text-white">{formattedSelectedDate}</strong>:
            </span>
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
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>👥</span>
                <span>＋ Reunião / Formação</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenScheduleStaff(selectedDate)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>🚫</span>
                <span>＋ Indisponível</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center">
          <div className="text-4xl mb-2">🏖️</div>
          <h3 className="text-base font-bold text-white font-['Chakra_Petch'] mb-1">
            Sem Eventos Agendados para este Dia
          </h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto mb-4">
            Podes agendar um jogo, treino, reunião/formação ou marcar uma indisponibilidade da equipa técnica para{' '}
            <strong>{formattedSelectedDate}</strong>.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenScheduleMatch(selectedDate)}
              className="ui-btn ui-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <span>⚽</span>
              <span>＋ Agendar Jogo</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleTraining(selectedDate)}
              className="ui-btn ui-btn-warning px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>＋ Agendar Treino</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenClubEventModal(selectedDate)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>＋ Reunião / Formação</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleStaff(selectedDate)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1.5"
            >
              <span>🚫</span>
              <span>＋ Indisponível (Equipa)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
