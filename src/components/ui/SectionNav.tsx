import React from 'react';

/**
 * A short bar that stays at the top of a long page and jumps to its sections (the athlete's sheet). The section in
 * view is marked by the caller (`active`).
 */
export const SectionNav: React.FC<{
  label: string;
  sections: { id: string; label: string }[];
  active: string;
  onJump: (id: string) => void;
  className?: string;
}> = ({ label, sections, active, onJump, className = '' }) => (
  <nav aria-label={label} className={`overflow-x-auto [scrollbar-width:none] ${className}`}>
    <div className="flex w-max gap-1 p-1">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onJump(s.id)}
          aria-current={active === s.id ? 'true' : undefined}
          className={`whitespace-nowrap rounded-ui-sm px-3 py-1.5 text-ui-caption font-bold transition-colors ${
            active === s.id
              ? 'bg-ui-brand-soft text-ui-brand'
              : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  </nav>
);
