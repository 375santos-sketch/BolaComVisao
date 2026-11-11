import React from 'react';
import { datePT, timePT } from '../../lib/planningSummary';

/**
 * A date or time field that always reads the Portuguese way (12/11/2026, 18:30), whatever the language of the phone
 * or browser. It is still the device's own field underneath, so tapping it opens the usual calendar or clock, and
 * the value saved is the same as before (YYYY-MM-DD or HH:MM): only what is shown changes.
 */
export const DateTimePT: React.FC<{
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  /** Classes of the field itself (size and look of the form it sits in). */
  inputClassName?: string;
  required?: boolean;
  min?: string;
}> = ({ type, value, onChange, label, className = '', inputClassName = 'w-full', required, min }) => {
  const shown = type === 'date' ? datePT(value) : timePT(value);
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        aria-label={label}
        required={required}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* the browser opens its own picker */
          }
        }}
        className={`${inputClassName} [&::-webkit-datetime-edit]:opacity-0`}
        style={{ color: 'transparent' }}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-3 flex items-center text-ui-text ${
          /text-xs/.test(inputClassName) ? 'text-xs' : ''
        }`}
      >
        {shown || (type === 'date' ? 'dd/mm/aaaa' : 'hh:mm')}
      </span>
    </div>
  );
};
