import { describe, expect, it } from 'vitest';
import { sheetExercise, sheetName, sheetText } from './pdfSheet';

describe('fichas PDF → biblioteca', () => {
  it('arruma o texto lido do PDF (espaços, linhas vazias e números de página)', () => {
    expect(sheetText('  Rondo   5x2 \r\n\n\n\nRegras:\t2 toques\n3\nPágina 2 de 4\n1/3\n')).toBe(
      'Rondo 5x2\nRegras: 2 toques'
    );
  });

  it('dá nome à ficha a partir do título ou do ficheiro', () => {
    expect(sheetName({ title: '', fileName: 'Rondo_4x2-v2.pdf' })).toBe('Rondo 4x2 v2');
    expect(sheetName({ title: 'Jogo de posse', fileName: 'x.pdf' })).toBe('Jogo de posse');
    expect(sheetName({ title: '', fileName: '' })).toBe('Ficha PDF');
  });

  it('cria o exercício com imagem, explicação e ligação à ficha', () => {
    const ex = sheetExercise(
      { id: 'pdf1', title: 'Rondo 5x2', fileName: 'r.pdf', category: 'geral' },
      { image: 'data:image/jpeg;base64,AAA', text: 'Rondo 5x2\nQuadrado de 12x12 metros.\nDois toques.' },
      '2026-11-02T10:00:00.000Z'
    );
    expect(ex).toMatchObject({
      name: 'Rondo 5x2',
      category: 'tecnica',
      objective: 'Quadrado de 12x12 metros.',
      description: 'Rondo 5x2\nQuadrado de 12x12 metros.\nDois toques.',
      image: 'data:image/jpeg;base64,AAA',
      fromPdfId: 'pdf1',
      durationMinutes: 15
    });
  });

  it('mantém a categoria e a nota do treinador quando existem', () => {
    const ex = sheetExercise(
      { id: 'p', title: 'T', fileName: '', category: 'tatica', description: 'Nota' },
      { text: '' }
    );
    expect(ex.category).toBe('tatica');
    expect(ex.objective).toBe('Nota');
    expect(ex.description).toBeUndefined();
    expect(ex.image).toBeUndefined();
  });
});
