import { describe, expect, it, vi } from 'vitest';
import { headToHead } from '../lib/headToHead';
import { cleanMaterial, kitBag, kitBagText, materialSummary } from '../lib/kitBag';
import { cleanPrintExercise } from '../lib/printExercise';
import { planFromRestDocument, renderPlanPage, sharedPlanOf } from '../lib/coachPlan';
import { applyClubColor, clubColorVars } from '../lib/clubColors';
import { applySunMode, isSunMode, loadSunMode } from '../lib/sunMode';
import { Exercise, Match, Player, Training } from '../types';

const roster = [
  { id: 'p1', name: 'Rui Silva', number: 9 },
  { id: 'p2', name: 'Tomás Gonçalves', number: 7, nickname: 'Tomé' }
] as Player[];

const game = (id: string, opponent: string, date: string, extra: Partial<Match> = {}): Match =>
  ({
    id,
    opponent,
    date,
    season: '2025/2026',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: [],
    capitao: null,
    ...extra
  }) as Match;

const goal = (type: 'scored' | 'conceded', scorerId: string | null = null, scorer?: string) => ({
  id: Math.random().toString(36),
  type,
  scorerId,
  assistId: null,
  minute: null,
  ...(scorer ? { scorer } : {})
});

describe('histórico contra o adversário', () => {
  const matches = [
    game('a', 'GD Abrantes', '2026-04-12', {
      goals: [goal('scored', 'p2'), goal('scored', 'p2'), goal('scored', 'p1'), goal('conceded')],
      opponentReport: { notes: 'Pressionam alto.', nextTime: 'Sair pelos lados.', dangerousPlayers: ['Nº 9 rápido'] }
    }),
    game('b', 'Abrantes', '2026-01-18', {
      type: 'torneio',
      tournamentName: 'Torneio de Natal',
      goals: [goal('scored', null, 'Rui Silva'), goal('conceded'), goal('scored', null, 'Avançado convidado')]
    }),
    game('c', 'Abrantes', '2025-11-02', { location: 'fora', finalScore: { scored: 0, conceded: 2 } }),
    game('d', 'Tramagal', '2026-03-01', { goals: [goal('scored', 'p1')] }),
    game('e', 'Abrantes', '2026-10-30', { finished: false })
  ];

  it('lists every finished game against them, most recent first, with score and scorers', () => {
    const h = headToHead(matches, roster, 'Abrantes')!;
    expect(h.games.map((g) => `${g.result} ${g.scored}-${g.conceded} ${g.where}`)).toEqual([
      'V 3-1 Casa',
      'V 2-1 Torneio de Natal',
      'D 0-2 Fora'
    ]);
    expect(h.games[0].scorers).toEqual(['Tomé 2', 'Rui Silva']);
    expect(h.games[1].scorers).toEqual(['Rui Silva', 'Avançado convidado']);
    expect([h.wins, h.draws, h.losses, h.goalsFor, h.goalsAgainst]).toEqual([2, 0, 1, 5, 4]);
    expect(h.report).toMatchObject({ date: '2026-04-12', notes: 'Pressionam alto.', nextTime: 'Sair pelos lados.' });
  });

  it('is empty for a new opponent', () => {
    expect(headToHead(matches, roster, 'Esparteiros')).toBeNull();
    expect(headToHead(matches, roster, '')).toBeNull();
  });
});

