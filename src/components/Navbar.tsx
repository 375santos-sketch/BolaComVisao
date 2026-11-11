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
  | 'epoca'
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
  /** Definições (on the computer menu, under Clube). */
  onOpenSettings?: () => void;
  hasActiveMatch: boolean;
  pendingCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenMore,
  onOpenSettings,
  hasActiveMatch,
  pendingCount = 0
}) => {
  if (currentTab === 'teams') return null;

  const activeCategory = getActiveCategory(currentTab);

  const items: { key: MainCategory; label: string; icon: IconName; go: () => void }[] = [
    { key: 'home', label: 'Início', icon: 'home', go: () => onNavigate('home') },
    { key: 'equipa', label: 'Equipa', icon: 'users', go: () => onNavigate('plantel') },
    { key: 'planeamento', label: 'Planeamento', icon: 'calendar', go: () => onNavigate('calendario') },
    // Pré-jogo, jogo ao vivo e estatísticas
    { key: 'performance', label: 'Jogo', icon: 'ball', go: () => onNavigate(hasActiveMatch ? 'jogo' : 'prejogo') },
    { key: 'mais', label: 'Clube', icon: 'more', go: onOpenMore }
  ];

  return (
    <>
      <SideMenu
        currentTab={currentTab}
        onNavigate={onNavigate}
        onOpenMore={onOpenMore}
        onOpenSettings={onOpenSettings}
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
 * On a computer (1024 px and wider) the areas are a menu fixed on the left, grouped like the product: Início, Equipa,
 * Planeamento, Jogo and Análise, with Clube and Definições at the bottom. On the phone the bar at the bottom stays.
 */
const SideMenu: React.FC<Omit<NavbarProps, 'lang'>> = ({
  currentTab,
  onNavigate,
  onOpenMore,
  onOpenSettings,
  hasActiveMatch,
  pendingCount = 0
}) => {
  type Item = { label: string; icon: IconName; tabs: TabType[]; go: () => void; live?: boolean };
  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ label: 'Início', icon: 'home', tabs: ['home'], go: () => onNavigate('home') }] },
    {
      title: 'Equipa',
      items: [
        { label: 'Plantel', icon: 'users', tabs: ['plantel'], go: () => onNavigate('plantel') },
        { label: 'Convocatória', icon: 'clipboard', tabs: ['convocatoria'], go: () => onNavigate('convocatoria') }
      ]
    },
    {
      title: 'Planeamento',
      items: [
        { label: 'Agenda', icon: 'calendar', tabs: ['calendario'], go: () => onNavigate('calendario') },
        { label: 'Treinos', icon: 'whistle', tabs: ['treinos'], go: () => onNavigate('treinos') },
        { label: 'Época', icon: 'chart', tabs: ['epoca'], go: () => onNavigate('epoca') }
      ]
    },
    {
      title: 'Jogo',
      items: [
        {
          label: hasActiveMatch ? 'Jogo ao vivo' : 'Pré-jogo e Modo Jogo',
          icon: 'ball',
          tabs: ['jogo', 'prejogo'],
          go: () => onNavigate(hasActiveMatch ? 'jogo' : 'prejogo'),
          live: hasActiveMatch
        },
        { label: 'Resultados', icon: 'trophy', tabs: ['jogos'], go: () => onNavigate('jogos') }
      ]
    },
    {
      title: 'Análise',
      items: [
        { label: 'Estatísticas', icon: 'chart', tabs: ['stats'], go: () => onNavigate('stats') },
        { label: 'Análise dos jogos', icon: 'search', tabs: ['analise_jogos'], go: () => onNavigate('analise_jogos') }
      ]
    }
  ];
  const row = (active: boolean) =>
    `relative flex w-full items-center gap-3 rounded-ui px-3 py-2 text-left text-ui-body transition-colors ${
      active ? 'bg-ui-brand-soft font-bold text-ui-brand' : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
    }`;
  return (
    <aside
      aria-label="Menu"
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-ui-line bg-ui-surface pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-4"
    >
      <div className="flex items-center gap-2.5 px-5 pb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-ui bg-ui-brand text-ui-brand-ink" aria-hidden>
          <Icon name="ball" className="h-5 w-5" strokeWidth={2.4} />
        </span>
        <span>
          <span className="block text-ui-lead font-extrabold leading-none text-ui-text">BolaComVisão</span>
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-ui-muted">
            Futebol de formação
          </span>
        </span>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3" aria-label="Navegação Principal (computador)">
        {groups.map((g, gi) => (
          <div key={g.title || gi} className="space-y-0.5">
            {g.title && (
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ui-muted/80">
                {g.title}
              </div>
            )}
            {g.items.map((item) => {
              const active = item.tabs.includes(currentTab);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.go}
                  aria-current={active ? 'page' : undefined}
                  className={row(active)}
                >
                  {active && (
                    <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-ui-brand" />
                  )}
                  <Icon name={item.icon} className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                  <span className="flex-1">{item.label}</span>
                  {item.live && (
                    <span className="h-2 w-2 rounded-full bg-ui-success animate-pulse" aria-label="a decorrer" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-ui-line px-3 pt-3">
        <button type="button" onClick={onOpenMore} className={row(false)}>
          <Icon name="more" className="h-[18px] w-[18px]" />
          <span className="flex-1">Clube</span>
          {pendingCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ui-warning px-1 text-[10px] font-black text-ui-brand-ink">
              {pendingCount}
            </span>
          )}
        </button>
        {onOpenSettings && (
          <button type="button" onClick={onOpenSettings} className={row(false)}>
            <Icon name="settings" className="h-[18px] w-[18px]" />
            <span className="flex-1">Definições</span>
          </button>
        )}
      </div>
    </aside>
  );
};
