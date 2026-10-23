import { useEffect, useRef } from 'react';
import { AppState } from '../types';
import { compressImageSource, PHOTO_MAX_BYTES, PHOTO_MAX_SIDE } from '../lib/imageCompress';
import { oversizedPhotos, replacePhotos } from '../lib/photoShrink';

/** Images that could not be read: left as they are and not retried in this session. */
const unreadable = new Set<string>();

/**
 * Reduces, once, the full-size photos saved before uploads were compressed (they filled the phone's storage). The
 * small versions are applied to the latest state, so edits made meanwhile are kept, and then saved like any change.
 */
export function useShrinkOldPhotos(
  state: AppState,
  latestState: { current: AppState },
  updateState: (updates: Partial<AppState>) => void
) {
  const running = useRef(false);
  const pending = oversizedPhotos(state).filter((url) => !unreadable.has(url));
  const key = pending.length ? `${pending.length}:${pending[0].length}` : '';

  useEffect(() => {
    if (!key || running.current) return;
    running.current = true;
    (async () => {
      const replacements = new Map<string, string>();
      for (const url of pending) {
        try {
          replacements.set(url, await compressImageSource(url, PHOTO_MAX_SIDE, PHOTO_MAX_BYTES));
        } catch {
          unreadable.add(url);
        }
      }
      const updates = replacePhotos(latestState.current, replacements);
      if (updates) updateState(updates);
    })().finally(() => {
      running.current = false;
    });
    // Runs when the set of oversized photos changes; the photos themselves are read when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
