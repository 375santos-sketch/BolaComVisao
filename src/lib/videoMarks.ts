import { Match, Player } from '../types';
import { computeMinuteInHalf, getNominalHalfDuration } from './matchPhaseUtils';

/**
 * Game video with marks (Resultados → 🎥 Vídeo do jogo): the coach pastes the video link and says where each half
 * starts in the video; every goal, card and substitution then links to its moment (a few seconds before it), so the
 * video opens right there. YouTube links jump to the second; other links (Drive…) open the video at the start.
 */

/** Seconds of lead-in before each moment (to see the move that led to it). */
export const LEAD_IN_SECONDS = 15;

export interface VideoMark {
  id: string;
  kind: 'golo' | 'sofrido' | 'cartao' | 'substituicao';
  icon: string;
  label: string;
  minute: string;
  half: 1 | 2;
  /** Second of the video (null when the half's start is unknown). */
  seconds: number | null;
  link: string | null;
}

/** "12:34", "1:02:03", "754" or "12m34s" → seconds (null when not understood). */
export function parseVideoTime(text: string): number | null {
  const t = (text || '').trim().toLowerCase();
  if (!t) return null;
  const hms = /^(?:(\d+)h)?\s*(?:(\d+)m(?:in)?)?\s*(?:(\d+)s)?$/.exec(t);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
  }
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n > 59)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** 754 → "12:34", 3723 → "1:02:03" */
export function formatVideoTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** YouTube video id from the usual link forms (watch?v=, youtu.be/, shorts/, live/, embed/). */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (host === 'youtube.com' || host === 'music.youtube.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = /^\/(shorts|live|embed)\/([^/?#]+)/.exec(u.pathname);
      return m ? m[2] : null;
    }
  } catch {
    /* not a link */
  }
  return null;
}

export const isValidVideoUrl = (url: string) => /^https?:\/\/\S+\.\S+/.test((url || '').trim());

/** Link that opens the video at that second (YouTube), or the plain link for other videos. */
export function videoLinkAt(url: string, seconds: number): string {
  const id = youTubeId(url);
  return id ? `https://youtu.be/${id}?t=${Math.max(0, Math.floor(seconds))}` : url.trim();
}

/** All marks of the game (goals, goals conceded, cards, substitutions), in game order, with their video link. */
export function videoMarks(
  match: Match,
  roster: Player[],
  category?: string,
  opponentLabel = 'Adversário'
): VideoMark[] {
  const video = match.video;
  const D = getNominalHalfDuration(match, category);
  const name = (id?: string | null) => {
    if (!id || id === 'none') return '';
    if (id === 'autogolo' || id === 'auto_golo') return 'Autogolo';
    return roster.find((p) => p.id === id)?.name || '';
  };
  const marks: (VideoMark & { order: number })[] = [];
  const add = (
    id: string,
    kind: VideoMark['kind'],
    icon: string,
    label: string,
    minute: string | number | null | undefined,
    half: 1 | 2 | undefined,
    minuteInHalf?: number,
    period?: string
  ) => {
    const h: 1 | 2 = half === 2 || period === '2.ª parte' ? 2 : 1;
    const inHalf = minuteInHalf || computeMinuteInHalf(minute ?? null, h, D);
    const start = h === 2 ? video?.half2Start : video?.half1Start;
    const url = h === 2 && video?.url2 ? video.url2 : video?.url;
    const seconds = start != null && inHalf > 0 ? Math.max(start, start + (inHalf - 1) * 60 - LEAD_IN_SECONDS) : null;
    marks.push({
      order: h * 1000 + inHalf,
      id,
      kind,
      icon,
      label,
      minute: minute != null && minute !== '' ? String(minute) : '',
      half: h,
      seconds,
      link: url && seconds != null ? videoLinkAt(url, seconds) : null
    });
  };
  (match.goals || []).forEach((g) => {
    if (g.type === 'conceded') {
      add(g.id, 'sofrido', '🛡️', `Golo sofrido (${opponentLabel})`, g.minute, g.half, g.minuteInHalf, g.period);
    } else {
      const assist = name(g.assistId);
      add(
        g.id,
        'golo',
        '⚽',
        `Golo de ${name(g.scorerId) || '—'}${assist ? ` (assistência ${assist})` : ''}`,
        g.minute,
        g.half,
        g.minuteInHalf,
        g.period
      );
    }
  });
  (match.cards || []).forEach((c) => {
    const red = c.color === 'Vermelho' || c.type === 'red';
    add(
      c.id,
      'cartao',
      red ? '🟥' : '🟨',
      `Cartão ${red ? 'vermelho' : 'amarelo'}: ${name(c.playerId) || '—'}`,
      c.minute,
      c.half,
      c.minuteInHalf,
      c.period
    );
  });
  (match.subs || [])
    .filter((s) => !s.isHalftime && s.minute !== 'INT' && s.period !== 'Intervalo')
    .forEach((s) =>
      add(
        s.id,
        'substituicao',
        '🔄',
        `Entra ${name(s.inId) || '—'}, sai ${name(s.outId) || '—'}`,
        s.minute,
        s.half,
        s.minuteInHalf,
        s.period
      )
    );
  return marks.sort((a, b) => a.order - b.order).map(({ order: _order, ...m }) => m);
}
