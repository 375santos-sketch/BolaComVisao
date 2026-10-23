import { test, expect, type Page } from '@playwright/test';
import { COACH_A, COACH_B, FIRESTORE, owner, PASSWORD } from './seed';
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
  await expect(page.getByText('Treinador A', { exact: true })).toBeVisible();

  // Simple home: shortcuts, what needs attention, the season in one line, the next 7 days.
  const notices = page.getByRole('region', { name: 'Avisos' });
  await expect(notices).toContainText('Convocatória por fechar: vs Abrantes');
  // Share over all the games' minutes: athletes never called up count too (0%)
  await expect(notices).toContainText(
    'Precisam de minutos: Gabriel Sousa (0%), Henrique Alves (0%), Lucas Pereira (0%) e mais 4'
  );
  await expect(page.getByRole('region', { name: 'Resumo da época' })).toContainText('2 jogos · 1V 1E 0D · golos 2-1');
  await expect(page.getByText('VISÃO DO TREINADOR')).toHaveCount(0);

  // "Treino de hoje" opens today's attendance straight away (closed without saving).
  await page
    .getByRole('navigation', { name: 'Atalhos' })
    .getByRole('button', { name: /Treino de hoje/ })
    .click();
  const today = page.getByRole('dialog', { name: 'Treino de hoje' });
  await expect(today).toBeVisible();
  await today.getByRole('button', { name: 'Fechar' }).click();
  await expect(today).toBeHidden();
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
  await expect(page.getByRole('region', { name: 'Plano' })).toBeVisible();

  // Performance tabs: Estatísticas (with playing time) is one tap away
  const performanceTabs = page.getByRole('navigation', { name: 'Performance' });
  await performanceTabs.getByRole('button', { name: /Estatísticas/ }).click();
  await expect(page.getByText('Minutos de jogo', { exact: false })).toBeVisible();
  // Games without the 7 first-half starters are flagged (their minutes come out short) and can be fixed here
  const missing = page.getByTestId('missing-starters');
  await expect(missing).toContainText('Esparteiros');
  await missing.locator('div', { hasText: 'Esparteiros' }).getByRole('button', { name: 'Indicar titulares' }).click();
  for (const name of ['Duarte Matos', 'Martim Costa', 'Lucas Pereira', 'Gabriel Sousa']) {
    await page.getByText(new RegExp(`^\\d+ - ${name}$`)).click();
  }
  await page.getByRole('button', { name: 'Confirmar 7 Titulares' }).click();
  await expect(missing).not.toContainText('Esparteiros');
  await expect(missing).toContainText('Tramagal');
  await expect(performanceTabs.getByRole('button', { name: /Adversário/ })).toHaveCount(0); // scouting removed
  await performanceTabs.getByRole('button', { name: /Pré-jogo/ }).click();
  await expect(page.getByRole('region', { name: 'Plano' })).toBeVisible();

  await navTo(page, /início/i);
  await expect(performanceTabs).toBeHidden();
  await page
    .getByRole('region', { name: 'Resumo da época' })
    .getByRole('button', { name: /Ver estatísticas/ })
    .click();
  await expect(page.getByText('Minutos de jogo', { exact: false })).toBeVisible();
  await expect(performanceTabs.getByRole('button', { name: /Estatísticas/ })).toHaveAttribute('aria-current', 'page');
  await expect(performanceTabs.getByRole('button', { name: /Estatísticas/ })).toBeInViewport();

  await openMore(page, /Análise dos Jogos/);
  await expect(page.getByText(/ANÁLISE/i).first()).toBeVisible();

  // Simplified "Mais" menu: these were removed (21/10/2026)
  await navTo(page, /mais/i);
  for (const removed of [
    /Módulos & Funcionalidades/,
    /Chat da Equipa Técnica/,
    /Biblioteca de Exercícios/,
    /Relatórios da Direção/,
    /Registo de Auditoria/,
    /Sincronização & Nuvem/,
    /Alertas & Notificações/
  ]) {
    await expect(page.getByRole('button', { name: removed })).toHaveCount(0);
  }
  for (const kept of [/Definições do Clube/, /Base de Dados & Backup/, /Trocar de Equipa/]) {
    await expect(page.getByRole('button', { name: kept })).toBeVisible();
  }
  await page.keyboard.press('Escape');
});

