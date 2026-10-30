import { deflateSync } from 'node:zlib';
import { test, expect, type Page } from '@playwright/test';
import { COACH_A, COACH_B, FIRESTORE, owner, PASSWORD } from './seed';
import { buildICS, feedFromRestDocument } from '../src/lib/calendarFeed';
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
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  await page.getByPlaceholder('Ex: Cristiano Ronaldo').fill(name);
  await page.getByPlaceholder('Ex: 7', { exact: true }).fill(number);
  await page.locator('#player-form button[type=submit]').click();
};

/** Agenda: the only "add" button, then Jogo / Treino / … */
const addToAgenda = async (page: Page, item: string) => {
  await page.getByRole('button', { name: 'Adicionar à agenda' }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
};

/** Agenda → Lista: opens the row of a game or training (also among the past ones) to show its actions. */
const openAgendaRow = async (page: Page, name: RegExp) => {
  const past = page.getByRole('button', { name: /Ver os \d+ anteriores/ });
  if (!(await page.getByRole('button', { name }).count()) && (await past.isVisible())) await past.click();
  await page.getByRole('button', { name }).first().click();
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
  await expect(page.getByPlaceholder('Procurar atleta')).toBeVisible();
  await expect(page.getByText('RUI SILVA')).toBeVisible();

  await navTo(page, /agenda/i);
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  await navTo(page, /jogo/i);
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
  for (const kept of [/Definições do Clube/, /Cópias de segurança/, /Trocar de equipa/]) {
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
  await navTo(page, /jogo/i);
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
  await addToAgenda(page, 'Jogo');
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

  await expect(page.getByRole('button', { name: /vs Constância.*Jornada 6/ })).toBeVisible();
  // The call-up of the game that was tapped (not the first game of the list).
  await openAgendaRow(page, /vs Constância/);
  await page.getByTitle('Abrir Convocatória').click();
  await expect(page.getByRole('region', { name: 'Jogo da convocatória' })).toContainText('vs Constância');

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

  // Starting line-up picture: the called-up players, the system and the captain; saved with the game
  await page.getByRole('button', { name: /Imagem da equipa inicial/ }).click();
  const lineup = page.getByRole('dialog', { name: 'Equipa inicial' });
  await expect(lineup.getByRole('group', { name: 'Titulares' }).getByRole('button')).toHaveCount(3);
  await expect(lineup.getByText('Titulares (3/7)')).toBeVisible();
  await lineup.getByLabel('Jogadores em campo').selectOption('5');
  await expect(lineup.getByLabel('Sistema')).toHaveValue('2-2');
  const places = lineup.getByRole('group', { name: 'Lugares no campo' });
  await expect(places.getByRole('combobox')).toHaveCount(5);
  await expect(lineup.getByText('Titulares (3/5)')).toBeVisible();
  // Any player in any place: Rui Silva (p1) plays as left centre-back
  await places.getByLabel('Central esquerdo').selectOption('p1');
  await expect(places.getByLabel('Central esquerdo')).toHaveValue('p1');
  await lineup.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/lugares.png` : undefined });
  await expect(lineup.getByText('Titulares (3/5)')).toBeVisible();
  await lineup.getByLabel('Capitão').selectOption({ label: 'Rui Silva' });
  await expect(lineup.getByRole('img', { name: 'Imagem da equipa inicial' })).toBeVisible();
  await lineup
    .getByRole('img', { name: 'Imagem da equipa inicial' })
    .screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/equipa-inicial.png` : undefined });
  await lineup.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText(/Equipa inicial guardada/)).toBeVisible();
  await lineup.getByRole('button', { name: 'Fechar equipa inicial' }).click();
  await expect(page.getByRole('button', { name: /Imagem da equipa inicial \(guardada\)/ })).toBeVisible();

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const body = (await res.json()) as { documents?: Array<{ fields: Record<string, any> }> };
        const game = (body.documents || [])
          .map((d) => d.fields.data?.mapValue?.fields)
          .find((f) => f?.opponent?.stringValue === 'Constância');
        const l = game?.startingLineup?.mapValue?.fields;
        return l ? [l.system?.stringValue, l.slots?.arrayValue?.values?.length] : null;
      },
      { timeout: 30_000, message: 'equipa inicial na nuvem' }
    )
    .toEqual(['2-2', 5]);

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

test('calendário para os pais: link secreto com jogos e treinos que se atualiza sozinho', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: /Calendário para os pais/ }).click();
  const share = page.getByRole('dialog', { name: 'Calendário para os pais' });
  await share.getByRole('button', { name: 'Criar link do calendário' }).click();
  const link = share.getByLabel('Link do calendário');
  await expect(link).toHaveValue(/\/cal\/[a-zA-Z0-9]{24}\.ics$/);
  const token = (await link.inputValue()).match(/\/cal\/([a-zA-Z0-9]{24})\.ics$/)![1];

  // Anyone with the link reads it (no sign-in), and it only has games and trainings
  const published = async () => {
    const res = await fetch(`${FIRESTORE}/public_calendars/${token}`);
    return res.ok ? JSON.stringify(await res.json()) : null;
  };
  await expect.poll(published, { timeout: 30_000 }).toContain('Abrantes');
  expect(await published()).not.toContain('Rui Silva');
  const ics = buildICS(feedFromRestDocument(JSON.parse((await published())!))!);
  expect(ics).toContain('SUMMARY:⚽ Dragões vs Abrantes');
  expect(ics).toContain('BEGIN:VEVENT');
  await share.getByRole('button', { name: 'Fechar' }).click();

  // A new game in the Agenda reaches the calendar on its own
  await addToAgenda(page, 'Jogo');
  await page.getByPlaceholder('Nome da equipa adversária').fill('Mação');
  await page.locator('input[type=date]').first().fill('2026-12-12');
  await page.locator('input[type=time]').first().fill('15:00');
  await page.getByRole('button', { name: /Guardar no Calendário/ }).click();
  await expect.poll(published, { timeout: 30_000 }).toContain('Mação');

  // Switched off: the link stops working
  await page.getByRole('button', { name: /Calendário para os pais/ }).click();
  await page.getByRole('button', { name: 'Desativar este link' }).click();
  await expect.poll(published, { timeout: 30_000 }).toBeNull();
});

