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

  // Shared look from the design system (index.css)
  const variantStyles = {
    default: 'ui-card',
    elevated: 'ui-card',
    spotlight: 'ui-card border-cyan-500/40',
    outline: 'ui-card bg-transparent',
    interactive: 'ui-card cursor-pointer hover:border-cyan-500/50 active:scale-[0.99]'
  };

  return (
    <div
      className={`transition-all duration-200 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
