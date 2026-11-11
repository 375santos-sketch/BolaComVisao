import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Shows a window on top of the whole app. Windows opened from inside a panel (the athlete's sheet) would otherwise
 * stay inside that panel's layer, under the bottom menu, with their last buttons covered.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  typeof document === 'undefined' ? <>{children}</> : createPortal(children, document.body);
