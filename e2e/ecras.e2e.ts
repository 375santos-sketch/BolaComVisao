import { test, expect, type Page } from '@playwright/test';
import { COACH_A, COACH_B } from './seed';
import {
  cloudRecords,
  enterPanel,
  login,
  navTo,
  newCoachPage,
  openMore,
  resetToLegacyFormat,
  syncBadge,
  watchPageErrors
} from './helpers';

// One club, used in order: each test builds on the data left by the previous ones.
test.describe.configure({ mode: 'serial' });

let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = watchPageErrors(page);
});
test.afterEach(() => {
  expect(errors, 'erros na página').toEqual([]);
});

const addPlayer = async (page: Page, name: string, number: string) => {
  await page.getByRole('button', { name: /➕ Novo/ }).click();
  await page.getByPlaceholder('Ex: Cristiano Ronaldo').fill(name);
  await page.getByPlaceholder('Ex: 7', { exact: true }).fill(number);
  await page.locator('#player-form button[type=submit]').click();
};

const signedIn = async (page: Page) => {
  await login(page, COACH_A);
  await enterPanel(page);
};

test('entrar: escolha da equipa e painel inicial', async ({ page }) => {
  await login(page, COACH_A);
  await expect(page.getByText('DRAGÕES')).toBeVisible();
  await expect(page.getByText('Sub-11').first()).toBeVisible();
  await enterPanel(page);
  await expect(page.getByText('VISÃO DO TREINADOR')).toBeVisible();
  await expect(page.getByText('Treinador A', { exact: true })).toBeVisible();
});

test('primeira utilização: o clube passa para registos separados e fica guardado', async ({ page }) => {
  await signedIn(page);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  await expect
    .poll(async () => (await cloudRecords()).has('club'), { timeout: 30_000, message: 'registo club na nuvem' })
    .toBe(true);
  const records = await cloudRecords();
  expect(records.get('player__sub11__p1')?.name).toBe('Rui Silva');
  expect(records.has('match__sub11__m2')).toBe(true);
});

test('reabrir a app com a sessão lembrada também passa o clube para registos separados', async ({ page }) => {
  await signedIn(page);
  await expect.poll(async () => (await cloudRecords()).has('club'), { timeout: 30_000 }).toBe(true);

  // Club still in the old format, coach already signed in on this device (what happened on 21/10/2026).
  await page.goto('about:blank');
  await resetToLegacyFormat();
  expect((await cloudRecords()).size).toBe(0);
  await page.goto('/');
  await enterPanel(page);

  await expect
    .poll(async () => (await cloudRecords()).has('club'), { timeout: 30_000, message: 'registo club na nuvem' })
    .toBe(true);
  expect((await cloudRecords()).get('player__sub11__p1')?.name).toBe('Rui Silva');
});

test('todos os ecrãs principais abrem', async ({ page }) => {
  await signedIn(page);

  await navTo(page, /equipa/i);
  await expect(page.getByText('PLANTEL DE JOGADORES')).toBeVisible();
  await expect(page.getByText('RUI SILVA')).toBeVisible();

  await navTo(page, /agenda/i);
  await expect(page.getByText('AGENDA & CALENDÁRIO ANUAL')).toBeVisible();

  await navTo(page, /performance/i);
  await expect(page.getByText('PLANO ESTRATÉGICO & MODELO DE JOGO')).toBeVisible();

  // Performance tabs: Estatísticas (with playing time) is one tap away
  const performanceTabs = page.getByRole('navigation', { name: 'Performance' });
  await performanceTabs.getByRole('button', { name: /Estatísticas/ }).click();
  await expect(page.getByText('Minutos de jogo', { exact: false })).toBeVisible();
  await performanceTabs.getByRole('button', { name: /Adversário/ }).click();
  await expect(performanceTabs).toBeVisible();
  await performanceTabs.getByRole('button', { name: /Pré-jogo/ }).click();
  await expect(page.getByText('PLANO ESTRATÉGICO & MODELO DE JOGO')).toBeVisible();

  await navTo(page, /início/i);
  await expect(performanceTabs).toBeHidden();
  await page.getByText('Eficácia de Vitórias').click();
  await expect(page.getByText('Minutos de jogo', { exact: false })).toBeVisible();
  await expect(performanceTabs.getByRole('button', { name: /Estatísticas/ })).toHaveAttribute('aria-current', 'page');
  await expect(performanceTabs.getByRole('button', { name: /Estatísticas/ })).toBeInViewport();

  for (const [item, heading] of [
    [/Chat da Equipa Técnica/, /CHAT/i],
    [/Análise dos Jogos/, /ANÁLISE/i],
    [/Biblioteca de Exercícios/, /BIBLIOTECA/i],
    [/Relatórios da Direção/, /RELATÓRIO/i]
  ] as const) {
    await openMore(page, item);
    await expect(page.getByText(heading).first()).toBeVisible();
  }
});

