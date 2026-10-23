import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildTrainingSessionPDF } from '../lib/pdf/createTrainingReport';
import { extractRecords, assembleState } from '../lib/recordSync';
import { normalizeClubState } from '../lib/storage';
import { dataUrlBytes } from '../lib/imageCompress';
import { AppState, Exercise, Training } from '../types';

const image = `data:image/jpeg;base64,${readFileSync(join(__dirname, '../../e2e/fixtures/exercicio.jpg')).toString('base64')}`;
const rondo: Exercise = {
  id: 'ex1',
  name: 'Rondo 4x2',
  category: 'tecnica',
  durationMinutes: 15,
  createdAt: '2026-10-01T00:00:00Z',
  objective: 'Circulação de bola sob pressão',
  description: 'Quadrado de 12x12 m, 2 toques',
  image
};
const training: Training = {
  id: 't1',
  trainingNumber: 7,
  date: '2026-10-22',
  notes: '',
  absences: [],
  completed: false,
  sessionPlan: {
    objective: 'Pressão',
    blocks: [
      { id: 'b1', exerciseId: 'ex1', title: 'Rondo 4x2', durationMinutes: 15, notes: 'Circulação de bola sob pressão' }
    ]
  }
};
const state = normalizeClubState({ myClubName: 'Dragões', exerciseLibrary: [rondo], trainings: [training] } as never);

describe('Biblioteca de exercícios', () => {
  it('each exercise is its own cloud record (the club record stays small)', () => {
    const records = extractRecords(state as AppState);
    const ex = [...records.values()].find((r) => r.kind === 'exercise');
    expect(ex).toMatchObject({ entityId: 'ex1', data: { name: 'Rondo 4x2', image } });
    expect(JSON.stringify(records.get('club')!.data)).not.toContain('Rondo');
    // and comes back into the team when the state is rebuilt from the records
    expect(assembleState(records, state as AppState).exerciseLibrary).toEqual([expect.objectContaining({ id: 'ex1' })]);
  });

  it('the session plan PDF draws the exercise with its objective and rules', async () => {
    const { doc, filename } = await buildTrainingSessionPDF(training, state as AppState);
    const raw = doc.output() as string;
    expect(filename).toMatch(/^Plano_Treino_7_/);
    expect(raw).toContain('/Subtype /Image');
    expect(raw).toContain('Quadrado de 12x12 m');
  });

  it('measures the size of an image data URL', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,QUJD')).toBe(3);
  });
});
