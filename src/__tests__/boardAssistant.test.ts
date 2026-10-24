import { describe, expect, it } from 'vitest';
import { answerQuestion } from '../lib/coachAssistant';
import { AppState, Match, Player, Training } from '../types';

describe('Assistente (perguntas sobre a equipa)', () => {
  const p = (id: string, name: string, number: number): Player => ({
    id,
    name,
    number,
    positions: '',
    birthDate: null,
    active: true
  });
  const roster = [p('a', 'Rui Silva', 9), p('b', 'Tomás Gonçalves', 7), p('c', 'André Lopes', 10)];
  const game = (id: string, date: string, opponent: string, extra: Partial<Match> = {}): Match =>
    ({
      id,
      opponent,
      date,
      season: '2026/2027',
      type: 'campeonato',
      location: 'casa',
      finished: true,
      goals: [],
      subs: [],
      cards: [],
      lineup: ['a', 'b'],
      lineupSize: 2,
      convocados: ['a', 'b', 'c'],
      capitao: null,
      halfDurationMinutes: 25,
      ...extra
    }) as Match;
  const training = (id: string, date: string, absences: string[]): Training => ({
    id,
    date,
    notes: '',
    absences,
    completed: true
  });
  const state = {
    season: '2026/2027',
    category: 'Sub-11',
    myClubName: 'Dragões',
    roster,
    schedule: [{ id: 's1', opponent: 'Abrantes', date: '2026-11-07', time: '10:30', location: 'casa', callup: ['a'] }],
    trainings: [
      training('t1', '2026-10-06', ['c']),
      training('t2', '2026-10-08', ['c', 'b']),
      training('t3', '2026-09-20', [])
    ],
    matches: [
      game('m1', '2026-09-27', 'Mação', {
        goals: [{ id: 'g1', type: 'scored', scorerId: 'a', assistId: 'b', minute: "5'", goalType: 'Canto' }]
      } as Partial<Match>),
      game('m2', '2026-10-17', 'Tramagal SU', {
        location: 'fora',
        goals: [
          { id: 'g2', type: 'scored', scorerId: 'a', assistId: null, minute: "3'", goalType: 'Bola jogada' },
          { id: 'g3', type: 'scored', scorerId: 'b', assistId: 'a', minute: "9'", goalType: 'Canto' },
          { id: 'g4', type: 'conceded', scorerId: null, assistId: null, minute: "20'" }
        ],
        subs: [{ id: 's1', outId: 'b', inId: 'c', minute: "40'", half: 2, minuteInHalf: 15 }]
      } as Partial<Match>)
    ]
  } as unknown as AppState;
  const today = new Date(2026, 9, 23); // 23 Oct 2026
  const ask = (q: string) => answerQuestion(q, state, today);

  it('who played least this month (only October games)', () => {
    const a = ask('Quem jogou menos este mês?');
    expect(a.title).toBe('Quem jogou menos este mês (1 jogo(s))');
    expect(a.lines[0]).toMatch(/^1\. 10 · André Lopes — 10 min/);
  });

  it('goals from corners, scorers and assists', () => {
    expect(ask('Quantos golos de canto marcámos?').title).toBe('2 golo(s) de canto marcados esta época');
    expect(ask('Quem é o melhor marcador?').lines[0]).toBe('1. 9 · Rui Silva — 2 golo(s)');
    expect(ask('Quem fez mais assistências?').lines).toEqual([
      '1. 9 · Rui Silva — 1 assistência(s)',
      '2. 7 · Tomás Gonçalves — 1 assistência(s)'
    ]);
  });

  it('absences, head to head, one athlete and the next game', () => {
    expect(ask('Quem faltou mais aos treinos em outubro?').lines[0]).toBe('1. 10 · André Lopes — 2 falta(s) em 2');
    const h2h = ask('Como correu contra o Tramagal?');
    expect(h2h.title).toBe('Jogos contra Tramagal SU: 1');
    expect(h2h.lines[0]).toBe('17/10 · fora · 1-2 (vitória)');
    const rui = ask('Quantos minutos jogou o Rui?');
    expect(rui.title).toBe('9 · Rui Silva esta época');
    expect(rui.lines[0]).toMatch(/^⏱️ 100 minutos em 2 jogo\(s\)/);
    expect(rui.lines[1]).toBe('⚽ 2 golo(s) · 🅰️ 1 assistência(s)');
    expect(ask('Quando é o próximo jogo?').lines[0]).toBe('📅 07/11 às 10:30 · em casa');
  });

  it('season record and questions it does not understand', () => {
    expect(ask('Quantas vitórias temos?').title).toBe('2 jogo(s) esta época: 2 vitória(s), 0 empate(s), 0 derrota(s)');
    const unknown = ask('Qual é a cor do equipamento?');
    expect(unknown.understood).toBe(false);
  });
});

describe('Imagem de parabéns', () => {
  it('without the photo the picture shows the initials (staff) ', async () => {
    const { initialsOf } = await import('../lib/birthdayCard');
    expect(initialsOf('Bruno Santos')).toBe('BS');
    expect(initialsOf('Rui Pedro Silva')).toBe('RP');
    expect(initialsOf('Miguel')).toBe('M');
  });
});