test('análise: remates e eficácia de finalização', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /jogo/i);
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
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
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
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await expect(page.getByText('Esparteiros')).toBeVisible();
  // Away win 2-1 reads like a scoreboard, home team first: Tramagal SU (Fora) 1 – 2
  await expect(page.locator('.ui-card', { hasText: 'Tramagal SU' }).getByLabel(/^Resultado /)).toHaveText('1 – 2');
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
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
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

  await expect(page.locator('.ui-card', { hasText: 'Tramagal SU' }).getByLabel(/^Resultado /)).toHaveText('1 – 3');
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
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
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
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await expect(
    page.getByRole('group', { name: 'Local do jogo' }).getByRole('button', { name: 'Casa' })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('classificação: resultados colados da série, jogos da app e posição da equipa', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByRole('button', { name: /Classificação do campeonato/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Classificação do campeonato' });

  await dialog.getByRole('button', { name: 'Colar' }).click();
  await dialog
    .getByLabel('Resultados colados')
    .fill('Jornada 1\nMação 3-0 Abrantes\nJornada 2\nEsparteiros 0-4 Mação\nTramagal SU 1-1 Abrantes\nlinha estranha');
  await expect(dialog).toContainText('3 jogo(s) reconhecido(s)');
  await expect(dialog).toContainText('Não percebi 1 linha(s): linha estranha');
  await dialog.getByRole('button', { name: 'Importar resultados' }).click();

  // Mação 6 pts; Dragões 4 pts from the app's championship games (draw with Esparteiros, win against Tramagal SU)
  const table = dialog.getByRole('table', { name: 'Tabela classificativa' });
  await expect(table.getByRole('row').nth(1)).toContainText('Mação');
  await expect(dialog.getByLabel('Posição da equipa')).toContainText('Dragões em 2.º lugar de 5');
  await expect(dialog.getByLabel('Posição da equipa')).toContainText('4 pontos');

  // A result typed by hand; our own games show as coming from the app
  await dialog.getByRole('button', { name: 'Resultados' }).click();
  await dialog.getByLabel('Casa', { exact: true }).fill('Abrantes');
  await dialog.getByLabel('Golos da equipa da casa').fill('2');
  await dialog.getByLabel('Golos da equipa de fora').fill('0');
  await dialog.getByLabel('Fora', { exact: true }).fill('Esparteiros');
  await dialog.getByRole('button', { name: 'Guardar resultado' }).click();
  const results = dialog.getByRole('list', { name: 'Resultados da série' });
  await expect(results.getByRole('listitem')).toHaveCount(6);
  await expect(results.getByRole('listitem').filter({ hasText: 'Tramagal SU' }).first()).toBeVisible();
  await expect(results.getByText('da app')).toHaveCount(2);

  // Text copied from the FPF results page: our team ("Cdr Dragões 'A'") and opponents' names are recognised
  await dialog.getByRole('button', { name: 'Colar' }).click();
  await dialog
    .getByLabel('Resultados colados')
    .fill(
      "SÉRIE 10\nJORNADAS\n12345\nGdr Mação\t2 - 0\n31 OUT\nTramagal Su\nCampo X\nCdr Dragões 'A'\t11:00\n01 NOV\nAbrantes\nCampo Y"
    );
  await expect(dialog).toContainText('1 jogo(s) reconhecido(s)');
  await dialog.getByRole('button', { name: 'Importar resultados' }).click();
  await dialog.getByRole('button', { name: 'Resultados' }).click();
  await expect(results).toContainText('Mação 2-0 Tramagal SU');

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('leagues') && raw.includes('Esparteiros') && raw.includes('Mação');
      },
      { timeout: 30_000, message: 'classificação guardada na nuvem' }
    )
    .toBe(true);
});

