import { describe, expect, it } from 'vitest';
import {
  arrangeStarters,
  defaultSystem,
  lineupStarters,
  positionGroup,
  shortName,
  slotNames,
  assignSlot,
  slotPositions,
  swapSlots,
  systemLines
} from '../lib/startingLineup';
import { Player } from '../types';

const p = (id: string, number: number, positions: string, name = `Atleta ${id}`): Player => ({
  id,
  name,
  number,
  positions,
  birthDate: null,
  active: true
});

describe('Equipa inicial', () => {
  it('reads the system and falls back to the usual one when it does not add up', () => {
    expect(systemLines('2-3-1', 7)).toEqual([2, 3, 1]);
    expect(systemLines(' 3 - 2 - 1 ', 7)).toEqual([3, 2, 1]);
    expect(systemLines('4-4-2', 7)).toEqual([2, 3, 1]);
    expect(systemLines(undefined, 11)).toEqual([4, 3, 3]);
    expect(defaultSystem(6)).toBe('3-2');
  });

  it('places the goalkeeper at the bottom and each line above it, left to right', () => {
    const pos = slotPositions([2, 3, 1]);
    expect(pos).toHaveLength(7);
    expect(pos[0]).toEqual({ x: 0.5, y: 0.93 });
    expect(pos[1].y).toBeGreaterThan(pos[3].y); // defence below midfield
    expect(pos[3].y).toBeGreaterThan(pos[6].y); // midfield below attack
    expect(pos[1].x).toBeLessThan(pos[2].x);
  });

  it('recognises the positions written in the squad', () => {
    expect(positionGroup('Guarda-Redes')).toBe('gr');
    expect(positionGroup('Defesa Central')).toBe('def');
    expect(positionGroup('Lateral esquerdo')).toBe('def');
    expect(positionGroup('Médio')).toBe('med');
    expect(positionGroup('Extremo / Ponta de lança')).toBe('ava');
    expect(positionGroup('')).toBeUndefined();
  });

  it('puts each starter in the line of his position, filling the rest', () => {
    const starters = [
      p('a', 9, 'Avançado'),
      p('b', 1, 'Guarda-redes'),
      p('c', 4, 'Defesa'),
      p('d', 8, 'Médio'),
      p('e', 7, 'Médio'),
      p('f', 3, ''),
      p('g', 10, 'Médio')
    ];
    const slots = arrangeStarters(starters, '2-3-1', 7);
    expect(slots).toHaveLength(7);
    expect(slots[0]).toBe('b'); // goalkeeper
    expect(slots.slice(1, 3)).toContain('c'); // defence
    expect(slots.slice(3, 6).sort()).toEqual(['d', 'e', 'g']); // midfield
    expect(slots[6]).toBe('a'); // attack
    expect(new Set(slots).size).toBe(7);
  });

  it('places every starter when nobody has a position for the lines (all "Médio")', () => {
    const m = (id: string, n: number) => p(id, n, 'Médio');
    const slots = arrangeStarters([m('a', 1), m('b', 2), m('c', 9)], '2-2', 5);
    expect(slots.filter(Boolean).sort()).toEqual(['a', 'b', 'c']);
  });

  it('leaves places empty when there are fewer starters, swaps places, and keeps only called-up starters', () => {
    const slots = arrangeStarters([p('a', 9, 'Avançado'), p('b', 1, 'Guarda-redes')], '2-3-1', 7);
    expect(slots.filter(Boolean)).toHaveLength(2);
    expect(swapSlots(['x', 'y', 'z'], 0, 2)).toEqual(['z', 'y', 'x']);
    expect(lineupStarters({ system: '2-3-1', slots: ['a', null, 'b', 'c'] }, ['a', 'c'])).toEqual(['a', 'c']);
  });

  it('uses the nickname or the first and last names', () => {
    expect(shortName({ name: 'Tomás Pedro Teste' })).toBe('Tomás Teste');
    expect(shortName({ name: 'Rui Teste', nickname: 'Ruizinho' })).toBe('Ruizinho');
  });

  it('names every place of the pitch', () => {
    expect(slotNames([2, 3, 1])).toEqual([
      'Guarda-redes',
      'Central esquerdo',
      'Central direito',
      'Médio esquerdo',
      'Médio centro',
      'Médio direito',
      'Ponta de lança'
    ]);
    expect(slotNames([4, 3, 3])).toEqual([
      'Guarda-redes',
      'Lateral esquerdo',
      'Central esquerdo',
      'Central direito',
      'Lateral direito',
      'Médio esquerdo',
      'Médio centro',
      'Médio direito',
      'Extremo esquerdo',
      'Ponta de lança',
      'Extremo direito'
    ]);
    expect(slotNames([4, 2, 3, 1]).slice(5, 7)).toEqual(['Médio defensivo esquerdo', 'Médio defensivo direito']);
    expect(slotNames([4, 2, 3, 1])[8]).toBe('Médio ofensivo');
  });

  it('puts any player in any place: swapping with another place, or sending the one there to the bench', () => {
    const slots = ['gk', 'a', 'b', null];
    expect(assignSlot(slots, 1, 'b')).toEqual(['gk', 'b', 'a', null]); // swap
    expect(assignSlot(slots, 1, 'miguel')).toEqual(['gk', 'miguel', 'b', null]); // from the bench
    expect(assignSlot(slots, 3, 'a')).toEqual(['gk', null, 'b', 'a']); // to an empty place
    expect(assignSlot(slots, 2, null)).toEqual(['gk', 'a', null, null]); // to the bench
  });
});
