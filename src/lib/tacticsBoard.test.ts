import { describe, expect, it } from 'vitest';
import { Player } from '../types';
import {
  benchOf,
  boardFormatOf,
  copyOf,
  newBoard,
  withArrow,
  withAthlete,
  withExtra,
  withPosition,
  withSystem,
  withoutLastArrow,
  withoutPiece
} from './tacticsBoard';

const roster = [
  { id: 'a', name: 'Atleta A', number: 1, active: true },
  { id: 'b', name: 'Atleta B', number: 7, active: true },
  { id: 'c', name: 'Atleta C', number: 9, active: true, status: 'inativo' }
] as Player[];

describe('Quadro tático', () => {
  it('a new board puts our places in the system, goalkeeper at the bottom', () => {
    const b = newBoard('t1', 'Saída de bola', 7, '2-3-1', '2026-11-10');
    expect(b.pieces).toHaveLength(7);
    const gk = b.frames[0].positions.o0;
    expect(gk.y).toBeGreaterThan(85);
    expect(boardFormatOf(3)).toBe(5);
    expect(boardFormatOf(undefined)).toBe(7);
  });

  it('athletes in places (one place each), another system keeps them, the bench is who is left', () => {
    let b = newBoard('t1', 'X', 7, '2-3-1', '2026-11-10');
    b = withAthlete(b, 'o0', roster[0], 0);
    b = withAthlete(b, 'o3', roster[1], 3);
    b = withAthlete(b, 'o4', roster[1], 4); // moves B from o3 to o4
    expect(b.pieces.find((p) => p.id === 'o3')?.playerId).toBeNull();
    expect(b.pieces.find((p) => p.id === 'o4')).toMatchObject({ playerId: 'b', label: '7' });
    const before = b.frames[0].positions.o4;
    b = withSystem(b, '3-2-1');
    expect(b.system).toBe('3-2-1');
    expect(b.pieces.find((p) => p.id === 'o4')?.playerId).toBe('b');
    expect(b.frames[0].positions.o4).not.toEqual(before);
    // The inactive athlete is never on the bench
    expect(benchOf(b, roster).map((p) => p.id)).toEqual([]);
  });

  it('dragging stays on the pitch; opponents, ball and arrows', () => {
    let b = newBoard('t1', 'X', 7, '2-3-1', '2026-11-10');
    b = withPosition(b, 'o1', -10, 120);
    expect(b.frames[0].positions.o1).toEqual({ x: 3, y: 97 });
    b = withExtra(b, 'opp', 'x1');
    b = withExtra(b, 'ball', 'bl');
    b = withExtra(b, 'ball', 'bl2'); // one ball only
    expect(b.pieces.filter((p) => p.kind !== 'own').map((p) => p.id)).toEqual(['x1', 'bl']);
    b = withArrow(b, { x1: 50, y1: 80, x2: 51, y2: 81 }); // a tap: no arrow
    b = withArrow(b, { x1: 50, y1: 80, x2: 60, y2: 50 });
    expect(b.frames[0].arrows).toHaveLength(1);
    expect(withoutLastArrow(b).frames[0].arrows).toHaveLength(0);
    // Our places are never removed; extras are
    expect(withoutPiece(withoutPiece(b, 'o1'), 'x1').pieces.map((p) => p.id)).not.toContain('x1');
    expect(withoutPiece(b, 'o1').pieces.map((p) => p.id)).toContain('o1');
  });

  it('another version is a full copy with its own id and name', () => {
    const b = withArrow(newBoard('t1', 'Pressão', 7, '2-3-1', '2026-11-01'), { x1: 10, y1: 10, x2: 40, y2: 40 });
    const v = copyOf(b, 't2', '2026-11-10');
    expect(v).toMatchObject({ id: 't2', name: 'Pressão (versão 2)', createdAt: '2026-11-10' });
    expect(v.frames[0].arrows).toEqual(b.frames[0].arrows);
    expect(v.frames[0]).not.toBe(b.frames[0]);
  });
});
