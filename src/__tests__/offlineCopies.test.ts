import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isUnusedOfflineCopy } from '../lib/syncEngine';

/** P1-02 — only the copies nothing read are removed from the device; the app's own copy stays. */
describe('P1-02 · cópias antigas sem uso no aparelho', () => {
  it('reconhece as cópias que nada lia', () => {
    for (const key of [
      'offline_state_backup',
      'latest_cloud_synced_state',
      'archived_mutations_1763990000000',
      'processed_queue_1763990000000'
    ])
      expect(isUnusedOfflineCopy(key), key).toBe(true);
  });

  it('nunca a cópia da própria app nem outras chaves', () => {
    for (const key of [
      'coach_active_state',
      'bcv-state:uid1:main',
      'archived_mutations_',
      'archived_mutations_abc',
      'offline_state_backup_2',
      'x_latest_cloud_synced_state',
      ''
    ])
      expect(isUnusedOfflineCopy(key), key).toBe(false);
  });

  it('ao voltar a rede há uma só gravação: o App já não chama a segunda nem a fila vazia', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    // Calls and imports (the comment that explains the change may still name them)
    expect(app).not.toMatch(/(syncStateWithCloud|processOfflineMutationsQueue)\s*\(/);
    expect(app).not.toMatch(/import\s*\{[^}]*(syncStateWithCloud|processOfflineMutationsQueue)/);
    expect(app.match(/await pushStateToCloud\(/g)?.length).toBeGreaterThan(0);
    const engine = readFileSync(new URL('../lib/syncEngine.ts', import.meta.url), 'utf8');
    expect(engine).not.toMatch(/export async function syncStateWithCloud|saveMasterClubState/);
  });
});
