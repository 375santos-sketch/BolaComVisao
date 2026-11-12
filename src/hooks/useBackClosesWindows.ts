import { useEffect } from 'react';

/** What counts as an open window of the app (the sheets, the old modals and the "Mais" menu). */
const WINDOW = '.ui-overlay, .modal-overlay';
const MARK = 'bcvWindow';

const openWindows = () => Array.from(document.querySelectorAll<HTMLElement>(WINDOW));

/**
 * Closes one window the way a person would: Esc first; if it is still open, a tap outside it (on the dark
 * background); if still open, its own close button.
 */
function closeTopWindow(win: HTMLElement) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  setTimeout(() => {
    if (!win.isConnected) return;
    win.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    win.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    setTimeout(() => {
      if (!win.isConnected) return;
      const close = win.querySelector<HTMLElement>('[aria-label^="Fechar"], [aria-label^="Close"], [title^="Fechar"]');
      close?.click();
    }, 50);
  }, 50);
}

/**
 * 📱 The phone's back button (Android, or the back gesture) closes the window that is open instead of leaving the
 * app. Each window that opens adds one step to the browser's history; back takes that step and closes the window on
 * top. A window closed in any other way (✕, Guardar, tap outside) takes its step back out, so the history stays as
 * it was.
 */
export function useBackClosesWindows(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
    let steps = 0; // history entries added for open windows
    let ignorePops = 0; // pops we caused ourselves (history.back after a window closed by other means)
    let closingByBack = 0; // windows being closed because of a back press

    const sync = () => {
      const count = openWindows().length;
      while (count > steps) {
        window.history.pushState({ [MARK]: steps + 1 }, '');
        steps += 1;
      }
      if (count < steps) {
        const extra = steps - count;
        steps = count;
        const fromBack = Math.min(closingByBack, extra);
        closingByBack -= fromBack;
        const toRemove = extra - fromBack;
        if (toRemove > 0) {
          ignorePops += toRemove;
          window.history.go(-toRemove);
        }
      }
    };

    const onPop = () => {
      if (ignorePops > 0) {
        ignorePops -= 1;
        return;
      }
      const wins = openWindows();
      const top = wins[wins.length - 1];
      if (!top) return;
      closingByBack += 1;
      closeTopWindow(top);
      // If the window refused to close (e.g. it asks for confirmation), its step comes back
      setTimeout(() => {
        if (top.isConnected && closingByBack > 0) {
          closingByBack -= 1;
          window.history.pushState({ [MARK]: steps }, '');
        }
      }, 400);
    };

    // Many changes come together (a window and its contents): count the windows once per frame
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', onPop);
    sync();
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('popstate', onPop);
    };
  }, []);
}