test('classificação: print da jornada (sem o nosso jogo) e nova fase sem perder a anterior', async ({ page }) => {
  await page.route('**/api/ler-jornada', (route) =>
    route.fulfill({
      json: {
        success: true,
        games: [
          { home: "Cdr Dragões 'A'", away: 'Abrantes', homeGoals: 7, awayGoals: 3, date: '24 OUT' },
          { home: 'Gdr Mação', away: 'Tramagal Su', homeGoals: 2, awayGoals: 1, date: '24 OUT' }
        ]
      }
    })
  );
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByRole('button', { name: /Classificação do campeonato/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Classificação do campeonato' });

  await dialog.getByRole('button', { name: 'Colar' }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  await dialog
    .getByLabel('Print da jornada')
    .setInputFiles({ name: 'jornada.png', mimeType: 'image/png', buffer: png });
  const read = dialog.getByRole('list', { name: 'Jogos lidos do print' });
  await expect(read.getByRole('listitem')).toHaveCount(1);
  await expect(read).toContainText('Mação 2-1 Tramagal SU');
  await expect(dialog).toContainText('O jogo de Dragões foi deixado de fora');
  await dialog.getByRole('button', { name: 'Importar 1 jogo(s)' }).click();
  const table = dialog.getByRole('table', { name: 'Tabela classificativa' });
  await expect(table).toContainText('Mação');

  // A second phase starts empty; the first one is kept as it was
  await dialog.getByRole('button', { name: '➕ Nova fase' }).click();
  const form = dialog.getByRole('region', { name: 'Nova fase' });
  await form.getByLabel('Nome da fase').fill('Fase de apuramento');
  await form.getByLabel('Começa em').fill('2099-01-10');
  await form.getByRole('button', { name: 'Criar fase' }).click();
  await dialog.getByLabel('Equipas da série').fill('Equipa Azul\nEquipa Verde');
  await dialog.getByRole('button', { name: 'Guardar equipas' }).click();
  const phases = dialog.getByRole('group', { name: 'Fases' });
  await expect(phases.getByRole('button', { name: 'Fase de apuramento' })).toHaveAttribute('aria-pressed', 'true');
  await expect(table).toContainText('Equipa Azul');
  await expect(table).not.toContainText('Mação');

  await phases.getByRole('button', { name: '1.ª fase' }).click();
  await expect(table).toContainText('Mação');
  await expect(table).not.toContainText('Equipa Azul');

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('Fase de apuramento') && raw.includes('2099-01-10') && raw.includes('Mação');
      },
      { timeout: 30_000, message: 'fases guardadas na nuvem' }
    )
    .toBe(true);
});

test('bolas paradas: caderno com desenho e quem marca aparece na Convocatória', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await openAgendaRow(page, /vs Abrantes/);
  await page.getByTitle('Abrir Convocatória').click();
  const card = page.getByRole('region', { name: 'Bolas paradas', exact: true });
  await card.getByRole('button', { name: 'Criar caderno' }).click();

  const book = page.getByRole('dialog', { name: 'Caderno de bolas paradas' });
  await book.getByRole('button', { name: /Nova bola parada/ }).click();
  await book.getByRole('button', { name: /Canto/ }).click();
  await book.getByRole('combobox').first().selectOption('direita');
  await book.getByLabel('Atleta para Marca').selectOption({ label: '9 · Rui Silva' });
  await book.getByLabel('Atleta para 1.º poste').selectOption({ label: '10 · André Lopes' });
  await book.getByLabel('Importar desenho da bola parada').setInputFiles('e2e/fixtures/exercicio.jpg');
  await expect(book.getByRole('img', { name: /Desenho: Canto direita/ })).toBeVisible();
  await book.getByRole('button', { name: 'Guardar' }).click();
  await expect(book.getByRole('list', { name: 'Lista de bolas paradas' })).toContainText('Marca: Rui Silva');
  await book.getByRole('button', { name: 'Fechar bolas paradas' }).click();

  await expect(card).toContainText('Canto direita');
  await expect(card).toContainText('Marca Rui Silva');
  await expect(card).toContainText('1.º poste André Lopes');
  await expect
    .poll(async () => [...(await cloudRecords()).values()].some((r) => r.kind === 'setpiece' && !r.deleted), {
      timeout: 30_000,
      message: 'bola parada guardada na nuvem'
    })
    .toBe(true);
});

test('jogador do jogo: escolher o destaque, guardar no jogo e descarregar a imagem', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Jogador do jogo/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Jogador do jogo' });
  // Rui Silva scored in this game: suggested first
  await expect(dialog.getByRole('combobox')).toHaveValue('p1');
  // Anyone in the team can be chosen, also who did not play
  await expect(dialog.getByRole('combobox').locator('option', { hasText: 'Henrique Alves' })).toHaveCount(1);
  await expect(dialog.getByRole('img', { name: 'Imagem do jogador do jogo' })).toBeVisible();
  await dialog
    .getByRole('img', { name: 'Imagem do jogador do jogo' })
    .screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/jogador-do-jogo.png` : undefined });
  await dialog.getByRole('button', { name: 'Guardar destaque' }).click();
  await expect(page.getByText('⭐ Rui Silva é o jogador do jogo')).toBeVisible();

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Partilhar imagem/ }).click();
  expect((await download).suggestedFilename()).toBe('Jogador_do_jogo_Rui_Silva.png');
  await dialog.getByRole('button', { name: 'Fechar jogador do jogo' }).click();
  await expect(page.getByRole('button', { name: /Jogador do jogo: Rui Silva/ })).toBeVisible();

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/match__sub11__m2`, { headers: owner });
        const body = (await res.json()) as { fields?: { data?: { mapValue?: { fields?: Record<string, any> } } } };
        return body.fields?.data?.mapValue?.fields?.mvpId?.stringValue;
      },
      { timeout: 30_000, message: 'jogador do jogo guardado na nuvem' }
    )
    .toBe('p1');
});

