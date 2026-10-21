import { expect, type Page, type BrowserContext } from '@playwright/test';
import { FIRESTORE, owner, PASSWORD } from './seed';

/** Fails the test on any uncaught error in the page (a broken screen). */
export function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

export async function login(page: Page, email: string) {
  await page.goto('/');
  await page.getByPlaceholder('ex: treinador ou treinador@email.com').fill(email);
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.locator('button[type=submit]').first().click();
  await expect(page.getByText('ESCOLHA A SUA EQUIPA / ÉPOCA')).toBeVisible();
}

export async function enterPanel(page: Page) {
  await page.getByText('ENTRAR NO PAINEL').first().click();
  await expect(page.locator('#navbar')).toBeVisible();
}

export async function newCoachPage(context: BrowserContext, email: string) {
  const page = await context.newPage();
  await login(page, email);
  await enterPanel(page);
  return page;
}

export const navTo = (page: Page, name: RegExp) => page.locator('#navbar').getByRole('button', { name }).click();

/** Opens an item of the "Mais" drawer. */
export async function openMore(page: Page, item: RegExp) {
  await navTo(page, /mais/i);
  await page.getByRole('button', { name: item }).first().click();
}

/** The cloud save indicator in the header (data-status: synced, saving, pending, offline, error, local). */
export const syncBadge = (page: Page) => page.getByTestId('sync-status').first();

export interface StoredRecord {
  kind: string;
  deleted: boolean;
  name?: string;
  opponent?: string;
  goals?: number;
}

/** Club records in the emulator (read with admin access). */
export async function cloudRecords(workspace = 'clubA'): Promise<Map<string, StoredRecord>> {
  const res = await fetch(`${FIRESTORE}/club_workspace/${workspace}/records?pageSize=500`, { headers: owner });
  const body = (await res.json()) as { documents?: Array<{ name: string; fields: Record<string, any> }> };
  return new Map(
    (body.documents || []).map((d) => [
      d.name.split('/').pop()!,
      {
        kind: d.fields.kind?.stringValue,
        deleted: d.fields.deleted?.booleanValue === true,
        name: d.fields.data?.mapValue?.fields?.name?.stringValue,
        opponent: d.fields.data?.mapValue?.fields?.opponent?.stringValue,
        goals: d.fields.data?.mapValue?.fields?.goals?.arrayValue?.values?.length ?? 0
      }
    ])
  );
}

/** Deletes the club's records (admin access): the club goes back to the old single-document format. */
export async function resetToLegacyFormat(workspace = 'clubA') {
  for (const id of (await cloudRecords(workspace)).keys()) {
    await fetch(`${FIRESTORE}/club_workspace/${workspace}/records/${id}`, { method: 'DELETE', headers: owner });
  }
}
