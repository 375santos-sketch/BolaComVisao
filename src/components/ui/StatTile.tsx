import React from 'react';
import { Icon, IconName } from './Icon';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE: Record<Tone, { icon: string; value: string; edge: string }> = {
  brand: { icon: 'bg-ui-brand-soft text-ui-brand', value: 'text-ui-text', edge: 'before:bg-ui-brand' },
  success: { icon: 'bg-ui-success-soft text-ui-success', value: 'text-ui-success', edge: 'before:bg-ui-success' },
  warning: { icon: 'bg-ui-warning-soft text-ui-warning', value: 'text-ui-warning', edge: 'before:bg-ui-warning' },
  danger: { icon: 'bg-ui-danger-soft text-ui-danger', value: 'text-ui-danger', edge: 'before:bg-ui-danger' },
  neutral: { icon: 'bg-ui-surface-3 text-ui-muted', value: 'text-ui-text', edge: 'before:bg-ui-line-strong' }
};

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Small line under the value ("em 12 jogos", "+3 que o mês passado"). */
  hint?: string;
  icon?: IconName;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
}

/**
 * A key figure: small label, big number, a line of context. The tone gives the meaning (success, warning, danger)
 * through the icon and a thin line on top, never through a coloured background.
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  onClick,
  className = ''
}) => {
  const look = TONE[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`ui-card relative overflow-hidden p-3.5 sm:p-4 text-left before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:opacity-80 ${look.edge} ${
        onClick
          ? 'transition-colors hover:border-ui-line-strong focus-visible:outline-2 focus-visible:outline-ui-brand'
          : ''
      } ${className}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">{label}</span>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm ${look.icon}`} aria-hidden>
            <Icon name={icon} className="h-4 w-4" strokeWidth={2.2} />
          </span>
        )}
      </span>
      <span className={`ui-figure mt-1 block text-ui-headline sm:text-ui-display ${look.value}`}>{value}</span>
      {hint && <span className="mt-1 block truncate text-ui-caption text-ui-muted">{hint}</span>}
    </Tag>
  );
};