test('votação dos pais: link anónimo, um voto por telemóvel e os dois mais votados na app', async ({
  page,
  browser
}) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Jogador do jogo/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Jogador do jogo' });
  const panel = dialog.getByRole('region', { name: 'Votação dos pais' });
  await panel.getByRole('button', { name: 'Abrir votação dos pais' }).click();
  const link = await panel.getByLabel('Link da votação').inputValue();
  expect(link).toMatch(/\/votar\.html\?v=[a-zA-Z0-9]{24}$/);

  // Parent 1 (this phone): votes for Rui; opening the link again says it already voted
  const parent1 = await page.context().newPage();
  await parent1.goto(link);
  await expect(parent1.getByRole('button', { name: 'Rui S. (9)' })).toBeVisible();
  await expect(parent1.getByText('Silva')).toHaveCount(0); // never the full name
  await parent1.getByRole('button', { name: 'Tomás G. (7)' }).click();
  await parent1.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/votacao.png` : undefined });
  await parent1.getByRole('button', { name: 'Rui S. (9)' }).click();
  await parent1.getByRole('button', { name: 'Votar' }).click();
  await expect(parent1.getByText('Obrigado! Votou em Rui S. (9)')).toBeVisible();
  await parent1.reload();
  await expect(parent1.getByText(/Já votou em Rui S\. \(9\)/)).toBeVisible();
  await parent1.close();

  // Parents 2 and 3 (other phones)
  for (const who of ['Tomás G. (7)', 'Rui S. (9)']) {
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await other.goto(link);
    await other.getByRole('button', { name: who }).click();
    await other.getByRole('button', { name: 'Votar' }).click();
    await expect(other.getByText(`Obrigado! Votou em ${who}`)).toBeVisible();
    await ctx.close();
  }

  await panel.getByRole('button', { name: /Ver votos/ }).click();
  const best = panel.getByRole('list', { name: 'Mais votados' });
  await expect(best.getByRole('listitem')).toHaveCount(2);
  await expect(best.getByRole('listitem').first()).toContainText('Rui S. (9)');
  await expect(best.getByRole('listitem').first()).toContainText('2 voto(s)');
  await expect(best.getByRole('listitem').nth(1)).toContainText('Tomás G. (7)');
  await expect(panel).toContainText('3 voto(s) no total');

  await panel.getByRole('button', { name: 'Fechar votação' }).click();
  await expect(panel).toContainText('Fechada');
  await dialog.getByRole('button', { name: 'Fechar jogador do jogo' }).click();
  await expect(page.getByText('🗳️ Pais: Rui S. (9) (2) · Tomás G. (7) (1)')).toBeVisible();

  const late = await page.context().newPage();
  await late.goto(link);
  await expect(late.getByText('A votação já fechou. Obrigado!')).toBeVisible();
  await late.close();
});

test('assistente: perguntas sobre a equipa respondidas com os dados da app', async ({ page }) => {
  await signedIn(page);
  const card = page.getByRole('region', { name: 'Pergunte à app' });
  await card.getByLabel('Pergunta').fill('Quem é o melhor marcador?');
  await card.getByRole('button', { name: 'Perguntar' }).click();
  const answer = card.getByRole('status', { name: 'Resposta' });
  await expect(answer).toContainText('Melhores marcadores esta época');
  await expect(answer).toContainText('1. 9 · Rui Silva');
  await card.getByRole('button', { name: 'Outra pergunta' }).click();
  await card.getByRole('button', { name: 'Quando é o próximo jogo?' }).click();
  await expect(answer).toContainText('Abrantes');
  await card.getByRole('button', { name: 'Outra pergunta' }).click();
  await card.getByLabel('Pergunta').fill('qual é a cor do equipamento?');
  await card.getByRole('button', { name: 'Perguntar' }).click();
  await expect(answer).toContainText('Não percebi a pergunta.');
});

test('treinos: treino de hoje com faltas e motivo, repetir, faltas por atleta', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  // Opens on every training (no empty "Agendados" filter), newest first.
  await expect(page.getByText('TREINO 2')).toBeVisible();

  await page.getByRole('button', { name: /Treino de hoje/ }).click();
  const today = page.getByRole('dialog', { name: 'Treino de hoje' });
  await expect(today).toContainText('Nº 3');
  // The team's time for the day (Mondays 19:15, Thursdays 18:15), otherwise the usual time
  const usual = (await page.evaluate(() => new Date().getDay())) === 1 ? '19:15' : '18:15';
  await expect(today.getByLabel('Hora')).toHaveValue(usual);
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
  await page.getByRole('button', { name: /Treino 3/ }).click();
  await page.getByRole('button', { name: /Repetir/ }).click();
  await expect(page.getByText(/Treino repetido para/)).toBeVisible();
  await expect(page.getByText('TREINO 4')).toBeVisible();

  // Absences per athlete, with the reason.
  await page
    .getByRole('button', { name: /Assiduidade/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Rui Silva/ }).click();
  await expect(page.getByRole('list', { name: 'Faltas de Rui Silva' })).toContainText('Doente');
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
});

test('exercícios: biblioteca com desenho importado, usada no plano do treino', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '➕ Novo exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await form.getByLabel('Nome').fill('Rondo 4x2');
  await form.getByLabel('Objetivo').fill('Circulação de bola sob pressão');
  await form.getByLabel('Duração (min)').fill('15');
  // The rules box grows with the text: everything written stays visible
  const rules = form.getByLabel('Descrição / regras (opcional)');
  const emptyHeight = (await rules.boundingBox())!.height;
  await rules.fill(Array.from({ length: 12 }, (_, i) => `Regra ${i + 1}: dois toques e reação à perda.`).join('\n'));
  await expect.poll(async () => (await rules.boundingBox())!.height).toBeGreaterThan(emptyHeight * 2);
  expect(await rules.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(2);
  await form.getByLabel('Importar imagem do exercício').setInputFiles('e2e/fixtures/exercicio.jpg');
  await expect(form.getByRole('img', { name: 'Desenho: Rondo 4x2' })).toBeVisible();
  await form.getByRole('button', { name: 'Guardar exercício' }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de exercícios' });
  await expect(library).toContainText('Rondo 4x2');
  await expect(library).toContainText('15 min');
  await expect
    .poll(async () => [...(await cloudRecords()).values()].find((r) => r.kind === 'exercise')?.name, {
      timeout: 30_000,
      message: 'exercício na nuvem'
    })
    .toBe('Rondo 4x2');

  // New training: the exercise joins the session plan with its drawing
  await page.getByRole('button', { name: /Lista/ }).first().click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.getByRole('button', { name: /Da biblioteca \(1\)/ }).click();
  await page
    .getByRole('group', { name: 'Escolher da biblioteca' })
    .getByRole('button', { name: /Rondo 4x2/ })
    .click();
  await expect(page.getByRole('img', { name: 'Desenho: Rondo 4x2' })).toBeVisible();
  await expect(page.getByText('Planeado: 15 /')).toBeVisible();

  // Keep it as a model, save the training, and the library shows the exercise was used
  const models = page.getByRole('region', { name: 'Modelos de treino' });
  await models.getByRole('button', { name: /Guardar este treino como modelo/ }).click();
  await models.getByLabel('Nome do modelo').fill('Rondo semanal');
  await models.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Modelo "Rondo semanal" guardado ✓')).toBeVisible();
  await page.getByRole('button', { name: /Guardar como Agendado/ }).click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await expect(page.getByRole('region', { name: 'Biblioteca de exercícios' })).toContainText(/Usado 1× · último hoje/);

  // A new training starts from the model; "Duplicar" opens a copy of a training to change and save
  await page.getByRole('button', { name: /Lista/ }).first().click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page
    .getByRole('region', { name: 'Modelos de treino' })
    .getByLabel('Modelo', { exact: true })
    .selectOption({ label: 'Rondo semanal (1 bloco)' });
  await page.getByRole('region', { name: 'Modelos de treino' }).getByRole('button', { name: 'Usar' }).click();
  await expect(page.getByRole('img', { name: 'Desenho: Rondo 4x2' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).last().click();
  await page.locator('[data-training-row]').first().click();
  await page.getByRole('button', { name: /Duplicar/ }).click();
  await expect(page.getByText(/Cópia do treino aberta/)).toBeVisible();
  await expect(page.getByText(/Novo Treino/).first()).toBeVisible();

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        return JSON.stringify(await res.json()).includes('Rondo semanal');
      },
      { timeout: 30_000, message: 'modelo guardado na nuvem' }
    )
    .toBe(true);
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

test('fim de época: mensagem do treinador guardada na nuvem e PDF para a família (um atleta ou o plantel)', async ({
  page
}) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  const report = page.getByRole('region', { name: 'Relatório de fim de época' });
  await report.getByLabel('Mensagem do treinador para a família').fill('Uma época de grande evolução. Parabéns!');
  await report.getByRole('button', { name: 'Guardar mensagem' }).click();
  await expect(page.getByText('Mensagem de fim de época guardada ✓')).toBeVisible();
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        return JSON.stringify(await res.json()).includes('Uma época de grande evolução');
      },
      { timeout: 30_000, message: 'mensagem guardada no registo do atleta' }
    )
    .toBe(true);

  const one = page.waitForEvent('download');
  await report.getByRole('button', { name: /PDF fim de época/ }).click();
  expect((await one).suggestedFilename()).toMatch(/^Fim_de_Epoca_Rui_Silva_2\d{3}_2\d{3}\.pdf$/);

  await page.getByRole('button', { name: 'Fechar' }).click();
  const all = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Mais ações do plantel' }).click();
  await page.getByRole('menuitem', { name: /Fim de época/ }).click();
  expect((await all).suggestedFilename()).toMatch(/^Fim_de_Epoca_Plantel_/);
});

test('painel: equipa e atleta por época, jogo, confronto e período; exportar para Power BI', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /jogo/i);
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

test('disponibilidade: lesão com data de regresso aparece no plantel e na Convocatória', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Gonçalo Teste' }).click();
  await page.getByRole('button', { name: /Editar Dados/ }).click();
  await page
    .locator('select')
    .filter({ has: page.locator('option[value=lesionado]') })
    .selectOption('lesionado');
  await page.getByLabel('Regressa a').fill('2099-01-15');
  await page.getByLabel('Motivo').fill('entorse');
  await page.locator('#player-form button[type=submit]').click();
  await expect(page.getByText('Lesionado até 15/01').first()).toBeVisible();

  await navTo(page, /agenda/i);
  await openAgendaRow(page, /vs Abrantes/);
  await page.getByTitle('Abrir Convocatória').click();
  await expect(page.getByText('🏥 Lesionado até 15/01 · entorse')).toBeVisible();
});

/** A noisy PNG of about 3 MB, like a photo taken with the phone (fictitious content, no person). */
function largePng(side = 1000): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const raw = Buffer.alloc((side * 3 + 1) * side);
  for (let i = 0; i < raw.length; i++) raw[i] = i % (side * 3 + 1) === 0 ? 0 : (Math.random() * 256) | 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

test('aniversário: no dia de anos aparece no Início com a imagem de parabéns para partilhar', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Gonçalo Teste' }).click();
  await page.getByRole('button', { name: /Editar Dados/ }).click();
  // Born 10 years ago today (local date, as the app sees it)
  const birth = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear() - 10}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.locator('#player-form input[type=date]').first().fill(birth);
  await page.locator('#player-form button[type=submit]').click();

  await navTo(page, /início/i);
  const today = page.getByRole('region', { name: 'Aniversários de hoje' });
  await expect(today).toContainText('Gonçalo Teste');
  await expect(today).toContainText('10 anos');
  await today.getByRole('button', { name: /Imagem de parabéns/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Imagem de parabéns' });
  const picture = dialog.getByRole('img', { name: 'Imagem de parabéns para Gonçalo Teste' });
  await expect(picture).toBeVisible();
  await picture.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/parabens.png` : undefined });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Partilhar imagem/ }).click();
  expect((await download).suggestedFilename()).toBe('Parabens_Gon_alo_Teste.png');
});

