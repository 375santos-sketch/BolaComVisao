import React from 'react';
import { Icon, IconName } from '../../ui/Icon';

type PlanningTab = 'calendario' | 'treinos' | 'epoca';

const TABS: { tab: PlanningTab; label: string; icon: IconName }[] = [
  { tab: 'calendario', label: 'Agenda', icon: 'calendar' },
  { tab: 'treinos', label: 'Treinos', icon: 'whistle' },
  { tab: 'epoca', label: 'Época', icon: 'chart' }
];

/** Planeamento: Agenda · Treinos · Época, at the top of each of the three screens. */
const TITLES: Record<PlanningTab, string> = { calendario: 'Planeamento', treinos: 'Treinos', epoca: 'Época' };

export const AgendaTabs: React.FC<{
  current: PlanningTab;
  onNavigate: (tab: any) => void;
  className?: string;
  /** Team, age group and season, under the title over the stadium. */
  subtitle?: string;
}> = ({ current, onNavigate, className = '', subtitle }) => (
  <div className={`space-y-2.5 ${className}`}>
    <div className="squad-hero !py-3">
      <div className="min-w-0">
        <h2 className="bcv-title text-[28px] sm:text-[34px]">{TITLES[current]}</h2>
        {subtitle && <p className="truncate text-ui-caption text-ui-muted">{subtitle}</p>}
      </div>
    </div>
    <PlanningNav current={current} onNavigate={onNavigate} />
  </div>
);

const PlanningNav: React.FC<{ current: PlanningTab; onNavigate: (tab: any) => void }> = ({ current, onNavigate }) => (
  <nav aria-label="Planeamento" className="ui-card grid grid-cols-3 gap-1 p-1">
    {TABS.map(({ tab, label, icon }) => (
      <button
        key={tab}
        type="button"
        aria-current={tab === current ? 'page' : undefined}
        onClick={() => tab !== current && onNavigate(tab)}
        className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-ui-sm px-1 py-2 text-ui-body font-bold transition-colors ${
          tab === current ? 'bg-ui-brand-soft text-ui-brand' : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
        <span>{label}</span>
      </button>
    ))}
  </nav>
);
