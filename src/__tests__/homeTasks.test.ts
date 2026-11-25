import { describe, expect, it } from 'vitest';
import { AppState, Player } from '../types';
import { buildHomeTasks, needsNextTraining, splitNotice, teamPulse } from '../lib/homeTasks';
import { HomeNotice } from '../lib/homeSummary';

/** Design · etapa 1: "Tarefas" and "A equipa" on the Início, from what the app already keeps. */
describe('Início · Tarefas', () => {
  const callup: HomeNotice = {
    id: 'convocatoria',
    icon: '📋',
    text: 'Convocatória por fechar: vs Abrantes (sábado)',
    tab: 'convocatoria',
    targetId: 'g1'
  };
  const birthdays: HomeNotice = { id: 'aniversarios', icon: '🎂', text: 'Aniversários: J1 (hoje)', tab: 'plantel' };

  it('puts everything waiting in one list, most urgent first, each opening where it is solved', () => {
    const tasks = buildHomeTasks({
      notices: [birthdays, callup],
      newsletterWeek: '16 a 22 nov',
      pendingUsers: { count: 2, latest: 'Treinador C (coach)' },
      noTrainingSoon: true,
      focus: { recommendation: 'Trabalhar a saída de bola', title: 'Golos sofridos' }
    });
    expect(tasks.map((t) => t.id)).toEqual(['convocatoria', 'resumo', 'acessos', 'treino', 'foco', 'aniversarios']);
    expect(tasks[0]).toMatchObject({
      title: 'Convocatória por fechar',
      detail: 'vs Abrantes (sábado)',
      tone: 'warning',
      action: { kind: 'tab', tab: 'convocatoria', targetId: 'g1' }
    });
    expect(tasks[1]).toMatchObject({ title: 'Enviar o resumo da semana', action: { kind: 'newsletter' } });
    expect(tasks[2]).toMatchObject({ title: 'Aprovar 2 pedidos de acesso', action: { kind: 'adminUsers' } });
    expect(tasks[3]).toMatchObject({ title: 'Marcar o próximo treino', action: { kind: 'tab', tab: 'treinos' } });
  });

  it('nothing waiting: no tasks (the block says "Está tudo em dia")', () => {
    expect(buildHomeTasks({ notices: [], pendingUsers: { count: 0 }, noTrainingSoon: false, focus: null })).toEqual([]);
  });

  it('cuts a notice at the first ": " into title and detail', () => {
    expect(splitNotice('Com menos minutos: Martim (0%), Duarte (20%)')).toEqual({
      title: 'Com menos minutos',
      detail: 'Martim (0%), Duarte (20%)'
    });
    expect(splitNotice('Sem detalhe')).toEqual({ title: 'Sem detalhe', detail: '' });
  });

  it('asks for the next training only when none is planned in the next 7 days', () => {
    const t = (date: string) => ({ id: date, date }) as unknown as AppState['trainings'][number];
    expect(needsNextTraining([], '2026-11-25')).toBe(true);
    expect(needsNextTraining([t('2026-11-20')], '2026-11-25')).toBe(true);
    expect(needsNextTraining([t('2026-12-03')], '2026-11-25')).toBe(true);
    expect(needsNextTraining([t('2026-12-02')], '2026-11-25')).toBe(false);
    expect(needsNextTraining([t('2026-11-25')], '2026-11-25')).toBe(false);
  });
});

describe('Início · A equipa', () => {
  const player = (id: string, extra: Partial<Player> = {}) => ({ id, name: id, active: true, ...extra }) as Player;
  const game = (id: string, date: string, scored: number, conceded: number) => ({
    id,
    date,
    season: '2026/2027',
    finished: true,
    opponent: id,
    goals: [
      ...Array.from({ length: scored }, () => ({ type: 'scored' })),
      ...Array.from({ length: conceded }, () => ({ type: 'conceded' }))
    ]
  });

  it('shows the last results as V/E/D, who can play today and the squad', () => {
    const state = {
      season: '2026/2027',
      category: 'Sub-11',
      roster: [
        player('a'),
        player('b', { status: 'lesionado' }),
        player('c', { status: 'suspenso', statusUntil: '2026-11-20' }),
        player('d', { active: false })
      ],
      matches: [game('m1', '2026-10-04', 2, 1), game('m2', '2026-10-11', 1, 1), game('m3', '2026-10-18', 0, 3)],
      trainings: [],
      schedule: [],
      staffMembers: []
    } as unknown as AppState;
    const pulse = teamPulse(state, '2026-11-25');
    expect(pulse.form).toEqual(['V', 'E', 'D']);
    expect(pulse.squad).toBe(3); // the inactive athlete does not count
    expect(pulse.available).toBe(2); // injured with no return date is out; the suspension already ended
    expect(pulse.attendance).toBeNull(); // no trainings held yet
  });
});
