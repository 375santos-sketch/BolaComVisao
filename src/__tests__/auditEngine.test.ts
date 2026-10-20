import { describe, it, expect, beforeEach, vi } from 'vitest';
import { filterAuditLogs } from '../lib/auditEngine';
import { AuditLogEntry } from '../types';

describe('auditEngine', () => {
  const sampleLogs: AuditLogEntry[] = [
    {
      id: 'aud_1',
      timestamp: Date.now() - 1000 * 60 * 10, // 10 mins ago
      userId: 'user-1',
      userName: 'Mister Silva',
      userRole: 'Treinador Principal',
      action: 'match_create',
      entityType: 'jogo',
      teamId: 'team-sub19',
      teamName: 'Sub-19 A',
      description: 'Criou jogo agendado vs Sporting'
    },
    {
      id: 'aud_2',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
      userId: 'admin-1',
      userName: 'Admin Master',
      userRole: 'Administrador',
      action: 'permission_change',
      entityType: 'utilizador',
      description: 'Alterou permissões de mister'
    },
    {
      id: 'aud_3',
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 40, // 40 days ago
      userId: 'user-1',
      userName: 'Mister Silva',
      userRole: 'Treinador Principal',
      action: 'training_attendance',
      entityType: 'treino',
      teamId: 'team-sub19',
      teamName: 'Sub-19 A',
      description: 'Registou presenças de treino'
    }
  ];

  it('filters audit logs by action and entityType', () => {
    const matchLogs = filterAuditLogs(sampleLogs, { action: 'match_create' });
    expect(matchLogs.length).toBe(1);
    expect(matchLogs[0].id).toBe('aud_1');

    const userLogs = filterAuditLogs(sampleLogs, { entityType: 'utilizador' });
    expect(userLogs.length).toBe(1);
    expect(userLogs[0].id).toBe('aud_2');
  });

  it('filters audit logs by timeframe (periodDays)', () => {
    const recent7Days = filterAuditLogs(sampleLogs, { periodDays: 7 });
    expect(recent7Days.length).toBe(2);
    expect(recent7Days.map((l) => l.id)).not.toContain('aud_3');
  });

  it('performs case-insensitive free text search across description and user', () => {
    const searchResult = filterAuditLogs(sampleLogs, { search: 'sporting' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].description).toContain('Sporting');

    const adminSearch = filterAuditLogs(sampleLogs, { search: 'admin' });
    expect(adminSearch.length).toBe(1);
    expect(adminSearch[0].userName).toBe('Admin Master');
  });
});
