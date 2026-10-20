import { describe, it, expect } from 'vitest';
import { evaluateSystemNotifications, defaultNotificationSettings } from '../lib/notificationEngine';
import { AppState, Player } from '../types';

describe('notificationEngine', () => {
  const playerLowAttendance: Player = {
    id: 'p-low',
    name: 'Atleta Ausente',
    number: 7,
    positions: 'Extremo',
    birthDate: '2005-06-01',
    active: true
  };

  const baseState: AppState = {
    activeTeamId: 'team-1',
    teams: [],
    roster: [playerLowAttendance],
    matches: [],
    trainings: [
      { id: 't1', date: '2026-05-01', notes: '', absences: ['p-low'] },
      { id: 't2', date: '2026-05-03', notes: '', absences: ['p-low'] },
      { id: 't3', date: '2026-05-05', notes: '', absences: ['p-low'] },
      { id: 't4', date: '2026-05-07', notes: '', absences: ['p-low'] }
    ],
    schedule: [],
    tactics: [],
    tacticFormat: 7,
    lastBackupDate: null,
    trackSubs: true,
    theme: 'original',
    lang: 'pt',
    myClubName: 'Clube Exemplo',
    notificationSettings: {
      ...defaultNotificationSettings,
      notifyLowAttendance: true,
      attendanceThreshold: 50
    },
    notifications: []
  };

  it('triggers a low attendance warning when player attendance is below threshold', () => {
    const result = evaluateSystemNotifications(baseState);
    expect(result.notifications.length).toBeGreaterThan(0);
    const lowAttNotif = result.notifications.find((n) => n.type === 'assiduidade_baixa');
    expect(lowAttNotif).toBeDefined();
    if (lowAttNotif) {
      expect(lowAttNotif.priority).toBe('alta');
      expect(lowAttNotif.message).toContain('Atleta Ausente');
    }
  });

  it('does not produce notifications if notifications are disabled in settings', () => {
    const disabledState: AppState = {
      ...baseState,
      notificationSettings: {
        ...defaultNotificationSettings,
        enabled: false
      }
    };
    const result = evaluateSystemNotifications(disabledState);
    expect(result.newTriggers.length).toBe(0);
  });
});
