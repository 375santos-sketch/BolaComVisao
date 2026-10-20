import React from 'react';
import { Language } from '../types';
import { getActiveCategory } from './navCategory';

export type TabType =
  | 'teams'
  | 'home'
  | 'jogo'
  | 'calendario'
  | 'convocatoria'
  | 'prejogo'
  | 'adversario'
  | 'treinos'
  | 'biblioteca'
  | 'jogos'
  | 'stats'
  | 'analise_jogos'
  | 'plantel'
  | 'chat_staff'
  | 'relatorios';

export type MainCategory = 'home' | 'equipa' | 'planeamento' | 'performance' | 'mais';

interface NavbarProps {
  currentTab: TabType;
  lang: Language;
  onNavigate: (tab: TabType) => void;
  onOpenMore: () => void;
  hasActiveMatch: boolean;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenMore,
  hasActiveMatch,
  pendingCount = 0
}) => {
  if (currentTab === 'teams') return null;

  const activeCategory = getActiveCategory(currentTab);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 max-w-5xl mx-auto px-1 sm:px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      id="navbar"
      aria-label="Navegação Principal"
    >
      {/* 1. INÍCIO */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex-1 py-1.5 px-0.5 min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
          activeCategory === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span
          className={`text-xl leading-none p-1 rounded-lg transition-colors ${activeCategory === 'home' ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,210,255,0.2)]' : ''}`}
        >
          🏠
        </span>
        <span className="text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">Início</span>
      </button>

      {/* 2. EQUIPA */}
      <button
        type="button"
        onClick={() => {
          if (activeCategory === 'equipa' && currentTab !== 'plantel') {
            onNavigate('plantel');
          } else {
            onNavigate('plantel');
          }
        }}
        className={`flex-1 py-1.5 px-0.5 min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
          activeCategory === 'equipa' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span
          className={`text-xl leading-none p-1 rounded-lg transition-colors ${activeCategory === 'equipa' ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,210,255,0.2)]' : ''}`}
        >
          ⚽
        </span>
        <span className="text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">Equipa</span>
      </button>

      {/* 3. PLANEAMENTO (AGENDA) */}
      <button
        type="button"
        onClick={() => {
          if (activeCategory === 'planeamento' && currentTab !== 'calendario') {
            onNavigate('calendario');
          } else {
            onNavigate('calendario');
          }
        }}
        className={`flex-1 py-1.5 px-0.5 min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
          activeCategory === 'planeamento' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span
          className={`text-xl leading-none p-1 rounded-lg transition-colors ${activeCategory === 'planeamento' ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,210,255,0.2)]' : ''}`}
        >
          📅
        </span>
        <span className="text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">Agenda</span>
      </button>

      {/* 4. PERFORMANCE */}
      <button
        type="button"
        onClick={() => {
          if (hasActiveMatch) {
            onNavigate('jogo');
          } else {
            onNavigate('prejogo');
          }
        }}
        className={`relative flex-1 py-1.5 px-0.5 min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-95 touch-manipulation ${
          activeCategory === 'performance' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <span
          className={`text-xl leading-none p-1 rounded-lg transition-colors ${activeCategory === 'performance' ? 'bg-cyan-500/15 shadow-[0_0_10px_rgba(0,210,255,0.2)]' : ''}`}
        >
          🧠
        </span>
        {hasActiveMatch && (
          <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
        <span className="text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">Performance</span>
      </button>

      {/* 5. MAIS */}
      <button
        type="button"
        onClick={onOpenMore}
        className="relative flex-1 py-1.5 px-0.5 min-h-[50px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all active:scale-95 touch-manipulation"
      >
        <span className="text-xl leading-none p-1 rounded-lg">⚙️</span>
        {pendingCount > 0 && (
          <span className="absolute top-1 right-2.5 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-slate-950">
            {pendingCount}
          </span>
        )}
        <span className="text-[10px] font-['Chakra_Petch'] uppercase tracking-wider">Mais</span>
      </button>
    </nav>
  );
};
