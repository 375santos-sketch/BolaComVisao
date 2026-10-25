import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'emerald' | 'amber' | 'cyan';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-['Chakra_Petch'] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]";

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-5 py-3 text-sm sm:text-base gap-2.5'
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.25)] border border-cyan-400/60 font-black',
    secondary: 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 hover:border-slate-600',
    outline: 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-500 font-bold',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/60 font-black',
    amber:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400/60 font-black',
    cyan: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,210,255,0.25)] border border-cyan-400/60 font-black'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          <span>A processar...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
