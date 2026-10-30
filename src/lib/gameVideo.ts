import { Match, MatchVideo, Player } from '../types';
import { parseMinuteOrder } from './utils';
import { getNominalHalfDuration } from './matchPhaseUtils';

/**
 * 🎥 Vídeo do jogo: the game filmed and put on YouTube ("não listado"), linked to what was recorded in the Modo Jogo.
 * The app keeps only the video's id and where each half starts in it; every goal, substitution and card becomes a
 * jump to a few seconds before it. Events recorded with the clock running know their second; the others their minute.
 */

/** Seconds before the moment where the video starts, so the move is seen from its beginning. */
export const LEAD_SECONDS = 10;

/** The YouTube video id of a link (youtu.be/…, youtube.com/watch?v=…, /shorts/…, /live/…, /embed/…). */
export function youtubeIdOf(link: string): string | null {
  const text = (link || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/)?.[1] || null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** "1:02:15" / "33:40" / "95" → seconds (null when it is not a time). */
export function parseVideoTime(text: string): number | null {
  const parts = (text || '').trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
  return parts.reduce((total, p) => total * 60 + Number(p), 0);
}

/** 2015 → "33:35", 4000 → "1:06:40". */
export function formatVideoTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export type VideoEventKind = 'golo' | 'sofrido' | 'sub' | 'cartao';

export interface VideoEvent {
  id: string;
  kind: VideoEventKind;
  half: 1 | 2;
  minute: string; // "31'"
  title: string; // "Golo · Rui"
  detail: string; // "Assist. Tomás · Boa jogada"
  playerIds: string[];
  /** Where the video starts for this event (seconds), and whether the 2nd half start had to be guessed. */
  at: number;
  estimated: boolean;
}

type AnyEvent = {
  id: string;
  half?: 1 | 2;
  period?: string;
  minute: number | string | null;
  minuteInHalf?: number;
  clockSec?: number;
};

const halfOf = (e: AnyEvent): 1 | 2 => e.half ?? (/^2/.test(String(e.period || '')) ? 2 : 1);

/** Seconds into the half: the exact second when known (and still matching the minute), else the minute's start. */
function secondsInHalf(e: AnyEvent, half: 1 | 2, halfMinutes: number): number {
  let m = e.minuteInHalf;
  if (m === undefined || m === null) {
    const game = parseMinuteOrder(e.minute);
    if (game >= 999) return 0;
    m = half === 2 && game > halfMinutes ? game - halfMinutes : game;
  }
  m = Math.max(1, Math.floor(m));
  if (typeof e.clockSec === 'number' && Math.floor(e.clockSec / 60) + 1 === m) return e.clockSec;
  return (m - 1) * 60;
}

const nameOf = (roster: Player[], id: string | null | undefined, fallback?: string | null) => {
  if (!id && !fallback) return '';
  if (id === 'autogolo') return 'autogolo';
  const p = roster.find((r) => r && r.id === id);
  return p ? p.nickname?.trim() || p.name.split(/\s+/)[0] : fallback || '';
};

/** Every event of the game with where it is in the video, in game order. */
export function videoEvents(match: Match, video: MatchVideo, roster: Player[], category?: string): VideoEvent[] {
  const halfMinutes = getNominalHalfDuration(match, category);
  const firstHalfSeconds = (match.timer?.half1DurationMs ?? halfMinutes * 60000) / 1000;
  const startOf = (half: 1 | 2) =>
    half === 1
      ? { at: video.half1At, estimated: false }
      : video.half2At !== undefined
        ? { at: video.half2At, estimated: false }
        : { at: video.half1At + firstHalfSeconds, estimated: true };
  const place = (e: AnyEvent) => {
    const half = halfOf(e);
    const start = startOf(half);
    const at = start.at + secondsInHalf(e, half, halfMinutes) - LEAD_SECONDS + (video.nudges?.[e.id] || 0);
    return { half, at: Math.max(0, Math.round(at)), estimated: start.estimated };
  };
  const label = (e: AnyEvent) =>
    e.minute !== null && e.minute !== undefined && `${e.minute}` !== ''
      ? `${String(e.minute).replace(/'+$/, '')}'`
      : '';

  const events: VideoEvent[] = [];
  (match.goals || []).forEach((g) => {
    const scored = g.type === 'scored';
    const scorer = scored ? nameOf(roster, g.scorerId, g.scorer) : '';
    const assist = scored ? nameOf(roster, g.assistId, g.assist) : '';
    events.push({
      id: g.id,
      kind: scored ? 'golo' : 'sofrido',
      minute: label(g),
      title: scored ? `Golo${scorer ? ` · ${scorer}` : ''}` : 'Golo sofrido',
      detail: [assist && assist !== 'autogolo' ? `Assist. ${assist}` : '', g.goalType ? String(g.goalType) : '']
        .filter(Boolean)
        .join(' · '),
      playerIds: [g.scorerId, g.assistId].filter((x): x is string => Boolean(x) && x !== 'autogolo'),
      ...place(g)
    });
  });
  (match.subs || [])
    .filter((s) => !s.isHalftime)
    .forEach((s) =>
      events.push({
        id: s.id,
        kind: 'sub',
        minute: label(s),
        title: `Sai ${nameOf(roster, s.outId, s.playerOut)}, entra ${nameOf(roster, s.inId, s.playerIn)}`,
        detail: halfOf(s) === 2 ? '2.ª parte' : '1.ª parte',
        playerIds: [s.outId, s.inId].filter(Boolean),
        ...place(s)
      })
    );
  (match.cards || []).forEach((c) =>
    events.push({
      id: c.id,
      kind: 'cartao',
      minute: label(c),
      title: `${c.color === 'Vermelho' ? '🟥' : '🟨'} ${nameOf(roster, c.playerId, c.player)}`,
      detail: c.reason || '',
      playerIds: [c.playerId].filter(Boolean),
      ...place(c)
    })
  );
  return events.sort((a, b) => a.half - b.half || a.at - b.at);
}

export const videoLink = (youtubeId: string, at?: number) =>
  `https://youtu.be/${youtubeId}${at ? `?t=${Math.max(0, Math.round(at))}` : ''}`;

/** Message for the parents' group: a direct link to each goal of the game. */
export function goalsMessage(
  match: Match,
  video: MatchVideo,
  events: VideoEvent[],
  club: string,
  withNames = true
): string {
  const scored = (match.goals || []).filter((g) => g.type === 'scored').length;
  const conceded = (match.goals || []).length - scored;
  const goals = events.filter((e) => e.kind === 'golo');
  return [
    `🎥 Os golos do jogo ${club} ${scored}-${conceded} ${match.opponent}`,
    '',
    ...goals.map((g) => {
      const who = withNames ? g.title.replace(/^Golo( · )?/, '') : '';
      return `⚽ ${[g.minute, who].filter(Boolean).join(' ') || 'Golo'}: ${videoLink(video.youtubeId, g.at)}`;
    }),
    '',
    `Jogo completo: ${videoLink(video.youtubeId)}`
  ].join('\n');
}
