import { useEffect, useRef, useState } from 'react';

/**
 * Talks to an embedded YouTube player through postMessage (the official iframe protocol), without loading YouTube's
 * script: follows the current time and state, and seeks/plays/pauses it.
 */

const ORIGINS = /^https:\/\/(www\.)?youtube(-nocookie)?\.com$/;

export const embedUrl = (youtubeId: string, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1&start=${Math.max(
    0,
    Math.floor(start)
  )}&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`;

/** `onTick(time, ended)` is called on every update from the player (e.g. to move on to the next clip). */
interface FrameControls {
  seek: (seconds: number) => void;
  pause: () => void;
}

export function useYouTubeFrame(onTick?: (time: number, ended: boolean, player: FrameControls) => void) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });
  const [time, setTime] = useState(0);
  const [state, setState] = useState(-1); // 1 playing, 2 paused, 0 ended
  const [ready, setReady] = useState(false);

  const post = (message: Record<string, unknown>) =>
    frameRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
  const controls: FrameControls = {
    seek: (seconds) => {
      post({ event: 'command', func: 'seekTo', args: [Math.max(0, seconds), true] });
      post({ event: 'command', func: 'playVideo', args: [] });
      setTime(Math.max(0, seconds));
    },
    pause: () => post({ event: 'command', func: 'pauseVideo', args: [] })
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!ORIGINS.test(e.origin) || e.source !== frameRef.current?.contentWindow) return;
      let data: any;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.event === 'onReady') setReady(true);
      if (data?.event === 'onStateChange' && typeof data.info === 'number') setState(data.info);
      if (data?.event === 'infoDelivery' && data.info) {
        setReady(true);
        if (typeof data.info.currentTime === 'number') setTime(data.info.currentTime);
        if (typeof data.info.playerState === 'number') setState(data.info.playerState);
      }
      if (data?.event === 'infoDelivery' || data?.event === 'onStateChange') {
        const t = typeof data.info?.currentTime === 'number' ? data.info.currentTime : null;
        const ended = data.info === 0 || data.info?.playerState === 0;
        if (t !== null || ended) tickRef.current?.(t ?? -1, ended, controls);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // The controls only use the iframe's ref and state setters, which never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Call on the iframe's load: asks the player to send its time and state. */
  const listen = () => {
    post({ event: 'listening', id: 'bcv', channel: 'widget' });
    post({ event: 'command', func: 'addEventListener', args: ['onStateChange'] });
  };

  return {
    frameRef,
    listen,
    ready,
    time,
    playing: state === 1,
    ended: state === 0,
    ...controls
  };
}
