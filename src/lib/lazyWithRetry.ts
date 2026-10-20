import React, { lazy } from 'react';

/**
 * Robust lazy import wrapper with automatic retry on chunk loading errors
 * (e.g. after a new build / deployment, HMR refresh or temporary network disconnect)
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | Record<string, any>>,
  namedExport?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenReloaded = window.sessionStorage.getItem('ais_lazy_retry_reloaded');

    try {
      const module = await componentImport();
      if (namedExport && module[namedExport]) {
        return { default: module[namedExport] as T };
      }
      if ('default' in module && module.default) {
        return { default: module.default as T };
      }
      // If it's a module with named export matching component function
      for (const key of Object.keys(module)) {
        if (typeof module[key] === 'function') {
          return { default: module[key] as T };
        }
      }
      return module as { default: T };
    } catch (error: any) {
      console.warn('Lazy module import failed, attempting recovery...', error);
      // If it hasn't reloaded in this session yet for a chunk error, do one full reload to pull fresh bundles
      if (!pageHasBeenReloaded) {
        window.sessionStorage.setItem('ais_lazy_retry_reloaded', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      // Reset flag for future navigations
      window.sessionStorage.removeItem('ais_lazy_retry_reloaded');
      throw error;
    }
  });
}
