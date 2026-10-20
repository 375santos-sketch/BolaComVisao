import React from 'react';

export type BadgeVariant = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple' | 'indigo';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
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

  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    slate: 'bg-slate-900/90 text-slate-300 border-slate-700/80',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
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
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-lg border leading-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
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
