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
  return (
    <div className="ui-card flex items-center gap-1.5 sm:gap-2 mb-3 p-1 overflow-x-auto [scrollbar-width:none] scroll-smooth">
      <button
        onClick={() => setActiveSquadTab('jogadores')}
        className={`shrink-0 min-h-[38px] py-1.5 px-3 rounded-xl font-semibold text-[13px] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'jogadores' ? 'ui-btn-primary' : 'text-ui-text hover:text-ui-text hover:bg-ui-surface-2/60'
        }`}
      >
        <span>Plantel</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeSquadTab === 'jogadores' ? 'bg-ui-bg/20' : 'bg-ui-surface-2 text-ui-text'
          }`}
        >
          {activeRosterCount}
        </span>
      </button>

      <button
        onClick={() => setActiveSquadTab('assiduidade')}
        className={`shrink-0 min-h-[38px] py-1.5 px-3 rounded-xl font-semibold text-[13px] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'assiduidade'
            ? 'ui-btn-primary'
            : 'text-ui-text hover:text-ui-text hover:bg-ui-surface-2/60'
        }`}
      >
        <span>Assiduidade</span>
      </button>

      <button
        onClick={() => setActiveSquadTab('testes')}
        className={`shrink-0 min-h-[38px] py-1.5 px-3 rounded-xl font-semibold text-[13px] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'testes' ? 'ui-btn-primary' : 'text-ui-text hover:text-ui-text hover:bg-ui-surface-2/60'
        }`}
      >
        <span>Testes</span>
      </button>

      <button
        onClick={() => setActiveSquadTab('equipa_tecnica')}
        className={`shrink-0 min-h-[38px] py-1.5 px-3 rounded-xl font-semibold text-[13px] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'equipa_tecnica'
            ? 'ui-btn-primary'
            : 'text-ui-text hover:text-ui-text hover:bg-ui-surface-2/60'
        }`}
      >
        <span>Equipa técnica</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeSquadTab === 'equipa_tecnica' ? 'bg-ui-bg/20' : 'bg-ui-surface-2 text-ui-text'
          }`}
        >
          {staffCount}
        </span>
      </button>

      <button
        onClick={() => setActiveSquadTab('aniversarios')}
        className={`shrink-0 min-h-[38px] py-1.5 px-3 rounded-xl font-semibold text-[13px] transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 relative ${
          activeSquadTab === 'aniversarios'
            ? 'ui-btn-primary'
            : 'text-ui-text hover:text-ui-text hover:bg-ui-surface-2/60'
        }`}
      >
        <span>Aniversários</span>
        {todayBirthdaysCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-ui-brand text-ui-brand-ink animate-bounce shadow">
            {todayBirthdaysCount} Hoje!
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSquadTab === 'aniversarios' ? 'bg-ui-bg/20' : 'bg-ui-surface-2 text-ui-text'
            }`}
          >
            {allBirthdaysList.length}
          </span>
        )}
      </button>
    </div>
  );
};
