import { describe, expect, it } from 'vitest';
import { cleanIdeaRequest, exerciseIdeaPrompt } from '../lib/exerciseIdea';
import { breakRule, heatMessage, withWaterBreaks } from '../lib/waterBreaks';
import { careerOf, careerStatus, clubDetail, monthsUntil, sortClubs, withCareer } from '../lib/coachCareer';
import { AppState, SessionBlock } from '../types';

describe('exercício a partir de um objetivo', () => {
  it('checks what comes from the phone', () => {
    expect(cleanIdeaRequest({ goal: '  terceiro   homem ', players: 99, minutes: 2, category: 'xx' })).toEqual({
      goal: 'terceiro homem',
      players: 30,
      minutes: 5,
      space: '½ campo',
      category: 'tecnica'
    });
    expect(cleanIdeaRequest({ goal: 'a' })).toBeNull();
    expect(cleanIdeaRequest(null)).toBeNull();
    expect(
      cleanIdeaRequest({ goal: 'pressão', avoid: ['Rondo 4+1', 3, ''], ageGroup: 'Sub-11', category: 'tatica' })
    ).toMatchObject({ avoid: ['Rondo 4+1'], ageGroup: 'Sub-11', category: 'tatica' });
  });

  it('asks for an exercise fit for the age, players and time, different from the ones already proposed', () => {
    const prompt = exerciseIdeaPrompt({
      goal: 'terceiro homem na saída de bola',
      players: 9,
      minutes: 15,
      space: '½ campo',
      category: 'tatica',
      ageGroup: 'Sub-11',
      avoid: ['Rondo 4+1']
    });
    expect(prompt).toContain('Objetivo: terceiro homem na saída de bola');
    expect(prompt).toContain('Escalão: Sub-11');
    expect(prompt).toContain('Jogadores: 9');
    expect(prompt).toContain('se for ímpar, usa um joker');
    expect(prompt).toContain('Não repitas estes exercícios: Rondo 4+1');
  });
});

describe('pausas de água com calor', () => {
  const blocks = [
    { id: 'a', title: 'Aquecimento', durationMinutes: 10 },
    { id: 'b', title: 'Rondo', durationMinutes: 15 },
    { id: 'c', title: 'Finalização', durationMinutes: 20 },
    { id: 'd', title: 'Jogo', durationMinutes: 30 }
  ] as SessionBlock[];

  it('only from 28 °C, more often from 32 °C', () => {
    expect(breakRule(27.9)).toBeNull();
    expect(breakRule(29)).toEqual({ every: 20, minutes: 2 });
    expect(breakRule(33)).toEqual({ every: 15, minutes: 3 });
  });

  it('puts breaks between blocks and keeps the training length', () => {
    const items = withWaterBreaks(blocks, 33);
    expect(items.map((i) => (i.kind === 'agua' ? `💧${i.start}` : `${i.title} ${i.start}-${i.end}`))).toEqual([
      'Aquecimento 0-10',
      '💧10',
      'Rondo 13-28',
      '💧28',
      'Finalização 31-51',
      '💧51',
      'Jogo 54-75'
    ]);
    expect(items[items.length - 1]).toMatchObject({ shortened: 9 });
    expect(withWaterBreaks(blocks, 20).some((i) => i.kind === 'agua')).toBe(false);
    expect(withWaterBreaks([], 35)).toEqual([]);
  });

  it('writes the note for the parents', () => {
    const text = heatMessage('2027-06-07', '19:15', 31.6);
    expect(text).toContain('às 19:15: previsão de 32 °C');
    expect(text).toContain('garrafa de água de 1 L');
  });
});

describe('a minha carreira', () => {
  const state = { currentUser: { id: 'u1' }, coachCareers: { u2: { courses: [] } } } as unknown as AppState;

  it('keeps each coach’s own career', () => {
    expect(careerOf(state)).toEqual({ courses: [] });
    const next = withCareer(state, { title: 'Grau I · UEFA C', courses: [] });
    expect(Object.keys(next.coachCareers!)).toEqual(['u2', 'u1']);
    expect(withCareer({ coachCareers: {} } as AppState, { courses: [] })).toEqual({});
  });

  it('counts months, credits and warns in time', () => {
    expect(monthsUntil('2028-03-15', '2026-10-30')).toBe(16);
    expect(monthsUntil('2026-11-10', '2026-10-30')).toBe(0);
    const career = {
      title: 'Grau I',
      validUntil: '2027-03-15',
      creditsNeeded: 15,
      courses: [
        { id: 'a', name: 'Ação', date: '2026-10-12', credits: 4 },
        { id: 'b', name: 'Clínica', date: '2026-05-03', credits: 3 }
      ]
    };
    expect(careerStatus(career, '2026-10-30')).toEqual({
      credits: 7,
      missing: 8,
      monthsLeft: 4,
      expired: false,
      warnings: ['O título caduca em 4 meses.', 'Faltam 8 créditos de formação para renovar.']
    });
    expect(careerStatus({ ...career, validUntil: '2026-01-01' }, '2026-10-30').warnings).toEqual([
      'O título de treinador caducou: trate da renovação.'
    ]);
    expect(careerStatus({ ...career, validUntil: '2029-01-01' }, '2026-10-30').warnings).toEqual([]);
  });
});

describe('clubes por onde passei', () => {
  it('lists the most recent first, by the last year of the period', () => {
    const clubs = [
      { id: 'a', club: 'CD Falcões', period: '2019–2021', role: 'Adjunto' },
      { id: 'b', club: 'GD Ribeira', period: '2023/2024', category: 'Sub-11', role: 'Treinador principal' },
      { id: 'c', club: 'UD Serra', period: '2022' }
    ];
    expect(sortClubs(clubs).map((c) => c.club)).toEqual(['GD Ribeira', 'UD Serra', 'CD Falcões']);
    expect(clubDetail(clubs[1])).toBe('Sub-11 · Treinador principal');
    expect(clubDetail(clubs[2])).toBe('');
    expect(sortClubs(undefined)).toEqual([]);
  });
});
