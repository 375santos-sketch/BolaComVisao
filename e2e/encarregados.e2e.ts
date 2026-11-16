import { expect, test } from '@playwright/test';
import { COACH_A } from './seed';
import { enterPanel, login, navTo } from './helpers';

// E1: the coach invites a guardian; the guardian creates the account with the invitation (consents), and sees ONLY
// «O meu educando», published from the coach's phone. Fictitious data.
test('encarregados: o treinador convida, o encarregado aceita e vê só o seu educando', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      (window as unknown as { __wa: string }).__wa = u;
      return null;
    };
  });
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  const card = page.getByLabel('Encarregados de educação');
  await expect(card).toContainText('Ainda sem encarregados na app');
  await card.getByRole('button', { name: '+ Convidar encarregado' }).click();
  await expect(card).toContainText('à espera');
  const wa = await page.evaluate(() => (window as unknown as { __wa: string }).__wa);
  const link = decodeURIComponent(wa).match(/\/encarregado\?c=([A-Za-z0-9]+)/);
  expect(link).toBeTruthy();
  const code = link![1];

  // The guardian, on their own phone
  const g = await (await browser.newContext()).newPage();
  await g.goto(`/encarregado?c=${code}`);
  await g.getByLabel('Email').fill(`mae.${code.slice(0, 6).toLowerCase()}@familia.pt`);
  await g.getByLabel(/Palavra-passe/).fill('segredo123');
  await g.getByRole('button', { name: 'Continuar' }).click();
  const accept = g.getByRole('form', { name: 'Aceitar o convite' });
  await expect(accept).toContainText('Rui Silva');
  await accept.getByLabel('O seu nome').fill('Mãe Exemplo');
  await expect(accept.getByRole('button', { name: 'Aceitar o convite' })).toBeDisabled(); // data consent first
  await accept.getByLabel(/Li e aceito/).check();
  await accept.getByRole('button', { name: 'Aceitar o convite' }).click();
  await expect(g.getByText('A página aparece assim que o treinador abrir a app')).toBeVisible();

  // The coach opens the app again: the page is published from the coach's phone
  await page.reload();
  await enterPanel(page).catch(() => {});
  await expect
    .poll(
      async () => {
        await g.reload();
        await g.waitForTimeout(1500);
        return g.getByRole('region', { name: 'O meu educando: Rui Silva' }).getByText('Esta época').count();
      },
      { timeout: 45_000, intervals: [3000] }
    )
    .toBe(1);
  const child = g.getByRole('region', { name: 'O meu educando: Rui Silva' });
  await expect(child).toContainText('Treinos:');
  await expect(child).not.toContainText('Tomás'); // never another athlete
  // The coach sees the guardian in the sheet, and takes the access away
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await expect(card).toContainText('Na app desde');
  page.on('dialog', (d) => d.accept());
  await card.getByRole('button', { name: 'Retirar o acesso do encarregado' }).click();
  await g.reload();
  await expect(g.getByRole('region', { name: 'O meu educando: Rui Silva' })).toHaveCount(0);
});