test('foto do atleta: uma foto grande do telemóvel fica pequena e é guardada', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Gonçalo Teste' }).click();
  await page.getByRole('button', { name: /Editar Dados/ }).click();
  const png = largePng();
  expect(png.length).toBeGreaterThan(2_000_000);
  await page
    .locator('#player-form input[type=file]')
    .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Foto carregada com sucesso!')).toBeVisible();
  const preview = await page.locator('#player-form img[alt=Preview]').getAttribute('src');
  expect(preview).toMatch(/^data:image\/jpeg;base64,/);
  expect(preview!.length).toBeLessThan(65_000);
  await page.locator('#player-form button[type=submit]').click();

  const saved = await page.evaluate(() => {
    const raw = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k) || '')
      .find((v) => v.includes('Gonçalo Teste'));
    const roster = raw ? (JSON.parse(raw).roster as { name: string; photoUrl?: string }[]) : [];
    return roster.find((p) => p.name === 'Gonçalo Teste')?.photoUrl || '';
  });
  expect(saved).toBe(preview);
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
  await openAgendaRow(page, /vs Abrantes/);
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
  // Halftime: season minutes of the 10 called up and a suggested 2nd-half line-up (7, pre-filled in the picker)
  const plan = page.getByRole('region', { name: 'Sugestão para a 2.ª parte' });
  await expect(plan.getByRole('listitem')).toHaveCount(10);
  await expect(plan.getByRole('listitem').filter({ hasText: '✓' })).toHaveCount(7);
  await plan.getByRole('button', { name: /com esta sugestão/ }).click();
  await expect(page.getByRole('button', { name: /Confirmar e Iniciar 2.ª Parte/i })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: /Iniciar 2.ª parte/i }).click();
  await page.getByRole('button', { name: /Confirmar e Iniciar 2.ª Parte/i }).click();

  // 2nd half: goal by the substitute, then 10 minutes in total (less simulated time keeps the sign-in valid).
  await advance('05:00');
  // One-tap goal: tap who scored (minute from the clock), then undo it
  const oneTap = page.getByRole('region', { name: 'Golo com um toque' });
  await oneTap.getByRole('button', { name: '7 - Tomás Gonçalves' }).click();
  await expect(oneTap.getByRole('status')).toContainText(/Golo de 7 - Tomás Gonçalves aos \d+'/);
  await oneTap.getByRole('button', { name: 'Desfazer' }).click();
  await expect(oneTap.getByRole('status')).toHaveCount(0);
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

test('relatório mensal: resumo do mês e PDF para o coordenador', async ({ page }) => {
  await signedIn(page);
  await openMore(page, /Relatório mensal/);
  const dialog = page.getByRole('dialog', { name: 'Relatório mensal' });
  await dialog.getByLabel('Mês', { exact: true }).selectOption('2026-10');
  const summary = dialog.getByLabel('Resumo do mês');
  await expect(summary).toContainText('Jogos');
  await expect(summary).toContainText('Treinos');
  await dialog.getByLabel('Notas para o coordenador (opcional)').fill('Mês de boa evolução.');
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '📄 Gerar PDF' }).click();
  expect((await download).suggestedFilename()).toBe('Relatorio_Mensal_Dragoes_2026-10.pdf');
  await expect(page.getByText('Relatório mensal criado 📄')).toBeVisible();
});

