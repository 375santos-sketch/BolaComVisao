import React from 'react';
import { Icon, IconName } from '../../ui/Icon';

type AgendaTab = 'calendario' | 'treinos' | 'jogos';

const TABS: { tab: AgendaTab; label: string; icon: IconName }[] = [
  { tab: 'calendario', label: 'Agenda', icon: 'calendar' },
  { tab: 'treinos', label: 'Treinos', icon: 'zap' },
  { tab: 'jogos', label: 'Resultados', icon: 'trophy' }
];

/** Agenda · Treinos · Resultados, at the top of each of the three screens. */
export const AgendaTabs: React.FC<{ current: AgendaTab; onNavigate: (tab: any) => void; className?: string }> = ({
  current,
  onNavigate,
  className = ''
}) => (
  <div className={`ui-card grid grid-cols-3 gap-1 p-1 text-[13px] font-semibold ${className}`}>
    {TABS.map(({ tab, label, icon }) => (
      <button
        key={tab}
        type="button"
        aria-current={tab === current ? 'page' : undefined}
        onClick={() => tab !== current && onNavigate(tab)}
        className={
          tab === current
            ? 'ui-btn ui-btn-primary py-2 px-1 flex items-center justify-center gap-1.5'
            : 'py-2 px-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-950/60 flex items-center justify-center gap-1.5 transition-all'
        }
      >
        <Icon name={icon} className="w-4 h-4" />
        <span>{label}</span>
      </button>
    ))}
  </div>
);
