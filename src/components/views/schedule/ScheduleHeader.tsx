import React from 'react';
import { ScheduleStats } from './types';

interface ScheduleHeaderProps {
  stats: ScheduleStats;
  allEventsCount: number;
  onOpenScheduleMatch: () => void;
  onOpenScheduleTraining: () => void;
  onOpenClubEventModal: () => void;
  onOpenScheduleStaff: () => void;
  onResetSchedule?: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  stats,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  onResetSchedule
}) => {
  return (
    <div className="mb-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
        <button
          type="button"
          onClick={onOpenScheduleMatch}
          className="py-2.5 px-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 cursor-pointer border border-cyan-400/40"
          id="agenda-add-match-btn"
        >
          <span className="text-base">⚽</span>
          <span>＋ Jogo</span>
        </button>

        <button
          type="button"
          onClick={onOpenScheduleTraining}
          className="py-2.5 px-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/40"
          id="agenda-add-training-btn"
        >
          <span className="text-base">⚡</span>
          <span>＋ Treino</span>
        </button>

        <button
          type="button"
          onClick={onOpenClubEventModal}
          className="py-2.5 px-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:via-indigo-500 hover:to-violet-500 text-white font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 cursor-pointer border border-purple-400/50 ring-1 ring-purple-400/30"
          id="agenda-add-clubevent-btn"
        >
          <span className="text-base">👥</span>
          <span>＋ Reunião</span>
        </button>

        <button
          type="button"
          onClick={onOpenScheduleStaff}
          className="py-2.5 px-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 hover:from-orange-400 hover:via-rose-400 hover:to-red-500 text-white font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 cursor-pointer border border-orange-400/50 ring-1 ring-orange-400/30"
          id="agenda-add-staff-btn"
        >
          <span className="text-base">🚫</span>
          <span>＋ Indisp.</span>
        </button>
      </div>

      {/* Global Summary Pill & Reset Button */}
      <div className="ui-inset flex items-center justify-between sm:justify-center gap-2 px-3 py-2 text-[11px] font-mono text-slate-300 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            ⚽ <strong className="text-cyan-300">{stats.matchesCount}</strong> jogos
          </span>
          <span>·</span>
          <span>
            ⚡ <strong className="text-amber-300">{stats.trainingsCount}</strong> treinos
          </span>
          <span>·</span>
          <span>
            👥 <strong className="text-purple-300">{stats.clubEventsCount}</strong> eventos
          </span>
          <span>·</span>
          <span>
            🚫 <strong className="text-orange-400">{stats.staffCount}</strong> staff
          </span>
        </div>

        {onResetSchedule && (
          <button
            type="button"
            onClick={onResetSchedule}
            className="ui-btn ui-btn-soft-danger ml-auto py-1 px-2.5 text-[10px] flex items-center gap-1"
            title="Limpar todos os eventos agendados"
            id="agenda-reset-btn"
          >
            <span>🗑️</span>
            <span>Reset Agenda</span>
          </button>
        )}
      </div>
    </div>
  );
};
