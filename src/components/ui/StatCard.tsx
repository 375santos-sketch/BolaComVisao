import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  color?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  trend?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant,
  color,
  trend,
  onClick,
  className = ''
}) => {
  const activeVariant = color || variant || 'cyan';
  const variantStyles = {
    cyan: {
      border: 'border-slate-800 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      valueColor: 'text-white'
    },
    emerald: {
      border: 'border-slate-800 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      valueColor: 'text-emerald-300'
    },
    amber: {
      border: 'border-slate-800 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      valueColor: 'text-amber-300'
    },
    rose: {
      border: 'border-slate-800 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      valueColor: 'text-rose-300'
    },
    slate: {
      border: 'border-slate-800 hover:border-slate-700',
      iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
      valueColor: 'text-slate-200'
    }
  };

  const style = variantStyles[activeVariant];

  return (
    <div
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border ${style.border} transition-all duration-200 backdrop-blur-sm ${
        onClick ? 'cursor-pointer hover:bg-slate-900 active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        {icon && <span className={`p-1.5 rounded-xl border text-sm shrink-0 ${style.iconBg}`}>{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-xl sm:text-2xl font-black font-['Chakra_Petch'] tracking-wide ${style.valueColor}`}>
          {value}
        </div>
        {trend && <span className="text-[11px] font-mono font-bold text-cyan-400 shrink-0">{trend}</span>}
      </div>

      {subtitle && <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">{subtitle}</div>}
    </div>
  );
};
