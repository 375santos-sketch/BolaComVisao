import { describe, expect, it } from 'vitest';
import { ensureMapUpsert } from './pdfjs';

describe('pdf.js em telemóveis mais antigos', () => {
  it('Map e WeakMap ganham getOrInsert e getOrInsertComputed', () => {
    ensureMapUpsert();
    const m = new Map<string, number>() as Map<string, number> & {
      getOrInsertComputed(k: string, f: (k: string) => number): number;
      getOrInsert(k: string, v: number): number;
    };
    expect(m.getOrInsertComputed('a', () => 1)).toBe(1);
    expect(m.getOrInsertComputed('a', () => 2)).toBe(1);
    expect(m.getOrInsert('b', 5)).toBe(5);
    expect(m.getOrInsert('b', 6)).toBe(5);
    const key = {};
    const w = new WeakMap<object, number>() as WeakMap<object, number> & {
      getOrInsertComputed(k: object, f: (k: object) => number): number;
    };
    expect(w.getOrInsertComputed(key, () => 3)).toBe(3);
    expect(w.get(key)).toBe(3);
  });
});
