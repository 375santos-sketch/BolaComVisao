import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, restoreFromBackup, isBackupDue, daysSinceBackup } from '../lib/backup';
import { normalizeClubState } from '../lib/storage';
import { AppState } from '../types';

const player = (id: string, name: string) => ({ id, name, number: 1, positions: '', birthDate: null, active: true });
const match = (id: string, opponent: string) =>
  ({
    id,
    opponent,
    date: '2026-10-10',
    type: 'campeonato',
    location: 'casa',
    finished: true,
    goals: [],
    subs: [],
    lineup: [],
    capitao: null
  }) as any;

const club = (active: string): AppState =>
  normalizeClubState({
    activeTeamId: active,
    version: 2,
    theme: 'luzsolar',
    currentUser: { id: 'u1', name: 'Admin', email: 'admin@clube.pt', role: 'Administrador', status: 'approved' } as any,
    users: [{ id: 'u2', name: 'Treinador', email: 'treinador@clube.pt', phoneNumber: '912000000' }] as any,
    auditLogs: [{ id: 'l1' }] as any,
    teams: [
      {
        id: 'sub11',
        clubName: 'Dragões',
        category: 'Sub-11',
        season: '2026/2027',
        roster: [player('p1', 'Rui')],
        matches: [match('m1', 'Esparteiros')],
        staffMembers: [{ id: 's1', name: 'Mister' }]
      } as any,
      {
        id: 'sub13',
        clubName: 'Dragões',
        category: 'Sub-13',
        season: '2026/2027',
        roster: [player('p9', 'Zé')],
        matches: [match('m9', 'Abrantes')]
      } as any
    ]
  } as AppState);

describe('Cópia de segurança do clube', () => {
  const file = JSON.stringify(buildBackup(club('sub11'), new Date('2026-10-21T12:00:00Z')));

  it('holds every team with its records (before: only the active team was restored)', () => {
    const { backup } = parseBackup(file) as any;
    const teams = backup.club.teams;
    expect(teams.map((t: any) => t.id)).toEqual(['sub11', 'sub13']);
    expect(teams[1].roster.map((p: any) => p.name)).toEqual(['Zé']);
    expect(teams[1].matches.map((m: any) => m.opponent)).toEqual(['Abrantes']);
    expect(teams[0].staffMembers.map((s: any) => s.name)).toEqual(['Mister']);
    expect(backup.club.theme).toBe('luzsolar');
  });

  it('has no account data: signed-in user, coaches contacts, audit log', () => {
    expect(file).not.toContain('admin@clube.pt');
    expect(file).not.toContain('treinador@clube.pt');
    expect(file).not.toContain('912000000');
    expect(JSON.parse(file).club.auditLogs).toBeUndefined();
  });

  it('restores the whole club and keeps this device signed in, on the team it was using', () => {
    const now = normalizeClubState({ ...club('sub13'), teams: [club('sub13').teams[0]] } as AppState); // Sub-13 lost
    const read = parseBackup(file);
    expect(read.kind).toBe('full');
    const restored = restoreFromBackup((read as any).backup.club, { ...now, activeTeamId: 'sub11' });
    expect(restored.teams.map((t) => t.id)).toEqual(['sub11', 'sub13']);
    expect(restored.currentUser?.id).toBe('u1');
    expect(restored.activeTeamId).toBe('sub11');
    expect(restored.roster.map((p) => p.id)).toEqual(['p1']);
    expect(restored.teams[1].roster.map((p) => p.id)).toEqual(['p9']);
  });

  it('older backup files are still accepted', () => {
    expect(parseBackup(JSON.stringify({ roster: [player('p1', 'Rui')], matches: [] })).kind).toBe('legacy');
    expect(() => parseBackup('{"x":1}')).toThrow();
  });

  it('weekly reminder', () => {
    const day = 86_400_000;
    const now = Date.UTC(2026, 9, 21);
    expect(isBackupDue(null, now)).toBe(true);
    expect(isBackupDue(now - 6 * day, now)).toBe(false);
    expect(isBackupDue(now - 7 * day, now)).toBe(true);
    expect(daysSinceBackup(now - 3 * day, now)).toBe(3);
  });
});