test('tocar no indicador de gravação mostra o estado', async ({ page }) => {
  await signedIn(page);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  await page.waitForTimeout(4000); // let the welcome message (same toast area) go away
  await syncBadge(page).click();
  await expect(page.getByText(/Tudo guardado na nuvem/).last()).toBeVisible();
});

test('pré-jogo: abrir não grava nada; plano guardado no jogo da Agenda, PDF e plano pronto', async ({ page }) => {
  const scheduleDoc = async () => {
    const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/schedule__sub11__s1`, { headers: owner });
    return ((await res.json()) as { fields?: any }).fields?.data?.mapValue?.fields || {};
  };
  await signedIn(page);
  await navTo(page, /performance/i);
  const game = page.getByRole('region', { name: 'Jogo' });
  await expect(game).toContainText('vs Abrantes');
  await page.waitForTimeout(5000); // longer than the 3.5 s save delay
  expect((await scheduleDoc()).preMatchPlan).toBeUndefined();
  expect([...(await cloudRecords()).values()].filter((r) => r.kind === 'scouting')).toEqual([]);

  const plan = page.getByRole('region', { name: 'Plano' });
  await plan.getByPlaceholder('ex.: 2-3-1').fill('2-3-1');
  await plan.getByLabel('Objetivo 1').fill('Ganhar as segundas bolas');
  await plan.getByLabel(/Sem bola/).fill('Pressionar a saída de bola');
  await plan.getByLabel(/Palavra de ordem/).fill('Juntos até ao fim!');
  const download = page.waitForEvent('download');
  await plan.getByRole('button', { name: /PDF/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^PreJogo_Abrantes_\d{4}-\d{2}-\d{2}\.pdf$/);
  await plan.getByRole('button', { name: /Plano pronto/ }).click();
  await expect(game).toContainText('✓ Plano pronto');

  await expect
    .poll(
      async () => {
        const d = await scheduleDoc();
        const p = d.preMatchPlan?.mapValue?.fields;
        return [d.preMatchFinalized?.booleanValue, p?.system?.stringValue, p?.motto?.stringValue];
      },
      { timeout: 30_000 }
    )
    .toEqual([true, '2-3-1', 'Juntos até ao fim!']);
});

test('semana: jogo novo na Agenda, convocatória com minutos, envio por WhatsApp', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '⚽ ＋ Jogo' }).first().click();
  await page.getByPlaceholder('Nome da equipa adversária').fill('Constância');
  await page.locator('input[type=date]').first().fill('2026-12-05');
  await page.locator('input[type=time]').first().fill('11:00');
  await page.getByRole('button', { name: 'Fora', exact: true }).click();
  // The type of the last game (league) is suggested.
  await expect(page.locator('select').filter({ has: page.locator('option[value=campeonato]') })).toHaveValue(
    'campeonato'
  );
  await page.getByPlaceholder('Ex: Jornada 4 ou Quartos de Final').fill('Jornada 6');
  await page.getByRole('button', { name: /Guardar no Calendário/ }).click();

  await page.getByRole('button', { name: /Lista/i }).click();
  await expect(page.getByText('🏆 Jornada 6')).toBeVisible();
  // The call-up of the game that was tapped (not the first game of the list).
  await page.getByTitle('Abrir Convocatória').nth(1).click();
  await expect(page.getByText(/Dragões vs Constância/)).toBeVisible();

  // Minutes of the season help choose: who played little is flagged.
  const need = page.getByRole('note', { name: 'Precisam de minutos' });
  await expect(need).toContainText('Martim Costa 0%');
  await expect(need).toContainText('Duarte Matos 10%'); // 10' of the 2 games' 100'
  await expect(need).toContainText('Gabriel Sousa 0% · fora 2/3');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  for (const name of ['Duarte Matos', 'Martim Costa', 'Rui Silva']) await page.getByText(name, { exact: true }).click();
  await page
    .getByRole('button', { name: /Finalizar Convocatória/ })
    .last()
    .click();
  await expect(page.getByText('3 convocados')).toBeVisible();

  await page.getByRole('button', { name: /Enviar por WhatsApp/ }).click();
  const share = page.getByRole('dialog', { name: 'Enviar convocatória' });
  const message = share.getByLabel('Mensagem');
  await expect(message).toHaveValue(/\*Constância vs Dragões\*/);
  await expect(message).toHaveValue(/Campeonato – Jornada 6/);
  await expect(message).toHaveValue(/Convocados \(3\)/);
  await expect(message).toHaveValue(/• 9 – Rui Silva/);
  await expect(message).not.toHaveValue(/Concentração/);
  await share.getByRole('button', { name: 'Fechar' }).click();

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const body = (await res.json()) as { documents?: Array<{ fields: Record<string, any> }> };
        const game = (body.documents || [])
          .map((d) => d.fields.data?.mapValue?.fields)
          .find((f) => f?.opponent?.stringValue === 'Constância');
        return game
          ? [game.phase?.stringValue, game.callup?.arrayValue?.values?.length, game.callupFinalized?.booleanValue]
          : null;
      },
      { timeout: 30_000, message: 'convocatória na nuvem' }
    )
    .toEqual(['Jornada 6', 3, true]);
});

test('análise: remates e eficácia de finalização', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /performance/i);
  await page
    .getByRole('navigation', { name: 'Performance' })
    .getByRole('button', { name: /Análise/ })
    .click();
  const shots = page.getByRole('region', { name: 'Remates' });
  await expect(shots).toBeVisible();
  await expect(shots).toContainText('1 jogo com remates registados');
  await expect(shots).toContainText('15 dentro · 6 fora da área');
  await expect(shots).toContainText('10% dos remates deram golo (2 em 21)'); // the Esparteiros game has no shots: left out
});

test('relatório do adversário pós-jogo: números do jogo, notas guardadas na nuvem e PDF', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆 Resultados' }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Relatório do adversário/ }).click();
  const report = page.getByRole('dialog', { name: 'Relatório do adversário' });
  await expect(report).toBeVisible();
  const numbers = report.getByRole('region', { name: 'Números do jogo' });
  await expect(numbers).toContainText('2-1'); // our goals - theirs
  await expect(numbers).toContainText('5'); // their shots (3 + 2)
  await expect(numbers).toContainText("30'"); // minute of their goal

  await report.getByPlaceholder('ex.: 2-3-1').fill('3-2-1');
  await report.getByLabel(/Pontos fracos/).fill('Lentos a recuperar\nSaída de bola fraca');
  await report.getByLabel(/Para o próximo jogo/).fill('Pressionar a saída de bola');
  const download = page.waitForEvent('download');
  await report.getByRole('button', { name: 'PDF' }).click();
  expect((await download).suggestedFilename()).toBe('Relatorio_Adversario_Tramagal_SU_2026-10-17.pdf');
  await report.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: /Relatório do adversário ✓/ })).toBeVisible();

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/match__sub11__m2`, { headers: owner });
        const doc = (await res.json()) as { fields?: any };
        const r = doc.fields?.data?.mapValue?.fields?.opponentReport?.mapValue?.fields;
        return r ? [r.system?.stringValue, r.nextTime?.stringValue, r.weaknesses?.arrayValue?.values?.length] : null;
      },
      { timeout: 30_000 }
    )
    .toEqual(['3-2-1', 'Pressionar a saída de bola', 2]);
});

