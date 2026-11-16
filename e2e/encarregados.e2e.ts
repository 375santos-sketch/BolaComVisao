import { expect, test } from '@playwright/test';
import { COACH_A } from './seed';
import { enterPanel, login, navTo } from './helpers';

// E1: the coach invites a guardian; the guardian creates the account with the invitation (consents), and sees ONLY
// «O meu educando», published from the coach's phone. Fictitious data.
test('encarregados: o treinador convida, o encarregado aceita e vê só o seu educando', async ({ page, browser }) => {
  test.setTimeout(180_000);
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

  // VJ6: the coach publishes a Visão de Jogo session of the team (it goes to the family page, to watch at home)
  await page.keyboard.press('Escape');
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  await page.getByRole('dialog', { name: 'Visão de Jogo' }).getByRole('button', { name: '+ Nova sessão' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova sessão' });
  await editor.getByPlaceholder(/Onde receber/).fill('Ver em casa: largura');
  await editor.getByLabel('Link do vídeo do YouTube').fill('https://youtu.be/dQw4w9WgXcQ');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  await editor.getByRole('button', { name: '+ Parar aqui (pausa com pergunta)' }).click();
  const pause = editor.getByRole('form', { name: 'Pausa com pergunta' });
  await pause.getByLabel('Momento da pausa').fill('0:20');
  await pause.getByLabel('Pergunta', { exact: true }).fill('Quem está livre?');
  await pause.getByLabel('Resposta A', { exact: true }).fill('O extremo');
  await pause.getByLabel('Resposta A certa').check();
  await pause.getByLabel('Explicação da resposta A').fill('Ninguém o marca');
  await pause.getByLabel('Resposta B', { exact: true }).fill('O central');
  await pause.getByRole('button', { name: 'Guardar a pausa' }).click();
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();
  await page.waitForTimeout(3000); // saved on this phone before it opens again

  // The coach opens the app again: the page is published from the coach's phone
  await page.reload();
  await enterPanel(page).catch(() => {});
  await expect
    .poll(
      async () => {
        await g.reload();
        await g.waitForTimeout(1500);
        // the page with the session just published (another test may publish its own sessions at the same time)
        return g.getByRole('button', { name: 'Ver em casa: Ver em casa: largura' }).count();
      },
      { timeout: 90_000, intervals: [3000] }
    )
    .toBe(1);
  const child = g.getByRole('region', { name: 'O meu educando: Rui Silva' });
  await expect(child).toContainText('Treinos:');
  await expect(child).not.toContainText('Tomás'); // never another athlete
  // VJ6: watch the session at home — the answers stay on this phone
  await child.getByRole('button', { name: 'Ver em casa: Ver em casa: largura' }).click();
  const home = g.getByRole('dialog', { name: 'Ver em casa' });
  await home.getByRole('button', { name: 'Ir à próxima pergunta' }).click();
  const question = home.getByRole('region', { name: 'Pergunta' });
  await expect(question).toContainText('Quem está livre?');
  await question.getByRole('button', { name: /^A · O extremo/ }).click();
  await question.getByRole('button', { name: 'Mostrar explicação' }).click();
  await expect(question).toContainText('Ninguém o marca');
  await question.getByRole('button', { name: 'Continuar ▶' }).click();
  await home.getByRole('button', { name: 'Terminar' }).click();
  const summary = g.getByRole('dialog', { name: 'Resumo da sessão' });
  await expect(summary).toContainText('Resposta: O extremo · ✓ certo');
  await expect(summary).toContainText('As respostas ficam só neste telemóvel');
  await summary.getByRole('button', { name: 'Terminar' }).click();
  // The coach sees the guardian in the sheet, and takes the access away
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await expect(card).toContainText('Na app desde');
  page.on('dialog', (d) => d.accept());
  await card.getByRole('button', { name: 'Retirar o acesso do encarregado' }).click();
  await g.reload();
  await expect(g.getByRole('region', { name: 'O meu educando: Rui Silva' })).toHaveCount(0);
});
