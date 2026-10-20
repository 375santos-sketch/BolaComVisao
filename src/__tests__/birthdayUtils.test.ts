import { describe, it, expect } from 'vitest';
import { getAllBirthdays, filterBirthdays, parseBirthday, getBirthdayGreetingMessage } from '../lib/birthdayUtils';
import { Player, StaffMember } from '../types';

describe('birthdayUtils', () => {
  const players: Player[] = [
    {
      id: 'p1',
      name: 'João Silva',
      birthDate: '2008-03-25',
      number: 10,
      positions: 'Médio Centro (MC)',
      active: true
    },
    {
      id: 'p2',
      name: 'Miguel Costa',
      birthDate: '2007-11-12',
      number: 5,
      positions: 'Defesa Central (DC)',
      active: true
    }
  ];

  const staff: StaffMember[] = [
    {
      id: 's1',
      name: 'Mister Santos',
      birthDate: '1985-07-10',
      role: 'Treinador Principal'
    }
  ];

  it('aggregates all birthdays across players and staff', () => {
    const all = getAllBirthdays(players, staff);
    expect(all.length).toBe(3);
    const types = all.map((b) => b.type);
    expect(types).toContain('jogador');
    expect(types).toContain('equipa_tecnica');
  });

  it('calculates daysUntil and nextAge correctly', () => {
    const all = getAllBirthdays(players, staff);
    all.forEach((b) => {
      expect(b.daysUntil).toBeGreaterThanOrEqual(0);
      expect(b.daysUntil).toBeLessThanOrEqual(366);
      expect(b.nextAge).toBeGreaterThan(0);
      expect(b.formattedBirthDate).toBeTruthy();
    });
  });

  it('filters birthdays by role type and period', () => {
    const all = getAllBirthdays(players, staff);
    const onlyPlayers = filterBirthdays(all, 'jogadores', 'todos');
    expect(onlyPlayers.length).toBe(2);

    const onlyStaff = filterBirthdays(all, 'equipa_tecnica', 'todos');
    expect(onlyStaff.length).toBe(1);
  });

  it('parses birthday date correctly and formats day/month', () => {
    const parsed = parseBirthday({ id: 'p1', name: 'João Silva', birthDate: '2008-03-25' }, 'jogador', 'Médio Centro');
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.birthDay).toBe(25);
      expect(parsed.birthMonth).toBe(3);
      expect(parsed.formattedDayMonth).toContain('25 de março');
    }
  });

  it('generates a personalized WhatsApp greeting message', () => {
    const parsed = parseBirthday({ id: 'p1', name: 'João Silva', birthDate: '2008-03-25' }, 'jogador', 'Médio Centro');
    if (parsed) {
      const msg = getBirthdayGreetingMessage(parsed, 'Clube Desportivo');
      expect(msg).toContain('JOÃO SILVA');
      expect(msg).toContain('Clube Desportivo');
    }
  });
});