test('resultados: ficha do jogo e partilha com os pais', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆 Resultados' }).first().click();
  await expect(page.getByText('Esparteiros')).toBeVisible();
  // Away win 2-1 reads like a scoreboard, home team first: Tramagal SU (Fora) 1 – 2
  await expect(page.locator('.match-item', { hasText: 'Tramagal SU' }).locator('.match-score')).toHaveText('1 – 2');
  await page.getByText('Tramagal SU').click();
  await expect(page.getByText("12'⚽ 9 - Rui Silva (ast. 7 - Tomás Gonçalves)")).toBeVisible();
  await page.getByRole('button', { name: /Partilhar com os pais/i }).click();
  const modal = page.getByRole('dialog', { name: /Partilhar com os pais/i });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Tramagal SU');
  await expect(modal).toContainText('2');
});

test('resultados: editar um jogo terminado num só ecrã (golo novo) fica guardado', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆 Resultados' }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Editar jogo/ }).click();
  const editor = page.getByRole('dialog', { name: 'Editar jogo' });
  await expect(editor.getByLabel('Resultado')).toHaveText('Tramagal SU 1 – 2 Nós');

  await editor.getByRole('button', { name: '+ Golo nosso' }).click();
  const goal = editor.getByLabel('Golo 4');
  await goal.getByLabel('Parte').selectOption('2');
  await goal.getByLabel('Minuto do golo').fill('45');
  await goal.getByLabel('Marcador').selectOption({ label: '7 - Tomás Gonçalves' });
  await goal.getByLabel('Assistência').selectOption({ label: '9 - Rui Silva' });
  await goal.getByLabel('Origem').selectOption('Canto');
  await expect(editor.getByLabel('Resultado')).toHaveText('Tramagal SU 1 – 3 Nós');
  await editor.getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(editor).toBeHidden();

  await expect(page.locator('.match-item', { hasText: 'Tramagal SU' }).locator('.match-score')).toHaveText('1 – 3');
  await expect(page.getByText(/45'.*7 - Tomás Gonçalves/).first()).toBeVisible();
  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()].find((r) => r.kind === 'match' && r.opponent === 'Tramagal SU')?.goals,
      { timeout: 30_000 }
    )
    .toBe(4);
});

