import { BoardPiece, PlayFrame, TacticPlay } from '../types';
import { uid } from './utils';

/**
 * Quadro tático (Pré-jogo → 🧩): a play drawn in steps on a pitch shown upright (our goal at the bottom). The coach
 * drags players and the ball in each step and the app animates from one step to the next.
 */

export type BoardFormat = TacticPlay['format'];
export const BOARD_FORMATS: BoardFormat[] = [5, 7, 9, 11];

/** Seconds of animation between two steps. */
export const STEP_SECONDS = 1.2;
export const MAX_STEPS = 12;

// Our team's starting positions (percent of the pitch: x left→right, y top→bottom; our goal at the bottom)
const OWN_SHAPES: Record<BoardFormat, [number, number][]> = {
  5: [
    [50, 93],
    [30, 75],
    [70, 75],
    [50, 62],
    [50, 50]
  ],
  7: [
    [50, 93],
    [22, 77],
    [50, 80],
    [78, 77],
    [33, 63],
    [67, 63],
    [50, 52]
  ],
  9: [
    [50, 93],
    [22, 80],
    [50, 82],
    [78, 80],
    [15, 64],
    [40, 66],
    [60, 66],
    [85, 64],
    [50, 53]
  ],
  11: [
    [50, 94],
    [15, 80],
    [38, 83],
    [62, 83],
    [85, 80],
    [25, 66],
    [50, 69],
    [75, 66],
    [20, 55],
    [80, 55],
    [50, 53]
  ]
};

/** A new play: our players (1, 2, 3…), opponents (optional, mirrored in the other half) and the ball. */
export function newPlay(format: BoardFormat = 7, withOpponents = true, name = ''): TacticPlay {
  const pieces: BoardPiece[] = [];
  const positions: PlayFrame['positions'] = {};
  OWN_SHAPES[format].forEach(([x, y], i) => {
    const id = `own${i + 1}`;
    pieces.push({ id, kind: 'own', label: String(i + 1), playerId: null });
    positions[id] = { x, y };
  });
  if (withOpponents) {
    OWN_SHAPES[format].forEach(([x, y], i) => {
      const id = `opp${i + 1}`;
      pieces.push({ id, kind: 'opp', label: '' });
      positions[id] = { x: 100 - x, y: 100 - y };
    });
  }
  pieces.push({ id: 'ball', kind: 'ball', label: '' });
  positions.ball = { x: 50, y: 88 };
  return { id: uid(), name, format, pieces, frames: [{ positions }], createdAt: new Date().toISOString() };
}

const clamp = (v: number) => Math.max(2, Math.min(98, Math.round(v * 10) / 10));

/** Moves one piece in one step (kept inside the pitch). */
export function movePiece(play: TacticPlay, step: number, pieceId: string, x: number, y: number): TacticPlay {
  const frames = play.frames.map((f, i) =>
    i === step ? { ...f, positions: { ...f.positions, [pieceId]: { x: clamp(x), y: clamp(y) } } } : f
  );
  return { ...play, frames };
}

/** Adds a step after `step`, starting where that step ends (the coach then moves what changes). */
export function addStep(play: TacticPlay, step: number): TacticPlay {
  if (play.frames.length >= MAX_STEPS) return play;
  const base = play.frames[step] || play.frames[play.frames.length - 1];
  const copy: PlayFrame = { positions: { ...base.positions } };
  const frames = [...play.frames.slice(0, step + 1), copy, ...play.frames.slice(step + 1)];
  return { ...play, frames };
}

export function removeStep(play: TacticPlay, step: number): TacticPlay {
  if (play.frames.length <= 1) return play;
  return { ...play, frames: play.frames.filter((_, i) => i !== step) };
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Positions at a moment of the animation: `time` in steps (1.5 = halfway between step 2 and step 3). */
export function positionsAt(play: TacticPlay, time: number): PlayFrame['positions'] {
  const last = play.frames.length - 1;
  const t = Math.max(0, Math.min(last, time));
  const i = Math.min(last, Math.floor(t));
  const a = play.frames[i].positions;
  if (i === last) return a;
  const b = play.frames[i + 1].positions;
  const k = ease(t - i);
  const out: PlayFrame['positions'] = {};
  Object.keys(a).forEach((id) => {
    const from = a[id];
    const to = b[id] || from;
    out[id] = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  });
  return out;
}

/** Pieces that move from step `step - 1` to `step` (to draw their path as arrows). */
export function movesInto(
  play: TacticPlay,
  step: number
): { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] {
  if (step <= 0) return [];
  const prev = play.frames[step - 1]?.positions || {};
  const cur = play.frames[step]?.positions || {};
  return Object.keys(cur)
    .filter((id) => prev[id] && Math.hypot(cur[id].x - prev[id].x, cur[id].y - prev[id].y) > 1)
    .map((id) => ({ id, from: prev[id], to: cur[id] }));
}