test('clube: cor da app, localidade, previsão do tempo e como chegar ao campo', async ({ page }) => {
  // The weather service answers with a rainy afternoon (no real internet in the tests)
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { results: [{ latitude: 39.46, longitude: -8.2 }] } })
  );
  const hours = (v: number) => Array.from({ length: 24 }, () => v);
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        hourly: {
          temperature_2m: hours(15),
          precipitation_probability: hours(60),
          weather_code: hours(61),
          wind_speed_10m: hours(20)
        }
      }
    })
  );
  await signedIn(page);
  await openMore(page, /Definições do Clube/);
  const club = page.getByRole('region', { name: 'Definições do clube' });
  await club.getByRole('button', { name: 'Vermelho' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-cyan-500').trim())
    )
    .toBe('#e23b3b');
  await club.getByPlaceholder('Ex: Abrantes').fill('Abrantes');
  await club.getByLabel('Amarelos para um jogo de castigo').selectOption('4');
  await page
    .getByRole('button', { name: /Fechar|Close/ })
    .last()
    .click();

  // An away game tomorrow: forecast for the game's hour and directions to the pitch
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await navTo(page, /agenda/i);
  await addToAgenda(page, 'Jogo');
  await page.getByPlaceholder('Nome da equipa adversária').fill('AD Tempo Teste');
  await page.locator('input[type=date]').first().fill(tomorrow);
  await page.locator('input[type=time]').first().fill('15:00');
  await page.getByRole('button', { name: 'Fora', exact: true }).click();
  await page.getByRole('button', { name: /Guardar no Calendário/ }).click();
  await openAgendaRow(page, /vs AD Tempo Teste/);
  const card = page.getByRole('listitem').filter({ hasText: 'AD Tempo Teste' });
  await expect(card.getByLabel('Previsão do tempo')).toHaveText('🌧️ 15° · 💧60% · 💨20 km/h');
  await card.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cor-tempo.png` : undefined });
  await expect(card.getByRole('link', { name: /Como chegar/ })).toHaveAttribute(
    'href',
    /google\.com\/maps\/dir\/\?api=1&destination=campo%20de%20futebol%20Tempo%20Teste/
  );

  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('#e23b3b') && raw.includes('Abrantes') && raw.includes('yellowsForBan');
      },
      { timeout: 30_000, message: 'definições do clube na nuvem' }
    )
    .toBe(true);
});

test('agenda: jogos importados de um print do calendário e modo compacto', async ({ page }) => {
  let mode = '';
  await page.route('**/api/ler-jornada', async (route) => {
    mode = route.request().postDataJSON()?.mode;
    await route.fulfill({
      json: {
        success: true,
        games: [
          {
            home: "Cdr Dragões 'A'",
            away: 'Gd Calendário',
            date: '07/03/2099',
            time: '10h30',
            round: 1,
            venue: 'Campo Teste'
          },
          { home: 'Ud Outra', away: 'Ad Terceira', date: '07/03/2099', time: '11:00', round: 1 },
          { home: 'Ad Terceira', away: "Cdr Dragões 'A'", date: '14/03/2099', time: '09:15', round: 2 },
          { home: 'Gd Calendário', away: 'Ud Outra', date: '14/03/2099', round: 2 }
        ]
      }
    });
  });
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: /Importar jogos de um print do calendário/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Importar jogos por print' });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  await dialog
    .getByLabel('Print do calendário')
    .setInputFiles({ name: 'calendario.png', mimeType: 'image/png', buffer: png });
  await expect(dialog.getByLabel('A nossa equipa no print')).toHaveValue("Cdr Dragões 'A'");
  expect(mode).toBe('calendario');
  const found = dialog.getByRole('list', { name: 'Jogos encontrados' });
  await expect(found.getByRole('listitem')).toHaveCount(2);
  await expect(found.getByRole('listitem').first()).toContainText('🏠 vs Gd Calendário');
  await expect(found.getByRole('listitem').first()).toContainText('10:30 · Jornada 1');
  await expect(found.getByRole('listitem').last()).toContainText('✈️ vs Ad Terceira');
  await dialog.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/calendario-print.png` : undefined });
  await dialog.getByRole('button', { name: 'Adicionar 2 jogo(s) à Agenda' }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()]
          .filter((r) => r.kind === 'schedule' && ['Gd Calendário', 'Ad Terceira'].includes(r.opponent as string))
          .map((r) => `${r.date} ${r.time} ${r.location} ${r.phase} ${r.opponent}`)
          .sort(),
      { timeout: 30_000, message: 'jogos importados na nuvem' }
    )
    .toEqual(['2099-03-07 10:30 casa Jornada 1 Gd Calendário', '2099-03-14 09:15 fora Jornada 2 Ad Terceira']);

  // The same print again: both games are already in the Agenda
  await page.getByRole('button', { name: /Importar jogos de um print do calendário/ }).click();
  await dialog
    .getByLabel('Print do calendário')
    .setInputFiles({ name: 'calendario.png', mimeType: 'image/png', buffer: png });
  await expect(dialog.getByRole('list', { name: 'Jogos encontrados' })).toContainText('já está na Agenda');
  await expect(dialog.getByRole('button', { name: 'Adicionar 0 jogo(s) à Agenda' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Fechar importar jogos' }).click();

  // Compact mode: on this phone only, kept after reopening the app
  await openMore(page, /Definições do Clube/);
  await page.getByRole('checkbox', { name: /Modo compacto/ }).check();
  await expect(page.locator('html')).toHaveClass(/compact/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/compact/);
  await enterPanel(page);
  await openMore(page, /Definições do Clube/);
  await page.getByRole('checkbox', { name: /Modo compacto/ }).uncheck();
  await expect(page.locator('html')).not.toHaveClass(/compact/);
});

test('foto do exercício, imagem da convocatória e plano para o adjunto', async ({ page }) => {
  // The photo is read on the server (Gemini): here the answer is simulated
  let mode = '';
  await page.route('**/api/ler-jornada', async (route) => {
    mode = route.request().postDataJSON()?.mode;
    await route.fulfill({
      json: {
        success: true,
        games: {
          name: 'Rondo da foto',
          category: 'tatica',
          durationMinutes: 18,
          objective: 'Pressão após perda',
          description: '4 fora, 2 dentro. Dois toques.',
          drawing: { x: 0, y: 0, w: 0.5, h: 0.5 }
        }
      }
    });
  });
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
  await page
    .getByLabel('Foto do exercício')
    .setInputFiles({ name: 'exercicio.png', mimeType: 'image/png', buffer: png });
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await expect(form.getByRole('note')).toContainText('Lido da foto');
  expect(mode).toBe('exercicio');
  await expect(form.getByPlaceholder('Ex: Rondo 4x2')).toHaveValue('Rondo da foto');
  await expect(form.getByRole('img', { name: 'Desenho: Rondo da foto' })).toBeVisible();
  await form.getByRole('button', { name: 'Usar a foto inteira' }).click();
  await form
    .getByRole('button', { name: /Guardar/ })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'Biblioteca de exercícios' })).toContainText('Rondo da foto');

  // Link for the assistant coach: created once, kept in the cloud with the next training's plan only
  await page.getByRole('button', { name: /Lista/ }).first().click();
  await page.getByRole('button', { name: /Plano para o adjunto/ }).click();
  const share = page.getByRole('dialog', { name: 'Plano para o adjunto' });
  await share.getByRole('button', { name: 'Criar link para o adjunto' }).click();
  const link = await share.getByLabel('Link do plano').inputValue();
  expect(link).toMatch(/\/plano\/[A-Za-z0-9]{24}$/);
  const res = await fetch(`${FIRESTORE}/public_plans/${link.split('/').pop()}`);
  expect(res.status).toBe(200);
  const raw = JSON.stringify(await res.json());
  expect(raw).toContain('Dragões');
  expect(raw).not.toMatch(/Rui Silva|absences/);
  await share.getByRole('button', { name: 'Fechar plano para o adjunto' }).click();

  // Convocatória picture for the parents
  await navTo(page, /agenda/i);
  await openAgendaRow(page, /vs AD Tempo Teste/);
  await page.getByTitle('Abrir Convocatória').click();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByRole('button', { name: /Imagem para os pais/ }).click();
  const picture = page.getByRole('dialog', { name: 'Imagem da convocatória' });
  await expect(picture.getByRole('img', { name: 'Imagem da convocatória para os pais' })).toBeVisible();
  await picture.screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/convocatoria-imagem.png` : undefined
  });
  const download = page.waitForEvent('download');
  await picture.getByRole('button', { name: /Partilhar imagem/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^Convocatoria_AD_Tempo_Teste_/);
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
  // Only the club's name, colour and symbol stay, for the entrance screen
  await expect(page.getByLabel('Clube')).toContainText('Dragões');
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/entrada.png` : undefined });
});

