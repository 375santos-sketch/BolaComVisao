import React from 'react';

interface ScheduleFabProps {
  showFabMenu: boolean;
  setShowFabMenu: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDate: string;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
}

export const ScheduleFab: React.FC<ScheduleFabProps> = ({
  showFabMenu,
  setShowFabMenu,
  selectedDate,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
      {showFabMenu && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-fadeIn">
          {/* Action 1: Match */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/95 border border-cyan-500/50 text-cyan-300 text-xs font-['Chakra_Petch'] font-bold shadow-lg">
              Agendar Jogo
            </span>
            <button
              type="button"
              onClick={() => {
                setShowFabMenu(false);
                onOpenScheduleMatch(selectedDate);
              }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(0,210,255,0.5)] transition-transform active:scale-95 border border-cyan-300/40"
              title="Agendar Jogo"
              id="fab-add-match"
            >
              ⚽
            </button>
          </div>

          {/* Action 2: Training */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/95 border border-amber-500/50 text-amber-300 text-xs font-['Chakra_Petch'] font-bold shadow-lg">
              Agendar Treino
            </span>
            <button
              type="button"
              onClick={() => {
                setShowFabMenu(false);
                onOpenScheduleTraining(selectedDate);
              }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-transform active:scale-95 border border-amber-300/40"
              title="Agendar Treino"
              id="fab-add-training"
            >
              ⚡
            </button>
          </div>

          {/* Action 3: Club Event */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/95 border border-purple-500/50 text-purple-300 text-xs font-['Chakra_Petch'] font-bold shadow-lg">
              Reunião / Formação
            </span>
            <button
              type="button"
              onClick={() => {
                setShowFabMenu(false);
                onOpenClubEventModal(selectedDate);
              }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center text-lg shadow-[0_0_15px_rgba(147,51,234,0.5)] transition-transform active:scale-95 border border-purple-300/40"
              title="Reunião / Formação"
              id="fab-add-clubevent"
            >
              👥
            </button>
          </div>

          {/* Action 4: Staff Unavailability */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/95 border border-orange-500/50 text-orange-300 text-xs font-['Chakra_Petch'] font-bold shadow-lg">
              Indisponível (Equipa)
            </span>
            <button
              type="button"
              onClick={() => {
                setShowFabMenu(false);
                onOpenScheduleStaff(selectedDate);
              }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white flex items-center justify-center text-lg shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-transform active:scale-95 border border-orange-300/40"
              title="Indisponível (Equipa Técnica)"
              id="fab-add-staff"
            >
              🚫
            </button>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setShowFabMenu((prev) => !prev)}
        className={`w-14 h-14 rounded-3xl shadow-2xl flex items-center justify-center text-2xl font-black transition-all active:scale-95 border cursor-pointer ${
          showFabMenu
            ? 'bg-rose-600 hover:bg-rose-500 text-white rotate-45 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)]'
            : 'bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 border-cyan-300 shadow-[0_0_25px_rgba(0,210,255,0.6)] animate-pulse'
        }`}
        title={showFabMenu ? 'Fechar menu de adicionar' : '＋ Adicionar Entrada na Agenda'}
        id="agenda-floating-add-fab"
      >
        ＋
      </button>
    </div>
  );
};
