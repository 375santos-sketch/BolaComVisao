import { describe, expect, it } from 'vitest';
import { squadIndicators, pctLabel } from '../lib/squadIndicators';
import { strengthsOf } from '../lib/playerEvolution';
import { sectorOf } from '../components/views/squad/types';
import { AppState, PlayerEvaluation } from '../types';

const game = (id: string, convocados: string[], lineup: string[]) => ({
  id,
  date: '2026-10-10',
  season: '2026/2027',
  opponent: 'Equipa B',
  finished: true,
  location: 'casa',
  goals: [],
  subs: [],
  lineup,
  convocados,
  halfDurationMinutes: 25
});

describe('Equipa: indicadores do plantel', () => {
  const state = {
    season: '2026/2027',
    category: 'Sub-11',
    roster: [
      { id: 'a', name: 'A', active: true },
      { id: 'b', name: 'B', active: true },
      { id: 'c', name: 'C', active: true },
      { id: 'x', name: 'Inativo', active: false }
    ],
    matches: [game('m1', ['a', 'b'], ['a'])],
    trainings: [
      { id: 't1', date: '2026-10-01', season: '2026/2027', completed: true, absences: ['b'], notes: '' },
      { id: 't2', date: '2026-10-03', season: '2026/2027', completed: true, absences: [], notes: '' },
      { id: 't3', date: '2026-10-05', season: '2026/2027', completed: false, absences: ['a', 'b'], notes: '' }
    ]
  } as unknown as AppState;
  const ind = squadIndicators(state);

  it('% conv. = minutes ÷ minutes of the games called up for; never called up → no data', () => {
    expect(ind.get('a')?.callupShare).toBe(1);
    expect(ind.get('b')?.callupShare).toBe(0);
    expect(ind.get('c')?.callupShare).toBeNull();
    expect(ind.has('x')).toBe(false);
  });

  it('% treinos = (held − absences) ÷ held, trainings "por fazer" do not count', () => {
    expect(ind.get('a')?.attendance).toBe(1);
    expect(ind.get('b')?.attendance).toBe(0.5);
  });

  it('no trainings → no data', () => {
    const empty = squadIndicators({ ...state, trainings: [] } as AppState);
    expect(empty.get('a')?.attendance).toBeNull();
    expect(pctLabel(null)).toBe('—');
    expect(pctLabel(0.744)).toBe('74%');
  });
});

describe('Equipa: avaliação e setores', () => {
  const ev = (scores: number[]): PlayerEvaluation => ({
    id: 'e',
    date: '2026-11-03',
    scores: { tecnica: scores[0], tatica: scores[1], fisica: scores[2], psicologica: scores[3], jogo: scores[4] }
  });

  it('strengths and points to improve are the highest and lowest areas of the evaluation (ties listed)', () => {
    const s = strengthsOf(ev([5, 4, 2, 5, 3]));
    expect(s.strong.map((r) => r.key)).toEqual(['tecnica', 'psicologica']);
    expect(s.improve.map((r) => r.key)).toEqual(['fisica']);
  });

  it('all areas with the same score: nothing singled out', () => {
    expect(strengthsOf(ev([3, 3, 3, 3, 3]))).toEqual({ strong: [], improve: [] });
  });

  it('sector of each position', () => {
    expect(sectorOf('Guarda-Redes (GR)')).toBe('gr');
    expect(sectorOf('Defesa Central (DC)')).toBe('def');
    expect(sectorOf('Médio Centro (MC)')).toBe('med');
    expect(sectorOf('Avançado Centro (PL/AC)')).toBe('ata');
    expect(sectorOf('')).toBe('outros');
  });
});