test('lista do saco: material do exercício no treino, e modo sol que fica lembrado', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /agenda/i);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '➕ Novo exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await form.getByLabel('Nome').fill('Jogo 5x5 com balizas');
  await form.getByLabel('Quantidade de cones').fill('16');
  await form.getByRole('button', { name: 'Mais balizas pequenas' }).click();
  await form.getByRole('button', { name: 'Mais balizas pequenas' }).click();
  await form.getByRole('button', { name: 'Mais bolas' }).click();
  await form.getByRole('button', { name: 'Guardar exercício' }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de exercícios' });
  await expect(library).toContainText('🎒 16 cones · 1 bola · 2 balizas pequenas');

  await page.getByRole('button', { name: /Lista/ }).first().click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.getByRole('button', { name: /Da biblioteca/ }).click();
  await page
    .getByRole('group', { name: 'Escolher da biblioteca' })
    .getByRole('button', { name: /Jogo 5x5 com balizas/ })
    .click();
  await page.getByRole('button', { name: /Guardar como Agendado/ }).click();
  await page.locator('[data-training-row]').first().click();
  const kit = page.getByRole('region', { name: 'Levar para o treino' });
  await expect(kit).toContainText('16 cones');
  await expect(kit).toContainText('2 balizas pequenas');
  await kit.getByRole('checkbox', { name: /16 cones/ }).click();
  await expect(kit.getByRole('checkbox', { name: /16 cones/ })).toHaveAttribute('aria-checked', 'true');

  // ☀️ in the top bar: the light look, remembered on this phone
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/\bsol\b/);
  await page.getByRole('button', { name: 'Modo sol' }).first().click();
  await expect(html).toHaveClass(/\bsol\b/);
  await page.reload();
  await expect(html).toHaveClass(/\bsol\b/);
  await enterPanel(page);
  await page.getByRole('button', { name: 'Modo sol' }).first().click();
  await expect(html).not.toHaveClass(/\bsol\b/);
});
