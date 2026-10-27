import React from 'react';
import { Icon } from '../../ui/Icon';

interface ScheduleFabProps {
  showFabMenu: boolean;
  setShowFabMenu: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDate: string;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
}

/** The Agenda's only "add" button: Jogo, Treino, Reunião or Indisponível. */
export const ScheduleFab: React.FC<ScheduleFabProps> = ({
  showFabMenu,
  setShowFabMenu,
  selectedDate,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff
}) => {
  const items: [string, string, string, (date?: string) => void][] = [
    ['fab-add-match', 'Jogo', 'bg-cyan-500', onOpenScheduleMatch],
    ['fab-add-training', 'Treino', 'bg-amber-400', onOpenScheduleTraining],
    ['fab-add-clubevent', 'Reunião / formação', 'bg-violet-400', onOpenClubEventModal],
    ['fab-add-staff', 'Indisponível (equipa técnica)', 'bg-slate-500', onOpenScheduleStaff]
  ];
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
      {showFabMenu && (
        <div role="menu" aria-label="Adicionar à agenda" className="ui-card w-60 p-1.5 shadow-2xl animate-fadeIn">
          {items.map(([id, label, dot, open]) => (
            <button
              key={id}
              id={id}
              type="button"
              role="menuitem"
              onClick={() => {
                setShowFabMenu(false);
                open(selectedDate);
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800/70"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowFabMenu((prev) => !prev)}
        aria-expanded={showFabMenu}
        aria-label={showFabMenu ? 'Fechar' : 'Adicionar à agenda'}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all active:scale-95 ${
          showFabMenu ? 'bg-slate-700 text-white' : 'ui-btn-primary'
        }`}
        id="agenda-floating-add-fab"
      >
        <Icon name={showFabMenu ? 'x' : 'plus'} className="w-7 h-7" strokeWidth={2.5} />
      </button>
    </div>
  );
};
