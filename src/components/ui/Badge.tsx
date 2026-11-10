import React from 'react';

type BadgeVariant = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  dot = false,
  pulse = false,
  icon,
  className = '',
  ...props
}) => {
  const sizeStyles: Record<BadgeSize, string> = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] sm:text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  };

  // Colour with a meaning (index.css): brand, success, warning, danger; slate is neutral
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'ui-badge-brand',
    emerald: 'ui-badge-success',
    amber: 'ui-badge-warning',
    rose: 'ui-badge-danger',
    slate: '',
    purple: 'bg-purple-500/15 text-purple-300',
    indigo: 'bg-indigo-500/15 text-indigo-300'
  };

  const dotColors: Record<BadgeVariant, string> = {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
    purple: 'bg-purple-400',
    indigo: 'bg-indigo-400'
  };

  return (
    <span
      className={`ui-badge font-mono uppercase tracking-wider leading-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
