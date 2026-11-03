import { describe, expect, it } from 'vitest';
import { pageExercises, replaceSheetExercises, sheetDone } from './pdfSheet';
import { cleanPrintExercises } from './printExercise';
import { Exercise } from '../types';

const answer = {
  exercises: [
    {
      name: 'Rondo 5x2',
      category: 'tecnica',
      durationMinutes: 12,
      objective: 'Circulação de bola',
      description: 'Quadrado de 12x12 metros. Dois toques.',
      material: { cones: 4, bolas: 2 },
      drawing: { x: 0.05, y: 0.1, w: 0.4, h: 0.3 }
    },
    {
      name: 'Finalização 2x1',
      category: 'jogo',
      description: 'Ataque à baliza em superioridade.',
      drawing: { x: 0.05, y: 0.55, w: 0.4, h: 0.3 }
    },
    { name: '', description: '' }
  ]
};

describe('fichas PDF → um exercício por desenho', () => {
  it('lê os vários exercícios de uma página e deixa de fora o que não tem nada', () => {
    const list = cleanPrintExercises(answer);
    expect(list.map((e) => e.name)).toEqual(['Rondo 5x2', 'Finalização 2x1']);
    expect(list[0].drawing).toEqual({ x: 0.05, y: 0.1, w: 0.4, h: 0.3 });
    expect(cleanPrintExercises(null)).toEqual([]);
    expect(cleanPrintExercises({ exercises: 'x' })).toEqual([]);
  });

  it('cada exercício fica só com o seu desenho recortado e a sua explicação', async () => {
    const boxes: number[] = [];
    const made = await pageExercises(
      answer,
      2,
      'pdf1',
      async (box) => {
        boxes.push(box.y);
        return `data:image/jpeg;base64,${box.y}`;
      },
      '2026-11-03T10:00:00.000Z'
    );
    expect(boxes).toEqual([0.1, 0.55]);
    expect(made[0]).toMatchObject({
      name: 'Rondo 5x2',
      category: 'tecnica',
      durationMinutes: 12,
      objective: 'Circulação de bola',
      description: 'Quadrado de 12x12 metros. Dois toques.',
      material: { cones: 4, bolas: 2 },
      image: 'data:image/jpeg;base64,0.1',
      fromPdfId: 'pdf1',
      fromPdfPage: 2
    });
    expect(made[1]).toMatchObject({ name: 'Finalização 2x1', category: 'jogo', durationMinutes: 15 });
  });

  it('um desenho que não deu para recortar não impede o exercício', async () => {
    const made = await pageExercises(answer, 1, undefined, async () => {
      throw new Error('x');
    });
    expect(made).toHaveLength(2);
    expect(made[0].image).toBeUndefined();
    expect(made[0].fromPdfId).toBeUndefined();
  });

  it('passar outra vez substitui o que a ficha tinha dado (as páginas inteiras da 1.ª versão)', () => {
    const base = { category: 'tecnica', durationMinutes: 15, createdAt: '' } as const;
    const library: Exercise[] = [
      { ...base, id: 'a', name: 'Meu exercício' },
      { ...base, id: 'b', name: 'Página inteira', fromPdfId: 'pdf1' }
    ];
    expect(sheetDone(library, 'pdf1')).toBe(false);
    const next = replaceSheetExercises(library, 'pdf1', [
      { ...base, id: 'c', name: 'Rondo', fromPdfId: 'pdf1', fromPdfPage: 1 }
    ]);
    expect(next.map((e) => e.id)).toEqual(['a', 'c']);
    expect(sheetDone(next, 'pdf1')).toBe(true);
    // A PDF imported now (no link to a stored sheet) only adds
    expect(replaceSheetExercises(library, undefined, []).map((e) => e.id)).toEqual(['a', 'b']);
  });
});
