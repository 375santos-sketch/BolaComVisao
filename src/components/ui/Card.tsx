import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'spotlight' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6'
  };

  const variantStyles = {
    default: 'bg-slate-900/80 border-slate-800/80 shadow-md',
    elevated: 'bg-slate-900/90 border-slate-700/80 shadow-xl',
    spotlight:
      'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-cyan-500/40 shadow-[0_0_20px_rgba(0,210,255,0.12)]',
    outline: 'bg-transparent border-slate-800 hover:border-slate-700',
    interactive:
      'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-md hover:shadow-cyan-500/5'
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-sm transition-all duration-200 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
