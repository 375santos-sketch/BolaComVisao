import React from 'react';
import { Icon } from './Icon';
import { applySunMode, useSunMode } from '../../lib/sunMode';

/** ☀️ in the top bar: the light look for reading the app in bright sun (one tap on, one tap off). */
export const SunModeButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const on = useSunMode();
  return (
    <button
      type="button"
      onClick={() => applySunMode(!on)}
      aria-pressed={on}
      className={`ui-btn ui-btn-secondary flex items-center justify-center touch-manipulation ${
        on ? '!border-amber-500 !text-amber-500' : ''
      } ${className}`}
      title={on ? 'Voltar ao modo escuro' : 'Modo sol (para ler ao sol)'}
      aria-label="Modo sol"
    >
      <Icon name={on ? 'moon' : 'sun'} className="w-[18px] h-[18px]" />
    </button>
  );
};