test('resultados: corrigir o local de um jogo terminado (casa/fora) fica guardado', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆 Resultados' }).first().click();
  await page.getByText('Tramagal SU').click();
  const place = page.getByRole('group', { name: 'Local do jogo' });
  await expect(place.getByRole('button', { name: 'Fora' })).toHaveAttribute('aria-pressed', 'true');
  await place.getByRole('button', { name: 'Casa' }).click();
  await expect(place.getByRole('button', { name: 'Casa' })).toHaveAttribute('aria-pressed', 'true');

  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()].find((r) => r.kind === 'match' && r.opponent === 'Tramagal SU')?.location,
      { timeout: 30_000 }
    )
    .toBe('casa');

  await page.reload();
  await enterPanel(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '🏆 Resultados' }).first().click();
  await page.getByText('Tramagal SU').click();
  await expect(
    page.getByRole('group', { name: 'Local do jogo' }).getByRole('button', { name: 'Casa' })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('treinos: treino de hoje com faltas e motivo, repetir, faltas por atleta', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: '⚡ Treinos' }).first().click();
  // Opens on every training (no empty "Agendados" filter), newest first.
  await expect(page.getByText('TREINO 2')).toBeVisible();

  await page.getByRole('button', { name: /Treino de hoje/ }).click();
  const today = page.getByRole('dialog', { name: 'Treino de hoje' });
  await expect(today).toContainText('Nº 3');
  await expect(today.getByLabel('Hora')).toHaveValue('18:15'); // the usual time
  await today.getByRole('button', { name: 'Rui Silva: presente' }).click();
  await today.getByLabel('Motivo da falta de Rui Silva').selectOption('doente');
  await today.getByRole('button', { name: 'Guardar treino' }).click();
  await expect(page.getByText(/Treino de hoje guardado: 1 falta/)).toBeVisible();

  const todayISO = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const body = (await res.json()) as { documents?: Array<{ fields: Record<string, any> }> };
        const tr = (body.documents || [])
          .map((d) => d.fields.data?.mapValue?.fields)
          .find((f) => f?.date?.stringValue === todayISO && f?.trainingNumber);
        return tr
          ? [
              tr.completed?.booleanValue,
              tr.absences?.arrayValue?.values?.map((v: any) => v.stringValue),
              tr.absenceReasons?.mapValue?.fields?.p1?.stringValue
            ]
          : null;
      },
      { timeout: 30_000, message: 'treino de hoje na nuvem' }
    )
    .toEqual([true, ['p1'], 'doente']);

  // Opening it again shows today's training as saved.
  await page.getByRole('button', { name: /Treino de hoje/ }).click();
  await expect(today.getByRole('button', { name: 'Rui Silva: faltou' })).toBeVisible();
  await today.getByRole('button', { name: 'Fechar' }).click();

  // Repeat today's training next week: planned, shown first (what's coming).
  await page
    .getByRole('button', { name: /Repetir/ })
    .first()
    .click();
  await expect(page.getByText(/Treino repetido para/)).toBeVisible();
  await expect(page.getByText('TREINO 4')).toBeVisible();

  // Absences per athlete, with the reason.
  await page.getByRole('button', { name: /Stats/i }).first().click();
  await page.getByRole('button', { name: /Rui Silva/ }).click();
  await expect(page.getByRole('list', { name: 'Faltas de Rui Silva' })).toContainText('Doente');
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
});