describe('lista do saco', () => {
  const library = [
    { id: 'ex1', name: 'Rondo', material: { cones: 8, coletes: 6, bolas: 4 } },
    { id: 'ex2', name: 'Jogo 5x5', material: { cones: 16, coletes: 10, balizas: 2, bolas: 6 } },
    { id: 'ex3', name: 'Sem material' }
  ] as Exercise[];
  const training = {
    id: 't1',
    date: '2026-11-02',
    time: '19:15',
    sessionPlan: {
      blocks: [
        { id: 'b1', exerciseId: 'ex1', title: 'Rondo', durationMinutes: 15 },
        { id: 'b2', exerciseId: 'ex2', title: 'Jogo', durationMinutes: 25 },
        { id: 'b3', exerciseId: 'ex3', title: 'Livre', durationMinutes: 10 },
        { id: 'b4', title: 'Bloco escrito à mão', durationMinutes: 10 }
      ]
    }
  } as Training;

  it('takes the most any one exercise needs (the material moves between exercises)', () => {
    const kit = kitBag(training.sessionPlan!.blocks, library);
    expect(kit.map((i) => i.label)).toEqual(['16 cones', '10 coletes', '6 bolas', '2 balizas pequenas']);
    expect(kitBagText(kit, training.date, training.time)).toBe(
      '🎒 Material para o treino de 02/11/2026 (19:15)\n• 16 cones\n• 10 coletes\n• 6 bolas\n• 2 balizas pequenas'
    );
    expect(kitBag([], library)).toEqual([]);
  });

  it('keeps only known items with whole quantities', () => {
    expect(cleanMaterial({ cones: '8', bolas: 2.6, coletes: 0, arcos: -3, foguetes: 4, estacas: 500 })).toEqual({
      cones: 8,
      bolas: 3,
      estacas: 99
    });
    expect(cleanMaterial({ cones: 0 })).toBeUndefined();
    expect(cleanMaterial(null)).toBeUndefined();
    expect(materialSummary({ bolas: 1, cones: 4 })).toBe('4 cones · 1 bola');
  });

  it('reads the material from the photo of an exercise', () => {
    expect(
      cleanPrintExercise({ name: 'Rondo', category: 'tecnica', material: { cones: 4, bolas: 0 } })?.material
    ).toEqual({
      cones: 4
    });
    expect(cleanPrintExercise({ name: 'Rondo', category: 'tecnica' })?.material).toBeUndefined();
  });

  it('goes on the assistant coach page', () => {
    const plan = sharedPlanOf({ trainings: [training], exerciseLibrary: library }, '2026-11-01')!;
    expect(plan.kit).toEqual(['16 cones', '10 coletes', '6 bolas', '2 balizas pequenas']);
    const page = planFromRestDocument({
      fields: {
        teamName: { stringValue: 'Sub-11' },
        plan: {
          mapValue: {
            fields: {
              date: { stringValue: '2026-11-02' },
              kit: { arrayValue: { values: [{ stringValue: '16 cones' }, { stringValue: '<b>x</b>' }] } },
              blocks: { arrayValue: { values: [] } }
            }
          }
        }
      }
    })!;
    const html = renderPlanPage(page, '2026-11-01');
    expect(html).toContain('🎒 Levar: 16 cones · &lt;b&gt;x&lt;/b&gt;');
  });
});

describe('modo sol', () => {
  const store = new Map<string, string>();
  const classes = new Set<string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  });
  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
        contains: (c: string) => classes.has(c)
      }
    }
  });
  vi.stubGlobal('window', new EventTarget());

  it('turns on and off on this phone, is remembered and tells the screens', () => {
    let changes = 0;
    window.addEventListener('bcv-sun-mode', () => changes++);
    expect(loadSunMode()).toBe(false);
    applySunMode(true);
    expect(isSunMode()).toBe(true);
    expect(loadSunMode()).toBe(true);
    applySunMode(false);
    expect(classes.has('sol')).toBe(false);
    expect(loadSunMode()).toBe(false);
    expect(changes).toBe(2);
  });

  it('turns the club colour scale upside down', () => {
    const dark = clubColorVars('#e23b3b');
    const sun = clubColorVars('#e23b3b', true);
    expect(sun['--color-cyan-50']).toBe(dark['--color-cyan-950']);
    expect(sun['--color-cyan-300']).toBe(dark['--color-cyan-700']);
    expect(sun['--color-cyan-500']).toBe(dark['--color-cyan-500']);
    expect(sun['--color-ui-brand']).toBe('#e23b3b');

    const vars = new Map<string, string>();
    const root = {
      classList: { contains: (c: string) => c === 'sol' },
      style: { setProperty: (k: string, v: string) => vars.set(k, v), removeProperty: (k: string) => vars.delete(k) }
    } as unknown as HTMLElement;
    applyClubColor('#e23b3b', root);
    expect(vars.get('--color-cyan-950')).toBe(dark['--color-cyan-50']);
  });
});
