import { describe, it, expect, vi, afterEach } from 'vitest';
import { absenceStreak, pastTrainings, recentAttendance } from '../lib/attendanceAlerts';
import { evaluateSystemNotifications } from '../lib/notificationEngine';
import { AppState, Player, Training } from '../types';

const tr = (id: string, date: string, absences: string[] = [], completed = true): Training =>
  ({ id, date, notes: '', absences, completed }) as Training;
const player = (id: string, name: string, extra: Partial<Player> = {}): Player =>
  ({ id, name, number: 1, positions: '', birthDate: null, active: true, ...extra }) as Player;

afterEach(() => vi.useRealTimers());

describe('Assiduidade — cálculos', () => {
  const trainings = [
    tr('t1', '2026-09-28', ['a']),
    tr('t2', '2026-10-05'),
    tr('t3', '2026-10-08', ['a']),
    tr('t4', '2026-10-12', ['a', 'b']),
    tr('t5', '2026-10-15', ['a']),
    tr('t6', '2026-10-30', ['a'], true) // future: not counted yet
  ];
  const recent = pastTrainings(trainings, '2026-10-20');

  it('orders past trainings, most recent first, ignoring future ones', () => {
    expect(recent.map((t) => t.id)).toEqual(['t5', 't4', 't3', 't2', 't1']);
  });

  it('counts absences in a row from the latest training', () => {
    expect(absenceStreak('a', recent)).toBe(3);
    expect(absenceStreak('b', recent)).toBe(0); // was present in the latest
  });

  it('measures attendance in the last 30 days', () => {
    expect(recentAttendance('a', recent, 30, new Date('2026-10-20T12:00:00Z'))).toEqual({
      presences: 1,
      total: 5,
      pct: 20
    });
  });
});

describe('Assiduidade — alertas', () => {
  const state = (roster: Player[], trainings: Training[]): AppState =>
    ({
      activeTeamId: 't',
      roster,
      trainings,
      schedule: [],
      staffMembers: [],
      notifications: [],
      notificationSettings: { enabled: true, notifyLowAttendance: true, attendanceThreshold: 50 }
    }) as unknown as AppState;

  const titles = (s: AppState) => evaluateSystemNotifications(s).notifications.map((n) => n.title);

  it('alerts 3 absences in a row, but not for an injured player', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    const trainings = [
      tr('t1', '2026-10-01'),
      tr('t2', '2026-10-05'),
      tr('t3', '2026-10-08', ['rui', 'ze']),
      tr('t4', '2026-10-12', ['rui', 'ze']),
      tr('t5', '2026-10-15', ['rui', 'ze'])
    ];
    const t = titles(state([player('rui', 'Rui'), player('ze', 'Zé', { status: 'lesionado' })], trainings));
    expect(t).toContain('⚠️ 3 faltas seguidas: Rui');
    expect(t.some((x) => x.includes('Zé') && x.includes('seguidas'))).toBe(false);
  });

  it('alerts a recent drop even when the season average is still fine', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    const early = Array.from({ length: 10 }, (_, i) => tr(`e${i}`, `2026-08-${String(i + 10).padStart(2, '0')}`));
    const recent = [
      tr('r1', '2026-10-01', ['tomas']),
      tr('r2', '2026-10-05', ['tomas']),
      tr('r3', '2026-10-08'),
      tr('r4', '2026-10-12', ['tomas']),
      tr('r5', '2026-10-15')
    ];
    const t = titles(state([player('tomas', 'Tomás')], [...early, ...recent]));
    expect(t).toContain('📉 Assiduidade a baixar: Tomás (40% em 30 dias)');
    expect(t.some((x) => x.includes('Assiduidade Crítica'))).toBe(false); // season: 12/15 = 80%
  });

  it('no attendance alert for a single absence', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    const trainings = [tr('t1', '2026-10-08'), tr('t2', '2026-10-12'), tr('t3', '2026-10-15', ['rui'])];
    expect(titles(state([player('rui', 'Rui')], trainings)).filter((x) => x.includes('Rui'))).toEqual([]);
  });
});
