import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Decisão 9 (dono, 24/11/2026): the old evaluations (scale 1–5) are read-only history. They can no longer be created
 * in the app, and now no screen can delete them either.
 */
describe('Avaliações antigas (1–5): histórico só de leitura', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const screens = [
    '../components/views/squad/PlayerEvolutionSection.tsx',
    '../components/views/squad/AthleteSheet.tsx',
    '../components/views/squad/CompetencyCard.tsx'
  ];

  it('nenhum ecrã apaga uma avaliação antiga', () => {
    for (const s of screens) expect(read(s), s).not.toMatch(/withoutEvaluation\s*\(/);
  });

  it('nenhum ecrã cria uma avaliação antiga', () => {
    for (const s of screens) expect(read(s), s).not.toMatch(/withEvaluation\s*\(/);
  });

  it('a lista continua a ser mostrada (o histórico não desaparece)', () => {
    expect(read('../components/views/squad/PlayerEvolutionSection.tsx')).toContain('Lista de avaliações');
  });
});
