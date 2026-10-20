import React from 'react';
import { SquadTab } from './types';
import { BirthdayPerson } from '../../../lib/birthdayUtils';

interface SquadTabsNavProps {
  activeSquadTab: SquadTab;
  setActiveSquadTab: (tab: SquadTab) => void;
  activeRosterCount: number;
  staffCount: number;
  staffMessagesCount?: number;
  allBirthdaysList: BirthdayPerson[];
  todayBirthdaysCount: number;
}

export const SquadTabsNav: React.FC<SquadTabsNavProps> = ({
  activeSquadTab,
  setActiveSquadTab,
  activeRosterCount,
  staffCount,
  staffMessagesCount = 0,
  allBirthdaysList,
  todayBirthdaysCount
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-4 bg-slate-900/90 border border-cyan-500/30 p-1.5 rounded-2xl backdrop-blur-md shadow-[0_0_15px_rgba(0,210,255,0.1)] overflow-x-auto no-scrollbar scroll-smooth">
      <button
        onClick={() => setActiveSquadTab('jogadores')}
        className={`shrink-0 min-h-[42px] py-2 sm:py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'jogadores'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>👥 Plantel</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeSquadTab === 'jogadores'
              ? 'bg-slate-950/40 text-slate-950'
              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
          }`}
        >
          {activeRosterCount}
        </span>
      </button>

      <button
        onClick={() => setActiveSquadTab('assiduidade')}
        className={`shrink-0 min-h-[42px] py-2 sm:py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'assiduidade'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>📊 Assiduidade</span>
      </button>

      <button
        onClick={() => setActiveSquadTab('equipa_tecnica')}
        className={`shrink-0 min-h-[42px] py-2 sm:py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'equipa_tecnica'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>👔 E. Técnica</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeSquadTab === 'equipa_tecnica'
              ? 'bg-slate-950/40 text-slate-950'
              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
          }`}
        >
          {staffCount}
        </span>
      </button>

      <button
        onClick={() => setActiveSquadTab('chat_staff')}
        className={`shrink-0 min-h-[42px] py-2 sm:py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeSquadTab === 'chat_staff'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.3)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>💬 Chat & Recados</span>
        {staffMessagesCount > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSquadTab === 'chat_staff'
                ? 'bg-slate-950/40 text-slate-950'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {staffMessagesCount}
          </span>
        )}
      </button>

      <button
        onClick={() => setActiveSquadTab('aniversarios')}
        className={`shrink-0 min-h-[42px] py-2 sm:py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 relative ${
          activeSquadTab === 'aniversarios'
            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <span>🎂 Aniversários</span>
        {todayBirthdaysCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-fuchsia-400 text-slate-950 animate-bounce shadow">
            {todayBirthdaysCount} Hoje!
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSquadTab === 'aniversarios'
                ? 'bg-slate-950/40 text-white'
                : 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/30'
            }`}
          >
            {allBirthdaysList.length}
          </span>
        )}
      </button>
    </div>
  );
};
