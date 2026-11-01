import { describe, expect, it } from 'vitest';
import { allTeamsAgenda } from '../lib/allTeamsAgenda';
import { cleanKidsRequest, cleanKidsText, kidsPrompt } from '../lib/kidsExplain';
import { attendanceReminder } from '../lib/homeSummary';
import { signatureFor, withSignature } from '../lib/signature';
import { AppState, Training } from '../types';

describe('explicar às crianças', () => {
  it('checks the request and asks for 3 simple sentences for the age group', () => {
    expect(cleanKidsRequest({})).toBeNull();
    const r = cleanKidsRequest({ name: ' Rondo ', description: 'Quadrado 15x15', ageGroup: 'Sub-9', simpler: true })!;
    expect(r).toEqual({ name: 'Rondo', description: 'Quadrado 15x15', ageGroup: 'Sub-9', simpler: true });
    const prompt = kidsPrompt(r);
    expect(prompt).toContain('escalão Sub-9');
    expect(prompt).toContain('exatamente 3 frases curtas');
    expect(prompt).toContain('como para crianças de 6 anos');
  });

  it('keeps short plain lines', () => {
    expect(cleanKidsText('**Olá**\n1. ⚽ Passem a bola ao amarelo.\n- 🎯 Vale ponto.\n\n🏃 Troca quem perde.')).toBe(
      'Olá\n⚽ Passem a bola ao amarelo.\n🎯 Vale ponto.\n🏃 Troca quem perde.'
    );
    expect(cleanKidsText('ok')).toBeNull();
  });
});

describe('agenda de todas as equipas', () => {
  const state = {
    activeTeamId: 'a',
    schedule: [{ id: 'g1', opponent: 'Abrantes', date: '2026-11-07', time: '10:30' }],
    trainings: [{ id: 't1', date: '2026-11-02', time: '19:15' }],
    teams: [
      { id: 'a', clubName: 'Dragões', category: 'Sub-11', schedule: [], trainings: [] },
      {
        id: 'b',
        clubName: 'Dragões',
        category: 'Sub-13',
        schedule: [
          { id: 'g2', opponent: 'Tramagal', date: '2026-11-07', time: '11:00' },
          { id: 'g3', opponent: 'Longe', date: '2026-12-30', time: '11:00' }
        ],
        trainings: [{ id: 't2', date: '2026-11-03', time: '18:30' }]
      }
    ]
  } as unknown as AppState;

  it('mixes every team in date order and points out clashes', () => {
    const items = allTeamsAgenda(state, '2026-11-01');
    expect(items.map((i) => `${i.date} ${i.time} ${i.team} ${i.title}${i.clash ? ` ⚠️${i.clash}` : ''}`)).toEqual([
      '2026-11-02 19:15 Sub-11 Treino',
      '2026-11-03 18:30 Sub-13 Treino',
      '2026-11-07 10:30 Sub-11 Jogo vs Abrantes ⚠️Sub-13',
      '2026-11-07 11:00 Sub-13 Jogo vs Tramagal ⚠️Sub-11'
    ]);
  });
});

describe('presenças por marcar', () => {
  const settings = { trainingTimes: { '1': '19:15', '4': '18:15' }, trainingMinutes: 75 };
  const monday = (h: number, m: number) => new Date(2026, 10, 2, h, m); // Monday 2 November 2026

  it('reminds near the end of today’s training until it is saved', () => {
    expect(attendanceReminder([], settings, monday(19, 30))).toBeNull();
    expect(attendanceReminder([], settings, monday(20, 20))).toMatchObject({
      id: 'presencas',
      text: 'Presenças por marcar: treino de hoje (19:15)',
      tab: 'treinos',
      targetId: 'hoje'
    });
    const done = [{ id: 't', date: '2026-11-02', completed: true }] as Training[];
    expect(attendanceReminder(done, settings, monday(21, 0))).toBeNull();
    expect(attendanceReminder([], settings, new Date(2026, 10, 3, 21, 0))).toBeNull(); // Tuesday: no training
  });
});

describe('assinatura', () => {
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const state = { currentUser: { id: 'u1' } } as AppState;

  it('is kept per coach and only goes on the chosen documents', () => {
    const next = { ...state, ...withSignature(state, { image, docs: ['convocatoria'] }) } as AppState;
    expect(signatureFor(next, 'convocatoria')).toBe(image);
    expect(signatureFor(next, 'curriculo')).toBeNull();
    expect(withSignature(next, null).coachSignatures).toEqual({});
    expect(withSignature(state, { image: 'javascript:x', docs: [] }).coachSignatures).toEqual({});
  });
});
