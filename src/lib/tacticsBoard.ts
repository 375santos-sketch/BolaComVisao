import { Player, TacticPlay } from '../types';
import { slotPositions, systemLines } from './startingLineup';

/**
 * 🧠 Quadro tático: our team in a game system on the pitch (each athlete dragged where he should be), the
 * opponents and the ball when needed, and arrows for the movements. Each board is a strategy, kept with a name; a
 * copy makes another version. Stored as the team's "tacticPlays" (one cloud record each, as before).
 */

type Board = TacticPlay;
type BoardFormat = Board['format'];
type Arrow = NonNullable<Board['frames'][number]['arrows']>[number];

export const FORMATS: BoardFormat[] = [5, 7, 9, 11];

/** The team's format for the board (3 v 3 teams use the 5-a-side pitch). */
export const boardFormatOf = (tacticFormat: number | undefined): BoardFormat =>
  tacticFormat === 11 || tacticFormat === 9 || tacticFormat === 5 ? tacticFormat : tacticFormat === 3 ? 5 : 7;

const clamp = (n: number) => Math.round(Math.min(97, Math.max(3, n)) * 10) / 10;

/** Places of the system as percent of the pitch (our goal at the bottom). */
function places(format: BoardFormat, system: string) {
  return slotPositions(systemLines(system, format)).map((p) => ({ x: clamp(p.x * 100), y: clamp(p.y * 100) }));
}

const ownIds = (board: Board) => board.pieces.filter((p) => p.kind === 'own').map((p) => p.id);

/** A new board: our places in the system, empty (the athletes are put in by the coach). */
export function newBoard(id: string, name: string, format: BoardFormat, system: string, today: string): Board {
  const spots = places(format, system);
  const pieces = spots.map((_, i) => ({ id: `o${i}`, kind: 'own' as const, label: i === 0 ? 'GR' : String(i + 1) }));
  return {
    id,
    name,
    format,
    system,
    createdAt: today,
    pieces,
    frames: [{ positions: Object.fromEntries(pieces.map((p, i) => [p.id, spots[i]])), arrows: [] }]
  };
}

/** Another system: our pieces go to its places, each keeping its athlete. */
export function withSystem(board: Board, system: string): Board {
  const spots = places(board.format, system);
  const own = ownIds(board);
  const frame = board.frames[0] || { positions: {} };
  const positions = { ...frame.positions };
  own.forEach((id, i) => {
    if (spots[i]) positions[id] = spots[i];
  });
  return { ...board, system, frames: [{ ...frame, positions }, ...board.frames.slice(1)] };
}

export function withPosition(board: Board, pieceId: string, x: number, y: number): Board {
  const frame = board.frames[0] || { positions: {} };
  return {
    ...board,
    frames: [
      { ...frame, positions: { ...frame.positions, [pieceId]: { x: clamp(x), y: clamp(y) } } },
      ...board.frames.slice(1)
    ]
  };
}

/** Puts an athlete in a place (taking him out of any other place) or empties it (null). */
export function withAthlete(
  board: Board,
  pieceId: string,
  player: Pick<Player, 'id' | 'number'> | null,
  index: number
): Board {
  return {
    ...board,
    pieces: board.pieces.map((p) => {
      if (p.id === pieceId)
        return {
          ...p,
          playerId: player?.id ?? null,
          label: player ? (player.number != null ? String(player.number) : '•') : index === 0 ? 'GR' : String(index + 1)
        };
      if (player && p.playerId === player.id) return { ...p, playerId: null, label: p.kind === 'own' ? '?' : p.label };
      return p;
    })
  };
}

/** An opponent or the ball, added in the middle of the pitch. */
export function withExtra(board: Board, kind: 'opp' | 'ball', id: string): Board {
  if (kind === 'ball' && board.pieces.some((p) => p.kind === 'ball')) return board;
  const count = board.pieces.filter((p) => p.kind === 'opp').length;
  const piece = { id, kind, label: kind === 'ball' ? '' : String(count + 1) } as Board['pieces'][number];
  const at = kind === 'ball' ? { x: 50, y: 50 } : { x: clamp(20 + ((count * 15) % 60)), y: 30 };
  const frame = board.frames[0] || { positions: {} };
  return {
    ...board,
    pieces: [...board.pieces, piece],
    frames: [{ ...frame, positions: { ...frame.positions, [id]: at } }, ...board.frames.slice(1)]
  };
}

export function withoutPiece(board: Board, pieceId: string): Board {
  const frame = board.frames[0] || { positions: {} };
  const positions = { ...frame.positions };
  delete positions[pieceId];
  return {
    ...board,
    pieces: board.pieces.filter((p) => p.id !== pieceId || p.kind === 'own'),
    frames: [{ ...frame, positions }, ...board.frames.slice(1)]
  };
}

/** An arrow (a movement); a tap without moving is not an arrow. */
export function withArrow(board: Board, arrow: Arrow): Board {
  if (Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) < 4) return board;
  const frame = board.frames[0] || { positions: {} };
  const a = { x1: clamp(arrow.x1), y1: clamp(arrow.y1), x2: clamp(arrow.x2), y2: clamp(arrow.y2) };
  return { ...board, frames: [{ ...frame, arrows: [...(frame.arrows || []), a] }, ...board.frames.slice(1)] };
}

export function withoutLastArrow(board: Board): Board {
  const frame = board.frames[0] || { positions: {} };
  return { ...board, frames: [{ ...frame, arrows: (frame.arrows || []).slice(0, -1) }, ...board.frames.slice(1)] };
}

/** Another version of a board (same pieces, positions and arrows) with its own name. */
export function copyOf(board: Board, id: string, today: string): Board {
  return { ...JSON.parse(JSON.stringify(board)), id, name: `${board.name} (versão 2)`, createdAt: today };
}

/** The athletes on the board and the ones left out (the bench), among the ones who can play. */
export function benchOf(board: Board, roster: Player[]): Player[] {
  const used = new Set(board.pieces.map((p) => p.playerId).filter(Boolean));
  return roster.filter((p) => p && p.active !== false && p.status !== 'inativo' && !used.has(p.id));
}
