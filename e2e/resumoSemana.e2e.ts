import { test, expect } from '@playwright/test';
import { COACH_A, FIRESTORE } from './seed';
import { enterPanel, login, openMore, watchPageErrors } from './helpers';
import { newsletterFromRestDocument, renderNewsletterPage } from '../src/lib/weeklyNewsletter';

// 📰 Resumo da semana: the link opens for anyone who has it, without an account; nothing else of the club is readable.
// Only fictitious data from the emulator (e2e/seed.ts).

test('resumo da semana: link sem conta, fotografias só quando o treinador liga, desligar o link', async ({
  page,
  browser
}) => {
  const errors = watchPageErrors(page);
  await login(page, COACH_A);
  await enterPanel(page);
  await openMore(page, /Comunicação/);
  await page
    .getByRole('dialog', { name: 'Comunicação' })
    .getByRole('button', { name: /Resumo da semana/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Resumo da semana' });

  // The photos are off unless the coach turns them on
  const photos = dialog.getByLabel('Mostrar a fotografia de quem marcou');
  await expect(photos).not.toBeChecked();
  await expect(dialog.getByRole('region', { name: 'Fotografias de quem marcou' })).toContainText(
    'Qualquer pessoa com o link vê as fotografias'
  );

  await dialog.getByRole('button', { name: 'Criar link e publicar' }).click();
  await expect(page.getByText('Resumo da semana publicado ✓')).toBeVisible();
  const input = dialog.getByLabel('Link do resumo');
  await expect(input).toHaveValue(/\/semana\/[a-zA-Z0-9]{24}$/);
  const token = (await input.inputValue()).split('/').pop()!;
  await expect(dialog.getByRole('button', { name: 'Copiar link' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Enviar pelo WhatsApp/ })).toHaveAttribute(
    'href',
    new RegExp(`wa\\.me/\\?text=.*semana%2F${token}`)
  );

  // A parent opens the link: a new browser without any session, reading only that one document
  const read = async () => {
    const res = await fetch(`${FIRESTORE}/public_newsletters/${token}`);
    return res.ok ? ((await res.json()) as { fields?: Record<string, unknown> }) : null;
  };
  const doc = await read();
  expect(doc, 'o resumo lê-se sem sessão').not.toBeNull();
  // Only what the page needs: no contacts, birth dates, absences or notes
  const allowed = ['archive', 'card', 'clubId', 'issue', 'teamId', 'teamName', 'updatedAt'];
  expect(Object.keys(doc!.fields || {}).filter((k) => !allowed.includes(k))).toEqual([]);
  expect(JSON.stringify(doc)).not.toMatch(/phone|email|birthDate|absences|coachNotes|emergencyContact|photoUrl/);
  // Nobody lists the links, and the club's own data stays closed without a session
  expect((await fetch(`${FIRESTORE}/public_newsletters`)).status).toBe(403);
  expect((await fetch(`${FIRESTORE}/club_workspace`)).status).toBe(403);
  expect((await fetch(`${FIRESTORE}/team_databases`)).status).toBe(403);

  const parentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const parent = await parentContext.newPage();
  await parent.setContent(renderNewsletterPage(newsletterFromRestDocument(doc)!, { token }));
  await expect(parent.getByRole('heading', { name: 'Resumo da semana' })).toBeVisible();
  await expect(parent.locator('body')).toContainText('Resultados da semana');
  await expect(parent.locator('body')).not.toContainText('⚽');

  // Turned on: only small photos of this week's scorers go with the link; turned off again, they are removed
  await photos.check();
  await dialog.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Resumo da semana publicado ✓')).toBeVisible();
  await expect
    .poll(async () => {
      const page = newsletterFromRestDocument(await read());
      const scorers = (page?.issue?.results || []).flatMap((r) =>
        r.scorers.split(', ').map((s) => s.replace(/ \(\d+\)$/, ''))
      );
      return Object.keys(page?.photos || {}).every((name) => scorers.includes(name));
    })
    .toBe(true);
  await photos.uncheck();
  await dialog.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect.poll(async () => JSON.stringify(await read())).not.toContain('"photos"');

  // Switched off: the link stops working for everyone
  await dialog.getByRole('button', { name: 'Desligar o link' }).click();
  await expect(page.getByText('Link desligado: deixou de funcionar.')).toBeVisible();
  await expect.poll(read, { timeout: 30_000 }).toBeNull();
  await parentContext.close();
  expect(errors, 'erros na página').toEqual([]);
});
