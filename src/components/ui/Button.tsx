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
  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-5 py-3 text-sm sm:text-base gap-2.5'
  };

  // Shared look from the design system (index.css)
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'ui-btn-primary',
    cyan: 'ui-btn-primary',
    secondary: 'ui-btn-secondary',
    outline: 'ui-btn-soft',
    danger: 'ui-btn-danger',
    ghost: 'ui-btn-ghost',
    emerald: 'ui-btn-success',
    amber: 'ui-btn-warning'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`ui-btn ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
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
