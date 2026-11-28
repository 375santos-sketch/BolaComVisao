import React from 'react';
import { Icon, IconName } from '../../ui/Icon';

interface AddEventButtonsProps {
  date: string;
  onOpenScheduleMatch: (date?: string) => void;
  onOpenScheduleTraining: (date?: string) => void;
  onOpenClubEventModal: (date?: string) => void;
  onOpenScheduleStaff: (date?: string) => void;
  /** Smaller buttons; the meeting and unavailability ones show only the icon. */
  compact?: boolean;
  className?: string;
}

/** The four "add to this day" buttons of the Agenda (game, training, meeting, unavailability). */
export const AddEventButtons: React.FC<AddEventButtonsProps> = ({
  date,
  onOpenScheduleMatch,
  onOpenScheduleTraining,
  onOpenClubEventModal,
  onOpenScheduleStaff,
  compact = false,
  className = ''
}) => {
  const items: [string, string, IconName, (date?: string) => void, boolean][] = [
    ['Jogo', 'Agendar jogo', 'ball', onOpenScheduleMatch, true],
    ['Treino', 'Agendar treino', 'whistle', onOpenScheduleTraining, false],
    ['Reunião', 'Reunião ou formação', 'users', onOpenClubEventModal, false],
    ['Indisponível', 'Indisponível (equipa técnica)', 'ban', onOpenScheduleStaff, false]
  ];
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {items.map(([label, title, icon, open, primary], i) => {
        const iconOnly = compact && i >= 2;
        return (
          <button
            key={label}
            type="button"
            onClick={() => open(date)}
            className={`ui-btn ${primary ? 'ui-btn-primary' : 'ui-btn-secondary'} min-h-10 ${
              iconOnly ? 'w-10 px-0' : 'px-3'
            } text-ui-caption touch-manipulation`}
            title={title}
            aria-label={iconOnly ? title : undefined}
          >
            <Icon name={iconOnly ? icon : 'plus'} className="h-4 w-4 shrink-0" />
            {!iconOnly && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
