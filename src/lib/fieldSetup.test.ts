import { describe, expect, it } from 'vitest';
import {
  areaOf,
  cleanSetup,
  conesOf,
  fieldOf,
  fieldSetup,
  fieldSvg,
  goalsOf,
  parseArea,
  setupSteps
} from './fieldSetup';
import { Exercise, SessionBlock } from '../types';

const ex = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise => ({
  id,
  name,
  category: 'tecnica',
  durationMinutes: 15,
  createdAt: '',
  ...extra
});
const block = (id: string, exerciseId: string | undefined, minutes: number, title = ''): SessionBlock => ({
  id,
  exerciseId,
  title,
  durationMinutes: minutes
});

describe('montar o campo', () => {
  it('lê as medidas escritas e não confunde com o número de jogadores', () => {
    expect(parseArea('Quadrado de 12x12, dois toques')).toEqual({ w: 12, l: 12 });
    expect(parseArea('Espaço 30 x 20 m com 2 balizas')).toEqual({ w: 30, l: 20 });
    expect(parseArea('20×15 metros')).toEqual({ w: 20, l: 15 });
    expect(parseArea('Jogo 5x5 com joker')).toBeNull();
    expect(parseArea('Rondo 4x2')).toBeNull();
    expect(parseArea('Jogo 8x8 em meio campo')).toBeNull();
  });

  it('usa a medida guardada, o espaço do exercício ou o texto', () => {
    const b = block('b', 'e', 15);
    expect(areaOf(b, ex('e', 'X', { area: { w: 10, l: 8 } }), 'f7')).toEqual({ w: 10, l: 8 });
    expect(areaOf({ ...b, area: { w: 5, l: 5 } }, ex('e', 'X', { area: { w: 10, l: 8 } }), 'f7')).toEqual({
      w: 5,
      l: 5
    });
    expect(areaOf(b, ex('e', 'X', { spaceDimensions: '½ campo' }), 'f7')).toEqual({ w: 40, l: 30 });
    expect(areaOf(b, ex('e', 'X', { spaceDimensions: 'Campo inteiro' }), 'meio-f7')).toEqual({ w: 40, l: 30 });
    expect(areaOf(b, ex('e', 'X', { description: 'Quadrado de 15x15.' }), 'f7')).toEqual({ w: 15, l: 15 });
    expect(areaOf(b, ex('e', 'Rondo 4x2'), 'f7')).toBeNull();
  });

  it('segunda: campo de 7 inteiro; quinta: meio campo (ou o que o treinador escolher)', () => {
    expect(fieldOf({ date: '2026-11-02' })).toBe('f7'); // segunda
    expect(fieldOf({ date: '2026-11-05' })).toBe('meio-f7'); // quinta
    expect(fieldOf({ date: '2026-11-05', field: 'f7' })).toBe('f7');
    expect(fieldOf({ date: '2026-11-02' }, { '1': 'meio-f7' })).toBe('meio-f7');
  });

  const library = [
    ex('aq', 'Aquecimento', { description: 'Quadrado de 15x15' }),
    ex('ro', 'Rondo 4x2', { description: 'Quadrado de 12x12' }),
    ex('jo', 'Jogo 5x5', { description: 'Espaço 30x20 m', material: { balizas: 2, cones: 6 } })
  ];
  const plan = [block('1', 'aq', 15), block('2', 'ro', 20), block('3', 'jo', 30), block('4', 'ro', 10)];

  it('no campo de 7 inteiro fica tudo montado antes do treino, sem zonas por cima umas das outras', () => {
    const s = fieldSetup(plan, library, 'f7');
    expect(s.zones.map((z) => [z.letter, z.title, z.from, z.to])).toEqual([
      ['A', 'Aquecimento', 0, 15],
      ['B', 'Rondo 4x2', 15, 75], // usado duas vezes: a mesma zona
      ['C', 'Jogo 5x5', 35, 65]
    ]);
    expect(s.zones.every((z) => !z.after)).toBe(true);
    for (const a of s.zones)
      for (const b of s.zones)
        if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.l <= b.y || b.y + b.l <= a.y).toBe(true);
    for (const z of s.zones) {
      expect(z.x + z.w).toBeLessThanOrEqual(40);
      expect(z.y + z.l).toBeLessThanOrEqual(60);
    }
  });

  it('no meio campo, o que não cabe ao mesmo tempo usa o espaço de um exercício que já acabou', () => {
    const s = fieldSetup([block('1', 'aq', 15), block('2', 'jo', 30)], library, 'meio-f7');
    const [a, c] = s.zones;
    expect(a.after).toBeUndefined();
    expect(c.after).toBe('A');
    expect([c.x, c.y]).toEqual([a.x, a.y]);
    expect(s.crowded).toEqual([]);
    expect(setupSteps(s)[1].text).toMatch(
      /^Quando acabar a zona A, muda os cones dela para um retângulo de 30 passos × 20 passos/
    );
  });

  it('avisa quando dois exercícios ao mesmo tempo não cabem, e pede as medidas que faltam', () => {
    const lib = [ex('g1', 'Grande 1', { area: { w: 36, l: 20 } }), ex('g2', 'Grande 2', { area: { w: 36, l: 20 } })];
    // the same minutes: two blocks of the same length starting together is not possible in a plan, so overlap
    // happens only through reuse rules; here the second one starts while the first is still on
    const s = fieldSetup(
      [block('1', 'g1', 30), block('2', undefined, 0, 'Sem medidas'), block('3', 'g2', 30)],
      lib,
      'meio-f7'
    );
    expect(s.zones.map((z) => z.after)).toEqual([undefined, 'A']);
    const t = fieldSetup([block('1', undefined, 10, 'Passe livre')], [], 'f7');
    expect(t.missing).toEqual(['Passe livre']);
  });

  it('cones nos cantos (e a meio dos lados grandes) e balizas nos lados curtos', () => {
    expect(conesOf({ x: 0, y: 0, w: 12, l: 12 })).toHaveLength(4);
    expect(conesOf({ x: 0, y: 0, w: 30, l: 25 })).toHaveLength(8);
    expect(goalsOf({ x: 0, y: 0, w: 20, l: 30, goals: 2 })).toEqual([
      { x: 10, y: 0, across: true },
      { x: 10, y: 30, across: true }
    ]);
  });

  it('passos a partir da bandeirola, em passos ou em metros', () => {
    const s = fieldSetup([block('1', 'ro', 20)], library, 'f7');
    const [st] = setupSteps(s);
    expect(st.text).toBe(
      'Da 🚩, anda 2 passos ao longo da linha de fundo e 2 passos para dentro do campo: 1.º cone. Daí faz um quadrado de 12 passos (ao longo da linha de fundo) × 12 passos (para dentro).'
    );
    expect(st.sub).toBe('Zona A · Rondo 4x2 · 4 cones');
    expect(setupSteps(s, 'm')[0].text).toContain('12 m (ao longo da linha de fundo)');
  });

  it('desenho e dados publicados no link do adjunto sem texto perigoso', () => {
    const s = fieldSetup([block('1', 'ro', 20, '<b>Rondo</b>')], library, 'f7');
    const svg = fieldSvg(s);
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toContain('<b>');
    const back = cleanSetup(JSON.parse(JSON.stringify(s)))!;
    expect(back.zones[0]).toMatchObject({ letter: 'A', w: 12, l: 12 });
    expect(cleanSetup({ field: 'x', zones: [{ x: 999, w: -4, color: 'red' }] })!.zones[0]).toMatchObject({
      x: 40,
      w: 0,
      color: '#fbbf24'
    });
    expect(cleanSetup({ zones: [] })).toBeUndefined();
  });
});