test('ficha do atleta: época, últimos jogos, faltas com motivo e PDF', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  const season = page.getByRole('region', { name: 'Época do atleta' });
  await expect(season).toContainText('2/2'); // played / called up
  await expect(season).toContainText("100'");
  await expect(season).toContainText('Treinos 2/3'); // missed today's training (treinos test)
  await expect(season.getByRole('list', { name: 'Últimos jogos' })).toContainText('Tramagal SU');
  await expect(season.getByRole('list', { name: 'Faltas aos treinos' })).toContainText('Doente');
  // Evolution: minutes game by game (tap a bar for the details) and training attendance per month
  const chart = season.getByRole('img', { name: 'Minutos jogados em cada jogo' });
  await expect(chart.getByRole('button')).toHaveCount(2);
  await chart.getByRole('button', { name: /Tramagal SU/ }).dispatchEvent('click');
  await expect(season.getByText(/Tramagal SU .* · 50' de 50' · titular · 2 golo\(s\)/)).toBeVisible();
  await expect(season.getByRole('list', { name: 'Presença nos treinos por mês' })).toContainText('out');
  await season.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/ficha.png` : undefined });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /PDF Ficha do Atleta/ }).click();
  expect((await download).suggestedFilename()).toBe('Ficha_Atleta_Rui_Silva.pdf');
});

test('painel: equipa e atleta por época, jogo, confronto e período; exportar para Power BI', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /performance/i);
  await page
    .getByRole('navigation', { name: 'Performance' })
    .getByRole('button', { name: /Estatísticas/ })
    .click();
  await page.getByRole('button', { name: /Abrir painel/ }).click();
  const panel = page.getByRole('dialog', { name: 'Painel de estatísticas' });
  const team = panel.getByRole('region', { name: 'Números da equipa' });
  await expect(team).toContainText('1-1-0'); // V-E-D in the season
  await expect(panel.getByRole('img', { name: 'Golos por jogo' })).toBeVisible();

  // Head-to-head: only the games against one opponent.
  await panel.getByRole('tab', { name: 'Confronto' }).click();
  await panel.getByLabel('Adversário').selectOption('Tramagal SU');
  await expect(panel.getByRole('table', { name: 'Jogos' })).toContainText('Tramagal SU');
  await expect(panel.getByRole('table', { name: 'Jogos' })).not.toContainText('Esparteiros');

  // One athlete, any period.
  await panel.getByLabel('Equipa ou atleta').selectOption('p1');
  await panel.getByRole('tab', { name: 'Período' }).click();
  await panel.getByLabel('De').fill('2026-10-15');
  const athlete = panel.getByRole('region', { name: 'Números do atleta' });
  await expect(athlete).toContainText('1/1'); // only the Tramagal game
  await expect(panel.getByRole('table', { name: 'Jogos' })).toContainText('Tramagal SU');

  const pdf = page.waitForEvent('download');
  await panel.getByRole('button', { name: /PDF destes jogos/ }).click();
  expect((await pdf).suggestedFilename()).toMatch(/^Painel_Jogos_Drag.*\.pdf$/);

  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: /Excel com gráficos/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^Painel_Jogos_Drag.*\.xlsx$/);
  await panel.getByRole('button', { name: 'Fechar' }).click();

  // From the athlete's sheet the panel opens on the athlete.
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Tomás Gonçalves' }).click();
  await page.getByRole('button', { name: /Painel do atleta/ }).click();
  await expect(panel).toContainText('Painel · Tomás Gonçalves');
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

test('dia de jogo: convocatória, titulares, relógio, golos, substituição, cartão, intervalo, fim e minutos', async ({
  page
}) => {
  test.setTimeout(150_000);
  // The match clock reads the current time: move it forward instead of waiting. Only the date moves, timers stay
  // real (fake timers firing all at once break the Firestore emulator connection).
  await page.addInitScript(() => {
    const RealDate = Date;
    let offset = 0;
    (window as unknown as { __advanceTime: (ms: number) => void }).__advanceTime = (ms) => (offset += ms);
    class ShiftedDate extends RealDate {
      // new Date() is shifted; new Date(value) and new Date(y, m, d...) are passed through unchanged.
      constructor(...args: any[]) {
        super(...((args.length ? args : [RealDate.now() + offset]) as [number]));
      }
      static now() {
        return RealDate.now() + offset;
      }
    }
    window.Date = ShiftedDate as DateConstructor;
  });
  const advance = async (time: string) => {
    const [min, sec] = time.split(':').map(Number);
    await page.evaluate(
      (ms) => (window as unknown as { __advanceTime: (ms: number) => void }).__advanceTime(ms),
      (min * 60 + sec) * 1000
    );
    await page.waitForTimeout(1500); // the clock on screen refreshes every second
  };
  page.on('console', (m) => {
    if (m.type() !== 'debug') console.log('CONSOLE', m.type(), m.text().slice(0, 300));
  });
  page.on('requestfailed', (r) => console.log('REQFAIL', r.url().slice(0, 150), r.failure()?.errorText));
  page.on('response', async (r) => {
    if (r.status() >= 400) console.log('RESP', r.status(), r.url().slice(0, 150));
  });

  await signedIn(page);
  await navTo(page, /agenda/i);
  await page
    .getByRole('button', { name: /Iniciar Jogo/ })
    .first()
    .click();
  await expect(page.getByText('JOGO EM CURSO')).toBeVisible();

  // The 10 players called up in the Agenda arrive in the live match.
  await page.getByRole('button', { name: /Selecionar 7 Titulares/i }).click();
  await expect(page.getByText(/Só há \d+ jogadores convocados/)).toBeHidden();
  await expect(page.getByText('Não convocado')).toHaveCount(0);
  await page.getByRole('button', { name: /1\.ºs 7/ }).click(); // numbers 1 to 7
  await page.getByRole('button', { name: /Confirmar 7 Titulares/i }).click();
  await page.getByRole('button', { name: /Iniciar 1.ª parte/i }).click();

  // 11': goal by a player on the pitch, with an assist.
  await advance('10:05');
  await page.getByRole('button', { name: /GOLO MARCADO/i }).click();
  await expect(page.getByPlaceholder('ex: 23 ou 45+2')).toHaveValue('11');
  await page.locator('select').nth(0).selectOption('p2'); // 7 - Tomás Gonçalves
  await page.locator('select').nth(1).selectOption('p6'); // 3 - Lucas Pereira
  await page.getByRole('button', { name: 'Confirmar Golo' }).click();

  // 16': substitution (on-pitch and bench players are listed apart) and a yellow card.
  await advance('05:00');
  await page.getByRole('button', { name: /Substituição/ }).click();
  const [out, into] = [page.locator('select').nth(0), page.locator('select').nth(1)];
  await expect(out.locator('optgroup[label="Em campo"] option')).toHaveCount(7);
  await expect(into.locator('optgroup').first()).toHaveAttribute('label', 'No banco');
  await expect(into.locator('option', { hasText: 'Teste' })).toHaveCount(0); // added to the squad, not called up
  await out.selectOption('p4'); // 1 - Duarte Matos
  await into.selectOption('p10'); // 8 - Henrique Alves
  await page.getByRole('button', { name: 'Confirmar Substituição' }).click();
  await page.getByRole('button', { name: /Cartão/ }).click();
  await page.locator('select').first().selectOption('p5'); // 2 - Martim Costa
  await page.getByRole('button', { name: 'Confirmar Cartão' }).click();

  // 26': goal conceded, then half time after 25 minutes.
  await advance('10:00');
  await page.getByRole('button', { name: /GOLO SOFRIDO/i }).click();
  await page.getByRole('button', { name: 'Confirmar Golo Sofrido' }).click();
  await page.getByRole('button', { name: /^⏸️ Intervalo$/ }).click();
  await advance('01:00'); // the clock stops during half time
  await page.getByRole('button', { name: /Iniciar 2.ª parte/i }).click();
  await page.getByRole('button', { name: /Confirmar e Iniciar 2.ª Parte/i }).click();

  // 2nd half: goal by the substitute, then 10 minutes in total (less simulated time keeps the sign-in valid).
  await advance('05:00');
  await page.getByRole('button', { name: /GOLO MARCADO/i }).click();
  await page.locator('select').first().selectOption('p10');
  await page.getByRole('button', { name: 'Confirmar Golo' }).click();
  await advance('05:00');

  // Playing minutes: 25 + 10, Duarte left at 16', Henrique came on at 16'.
  await page.getByRole('button', { name: /MINUTOS EM JOGO/i }).click();
  const minutes = (name: string) => page.locator('li').filter({ hasText: name }).locator('span').last().innerText();
  expect(await minutes('1 - Duarte Matos')).toBe("16'");
  expect(await minutes('8 - Henrique Alves')).toBe("19'");
  expect(await minutes('7 - Tomás Gonçalves')).toBe("35'");
  expect(await minutes('9 - Rui Silva')).toBe("0'");

  // Finish: checklist, then the 30-second summary with names and the round from the Agenda.
  await page.getByRole('button', { name: /Validar e Terminar Jogo/i }).click();
  // The checklist confirms starters, that the minutes add up (7 x game length) and where the game was played
  await expect(page.getByText('7 titulares registados')).toBeVisible();
  await expect(page.getByText(/^\d+' = 7 x \d+'$/)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'minutos de jogo' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Local do jogo' })).toBeVisible();
  await page.getByRole('button', { name: /Concluir e ver resumo/i }).click();
  await expect(page.getByText('RESUMO INTELIGENTE PÓS-JOGO')).toBeVisible();
  await expect(page.getByText('Jornada 5')).toBeVisible();
  await expect(page.getByText('Golo (7 - Tomás Gonçalves)')).toBeVisible();
  await expect(page.getByText('Sai: 1 - Duarte Matos ➔ Entra: 8 - Henrique Alves')).toBeVisible();
  await expect(page.getByText('Cartão Amarelo (2 - Martim Costa)')).toBeVisible();

  // Games list: result, parents' share and the opponent report with this match's numbers.
  await page.getByRole('button', { name: /Histórico/i }).click();
  await expect(page.getByText(/JORNADA 5/i)).toBeVisible();
  await page.getByText('Abrantes').first().click();
  await expect(page.getByText("11'⚽ 7 - Tomás Gonçalves")).toBeVisible();
  await page.getByRole('button', { name: /Partilhar com os pais/i }).click();
  const share = page.getByRole('dialog', { name: /Partilhar com os pais/i });
  await expect(share).toBeVisible();
  await expect(share).toContainText('Abrantes');
  await share.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: /Relatório do adversário/ }).click();
  const numbers = page
    .getByRole('dialog', { name: 'Relatório do adversário' })
    .getByRole('region', { name: 'Números do jogo' });
  await expect(numbers).toContainText('2-1');
  await expect(numbers).toContainText("26'");

  // Reopening the app (back on the real time) sends what is still waiting on this device to the cloud.
  page.on('dialog', (d) => d.accept()); // "leave with unsaved changes?"
  await page.reload();
  await enterPanel(page);
  await expect
    .poll(
      async () => [...(await cloudRecords()).values()].find((r) => r.kind === 'match' && r.opponent === 'Abrantes'),
      { timeout: 30_000, message: 'jogo terminado na nuvem' }
    )
    .toMatchObject({ finished: true, goals: 3, phase: 'Jornada 5', convocados: 10 });
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
});

test('sessão na nuvem terminada: aviso, entrar de novo sem perder o que ficou no aparelho', async ({
  page,
  browser
}) => {
  await signedIn(page);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  // Same device data (coach saved in localStorage) but without the Firebase session
  const saved = await page.context().storageState();
  const storageState = {
    ...saved,
    origins: saved.origins.map((o) => ({
      ...o,
      localStorage: o.localStorage.filter((item) => !item.name.startsWith('firebase:'))
    }))
  };
  const device = await browser.newContext({ storageState });
  const app = await device.newPage();
  await app.goto('/');
  await enterPanel(app);
  const banner = app.getByRole('alert').filter({ hasText: 'A sessão na nuvem terminou' });
  await expect(banner).toBeVisible();

  // A change made meanwhile stays on this device…
  await navTo(app, /equipa/i);
  await addPlayer(app, 'Tiago Sessão', '31');
  await expect(app.getByRole('heading', { name: 'Tiago Sessão' })).toBeVisible();

  // …and reaches the cloud after signing in again from the banner
  await banner.getByRole('button', { name: 'Entrar de novo' }).click();
  await banner.getByLabel('Palavra-passe').fill(PASSWORD);
  await banner.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(banner).toBeHidden();
  await expect
    .poll(async () => [...(await cloudRecords()).values()].some((r) => r.name === 'Tiago Sessão'), {
      timeout: 30_000
    })
    .toBe(true);
  await expect(syncBadge(app)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  await device.close();
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
