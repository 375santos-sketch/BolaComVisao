import React from 'react';
import { DateTimePT } from '../../ui/DateTimePT';
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
                ? 'bg-ui-brand text-ui-brand-ink border-ui-brand'
                : 'bg-ui-inset border-ui-line text-ui-brand hover:border-ui-brand'
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
          <div className="text-base sm:text-lg font-['Chakra_Petch'] font-black text-ui-text capitalize">
            {formattedSelectedDate}
          </div>
          <div className="text-xs font-mono text-ui-brand">
            {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'evento registado' : 'eventos registados'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DateTimePT
            type="date"
            label="Data"
            value={selectedDate}
            onChange={(v) => {
              if (v) {
                setSelectedDate(v);
                const dt = new Date(v + 'T12:00:00');
                setActiveYear(dt.getFullYear());
                setActiveMonth(dt.getMonth());
              }
            }}
            inputClassName="ui-input text-xs"
          />
        </div>
      </div>

      {/* Events List for Day */}
      {selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((ev) => renderEventCard(ev))}

          {/* Quick Actions Footer for Day View */}
          <div className="ui-card p-3.5 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-ui-muted">
              Adicionar outro evento para <strong className="text-ui-text">{formattedSelectedDate}</strong>:
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
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-ui-brand to-ui-brand hover:from-ui-brand hover:to-ui-brand text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>👥</span>
                <span>＋ Reunião / Formação</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenScheduleStaff(selectedDate)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-ui-warning to-ui-danger hover:from-ui-warning hover:to-ui-danger text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <span>🚫</span>
                <span>＋ Indisponível</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-ui-surface/60 border-2 border-dashed border-ui-line text-center">
          <div className="text-4xl mb-2">🏖️</div>
          <h3 className="text-base font-bold text-ui-text font-['Chakra_Petch'] mb-1">
            Sem Eventos Agendados para este Dia
          </h3>
          <p className="text-xs text-ui-muted font-mono max-w-md mx-auto mb-4">
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-ui-brand to-ui-brand hover:from-ui-brand hover:to-ui-brand text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>＋ Reunião / Formação</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleStaff(selectedDate)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-ui-warning to-ui-danger hover:from-ui-warning hover:to-ui-danger text-ui-text font-['Chakra_Petch'] font-bold text-xs uppercase shadow-md transition-all flex items-center gap-1.5"
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
