import React from 'react';
import { TrainingsTab } from './types';

interface TrainingHeaderProps {
  activeTab: TrainingsTab;
  setActiveTab: (tab: TrainingsTab) => void;
  totalTrainings: number;
  pdfLibraryCount: number;
  completedCount: number;
}

export const TrainingHeader: React.FC<TrainingHeaderProps> = ({
  activeTab,
  setActiveTab,
  totalTrainings,
  pdfLibraryCount,
  completedCount
}) => {
  return (
    <div className="grid grid-cols-3 gap-1 mb-3.5 bg-slate-900/90 p-1 border border-cyan-500/20 rounded-2xl shadow-sm">
      <button
        type="button"
        className={`font-['Chakra_Petch'] uppercase font-bold text-xs py-2 px-1 min-h-[42px] rounded-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeTab === 'list'
            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
            : 'text-cyan-300/70 hover:text-white hover:bg-slate-950/60'
        }`}
        onClick={() => setActiveTab('list')}
      >
        <span>📋</span>
        <span className="hidden sm:inline">Treinos</span>
        <span className="sm:hidden">Lista</span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60">{totalTrainings}</span>
      </button>

      <button
        type="button"
        className={`font-['Chakra_Petch'] uppercase font-bold text-xs py-2 px-1 min-h-[42px] rounded-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeTab === 'library'
            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
            : 'text-cyan-300/70 hover:text-white hover:bg-slate-950/60'
        }`}
        onClick={() => setActiveTab('library')}
      >
        <span>📚</span>
        <span>Biblioteca</span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
          {pdfLibraryCount}
        </span>
      </button>

      <button
        type="button"
        className={`font-['Chakra_Petch'] uppercase font-bold text-xs py-2 px-1 min-h-[42px] rounded-xl transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
          activeTab === 'stats'
            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,210,255,0.4)]'
            : 'text-cyan-300/70 hover:text-white hover:bg-slate-950/60'
        }`}
        onClick={() => setActiveTab('stats')}
      >
        <span>📊</span>
        <span className="hidden sm:inline">Assiduidade</span>
        <span className="sm:hidden">Stats</span>
        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
          {completedCount}
        </span>
      </button>
    </div>
  );
};
