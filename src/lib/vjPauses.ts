import { VjItem, VjOption, VjPause, VjRun, VjSession } from '../types';

/**
 * 🎬 Visão de Jogo (VJ2) — pauses with questions. The video stops at the second of each pause (with a tolerance:
 * the player reports the time a few times per second), the team talks and answers, the coach shows the
 * explanations. A choice question may have several right answers, each with its own explanation; an open question
 * is only talked about. The group's answers are kept (never athletes' names).
 */

/** How early a pause may trigger (the player reports the time a few times per second). */
export const PAUSE_TOLERANCE = 0.3;
export const MAX_RUNS = 10;

/** "1:05" or "65" → 65; null when it is not a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  const m = /^(?:(\d+):)?(\d{1,2})(?:[.,](\d))?$/.exec(t);
  if (!m) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  if (m[1] && seconds >= 60) return null;
  return minutes * 60 + seconds + (m[3] ? Number(m[3]) / 10 : 0);
}

export const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A clean pause: a question, a time, and for a choice question 2–5 answers with at least one right. */
export function cleanPause(p: VjPause): VjPause | null {
  const question = p.question.trim().slice(0, 200);
  if (!question || !(p.at >= 0)) return null;
  if (p.kind === 'aberta') {
    const explanation = (p.explanation || '').trim().slice(0, 400);
    return {
      id: p.id,
      at: Math.round(p.at * 10) / 10,
      question,
      kind: 'aberta',
      ...(explanation ? { explanation } : {})
    };
  }
  const options: VjOption[] = (p.options || [])
    .map((o) => ({
      id: o.id,
      text: o.text.trim().slice(0, 120),
      correct: !!o.correct,
      ...(o.explanation?.trim() ? { explanation: o.explanation.trim().slice(0, 300) } : {})
    }))
    .filter((o) => o.text)
    .slice(0, 5);
  if (options.length < 2 || !options.some((o) => o.correct)) return null;
  return { id: p.id, at: Math.round(p.at * 10) / 10, question, kind: 'escolha', options };
}

/** The pauses of a video in order of time. */
export const pausesOf = (item: VjItem): VjPause[] => [...(item.pauses || [])].sort((a, b) => a.at - b.at);

/** The pause the video must stop at now: the first one not done yet whose time has been reached. */
export function pauseDue(item: VjItem, time: number, done: Set<string>): VjPause | null {
  return pausesOf(item).find((p) => !done.has(p.id) && time >= p.at - PAUSE_TOLERANCE) || null;
}

/** The next pause not done yet (for «Ir à próxima pergunta», when the video does not play). */
export const nextPause = (item: VjItem, done: Set<string>): VjPause | null =>
  pausesOf(item).find((p) => !done.has(p.id)) || null;

/** Whether the group's choice matches the right answers exactly (open questions are never "right" or "wrong"). */
export function groupGotIt(pause: VjPause, chosen: string[]): boolean | null {
  if (pause.kind !== 'escolha') return null;
  const right = (pause.options || [])
    .filter((o) => o.correct)
    .map((o) => o.id)
    .sort();
  return right.length > 0 && [...chosen].sort().join(',') === right.join(',');
}

/** The session with this run added (the latest MAX_RUNS kept). */
export const withRun = (s: VjSession, run: VjRun): VjSession => ({
  ...s,
  runs: [...(s.runs || []), run].slice(-MAX_RUNS)
});

export const pauseCount = (s: VjSession) => s.items.reduce((n, i) => n + (i.pauses?.length || 0), 0);
