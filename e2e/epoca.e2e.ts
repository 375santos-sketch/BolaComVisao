import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo } from './helpers';

// Treinos → Época: the season week by week, and the objectives of a month saved with the team (they stay after a reload)
test('Época: semanas da época e objetivos do mês guardados', async ({ page }) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await expect(page.getByText(/Bem-vindo/)).toBeHidden({ timeout: 15_000 });
  const openSeason = async () => {
    await navTo(page, /Agenda/);
    await page
      .getByRole('button', { name: /^Treinos/ })
      .first()
      .click();
    await page.getByRole('button', { name: /^Época/ }).click();
  };
  await openSeason();
  const weeks = page.getByRole('list', { name: 'Semanas da época' });
  await expect(weeks).toContainText('Tramagal SU');
  await expect(weeks).toContainText('Esta semana');

  await page.getByRole('button', { name: '+ Objetivos do mês' }).first().click();
  await page.getByLabel(/Objetivos de Outubro/).fill('- Saída de bola a 3\nPressão logo após a perda');
  await page.getByRole('button', { name: 'Guardar objetivos' }).click();
  const objectives = page.getByRole('list', { name: 'Objetivos de Outubro 2026' });
  await expect(objectives).toContainText('Saída de bola a 3');
  await expect(objectives).toContainText('Pressão logo após a perda');

  // Saved with the team in the club's record in the cloud
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        return JSON.stringify(await res.json()).includes('Saída de bola a 3');
      },
      { timeout: 30_000, message: 'objetivos do mês na nuvem' }
    )
    .toBe(true);
});
