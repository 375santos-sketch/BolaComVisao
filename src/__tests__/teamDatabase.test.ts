import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  sanitizeAndDeduplicateHeaders,
  inspectExcelBuffer,
  MAX_COLUMNS_LIMIT,
  MAX_FILE_SIZE_BYTES
} from '../lib/teamDatabaseService';
import { canViewTeamDatabase, canManageTeamDatabase, hasPermission } from '../lib/permissionsEngine';
import { UserAccount } from '../types';

describe('Team Database - Import Pipeline & Sanitization', () => {
  it('column names in capitals, accents and symbols kept, duplicates numbered', () => {
    const rawHeaders = [
      '  Nome do Atleta  ',
      'Posição (Campo)',
      'Nº Camisola',
      'Posição (Campo)', // duplicate
      '', // empty
      'Email @'
    ];

    const cleaned = sanitizeAndDeduplicateHeaders(rawHeaders);

    expect(cleaned[0]).toBe('NOME DO ATLETA');
    expect(cleaned[1]).toBe('POSIÇÃO (CAMPO)');
    expect(cleaned[2]).toBe('Nº CAMISOLA');
    expect(cleaned[3]).toBe('POSIÇÃO (CAMPO) (2)');
    expect(cleaned[4]).toBe('COLUNA 5');
    expect(cleaned[5]).toBe('EMAIL @');
  });

  it('should strictly enforce max 40 columns limit', () => {
    const manyHeaders = Array.from({ length: 55 }, (_, i) => `COL_${i + 1}`);
    const cleaned = sanitizeAndDeduplicateHeaders(manyHeaders);
    expect(cleaned.length).toBe(MAX_COLUMNS_LIMIT);
    expect(cleaned[39]).toBe('COL_40');
  });

  it('should reject files exceeding the 2 MB limit', () => {
    const fakeLargeBuffer = new Uint8Array(MAX_FILE_SIZE_BYTES + 1024);
    expect(() => inspectExcelBuffer(fakeLargeBuffer, 'huge.xlsx')).toThrow(/limite máximo permitido de 2 MB/i);
  });

  it('ignores empty rows and keeps the text of the cells as in the file', () => {
    // Generate a simple in-memory workbook with XLSX
    const data = [
      ['Jogador', 'Posição', 'Golos', 'Email'],
      ["João d'Almeida-Silva", 'Avançado/Extremo', '12', 'JOAO@Clube.pt'],
      ['', '', '', ''], // empty row should be skipped
      ['  José   Mário  ', 'Médio-Centro', '3', 'jose.mario@clube.pt'],
      ['   ', '   ', '', ''] // another empty row
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Folha1');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const inspection = inspectExcelBuffer(u8, 'teste.xlsx');

    expect(inspection.sheetNames).toContain('Folha1');
    const sheet = inspection.sheets['Folha1'];
    expect(sheet.columns).toEqual(['JOGADOR', 'POSIÇÃO', 'GOLOS', 'EMAIL']);
    expect(sheet.rows.length).toBe(2); // 2 non-empty rows

    // Row 1
    expect(sheet.rows[0]['JOGADOR']).toBe("João d'Almeida-Silva");
    expect(sheet.rows[0]['POSIÇÃO']).toBe('Avançado/Extremo');
    expect(sheet.rows[0]['GOLOS']).toBe('12');
    expect(sheet.rows[0]['EMAIL']).toBe('joao@clube.pt'); // email lowercase exception

    // Row 2
    expect(sheet.rows[1]['JOGADOR']).toBe('José Mário');
    expect(sheet.rows[1]['POSIÇÃO']).toBe('Médio-Centro');
    expect(sheet.rows[1]['EMAIL']).toBe('jose.mario@clube.pt');
  });

  it('CSV files: accents read right (UTF-8, or the old Windows encoding) and "18/20" stays "18/20"', () => {
    const text = 'NOME,POSIÇÃO,PRESENÇAS\nGonçalo Exemplo,Guarda-redes,18/20\n';
    const utf8 = new TextEncoder().encode('\uFEFF' + text);
    const sheetOf = (bytes: Uint8Array) => Object.values(inspectExcelBuffer(bytes, 'plantel.csv').sheets)[0];
    for (const bytes of [utf8, Uint8Array.from(text, (c) => ({ Ç: 0xc7, Ã: 0xc3, ç: 0xe7 })[c] ?? c.charCodeAt(0))]) {
      const sheet = sheetOf(bytes);
      expect(sheet.columns).toEqual(['NOME', 'POSIÇÃO', 'PRESENÇAS']);
      expect(sheet.rows[0]).toEqual({ NOME: 'Gonçalo Exemplo', POSIÇÃO: 'Guarda-redes', PRESENÇAS: '18/20' });
    }
  });

  it('should handle workbook with multiple sheets and allow selection', () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([['COL1'], ['VAL1']]);
    const ws2 = XLSX.utils.aoa_to_sheet([['COL2'], ['VAL2']]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Sub-15');
    XLSX.utils.book_append_sheet(wb, ws2, 'Sub-17');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const inspection = inspectExcelBuffer(u8, 'escaloes.xlsx');
    expect(inspection.sheetNames).toEqual(['Sub-15', 'Sub-17']);
    expect(inspection.sheets['Sub-15'].columns).toEqual(['COL1']);
    expect(inspection.sheets['Sub-17'].columns).toEqual(['COL2']);
  });
});

describe('Team Database - Permissions & ABAC Multi-Tenant Scenarios', () => {
  const adminUser: UserAccount = {
    id: 'user_admin',
    username: 'admin',
    email: 'admin@bolacomvisao.pt',
    name: 'Administrador Geral',
    role: 'Administrador',
    status: 'approved',
    clubId: 'club_1',
    createdAt: ''
  };

  const coachTeamA: UserAccount = {
    id: 'user_coach_a',
    username: 'coach_a',
    name: 'Treinador Equipa A',
    role: 'Treinador Principal',
    status: 'approved',
    clubId: 'club_1',
    assignedTeams: ['team_a'],
    createdAt: ''
  };

  const assistantCoachTeamA: UserAccount = {
    id: 'user_adjunto_a',
    username: 'adjunto_a',
    name: 'Treinador Adjunto A',
    role: 'Treinador Adjunto',
    status: 'approved',
    clubId: 'club_1',
    assignedTeams: ['team_a'],
    createdAt: ''
  };

  const analystTeamA: UserAccount = {
    id: 'user_analyst_a',
    username: 'analyst_a',
    name: 'Analista A',
    role: 'Analista',
    status: 'approved',
    clubId: 'club_1',
    assignedTeams: ['team_a'],
    createdAt: ''
  };

  const physioTeamA: UserAccount = {
    id: 'user_physio_a',
    username: 'physio_a',
    name: 'Fisioterapeuta A',
    role: 'Fisioterapeuta',
    status: 'approved',
    clubId: 'club_1',
    assignedTeams: ['team_a'],
    createdAt: ''
  };

  const coachWithAllTeams: UserAccount = {
    id: 'user_coach_all',
    username: 'coach_all',
    name: 'Coordenador Multi-Equipa',
    role: 'Treinador Principal',
    status: 'approved',
    clubId: 'club_1',
    assignedTeams: ['all'],
    createdAt: ''
  };

  const pendingUser: UserAccount = {
    id: 'user_pending',
    username: 'pendente',
    name: 'Utilizador Pendente',
    role: 'Treinador Principal',
    status: 'pending',
    clubId: 'club_1',
    assignedTeams: ['team_a'],
    createdAt: ''
  };

  it('1. Coach of Team A can view and manage Team A database, but CANNOT access Team B', () => {
    // Access to Team A
    expect(canViewTeamDatabase(coachTeamA, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(coachTeamA, 'team_a', 'club_1')).toBe(true);
    expect(hasPermission(coachTeamA, 'view_team_database', 'team_a', 'club_1')).toBe(true);
    expect(hasPermission(coachTeamA, 'manage_team_database', 'team_a', 'club_1')).toBe(true);

    // Forbidden from Team B
    expect(canViewTeamDatabase(coachTeamA, 'team_b', 'club_1')).toBe(false);
    expect(canManageTeamDatabase(coachTeamA, 'team_b', 'club_1')).toBe(false);
    expect(hasPermission(coachTeamA, 'view_team_database', 'team_b', 'club_1')).toBe(false);
    expect(hasPermission(coachTeamA, 'manage_team_database', 'team_b', 'club_1')).toBe(false);
  });

  it('2. Assistant Coach (Treinador Adjunto) of Team A can view and manage Team A database', () => {
    expect(canViewTeamDatabase(assistantCoachTeamA, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(assistantCoachTeamA, 'team_a', 'club_1')).toBe(true);
    expect(hasPermission(assistantCoachTeamA, 'manage_team_database', 'team_a', 'club_1')).toBe(true);
  });

  it('3. Read-only profiles (Analyst, Physio) can VIEW Team A database but CANNOT edit/manage', () => {
    // Analyst
    expect(canViewTeamDatabase(analystTeamA, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(analystTeamA, 'team_a', 'club_1')).toBe(false);
    expect(hasPermission(analystTeamA, 'view_team_database', 'team_a', 'club_1')).toBe(true);
    expect(hasPermission(analystTeamA, 'manage_team_database', 'team_a', 'club_1')).toBe(false);

    // Physio
    expect(canViewTeamDatabase(physioTeamA, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(physioTeamA, 'team_a', 'club_1')).toBe(false);
  });

  it('4. User with "all" in assignedTeams has access to both Team A and Team B', () => {
    expect(canViewTeamDatabase(coachWithAllTeams, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(coachWithAllTeams, 'team_a', 'club_1')).toBe(true);
    expect(canViewTeamDatabase(coachWithAllTeams, 'team_b', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(coachWithAllTeams, 'team_b', 'club_1')).toBe(true);
  });

  it('5. Administrator has global unrestricted access to any team database', () => {
    expect(canViewTeamDatabase(adminUser, 'team_a', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(adminUser, 'team_a', 'club_1')).toBe(true);
    expect(canViewTeamDatabase(adminUser, 'team_b', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(adminUser, 'team_b', 'club_1')).toBe(true);
    expect(canManageTeamDatabase(adminUser, 'any_unknown_team', 'club_1')).toBe(true);
  });

  it('6. Pending users are strictly denied from viewing or editing any team database', () => {
    expect(canViewTeamDatabase(pendingUser, 'team_a', 'club_1')).toBe(false);
    expect(canManageTeamDatabase(pendingUser, 'team_a', 'club_1')).toBe(false);
  });
});
