import { describe, expect, it } from 'vitest';
import { growthNumbers, seasonMonths, seasonPhotos } from './seasonGrowth';
import { assembleState, extractRecords } from './recordSync';
import { AppState, Match, Player, Training } from '../types';

const player = (id: string, tests: Record<string, Record<string, number>> = {}): Player =>
  ({ id, name: id, number: 1, position: 'MC', status: 'disponivel', fitnessTests: tests }) as unknown as Player;
const training = (id: string, absences: string[], completed = true): Training => ({
  id,
  date: '2026-10-01',
  notes: '',
  absences,
  completed,
  season: '2026/27'
});
const match = (id: string, scored: number, conceded: number): Match =>
  ({
    id,
    finished: true,
    season: '2026/27',
    goals: [
      ...Array.from({ length: scored }, (_, i) => ({ id: `${id}s${i}`, type: 'scored' })),
      ...Array.from({ length: conceded }, (_, i) => ({ id: `${id}c${i}`, type: 'conceded' }))
    ]
  }) as unknown as Match;

describe('antes e depois da época', () => {
  const roster = [
    player('a', { '2026/27-set': { sprint20: 4.4, toques30: 16 }, '2026/27-mai': { sprint20: 4.0, toques30: 28 } }),
    player('b', { '2026/27-set': { sprint20: 4.2, toques30: 20 }, '2026/27-mai': { sprint20: 3.96, toques30: 26 } }),
    player('c', { '2026/27-set': { salto: 150 } })
  ];
  const trainings = [training('t1', []), training('t2', ['a']), training('t3', ['a', 'b'], false)];
  const matches = [match('m1', 3, 1), match('m2', 1, 1), match('m3', 0, 2)];

  it('números da equipa: treinos e presenças, golos, resultados e a média dos testes', () => {
    const n = growthNumbers(roster, trainings, matches, '2026/27');
    expect(n.map((x) => [x.id, x.value, x.sub, x.on])).toEqual([
      ['treinos', '2', '83% de presenças', true],
      ['golos', '4', 'em 3 jogos', true],
      ['resultados', '1 · 1 · 1', '', false],
      ['sprint20', '3,98 s', 'eram 4,30 s · −0,32 s', true],
      ['toques30', '27', 'eram 18 · +9', true]
    ]);
  });

  it('sem nada registado não há números; testes só com uma ronda não entram', () => {
    expect(growthNumbers([], [], [], '2026/27')).toEqual([]);
    expect(growthNumbers(roster, [], [], '2026/27').map((x) => x.id)).not.toContain('salto');
  });

  it('a foto mais recente de cada momento da época', () => {
    const photos = [
      { id: '1', season: '2026/27', moment: 'inicio' as const, image: 'data:x', createdAt: '2026-09-10' },
      { id: '2', season: '2026/27', moment: 'inicio' as const, image: 'data:y', createdAt: '2026-09-20' },
      { id: '3', season: '2025/26', moment: 'fim' as const, image: 'data:z', createdAt: '2026-06-01' }
    ];
    expect(seasonPhotos(photos, '2026/27').start?.id).toBe('2');
    expect(seasonPhotos(photos, '2026/27').end).toBeUndefined();
    expect(seasonMonths('2026/27')).toEqual(['Setembro 2026', 'Junho 2027']);
  });

  it('cada foto da equipa é um registo próprio na nuvem (o documento do clube fica pequeno)', () => {
    const state = {
      activeTeamId: 'sub11',
      teams: [
        {
          id: 'sub11',
          clubName: 'Dragões',
          category: 'Sub-11',
          teamPhotos: [
            { id: 'f1', season: '2026/27', moment: 'inicio', image: 'data:image/jpeg;base64,AAAA', createdAt: '' }
          ]
        }
      ]
    } as unknown as AppState;
    const records = extractRecords(state);
    const photo = [...records.values()].find((r) => r.kind === 'teamphoto');
    expect(photo?.entityId).toBe('f1');
    expect(JSON.stringify(records.get('club')?.data)).not.toContain('base64');
    const back = assembleState(records, {} as AppState);
    expect(back.teams?.[0].teamPhotos?.[0].id).toBe('f1');
  });
});
