import { expect, test } from '@playwright/test';
import { FIRESTORE, owner } from './seed';
import { PLATFORM_ADMIN, ensurePlatformAdmin } from './emulatorData';
import { enterPanel, login, navTo } from './helpers';

// Runs LAST (zz-): it moves the test accounts into the organization "main".

const memberDoc = async (uid: string) => {
  const res = await fetch(`${FIRESTORE}/organizations/main/members/${uid}`, { headers: owner });
  return res.ok ? ((await res.json()) as { fields: Record<string, any> }).fields : null;
};
const uidOf = async (name: string) => {
  const res = await fetch(`${FIRESTORE}/users?pageSize=100`, { headers: owner });
  const body = (await res.json()) as { documents: Array<{ name: string; fields: Record<string, any> }> };
  const doc = body.documents.find((d) => d.fields.account?.mapValue?.fields?.name?.stringValue === name);
  return doc!.name.split('/').pop()!;
};

/**
 * F1.8 + F1.6 in the emulator (where the migration is allowed): the platform Administrator chooses who stays,
 * migrates, sees the automatic checks; then, as owner of the club, manages the members and takes a coach's
 * access away.
 */
test('migração do clube e membros: escolher, migrar com verificação e retirar o acesso a um treinador', async ({
  page
}) => {
  test.setTimeout(120_000);
  const adminUid = await ensurePlatformAdmin();
  await login(page, PLATFORM_ADMIN);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Migração do clube/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Migração do clube' });
  await expect(sheet).not.toContainText('Migração bloqueada');
  const who = sheet.getByRole('region', { name: 'Quem fica no clube' });
  await expect(who).toContainText('Treinador A');
  await expect(who).toContainText('Administrador P ★');
  // The coordinator stays out of the club
  await who.getByRole('group', { name: 'Escolha para Coordenador C' }).getByRole('button', { name: 'Fora' }).click();
  const run = sheet.getByRole('button', { name: 'Criar organização e membros' });
  await expect(run).toBeDisabled(); // the encrypted copy is confirmed first
  await sheet.getByLabel(/Fiz uma cópia cifrada/).check();
  await run.click();
  await expect(sheet.getByRole('status')).toContainText('Migração concluída e verificada', { timeout: 30_000 });
  await expect(sheet.getByRole('region', { name: 'Verificação automática' })).toContainText(
    'Registos do clube iguais antes e depois'
  );
  expect((await memberDoc(adminUid))?.role?.stringValue).toBe('owner');
  expect(await memberDoc(await uidOf('Coordenador C'))).toBeNull();
  const coachB = await uidOf('Treinador B');
  expect((await memberDoc(coachB))?.status?.stringValue).toBe('active');

  // The owner opens the app again: it now works through the organization and shows its members
  await page.reload();
  await enterPanel(page).catch(() => {});
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Membros do clube/ }).click({ timeout: 30_000 });
  const members = page.getByRole('dialog', { name: 'Membros do clube' });
  await expect(members.getByRole('list', { name: 'Membros' })).toContainText('Treinador B');
  await members.getByRole('listitem').filter({ hasText: 'Treinador B' }).getByRole('button', { name: 'Gerir' }).click();
  const manage = page.getByRole('dialog', { name: 'Gerir acesso' });
  await expect(manage.getByRole('region', { name: 'Histórico' })).toContainText('Passou a membro na migração');
  await manage.getByRole('button', { name: 'Retirar acesso' }).click();
  await expect(members.getByRole('button', { name: /Sem acesso · 1/ })).toBeVisible({ timeout: 15_000 });
  expect((await memberDoc(coachB))?.status?.stringValue).toBe('revoked');
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/membros.png` : undefined });
});
