import React from 'react';

/**
 * A short bar that stays at the top of a long page and jumps to its sections (the athlete's sheet, the session
 * editor). The section in view is marked by the caller (`active`).
 *
 * With `fill`, every section gets an equal share of the width (no sideways scrolling) and phones show the `short`
 * label, so all the sections are always visible.
 */
export const SectionNav: React.FC<{
  label: string;
  sections: { id: string; label: string; short?: string }[];
  active: string;
  onJump: (id: string) => void;
  fill?: boolean;
  className?: string;
}> = ({ label, sections, active, onJump, fill = false, className = '' }) => (
  <nav aria-label={label} className={fill ? className : `overflow-x-auto [scrollbar-width:none] ${className}`}>
    <div
      className={fill ? 'grid gap-1 p-1' : 'flex w-max gap-1 p-1'}
      style={fill ? { gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` } : undefined}
    >
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onJump(s.id)}
          aria-current={active === s.id ? 'true' : undefined}
          aria-label={fill && s.short ? s.label : undefined}
          className={`whitespace-nowrap rounded-ui-sm py-1.5 text-ui-caption font-bold transition-colors ${
            fill ? 'px-1 text-center' : 'px-3'
          } ${
            active === s.id
              ? 'bg-ui-brand-soft text-ui-brand'
              : 'text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text'
          }`}
        >
          {fill && s.short ? (
            <>
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </>
          ) : (
            s.label
          )}
        </button>
      ))}
    </div>
  </nav>
);
