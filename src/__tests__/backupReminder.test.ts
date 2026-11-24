import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { backupUrgency, getLastEncryptedBackupAt, setLastEncryptedBackupAt } from '../lib/backup';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 24, 12);

describe('P1-03: lembrete da cópia cifrada', () => {
  it('sem cópia neste aparelho: em atraso', () => {
    expect(backupUrgency(null, NOW)).toBe('overdue');
  });

  it('menos de uma semana: não lembra', () => {
    expect(backupUrgency(NOW - 6 * DAY, NOW)).toBe('ok');
  });

  it('uma semana ou mais: lembra', () => {
    expect(backupUrgency(NOW - 7 * DAY, NOW)).toBe('due');
    expect(backupUrgency(NOW - 13 * DAY, NOW)).toBe('due');
  });

  it('duas semanas ou mais: em atraso (vermelho)', () => {
    expect(backupUrgency(NOW - 14 * DAY, NOW)).toBe('overdue');
  });
});

describe('P1-03: data da última cópia cifrada', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v)
    });
  });

  it('fica guardada neste aparelho', () => {
    expect(getLastEncryptedBackupAt()).toBeNull();
    setLastEncryptedBackupAt(NOW);
    expect(getLastEncryptedBackupAt()).toBe(NOW);
  });

  it('não conta a cópia simples (sem cifra)', () => {
    localStorage.setItem('bcv-last-backup-at', String(NOW));
    expect(getLastEncryptedBackupAt()).toBeNull();
  });
});

describe('P1-03: ecrãs', () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

  it('o lembrete só oferece a cópia cifrada (nenhum ficheiro sem cifra)', () => {
    const reminder = read('../components/BackupReminder.tsx');
    expect(reminder).toContain('onOpenEncryptedBackup');
    expect(reminder).not.toContain('exportJSONBackup');
  });

  it('a data só é gravada depois de a cópia ser verificada', () => {
    const modal = read('../components/admin/EncryptedBackupModal.tsx');
    const check = modal.indexOf('openBackupFile(backup, pass)');
    const saved = modal.indexOf('setLastEncryptedBackupAt()');
    expect(check).toBeGreaterThan(0);
    expect(saved).toBeGreaterThan(check);
  });
});
