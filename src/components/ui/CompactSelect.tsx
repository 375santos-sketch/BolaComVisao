import React from 'react';
import { Icon } from './Icon';

/**
 * A small choice ("Tudo ▾", "Posição ▾") for toolbars: the phone's own list opens on tap, but the 16px text the
 * phones need (no zoom on iPhone) stays hidden behind a compact label.
 */
export const CompactSelect: React.FC<{
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, value, options, onChange, className = '' }) => (
  <span className={`relative inline-flex items-center gap-1 font-semibold text-slate-100 ${className}`}>
    {options.find(([v]) => v === value)?.[1] || value}
    <Icon name="chevronDown" className="w-3.5 h-3.5 text-slate-400" />
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  </span>
);
