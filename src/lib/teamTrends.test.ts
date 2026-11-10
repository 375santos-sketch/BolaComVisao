import { describe, expect, it } from 'vitest';
import { GoalEvent, Match } from '../types';
import { teamTrends, weeklyFocus } from './teamTrends';

let n = 0;
const goal = (type: 'scored' | 'conceded', extra: Partial<GoalEvent> = {}): GoalEvent =>
  ({ id: `g${n++}`, type, half: 1, minute: 10, scorerId: null, ...extra }) as GoalEvent;
const game = (day: number, goals: GoalEvent[], extra: Partial<Match> = {}): Match =>
  ({
    id: `m${day}`,
    date: `2026-10-${String(day).padStart(2, '0')}`,
    finished: true,
    goals,
    opponent: 'X',
    ...extra
  }) as Match;
const canto = () => goal('conceded', { goalType: 'Canto' });

describe('Tendências da equipa', () => {
  it('needs at least 3 + 3 finished games', () => {
    expect(teamTrends([game(1, []), game(2, []), game(3, []), game(4, []), game(5, [])])).toEqual([]);
  });

  it('set-piece goals conceded going up: what to do and the games it rests on', () => {
    const before = [1, 2, 3, 4, 5].map((d) => game(d, d === 1 ? [canto()] : []));
    const recent = [6, 7, 8, 9, 10].map((d) =>
      game(d, d === 6 ? [canto(), canto()] : d === 8 || d === 9 ? [canto()] : [])
    );
    const trends = teamTrends([...recent, ...before]);
    const sp = trends.find((t) => t.id === 'sofridos-bola-parada')!;
    expect(sp.level).toBe('atencao');
    expect(sp.detail).toBe('Últimos 5 jogos: 4 · 5 jogos antes: 1');
    expect(sp.recommendation).toMatch(/cantos e livres/);
    expect([sp.recentGames, sp.beforeGames]).toEqual([5, 5]);
    expect(sp.series).toEqual([1, 0, 0, 0, 0, 2, 0, 1, 1, 0]);
    expect(weeklyFocus([...recent, ...before])?.id).toBe(trends[0].id);
  });

  it('improvements are trends too; games still being played are left out', () => {
    const before = [1, 2, 3].map((d) => game(d, [goal('conceded'), goal('conceded')]));
    const recent = [4, 5, 6].map((d) => game(d, [goal('scored')]));
    const live = game(7, [goal('conceded'), goal('conceded'), goal('conceded')], { finished: false });
    const trends = teamTrends([...before, ...recent, live]);
    expect(trends.map((t) => [t.id, t.level])).toEqual([
      ['sofridos-por-jogo', 'evolucao'],
      ['marcados-por-jogo', 'evolucao']
    ]);
    expect(trends[0].detail).toBe('Últimos 3 jogos: 0 por jogo · 3 jogos antes: 2 por jogo');
    expect(weeklyFocus([...before, ...recent])).toBeNull();
  });

  it('finishing only from games with shots recorded', () => {
    const shots = (s: number) => ({ shotsInBoxFor: s });
    const before = [1, 2, 3].map((d) => game(d, [goal('scored')], shots(10)));
    const recent = [4, 5, 6].map((d) => game(d, [goal('scored'), goal('scored'), goal('scored')], shots(10)));
    const eff = teamTrends([...before, ...recent]).find((t) => t.id === 'eficacia')!;
    expect(eff.level).toBe('evolucao');
    expect(eff.detail).toContain('30% (9 golos em 30 remates)');
  });
});
