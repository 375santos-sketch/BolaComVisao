import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { BackupFile, canonicalJson, openBackupFile } from '../src/lib/encryptedBackup';
import {
  PLATFORM_ADMIN,
  ensurePlatformAdmin,
  readWholeDatabase,
  restoreToEmulator,
  wipeEmulatorDatabase
} from './emulatorData';
import { enterPanel, login, navTo } from './helpers';

const PASS = 'frase-passe de teste 2026';

/** Content of the database: path → fields (documents that only exist as a parent of others are left out). */
const content = (db: Awaited<ReturnType<typeof readWholeDatabase>>) =>
  new Map([...db].filter(([, d]) => d.data !== null).map(([path, d]) => [path, canonicalJson(d.data)]));

// F1.1b: the copy is made in the app (only reads), checked in the app, and restored ONLY to the emulator
test('cópia cifrada: criar sem alterar nada, verificar, e restaurar no emulador com tudo igual', async ({ page }) => {
  test.setTimeout(180_000);
  await ensurePlatformAdmin();
  await login(page, PLATFORM_ADMIN);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await expect(page.getByTestId('sync-status').first()).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  const before = await readWholeDatabase();

  await page.getByRole('button', { name: /Cópia cifrada da plataforma/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Cópia cifrada da plataforma' });
  await expect(sheet).toContainText('Só leitura');
  // A short passphrase or one that does not match is refused
  await sheet.getByLabel(/^Frase-passe/).fill('curta');
  await sheet.getByLabel('Repetir a frase-passe').fill('curta');
  await sheet.getByRole('button', { name: 'Criar cópia cifrada' }).click();
  await expect(sheet.getByRole('alert')).toContainText('pelo menos 12');
  await sheet.getByLabel(/^Frase-passe/).fill(PASS);
  await sheet.getByLabel('Repetir a frase-passe').fill(PASS);
  const downloading = page.waitForEvent('download', { timeout: 90_000 });
  await sheet.getByRole('button', { name: 'Criar cópia cifrada' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^bcv-backup-\d{4}-\d{2}-\d{2}\.bcvbak$/);
  await expect(sheet.getByRole('status')).toContainText('Cópia criada, verificada e descarregada', {
    timeout: 60_000
  });
  const filePath = (await download.path())!;
  const text = await readFile(filePath, 'utf8');
  // Nothing readable: athletes' names only inside the encrypted part
  expect(text).not.toContain('Rui Silva');
  expect(text).not.toContain('coach.a@clube.pt');

  // Making the copy wrote nothing: every document exactly as before (same content, same update time)
  await page.waitForTimeout(2000);
  const afterCopy = await readWholeDatabase();
  expect([...afterCopy].map(([p, d]) => [p, d.updateTime]).sort()).toEqual(
    [...before].map(([p, d]) => [p, d.updateTime]).sort()
  );

  // Verify in the app: a wrong passphrase is refused, the right one opens it
  await sheet.getByRole('button', { name: 'Verificar uma cópia' }).click();
  await sheet.getByLabel('Ficheiro da cópia (.bcvbak)').setInputFiles(filePath);
  await sheet.getByLabel('Frase-passe da cópia').fill('frase errada mas longa');
  await sheet.getByRole('button', { name: 'Verificar', exact: true }).click();
  await expect(sheet.getByRole('alert')).toContainText('Frase-passe errada', { timeout: 30_000 });
  await sheet.getByLabel('Frase-passe da cópia').fill(PASS);
  await sheet.getByRole('button', { name: 'Verificar', exact: true }).click();
  await expect(sheet.getByRole('status')).toContainText('Cópia íntegra', { timeout: 30_000 });
  await expect(sheet.getByRole('region', { name: 'Conteúdo verificado' })).toContainText('club_workspace/*/records');
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/copia-cifrada.png` : undefined });
  await page.close();

  // The copy holds exactly what was in the cloud (except the public links, which the rules do not let anyone list)
  const opened = await openBackupFile(JSON.parse(text) as BackupFile, PASS);
  expect(opened.ok).toBe(true);
  if (!opened.ok) return;
  const original = content(before);
  const isPublic = (p: string) => p.startsWith('public_');
  const copied = new Map(opened.payload.documents.map((d) => [d.path, canonicalJson(d.data)]));
  expect([...copied.keys()].sort()).toEqual([...original.keys()].filter((p) => !isPublic(p)).sort());
  for (const [path, data] of copied) expect(data, path).toBe(original.get(path));

  // Restore to an EMPTY emulator: everything comes back identical
  await wipeEmulatorDatabase();
  expect(content(await readWholeDatabase()).size).toBe(0);
  await restoreToEmulator(opened.payload.documents);
  const restored = content(await readWholeDatabase());
  expect([...restored.keys()].sort()).toEqual([...copied.keys()].sort());
  for (const [path, data] of copied) expect(restored.get(path), path).toBe(data);
});
