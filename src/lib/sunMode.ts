import { useSyncExternalStore } from 'react';

/**
 * Modo sol (☀️ in the top bar, per phone): the light look for reading the app outdoors in bright sun. A class on
 * <html> turns the colour scales upside down (index.css); the club colour follows (clubColors.ts).
 */

const SUN_KEY = 'bcv_sun_v1';
const EVENT = 'bcv-sun-mode';

export function loadSunMode(): boolean {
  try {
    return localStorage.getItem(SUN_KEY) === '1';
  } catch {
    return false;
  }
}

export const isSunMode = () => typeof document !== 'undefined' && document.documentElement.classList.contains('sol');

/** Turns the sun mode on or off on this phone. */
export function applySunMode(on: boolean, save = true) {
  document.documentElement.classList.toggle('sol', on);
  if (save) {
    try {
      if (on) localStorage.setItem(SUN_KEY, '1');
      else localStorage.removeItem(SUN_KEY);
    } catch {
      // Not saved: it stays on until the app is closed
    }
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Whether the sun mode is on, re-rendering when it changes. */
export const useSunMode = () => useSyncExternalStore(subscribe, isSunMode, () => false);
