import { describe, expect, it } from 'vitest';
import { ScheduledMatch, Training } from '../types';
import { changeMessage, upcomingEvents } from './changeNotice';

const state = {
  trainings: [
    { id: 't1', date: '2026-11-12', time: '19:15', location: 'Campo 2', trainingNumber: 23, completed: false },
    { id: 't0', date: '2026-11-09', time: '19:15', completed: true },
    { id: 't9', date: '2026-12-30', time: '19:15', completed: false }
  ] as Training[],
  schedule: [
    { id: 's1', date: '2026-11-15', time: '10:30', opponent: 'Abrantes', venue: 'Municipal' }
  ] as ScheduledMatch[]
};

describe('Aviso de alteração para os pais', () => {
  it('the next two weeks, soonest first', () => {
    expect(upcomingEvents(state, '2026-11-10').map((e) => [e.id, e.title])).toEqual([
      ['t1', 'Treino nº 23'],
      ['s1', 'Jogo vs Abrantes']
    ]);
  });

  it('a message for each kind of change', () => {
    const [t, g] = upcomingEvents(state, '2026-11-10');
    expect(changeMessage('Leões Sub-11', t, 'hora', '18:30')).toBe(
      '⚽ Leões Sub-11\n🕒 Alteração de horário: Treino nº 23 de quinta, 12/11 passa das 19:15 para as 18:30.'
    );
    expect(changeMessage('Leões Sub-11', g, 'local', 'Campo da Escola')).toContain(
      'Jogo vs Abrantes de domingo, 15/11 às 10:30 passa a ser em Campo da Escola.'
    );
    expect(changeMessage('Leões Sub-11', t, 'cancelado', 'chuva forte')).toContain('foi cancelado: chuva forte');
    expect(changeMessage('Leões Sub-11', g, 'lembrete', '')).toContain(
      'Lembrete: Jogo vs Abrantes domingo, 15/11 às 10:30 · Municipal.'
    );
  });
});
