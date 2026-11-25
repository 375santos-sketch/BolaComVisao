import React from 'react';
import { SquadTab } from './types';
import { BirthdayPerson } from '../../../lib/birthdayUtils';

interface SquadTabsNavProps {
  activeSquadTab: SquadTab;
  setActiveSquadTab: (tab: SquadTab) => void;
  activeRosterCount: number;
  staffCount: number;
  allBirthdaysList: BirthdayPerson[];
  todayBirthdaysCount: number;
}

export const SquadTabsNav: React.FC<SquadTabsNavProps> = ({
  activeSquadTab,
  setActiveSquadTab,
  activeRosterCount,
  staffCount,
  allBirthdaysList,
  todayBirthdaysCount
}) => {
  const tabs: { id: SquadTab; label: string; count?: React.ReactNode }[] = [
    { id: 'jogadores', label: 'Plantel', count: activeRosterCount },
    { id: 'assiduidade', label: 'Assiduidade' },
    { id: 'testes', label: 'Testes' },
    { id: 'equipa_tecnica', label: 'Equipa técnica', count: staffCount },
    {
      id: 'aniversarios',
      label: 'Aniversários',
      count: todayBirthdaysCount > 0 ? `${todayBirthdaysCount} hoje` : allBirthdaysList.length
    }
  ];
  /*
   * One level of tabs (the same look in every module): the active one in white with a green line under it. On the
   * phone they slide sideways; the fade on the right says there is more.
   */
  return (
    <div className="relative mb-4 border-b border-ui-line after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-ui-bg after:to-transparent sm:after:hidden">
      <div className="flex gap-1 overflow-x-auto pr-6 [scrollbar-width:none] sm:pr-0">
        {tabs.map((t) => {
          const on = activeSquadTab === t.id;
          const today = t.id === 'aniversarios' && todayBirthdaysCount > 0;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setActiveSquadTab(t.id)}
              className={`-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-ui-body font-semibold transition-colors touch-manipulation ${
                on ? 'border-ui-brand text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 text-ui-caption font-bold tabular-nums ${
                    today ? 'bg-ui-brand-soft text-ui-brand' : 'bg-ui-surface-2 text-ui-muted'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
