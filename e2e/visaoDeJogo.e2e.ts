import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo } from './helpers';

// 🎬 Visão de Jogo (VJ1): a session of the team, published, kept as the team's record in the cloud. Fictitious data.
test('visão de jogo: criar uma sessão com vídeo, publicar na equipa e guardar na nuvem', async ({ page }) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  const library = page.getByRole('dialog', { name: 'Visão de Jogo' });
  await expect(library).toContainText('Ainda sem sessões');
  await library.getByRole('button', { name: '+ Nova sessão' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova sessão' });
  await editor.getByPlaceholder(/Onde receber/).fill('Onde receber? (receção orientada)');
  await editor.getByLabel('Juntar competência').selectOption('rececao_orientada');
  await editor.getByLabel('Link do vídeo do YouTube').fill('não é um link');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  await expect(editor).toContainText('Este link não é de um vídeo do YouTube.');
  await editor.getByLabel('Link do vídeo do YouTube').fill('https://youtu.be/dQw4w9WgXcQ');
  await editor.getByLabel('O que é o vídeo').fill('jogo profissional');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();
  const list = page.getByRole('dialog', { name: 'Visão de Jogo' }).getByRole('list', { name: 'Sessões' });
  await expect(list).toContainText('Onde receber? (receção orientada)');
  await expect(list).toContainText('Publicada');
  await expect(list).toContainText('Receção orientada');
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('"challenge"') && raw.includes('dQw4w9WgXcQ');
      },
      { timeout: 30_000, message: 'a sessão no registo da equipa' }
    )
    .toBe(true);
});