describe('montar o campo no link do adjunto', () => {
  it('o plano partilhado leva o campo do dia e a página mostra o desenho e os passos', async () => {
    const { sharedPlanOf, renderPlanPage } = await import('./coachPlan');
    const state = {
      trainings: [
        {
          id: 't',
          date: '2099-03-05', // quinta
          time: '18:15',
          notes: '',
          absences: [],
          sessionPlan: { blocks: [{ id: 'b1', exerciseId: 'q', title: 'Quadrado', durationMinutes: 15 }] }
        }
      ],
      exerciseLibrary: [
        {
          id: 'q',
          name: 'Quadrado',
          category: 'tecnica' as const,
          durationMinutes: 15,
          createdAt: '',
          area: { w: 15, l: 15 }
        }
      ]
    };
    const plan = sharedPlanOf(state, '2099-03-01')!;
    expect(plan.setup?.field).toBe('meio-f7');
    expect(plan.setup?.zones[0]).toMatchObject({ letter: 'A', w: 15, l: 15 });
    expect(sharedPlanOf(state, '2099-03-01', { '4': 'f7' })!.setup?.field).toBe('f7');
    const html = renderPlanPage({ teamName: 'Dragões', color: '#22c3ee', plan }, '2099-03-01');
    expect(html).toContain('📐 Montar o campo');
    expect(html).toContain('Meio campo de futebol 7');
    expect(html).toContain('<svg');
    expect(html).toContain('quadrado de 15 passos');
    expect(html).toContain('id="campo"');
  });
});
