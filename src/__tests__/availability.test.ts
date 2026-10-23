import { describe, it, expect } from 'vitest';
import { availabilityOn, returnSuffix, unavailableOn } from '../lib/availability';
import { Player } from '../types';

const p = (extra: Partial<Player>): Player =>
  ({ id: 'a', name: 'Rui', number: 9, positions: '', birthDate: null, active: true, ...extra }) as Player;

describe('Disponibilidade (lesões e castigos com data de regresso)', () => {
  it('injured until the return date, available from that day on', () => {
    const rui = p({ status: 'lesionado', statusUntil: '2026-11-12', statusNote: 'entorse' });
    expect(availabilityOn(rui, '2026-11-08')).toMatchObject({
      available: false,
      label: 'Lesionado até 12/11 · entorse'
    });
    expect(availabilityOn(rui, '2026-11-12')).toMatchObject({ available: true, label: 'Regressou a 12/11' });
    expect(returnSuffix(rui, '2026-11-08')).toBe(' até 12/11');
    expect(returnSuffix(rui, '2026-11-13')).toBe('');
  });

  it('suspended without a date stays out until the coach changes it', () => {
    expect(availabilityOn(p({ status: 'suspenso', statusNote: '2 jogos' }), '2027-05-01')).toMatchObject({
      available: false,
      label: 'Castigado · 2 jogos'
    });
  });

  it('available and inactive athletes', () => {
    expect(availabilityOn(p({}), '2026-11-08')).toMatchObject({ available: true, label: '' });
    expect(availabilityOn(p({ status: 'inativo' }), '2026-11-08').available).toBe(false);
    const roster = [
      p({}),
      p({ id: 'b', status: 'lesionado', statusUntil: '2026-12-01' }),
      p({ id: 'c', active: false })
    ];
    expect(unavailableOn(roster, '2026-11-08').map((r) => r.player.id)).toEqual(['b']);
  });
});
