import { describe, it, expect } from 'vitest';
import { applyDraft, matchToDraft, newGoalDraft, newSubDraft, validateDraft } from '../lib/matchEditor';
import { minutesBalance } from '../lib/matchChecklist';
import { Match } from '../types';

// Finished 2 x 30' game, 2 players a side, played live (fields as the live game saves them)
const game = {
  id: 'm1',
  opponent: 'Tramagal SU',
  date: '2026-10-17',
  season: '2026/2027',
  type: 'campeonato',
  phase: 'Jornada 3',
  location: 'casa',
  finished: true,
  goals: [
    {
      id: 'g1',
      type: 'scored',
      scorerId: 'a',
      assistId: null,
      minute: "40'",
      minuteBase: 'game',
      minuteInHalf: 10,
      period: '2.ª parte',
      half: 2,
      goalType: 'Canto',
      notes: 'de cabeça'
    }
  ],
  subs: [
    {
      id: 's1',
      outId: 'b',
      inId: 'c',
      minute: 'INT',
      minuteBase: 'game',
      isHalftime: true,
      half: 1,
      period: 'Intervalo'
    }
  ],
  lineup: ['a', 'b'],
  lineupSize: 2,
  convocados: ['a', 'b', 'c'],
  capitao: 'a',
  halfDurationMinutes: 30,
  timer: { isRunning: false, elapsedMs: 3600000, lastStartTs: null, half1DurationMs: 1800000, half2DurationMs: 1800000 }
} as unknown as Match;

describe('Editar jogo terminado', () => {
  it('reads the game as the coach thinks of it (game minutes, halftime)', () => {
    const d = matchToDraft(game, 'Sub-11');
    expect(d.goals[0]).toMatchObject({ scorerId: 'a', half: 2, minute: 40, goalType: 'Canto' });
    expect(d.subs[0]).toMatchObject({ outId: 'b', inId: 'c', half: 'INT', minute: null });
  });

  it('keeps untouched events exactly as they were', () => {
    const out = applyDraft(game, matchToDraft(game, 'Sub-11'), 'Sub-11');
    expect(out.goals[0]).toBe(game.goals[0]);
    expect(out.subs[0]).toBe(game.subs[0]);
    expect(out.finished).toBe(true);
    expect(out.capitao).toBe('a');
  });

  it('saves edits with the same fields as a live game', () => {
    const d = matchToDraft(game, 'Sub-11');
    d.location = 'fora';
    d.goals[0].minute = 12;
    d.goals[0].half = 1;
    d.goals.push({ ...newGoalDraft('conceded'), half: 2, minute: 55, goalType: 'Livre' });
    d.subs.push({ ...newSubDraft(), outId: 'a', inId: 'b', half: 2, minute: 50 });
    const out = applyDraft(game, d, 'Sub-11');
    expect(out.location).toBe('fora');
    expect(out.goals[0]).toMatchObject({
      minute: "12'",
      half: 1,
      minuteInHalf: 12,
      period: '1.ª parte',
      notes: 'de cabeça'
    });
    expect(out.goals[1]).toMatchObject({ type: 'conceded', scorerId: null, minute: "55'", half: 2, minuteInHalf: 25 });
    expect(out.subs[1]).toMatchObject({ minute: "50'", half: 2, minuteInHalf: 20, period: '2.ª parte' });
    expect(out.subs[1]).not.toHaveProperty('isHalftime');
    expect(out.finalScore).toEqual({ scored: 1, conceded: 1 });
    // a (60' until 50') ... the minutes still add up to 2 x 60'
    expect(minutesBalance(out, 'Sub-11')).toMatchObject({ total: 120, ok: true });
  });

  it('a new date moves the game to that season', () => {
    const d = matchToDraft(game, 'Sub-11');
    d.date = '2027-08-20';
    expect(applyDraft(game, d, 'Sub-11').season).toBe('2027/2028');
  });

  it('does not save incomplete forms', () => {
    const d = matchToDraft(game, 'Sub-11');
    d.lineup = ['a'];
    d.subs.push(newSubDraft());
    d.goals[0].minute = 70;
    d.goals[0].half = 1;
    expect(validateDraft(d, 30)).toEqual([
      'Substituição 2: escolha quem sai e quem entra.',
      'Substituição 2: indique o minuto.',
      "Minuto 70' não pertence à 1.ª parte (1'-30')."
    ]);
    expect(validateDraft(matchToDraft(game, 'Sub-11'), 30)).toEqual([]);
  });
});