test('resultados: ficha do jogo e partilha com os pais', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆' }).first().click();
  await expect(page.getByText('Esparteiros')).toBeVisible();
  await page.getByText('Tramagal SU').click();
  await expect(page.getByText("12'⚽ 9 - Rui Silva (ast. 7 - Tomás Gonçalves)")).toBeVisible();
  await page.getByRole('button', { name: /Partilhar com os pais/i }).click();
  const modal = page.getByRole('dialog', { name: /Partilhar com os pais/i });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Tramagal SU');
  await expect(modal).toContainText('2');
});

test('plantel: novo atleta fica guardado na nuvem e o outro treinador vê-o', async ({ page, browser }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await addPlayer(page, 'Gonçalo Teste', '23');
  await expect(page.getByRole('heading', { name: 'Gonçalo Teste' })).toBeVisible();

  await expect
    .poll(async () => [...(await cloudRecords()).values()].some((r) => r.name === 'Gonçalo Teste'), {
      timeout: 30_000,
      message: 'atleta na nuvem'
    })
    .toBe(true);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });

  const other = await browser.newContext();
  const coachB = await newCoachPage(other, COACH_B);
  await navTo(coachB, /equipa/i);
  await expect(coachB.getByRole('heading', { name: 'Gonçalo Teste' })).toBeVisible();

  // After reopening the app (session restored from this device), changes from the other coach still arrive live.
  await page.reload();
  await enterPanel(page);
  await navTo(page, /equipa/i);
  await addPlayer(coachB, 'Duarte Teste', '24');
  await expect(page.getByRole('heading', { name: 'Duarte Teste' })).toBeVisible({ timeout: 30_000 });
  await other.close();
});

test('modo jogo: abrir o jogo de hoje e registar um golo', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page
    .getByRole('button', { name: /Iniciar Jogo/ })
    .first()
    .click();
  await expect(page.getByText('JOGO EM CURSO')).toBeVisible();
  await expect(page.getByText('Abrantes', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /GOLO SOFRIDO/i }).click();
  await expect(page.getByText('REGISTAR GOLO SOFRIDO')).toBeVisible();
  await page.getByPlaceholder('ex: 34').fill('8');
  await page.getByRole('button', { name: 'Confirmar Golo Sofrido' }).click();
  await expect(page.getByText('REGISTAR GOLO SOFRIDO')).toBeHidden();
  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()].some(
          (r) => r.kind === 'match' && r.opponent === 'Abrantes' && r.goals === 1
        ),
      { timeout: 30_000, message: 'golo do jogo em direto na nuvem' }
    )
    .toBe(true);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
});

test('terminar sessão apaga os dados do clube neste aparelho', async ({ page }) => {
  await signedIn(page);
  const storedOnDevice = () =>
    page.evaluate(async () => {
      const local = Object.keys(localStorage)
        .map((k) => `${k}=${localStorage.getItem(k)}`)
        .join('\n');
      const dbs = await indexedDB.databases();
      const idb: string[] = [];
      for (const { name } of dbs) {
        if (!name || name.startsWith('firebase')) continue;
        const db = await new Promise<IDBDatabase>((ok, ko) => {
          const req = indexedDB.open(name);
          req.onsuccess = () => ok(req.result);
          req.onerror = () => ko(req.error);
        });
        for (const store of Array.from(db.objectStoreNames)) {
          const all = await new Promise<unknown[]>((ok) => {
            const req = db.transaction(store).objectStore(store).getAll();
            req.onsuccess = () => ok(req.result);
            req.onerror = () => ok([]);
          });
          idb.push(JSON.stringify(all));
        }
        db.close();
      }
      return local + '\n' + idb.join('\n');
    });
  await expect.poll(storedOnDevice).toContain('Rui Silva');

  await openMore(page, /Terminar Sessão/);
  await expect(page.getByText('ENTRAR NA PLATAFORMA')).toBeVisible();
  await expect.poll(storedOnDevice).not.toContain('Rui Silva');

  await page.reload();
  await expect(page.getByText('ENTRAR NA PLATAFORMA')).toBeVisible();
});
