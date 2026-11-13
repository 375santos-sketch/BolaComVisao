import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner, PASSWORD } from './seed';
import { cloudRecords, enterPanel, login, navTo } from './helpers';

const AUTH = 'http://127.0.0.1:9099';
const ADMIN = 'admin.plataforma@clube.pt';

/** Every document in the emulator (path → last update time), walking all collections. */
async function snapshotDatabase(): Promise<Map<string, string>> {
  const all = new Map<string, string>();
  const collectionsOf = async (parent: string): Promise<string[]> => {
    const res = await fetch(`${parent}:listCollectionIds`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ pageSize: 500 })
    });
    return ((await res.json()) as { collectionIds?: string[] }).collectionIds || [];
  };
  const walk = async (parent: string) => {
    for (const id of await collectionsOf(parent)) {
      const res = await fetch(`${parent}/${id}?pageSize=1000&showMissing=true`, { headers: owner });
      const body = (await res.json()) as { documents?: Array<{ name: string; updateTime?: string }> };
      for (const d of body.documents || []) {
        const path = d.name.split('/documents/')[1];
        all.set(path, d.updateTime || '(sem documento)');
        await walk(`${FIRESTORE}/${path}`);
      }
    }
  };
  await walk(FIRESTORE);
  return all;
}

/** A platform Administrator (admins/{uid}), created only for this test. */
async function createPlatformAdmin() {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: PASSWORD, returnSecureToken: true })
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  const s = (v: string) => ({ stringValue: v });
  await fetch(`${FIRESTORE}/users/${uid}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({
      fields: {
        account: {
          mapValue: {
            fields: {
              id: s(uid),
              username: s('admin.plataforma'),
              email: s(ADMIN),
              name: s('Administrador P'),
              role: s('Administrador'),
              status: s('approved'),
              clubId: s('clubA'),
              assignedTeams: { arrayValue: { values: [s('all')] } },
              createdAt: s('2026-09-01T00:00:00Z')
            }
          }
        }
      }
    })
  });
  await fetch(`${FIRESTORE}/admins/${uid}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({ fields: { email: s(ADMIN) } })
  });
}

test('inventário da plataforma: só o Administrador o vê; só lê (a base de dados fica igual)', async ({
  page,
  browser
}) => {
  // A coach does not see it
  const coachContext = await browser.newContext();
  const coach = await coachContext.newPage();
  await login(coach, COACH_A);
  await enterPanel(coach);
  await navTo(coach, /clube/i);
  await expect(coach.getByRole('button', { name: /Cópias de segurança/ })).toBeVisible();
  await expect(coach.getByRole('button', { name: /Inventário da plataforma/ })).toHaveCount(0);
  await coachContext.close();

  await createPlatformAdmin();
  await login(page, ADMIN);
  await enterPanel(page);
  await navTo(page, /clube/i);
  // The app settles (its normal sync); from here on, nothing may change in the database
  await expect(page.getByTestId('sync-status').first()).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  const before = await snapshotDatabase();

  await page.getByRole('button', { name: /Inventário da plataforma/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Inventário da plataforma' });
  await expect(sheet).toContainText('Só leitura');
  await sheet.getByRole('button', { name: 'Fazer inventário' }).click();
  await expect(sheet.getByRole('button', { name: 'Descarregar inventário (JSON)' })).toBeVisible({ timeout: 30_000 });

  // Accounts: the 3 seeded and this Administrator; never the athletes' names
  const accounts = sheet.getByRole('table', { name: 'Lista de contas' });
  await expect(accounts).toContainText('Treinador A');
  await expect(accounts).toContainText('Coordenador C');
  await expect(accounts).toContainText('Administrador P ★');
  await expect(sheet).not.toContainText('Rui Silva');
  await expect(sheet).not.toContainText('Tomás Gonçalves');

  // The counts are the emulator's
  const records = [...(await cloudRecords('clubA')).values()];
  const players = records.filter((r) => r.kind === 'player' && !r.deleted).length;
  const byKind = sheet.getByRole('table', { name: 'Registos por tipo em clubA' });
  await expect(byKind.getByRole('row', { name: /^Atletas/ })).toContainText(String(players));
  await expect(sheet.getByRole('region', { name: 'Espaço «clubA»' })).toContainText(
    `Registos: ${records.filter((r) => !r.deleted).length} ativos`
  );
  // The question of the addendum: does the shared club document hold user accounts?
  await expect(sheet.getByRole('region', { name: /documento comum do clube tem contas/ })).toContainText('«clubA»');

  // The file: JSON with its checksum
  const downloading = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Descarregar inventário (JSON)' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/^bcv-inventario-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = JSON.parse(await (await import('node:fs/promises')).readFile((await file.path())!, 'utf8'));
  expect(saved).toMatchObject({ format: 'bcv-inventario', version: 1 });
  expect(saved.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(saved)).not.toContain('Rui Silva');

  // Nothing was written: every document is exactly as before
  await page.waitForTimeout(2000);
  const after = await snapshotDatabase();
  expect([...after.entries()].sort()).toEqual([...before.entries()].sort());
  await page.screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/inventario.png` : undefined,
    fullPage: true
  });
});
