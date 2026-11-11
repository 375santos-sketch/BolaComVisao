import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo } from './helpers';

// Treinos → Época: the season week by week, and the objectives of a month saved with the team (they stay after a reload)
test('Época: semanas da época e objetivos do mês guardados', async ({ page }) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await expect(page.getByText(/Bem-vindo/)).toBeHidden({ timeout: 15_000 });
  const openSeason = async () => {
    await navTo(page, /Planeamento/);
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

// Planeamento: Agenda on the week with what comes next, Treinos with the next training (or a way to create one),
// the session editor writing dates the Portuguese way, and the Época counting only realized trainings.
test('Planeamento: semana, próximo treino, datas em português e minutos realizados', async ({ page }) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await expect(page.getByText(/Bem-vindo/)).toBeHidden({ timeout: 15_000 });
  await navTo(page, /Planeamento/);
  const planning = page.getByRole('navigation', { name: 'Planeamento' });

  // Agenda: the week by default, and the next game on top
  await expect(
    page.getByRole('group', { name: 'Vista da agenda' }).getByRole('button', { name: 'Semana' })
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Próximo' })).toContainText('Próximo jogo');
  await expect(page.getByRole('region', { name: 'Semana' })).toBeVisible();

  // Treinos: the next training opens its plan; with nothing scheduled, the card creates one
  await planning.getByRole('button', { name: 'Treinos' }).click();
  const next = page.getByRole('region', { name: 'Próximo treino' });
  await expect(next).toBeVisible();
  if (await next.getByText('Sem treino agendado').isVisible()) {
    await next.getByRole('button', { name: '+ Criar treino' }).click();
  } else {
    await next.getByRole('button', { name: 'Abrir plano' }).click();
  }

  // The date reads dd/mm/aaaa whatever the browser's language; the value kept is the same (AAAA-MM-DD)
  const date = page.getByLabel('Data do treino');
  const iso = await date.inputValue();
  expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const [y, m, d] = iso.split('-');
  await expect(date.locator('xpath=..')).toContainText(`${d}/${m}/${y}`);
  await expect(page.getByRole('navigation', { name: 'Partes do treino' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar o editor sem guardar' }).click();

  // Época: realized, scheduled and left-open trainings apart, with the rule written down
  await planning.getByRole('button', { name: 'Época' }).click();
  await expect(page.getByText('Treinos realizados')).toBeVisible();
  await expect(page.getByText('Por fechar', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Minutos por semana' })).toBeVisible();
  await page.getByText('Como contamos os minutos').click();
  await expect(page.getByText(/não consegue distinguir um treino/)).toBeVisible();
});
