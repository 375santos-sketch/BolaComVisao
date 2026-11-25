import React from 'react';
import { Icon, IconName } from '../../ui/Icon';

type PlanningTab = 'calendario' | 'treinos' | 'epoca';

const TABS: { tab: PlanningTab; label: string; icon: IconName }[] = [
  { tab: 'calendario', label: 'Agenda', icon: 'calendar' },
  { tab: 'treinos', label: 'Treinos', icon: 'whistle' },
  { tab: 'epoca', label: 'Época', icon: 'chart' }
];

/**
 * Planeamento: Agenda · Treinos · Época, at the top of each of the three screens. One level of tabs, the same look as
 * in Plantel (the active one in white with a green line under it); the screen's title is in the bar above.
 */
export const AgendaTabs: React.FC<{
  current: PlanningTab;
  onNavigate: (tab: any) => void;
  className?: string;
  /** Kept for the callers; the title bar above already says the team, age group and season. */
  subtitle?: string;
}> = ({ current, onNavigate, className = '' }) => (
  <nav aria-label="Planeamento" className={`flex gap-1 border-b border-ui-line ${className}`}>
    {TABS.map(({ tab, label, icon }) => (
      <button
        key={tab}
        type="button"
        aria-current={tab === current ? 'page' : undefined}
        onClick={() => tab !== current && onNavigate(tab)}
        className={`-mb-px flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 px-3 text-ui-body font-semibold transition-colors sm:flex-none ${
          tab === current ? 'border-ui-brand text-ui-text' : 'border-transparent text-ui-muted hover:text-ui-text'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
        <span>{label}</span>
      </button>
    ))}
  </nav>
);
