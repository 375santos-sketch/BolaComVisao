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
}> = ({ type, value, onChange, label, className = '' }) => {
  const shown = type === 'date' ? datePT(value) : timePT(value);
  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* the browser opens its own picker */
          }
        }}
        className="w-full [&::-webkit-datetime-edit]:opacity-0"
        style={{ color: 'transparent' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ui-text"
        style={{ fontSize: 'inherit' }}
      >
        {shown || (type === 'date' ? 'dd/mm/aaaa' : 'hh:mm')}
      </span>
    </div>
  );
};
