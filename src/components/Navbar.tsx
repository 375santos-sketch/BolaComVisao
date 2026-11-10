import React from 'react';
import { Language } from '../types';
import { getActiveCategory } from './navCategory';
import { Icon, IconName } from './ui/Icon';

export type TabType =
  | 'teams'
  | 'home'
  | 'jogo'
  | 'calendario'
  | 'convocatoria'
  | 'prejogo'
  | 'treinos'
  | 'jogos'
  | 'stats'
  | 'analise_jogos'
  | 'plantel';

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

  const items: { key: MainCategory; label: string; icon: IconName; go: () => void }[] = [
    { key: 'home', label: 'Início', icon: 'home', go: () => onNavigate('home') },
    { key: 'equipa', label: 'Equipa', icon: 'users', go: () => onNavigate('plantel') },
    { key: 'planeamento', label: 'Agenda', icon: 'calendar', go: () => onNavigate('calendario') },
    // Pré-jogo, jogo ao vivo e estatísticas
    { key: 'performance', label: 'Jogo', icon: 'ball', go: () => onNavigate(hasActiveMatch ? 'jogo' : 'prejogo') },
    { key: 'mais', label: 'Mais', icon: 'more', go: onOpenMore }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-ui-surface/95 backdrop-blur-md border-t border-ui-line max-w-5xl mx-auto px-1 sm:px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none shadow-[0_-6px_24px_rgba(0,0,0,0.35)]"
      id="navbar"
      aria-label="Navegação Principal"
    >
      {items.map((item) => {
        const active = item.key !== 'mais' && activeCategory === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.go}
            aria-current={active ? 'page' : undefined}
            className={`relative flex-1 py-1.5 px-0.5 min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors active:scale-95 touch-manipulation ${
              active ? 'text-ui-brand font-bold' : 'text-ui-muted hover:text-ui-text'
            }`}
          >
            {/* The current area: a short bar on top and the icon on a tinted pill */}
            {active && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-ui-brand" />}
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-ui-brand/15' : ''
              }`}
            >
              <Icon name={item.icon} className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="text-[11px] leading-none">{item.label}</span>
            {item.key === 'performance' && hasActiveMatch && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
            {item.key === 'mais' && pendingCount > 0 && (
              <span className="absolute top-1 right-2.5 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-slate-950 font-mono text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-ui-surface">
                {pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
