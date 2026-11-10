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
    <>
      <SideMenu
        currentTab={currentTab}
        onNavigate={onNavigate}
        onOpenMore={onOpenMore}
        hasActiveMatch={hasActiveMatch}
        pendingCount={pendingCount}
      />
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ui-surface/95 backdrop-blur-md border-t border-ui-line max-w-5xl mx-auto px-1 sm:px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none shadow-[0_-6px_24px_rgba(0,0,0,0.35)]"
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
    </>
  );
};

/**
 * On a computer (1024 px and wider) the areas are a menu fixed on the left, with the main screens one click away;
 * on the phone the bar at the bottom stays.
 */
const SideMenu: React.FC<Omit<NavbarProps, 'lang'>> = ({
  currentTab,
  onNavigate,
  onOpenMore,
  hasActiveMatch,
  pendingCount = 0
}) => {
  const items: { label: string; icon: IconName; tabs: TabType[]; go: () => void; live?: boolean }[] = [
    { label: 'Início', icon: 'home', tabs: ['home'], go: () => onNavigate('home') },
    { label: 'Equipa', icon: 'users', tabs: ['plantel'], go: () => onNavigate('plantel') },
    { label: 'Convocatória', icon: 'clipboard', tabs: ['convocatoria'], go: () => onNavigate('convocatoria') },
    { label: 'Agenda', icon: 'calendar', tabs: ['calendario'], go: () => onNavigate('calendario') },
    { label: 'Treinos', icon: 'whistle', tabs: ['treinos'], go: () => onNavigate('treinos') },
    { label: 'Resultados', icon: 'trophy', tabs: ['jogos'], go: () => onNavigate('jogos') },
    {
      label: hasActiveMatch ? 'Jogo ao vivo' : 'Jogo',
      icon: 'ball',
      tabs: ['jogo', 'prejogo'],
      go: () => onNavigate(hasActiveMatch ? 'jogo' : 'prejogo'),
      live: hasActiveMatch
    },
    { label: 'Estatísticas', icon: 'chart', tabs: ['stats', 'analise_jogos'], go: () => onNavigate('stats') }
  ];
  return (
    <aside
      aria-label="Menu"
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-ui-line bg-ui-surface pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-4"
    >
      <div className="px-5 pb-5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ui-brand">Futebol de formação</div>
        <div className="text-xl font-extrabold text-ui-text">BolaComVisão</div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Navegação Principal (computador)">
        {items.map((item) => {
          const active = item.tabs.includes(currentTab);
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.go}
              aria-current={active ? 'page' : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                active
                  ? 'bg-ui-brand/15 font-bold text-ui-brand'
                  : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
              }`}
            >
              {active && (
                <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-ui-brand" />
              )}
              <Icon name={item.icon} className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1">{item.label}</span>
              {item.live && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-label="a decorrer" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-3 pt-3 border-t border-ui-line">
        <button
          type="button"
          onClick={onOpenMore}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
        >
          <Icon name="more" className="h-5 w-5" />
          <span className="flex-1">Mais</span>
          {pendingCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
