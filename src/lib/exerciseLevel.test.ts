import { describe, expect, it } from 'vitest';
import { applyVariants, levelHistory, levelTrend, variantsFor } from './exerciseLevel';
import { Exercise, SessionBlock, Training } from '../types';

const training = (id: string, date: string, blocks: SessionBlock[]): Training => ({
  id,
  date,
  notes: '',
  absences: [],
  sessionPlan: { blocks }
});
const rondo: Exercise = {
  id: 'ro',
  name: 'Rondo 4+1x2',
  category: 'tecnica',
  durationMinutes: 20,
  createdAt: '',
  description: 'Quadrado de 15x15, o joker joga com quem tem a bola.'
};
const jogo: Exercise = {
  id: 'jo',
  name: 'Jogo 5x5',
  category: 'jogo',
  durationMinutes: 30,
  createdAt: '',
  area: { w: 30, l: 20 },
  description: 'Máximo 2 toques.'
};
const b = (exerciseId: string, level?: SessionBlock['level']): SessionBlock => ({
  id: `b-${exerciseId}`,
  exerciseId,
  title: exerciseId,
  durationMinutes: 20,
  ...(level ? { level } : {})
});

describe('exercício no nível certo', () => {
  const trainings = [
    training('t3', '2026-11-02', [b('ro', 'facil'), b('jo', 'dificil')]),
    training('t1', '2026-09-28', [b('ro', 'dificil')]),
    training('t2', '2026-10-12', [b('ro', 'certo'), b('jo', 'dificil')]),
    training('t4', '2026-11-05', [b('ro')])
  ];

  it('histórico por exercício, do mais antigo para o mais recente, só o que foi marcado', () => {
    expect(levelHistory(trainings, 'ro').map((m) => `${m.date} ${m.level}`)).toEqual([
      '2026-09-28 dificil',
      '2026-10-12 certo',
      '2026-11-02 facil'
    ]);
    expect(levelHistory(trainings, 'ro', '2026-11-02').map((m) => m.level)).toEqual(['dificil', 'certo']);
    expect(levelHistory(undefined, 'ro')).toEqual([]);
  });

  it('frase da evolução para a biblioteca', () => {
    expect(levelTrend(levelHistory(trainings, 'ro'))).toEqual({
      text: 'A equipa evoluiu: está pronta para a variante mais difícil.',
      tone: 'up'
    });
    expect(levelTrend(levelHistory(trainings, 'jo'))?.text).toBe(
      'Difícil 2 vezes seguidas: experimenta a versão mais fácil.'
    );
    expect(levelTrend([{ date: '2026-11-02', level: 'certo' }])).toBeNull();
    expect(levelTrend([])).toBeNull();
  });

  it('foi fácil: espaço mais pequeno, menos toques, sem joker, um objetivo', () => {
    const v = variantsFor('facil', b('ro'), rondo);
    expect(v.map((x) => x.label)).toEqual([
      '📐 Espaço mais pequeno: 12×12 (era 15×15)',
      '✋ Máximo 2 toques',
      '➖ Sem o joker (igualdade numérica)',
      '⏱️ 10 passes seguidos = 1 ponto'
    ]);
    expect(v[0].area).toEqual({ w: 12, l: 12 });
    expect(variantsFor('facil', b('jo'), jogo).map((x) => x.id)).toEqual(['menor', 'toques', 'objetivo']);
    expect(variantsFor('facil', b('jo'), jogo)[1].label).toBe('✋ Só 1 toque');
    expect(variantsFor('certo', b('ro'), rondo)).toEqual([]);
  });

  it('foi difícil: espaço maior, joker, toques livres', () => {
    const v = variantsFor('dificil', b('jo'), jogo);
    expect(v.map((x) => x.label)).toEqual([
      '📐 Espaço maior: 36×24 (era 30×20)',
      '➕ Um joker para quem tem a bola',
      '✋ Toques livres',
      '🗣️ Paragem a meio para corrigir (2 min)'
    ]);
    // without a known size, still a suggestion (no size change)
    expect(variantsFor('dificil', b('x'), { ...jogo, id: 'x', area: undefined, description: '' })[0]).toEqual({
      id: 'maior',
      label: '📐 Espaço maior (mais tempo para decidir)',
      note: 'espaço maior'
    });
  });

  it('aplicar: uma linha nas notas, o espaço novo (para o Montar o campo) e não volta a sugerir', () => {
    const block = { ...b('ro'), notes: 'Trocar o joker a cada 3 min.' };
    const [menor, , semJoker] = variantsFor('facil', block, rondo);
    const out = applyVariants(block, 'facil', [menor, semJoker]);
    expect(out.notes).toBe('Trocar o joker a cada 3 min.\n⬆️ Mais difícil: espaço 12×12, sem joker.');
    expect(out.area).toEqual({ w: 12, l: 12 });
    expect(out.levelChecked).toBe(true);
    expect(applyVariants(b('jo'), 'dificil', [variantsFor('dificil', b('jo'), jogo)[2]]).notes).toBe(
      '⬇️ Mais fácil: toques livres.'
    );
  });
});
