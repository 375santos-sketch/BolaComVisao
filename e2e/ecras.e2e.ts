import { deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { COACH_A, COACH_B, FIRESTORE, owner, PASSWORD } from './seed';
import { buildICS, feedFromRestDocument } from '../src/lib/calendarFeed';
import { parentsLiveFromRestDocument, renderParentsLivePage } from '../src/lib/parentsLive';
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

/** Jogo → Resultados → Estatísticas or Análise dos jogos (Análise has no tab of its own yet on the phone). */
const openFromResults = async (page: Page, name: 'Estatísticas' | 'Análise dos jogos') => {
  await navTo(page, /jogo/i);
  await page
    .getByRole('navigation', { name: 'Performance' })
    .getByRole('button', { name: 'Resultados', exact: true })
    .click();
  await page.getByRole('button', { name, exact: true }).click();
};

/** Planeamento → Agenda, in the list view (the Agenda opens on the week; these tests read the list of events). */
const openAgendaList = async (page: Page) => {
  await navTo(page, /planeamento/i);
  await page.getByRole('group', { name: 'Vista da agenda' }).getByRole('button', { name: 'Lista' }).click();
};

/** Agenda → Lista: opens the row of a game or training (also among the past ones) to show its actions. */
const openAgendaRow = async (page: Page, name: RegExp) => {
  // The rows of the list, not the "Próximo" cards on top (they open the edit form)
  const rows = page.locator('button:not(section[aria-label="Próximo"] button)').filter({ hasText: name });
  const past = page.getByRole('button', { name: /Ver os \d+ anteriores/ });
  if (!(await rows.count()) && (await past.isVisible())) await past.click();
  await rows.first().click();
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

  // Simple home: the season in four figures, shortcuts, what needs attention, the next 7 days.
  const notices = page.getByRole('region', { name: 'Avisos' });
  await expect(notices).toContainText('Convocatória por fechar: vs Abrantes');
  // Short of minutes only over the games each athlete was called up for: never called up does not count
  await expect(notices).toContainText('Precisam de minutos: Martim Costa (0%), Duarte Matos (20%)');
  await expect(notices).not.toContainText('Gabriel Sousa');
  const season = page.getByRole('region', { name: 'Resumo da época' });
  await expect(season.getByRole('button', { name: /Marcados/ })).toContainText('2em 2 jogos');
  await expect(season.getByRole('button', { name: /Sofridos/ })).toContainText('1em 2 jogos');
  await expect(season.getByRole('button', { name: /V-E-D/ })).toContainText('1-1-0');
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

  await openAgendaList(page);
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();

  await navTo(page, /jogo/i);
  await expect(page.getByRole('region', { name: 'Plano' })).toBeVisible();

  // Jogo: Pré-jogo · Ao vivo · Resultados; Estatísticas (with playing time) opens from Resultados
  const performanceTabs = page.getByRole('navigation', { name: 'Performance' });
  await performanceTabs.getByRole('button', { name: 'Resultados', exact: true }).click();
  await page.getByRole('button', { name: 'Estatísticas', exact: true }).click();
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

  await openMore(page, /Análise dos Jogos/);
  await expect(page.getByText(/ANÁLISE/i).first()).toBeVisible();

  // Simplified "Mais" menu: these were removed (21/10/2026)
  await navTo(page, /clube/i);
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
  await openAgendaList(page);
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
  await expect(need).toContainText('Duarte Matos 20%'); // 10' of the 50' of the one game he was called up for
  await expect(need).not.toContainText('Gabriel Sousa'); // never called up: not short of minutes
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
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Mais opções da agenda' }).click();
  await page.getByRole('menuitem', { name: /Calendário para os pais/ }).click();
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
  await page.getByRole('button', { name: 'Mais opções da agenda' }).click();
  await page.getByRole('menuitem', { name: /Calendário para os pais/ }).click();
  await page.getByRole('button', { name: 'Desativar este link' }).click();
  await expect.poll(published, { timeout: 30_000 }).toBeNull();
});

test('análise: remates e eficácia de finalização', async ({ page }) => {
  await signedIn(page);
  await openFromResults(page, 'Análise dos jogos');
  const shots = page.getByRole('region', { name: 'Remates' });
  await expect(shots).toBeVisible();
  await expect(shots).toContainText('1 jogo com remates registados');
  await expect(shots).toContainText('15 dentro · 6 fora da área');
  await expect(shots).toContainText('10% dos remates deram golo (2 em 21)'); // the Esparteiros game has no shots: left out
});

test('relatório do adversário pós-jogo: números do jogo, notas guardadas na nuvem e PDF', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await expect(
    page.getByRole('group', { name: 'Local do jogo' }).getByRole('button', { name: 'Casa' })
  ).toHaveAttribute('aria-pressed', 'true');
});

test('classificação: resultados colados da série, jogos da app e posição da equipa', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
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
  await openAgendaList(page);
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
  await navTo(page, /jogo/i);
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
  await navTo(page, /jogo/i);
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
  await openAgendaList(page);
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
  await expect(page.getByRole('button', { name: /Treino 4.*Por fazer/ })).toBeVisible();
  // …and it is the next training on top of Treinos
  await expect(page.getByRole('region', { name: 'Próximo treino' })).toContainText('Treino 4');

  // Absences per athlete, with the reason.
  await page
    .getByRole('button', { name: /^Presenças/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Rui Silva/ }).click();
  await expect(page.getByRole('list', { name: 'Faltas de Rui Silva' })).toContainText('Doente');
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
});

test('exercícios: biblioteca com desenho importado, usada no plano do treino', async ({ page }) => {
  await signedIn(page);
  await openAgendaList(page);
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
  // ⭐ Favourites have their own filter (and come first in the library and in the session's picker)
  await library.getByRole('button', { name: 'Favorito: Rondo 4x2' }).click();
  await expect(library.getByRole('button', { name: 'Favorito: Rondo 4x2' })).toHaveAttribute('aria-pressed', 'true');
  const filters = library.getByRole('group', { name: 'Filtrar exercícios' });
  await filters.getByRole('button', { name: '⭐ Favoritos' }).click();
  await expect(library).toContainText('Rondo 4x2');
  await filters.getByRole('button', { name: 'Todos' }).click();
  await expect
    .poll(async () => [...(await cloudRecords()).values()].find((r) => r.kind === 'exercise')?.name, {
      timeout: 30_000,
      message: 'exercício na nuvem'
    })
    .toBe('Rondo 4x2');

  // New training: the exercise joins the session plan with its drawing
  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.getByRole('button', { name: /Da biblioteca \(1\)/ }).click();
  await page
    .getByRole('group', { name: 'Escolher da biblioteca' })
    .getByRole('button', { name: /Rondo 4x2/ })
    .click();
  await expect(page.getByRole('img', { name: 'Desenho: Rondo 4x2' })).toBeVisible();
  await expect(page.getByText('Planeado: 15 /')).toBeVisible();
  // The session in three parts: what is missing is said
  await expect(page.getByRole('region', { name: 'Partes da sessão' }).first()).toContainText('Sem aquecimento');

  // Keep it as a model, save the training, and the library shows the exercise was used
  const models = page.getByRole('region', { name: 'Modelos de treino' });
  await models.getByRole('button', { name: /Guardar este treino como modelo/ }).click();
  await models.getByLabel('Nome do modelo').fill('Rondo semanal');
  await models.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Modelo "Rondo semanal" guardado ✓')).toBeVisible();
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await expect(page.getByRole('region', { name: 'Biblioteca de exercícios' })).toContainText(/Usado 1× · último hoje/);

  // A new training starts from the model; "Duplicar" opens a copy of a training to change and save
  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
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
  await expect(page.getByText(/Novo treino/).first()).toBeVisible();

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
  // Resumo at the top of the sheet: games, minutes, trainings (the same figures as before)
  const summary = page.getByRole('region', { name: 'Resumo' });
  await expect(summary).toContainText('convocado 2 · titular 2'); // played / called up
  await expect(summary).toContainText("100'");
  await expect(summary).toContainText('2 de 3'); // missed today's training (treinos test)
  await page
    .getByRole('navigation', { name: 'Secções da ficha' })
    .getByRole('button', { name: 'Estatísticas' })
    .click();
  const season = page.getByRole('region', { name: 'Época do atleta' });
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
  await page.getByRole('navigation', { name: 'Secções da ficha' }).getByRole('button', { name: 'Histórico' }).click();
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

  await page.getByRole('button', { name: 'Fechar a ficha' }).click();
  const all = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Mais ações do plantel' }).click();
  await page.getByRole('menuitem', { name: /Fim de época/ }).click();
  expect((await all).suggestedFilename()).toMatch(/^Fim_de_Epoca_Plantel_/);
});

test('evolução do atleta: avaliação em 5 áreas com radar e objetivos individuais, só para os treinadores', async ({
  page
}) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await page.getByRole('navigation', { name: 'Secções da ficha' }).getByRole('button', { name: 'Avaliação' }).click();
  const evaluations = page.getByRole('region', { name: 'Avaliações' });
  await expect(evaluations).toContainText('Ainda sem avaliações');
  await evaluations.getByRole('button', { name: '+ Nova avaliação' }).click();
  const form = page.getByRole('region', { name: 'Nova avaliação' });
  // Saving needs all five areas
  await expect(form.getByRole('button', { name: 'Guardar avaliação' })).toBeDisabled();
  for (const [area, v] of [
    ['Técnica', 4],
    ['Tática', 3],
    ['Física', 3],
    ['Psicológica e comportamental', 4],
    ['Compreensão do jogo', 3]
  ] as const)
    await form.getByRole('button', { name: `${area} ${v}`, exact: true }).click();
  await form.getByLabel('Observação do treinador').fill('Já procura o passe vertical');
  await form.getByRole('button', { name: 'Guardar avaliação' }).click();
  await expect(page.getByText('Avaliação guardada ✓')).toBeVisible();
  await expect(evaluations.getByRole('img', { name: /Competências: Técnica 4, Tática 3/ })).toBeVisible();
  await expect(evaluations.getByRole('list', { name: 'Lista de avaliações' })).toContainText('média 3,4');
  await expect(evaluations).toContainText('Já procura o passe vertical');

  const goals = page.getByRole('region', { name: 'Objetivos individuais' });
  await goals.getByLabel('Novo objetivo').fill('Receber orientado para a frente');
  await goals.getByLabel('Área do objetivo').selectOption('tecnica');
  await goals.getByRole('button', { name: 'Adicionar' }).click();
  await expect(goals).toContainText('Técnica · desde');
  await goals.getByLabel('Cumprido: Receber orientado para a frente').check();
  await expect(goals).toContainText('cumprido a');

  // Kept in the athlete's record in the cloud (the other coaches see it too)
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('Já procura o passe vertical') && raw.includes('Receber orientado para a frente');
      },
      { timeout: 30_000, message: 'avaliação e objetivo no registo do atleta' }
    )
    .toBe(true);
  await page.getByRole('region', { name: 'Avaliações' }).screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/evolucao-atleta.png` : undefined
  });
});

test('quadro tático: sistema, atletas nos lugares, arrastar, setas e estratégia guardada na nuvem', async ({
  page
}) => {
  await signedIn(page);
  await openMore(page, /Quadro tático/);
  const board = page.getByRole('dialog', { name: 'Quadro tático' });
  await board.getByLabel('Nome da estratégia').fill('Saída curta');
  await board.getByLabel('Sistema').selectOption('3-2-1');
  // Tap a place, choose the athlete
  const tap = async (name: string) => {
    const b = (await board.getByRole('button', { name }).boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  // The welcome message sits over the bottom of the pitch for a moment
  await expect(page.getByText(/Bem-vindo/)).toBeHidden({ timeout: 10_000 });
  await tap('Lugar 1: vazio');
  await board
    .getByRole('region', { name: 'Escolher atleta' })
    .getByRole('button', { name: /Rui Silva/ })
    .click();
  await expect(board.getByRole('button', { name: 'Lugar 1: Rui Silva' })).toBeVisible();
  await expect(board.getByRole('region', { name: 'Suplentes' })).not.toContainText('Rui');
  // Drag a place and draw a movement
  const pitch = board.getByRole('img', { name: /Campo: Saída curta em 3-2-1/ });
  const box = (await pitch.boundingBox())!;
  const piece = (await board.getByRole('button', { name: 'Lugar 2: vazio' }).boundingBox())!;
  await page.mouse.move(piece.x + piece.width / 2, piece.y + piece.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await board.getByRole('button', { name: /Desenhar setas/ }).click();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 5 });
  await page.mouse.up();
  await expect(board.getByRole('button', { name: '↩︎ Apagar última seta' })).toBeEnabled();
  await board.getByRole('button', { name: 'Guardar estratégia' }).click();
  await expect(page.getByText('"Saída curta" guardada ✓')).toBeVisible();
  await board.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/quadro-tatico.png` : undefined });
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const docs = ((await res.json()).documents || []) as Array<{ fields: Record<string, any> }>;
        const play = docs.find(
          (d) =>
            d.fields.kind?.stringValue === 'tacticplay' &&
            d.fields.data?.mapValue?.fields?.name?.stringValue === 'Saída curta'
        );
        const data = play?.fields.data?.mapValue?.fields;
        return data ? `${data.system?.stringValue} ${JSON.stringify(data.frames).includes('arrows')}` : null;
      },
      { timeout: 30_000, message: 'estratégia guardada na nuvem' }
    )
    .toBe('3-2-1 true');
  // Another version to change
  await board.getByRole('button', { name: 'Nova versão' }).click();
  await expect(board.getByLabel('Nome da estratégia')).toHaveValue('Saída curta (versão 2)');
  page.once('dialog', (d) => d.accept());
  await board.getByRole('button', { name: 'Fechar quadro tático' }).click();
});

test('adversários: resultados, próximo jogo e ficha da equipa técnica que aparece no Pré-jogo', async ({ page }) => {
  await signedIn(page);
  await openMore(page, /Adversários/);
  const dialog = page.getByRole('dialog', { name: 'Adversários' });
  const list = dialog.getByRole('list', { name: 'Lista de adversários' });
  await expect(list).toContainText('Tramagal SU');
  await expect(list).toContainText('Abrantes');
  await list.getByRole('button', { name: /Tramagal SU/ }).click();
  await expect(dialog.getByRole('region', { name: 'Resultados contra este adversário' })).toContainText(
    /1 jogo · \d+V/
  );
  await dialog.getByRole('button', { name: '‹ Todos os adversários' }).click();
  await list.getByRole('button', { name: /Abrantes/ }).click();
  const file = dialog.getByRole('region', { name: 'Ficha do adversário' });
  await file.getByLabel('Formação habitual').fill('3-2-1');
  await file.getByLabel('Pontos fortes (um por linha)').fill('Jogo aéreo\nContra-ataque');
  await file.getByLabel('Estratégia para o próximo jogo').fill('Pressionar a saída curta do guarda-redes');
  await file.getByRole('button', { name: 'Guardar ficha' }).click();
  await expect(page.getByText('Ficha guardada ✓')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar adversários' }).click();

  // The file comes up when preparing the game against them
  await navTo(page, /jogo/i);
  await expect(page.getByRole('region', { name: 'Ficha do adversário' })).toContainText(
    'Pressionar a saída curta do guarda-redes'
  );
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/club`, { headers: owner });
        return JSON.stringify(await res.json()).includes('Pressionar a saída curta');
      },
      { timeout: 30_000, message: 'ficha guardada na nuvem' }
    )
    .toBe(true);
});

test('comunicação e assistente: aviso de alteração para os pais e as ferramentas num só sítio', async ({ page }) => {
  await signedIn(page);
  await openMore(page, /Comunicação/);
  const com = page.getByRole('dialog', { name: 'Comunicação' });
  const notice = com.getByRole('region', { name: 'Aviso de alteração' });
  await notice.getByRole('group', { name: 'O que mudou' }).getByRole('button', { name: '🕒 Hora' }).click();
  await notice.getByLabel('Novo valor').fill('18:30');
  await expect(notice.getByLabel('Mensagem')).toContainText('Alteração de horário');
  await expect(notice.getByLabel('Mensagem')).toContainText('para as 18:30');
  await expect(notice.getByRole('link', { name: /Enviar pelo WhatsApp/ })).toHaveAttribute(
    'href',
    /wa\.me\/\?text=.*18%3A30/
  );
  // The channels open where each one lives
  await com.getByRole('button', { name: /Link do jogo para os pais/ }).click();
  await expect(page.getByRole('dialog', { name: 'Link para os pais' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar link para os pais' }).click();

  await openMore(page, /Assistente/);
  const hub = page.getByRole('dialog', { name: 'Assistente' });
  await expect(hub.getByRole('region', { name: 'Em preparação' })).toContainText('ainda não disponível');
  await hub.getByRole('button', { name: /Tendências da equipa/ }).click();
  await expect(page.getByRole('region', { name: 'Tendências da equipa' })).toBeVisible();
});

test('painel: equipa e atleta por época, jogo, confronto e período; exportar para Power BI', async ({ page }) => {
  await signedIn(page);
  await openFromResults(page, 'Estatísticas');
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
  // …inside the sheet, not in a window on top
  await page.getByRole('button', { name: /Painel do atleta/ }).click();
  await expect(page.getByRole('region', { name: 'Painel de estatísticas' })).toContainText('Painel · Tomás Gonçalves');
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
  // The sheet stays open after editing; back to the squad list, where the injury also shows
  await page.getByRole('button', { name: 'Fechar a ficha' }).click();
  await expect(page.getByText('Lesionado até 15/01').first()).toBeVisible();

  await openAgendaList(page);
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
  await openAgendaList(page);
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

  // ⏸️ The game stops (injury): the clock stops too, and carries on from the same second
  const clock = page.locator('span.tracking-wider').first();
  await page.getByRole('button', { name: '⏸️ Pausa' }).click();
  await expect(page.getByText('Jogo em pausa: o tempo está parado.', { exact: false })).toBeVisible();
  const stopped = await clock.textContent();
  await advance('03:00');
  await expect(clock).toHaveText(stopped!);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/pausa.png` : undefined });
  await page.getByRole('button', { name: '▶️ Retomar o jogo' }).click();
  await expect(page.getByRole('button', { name: '⏸️ Pausa' })).toBeVisible();

  // 26': goal conceded, then half time after 25 minutes.
  await advance('10:00');
  await page.getByRole('button', { name: /GOLO SOFRIDO/i }).click();
  await page.getByRole('button', { name: 'Confirmar Golo Sofrido' }).click();
  await page.getByRole('button', { name: /Terminar 1.ª parte/ }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
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
  // ↩︎ Any action can be undone with one tap (here a corner tapped by mistake)
  await page.getByTitle('Adicionar Canto').first().click();
  await page.getByRole('button', { name: '↩︎ Desfazer: Canto a favor' }).click();
  await expect(page.getByText('Desfeito: Canto a favor')).toBeVisible();
  await expect(page.getByRole('button', { name: '↩︎ Desfazer: Golo marcado' })).toBeVisible();
  await advance('05:00');

  // Playing minutes: 25 + 10, Duarte left at 16', Henrique came on at 16'.
  // Ao vivo → Em campo: the minutes of each athlete are always listed
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
  await openAgendaList(page);
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
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Mais opções da agenda' }).click();
  await page.getByRole('menuitem', { name: /Importar jogos de um print do calendário/ }).click();
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
  await page.getByRole('button', { name: 'Mais opções da agenda' }).click();
  await page.getByRole('menuitem', { name: /Importar jogos de um print do calendário/ }).click();
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
  await openAgendaList(page);
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
  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
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
  await openAgendaList(page);
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
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '➕ Novo exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await form.getByLabel('Nome').fill('Jogo 5x5 com balizas');
  // Written by the coach: the type, the variants and the material
  await form.getByLabel('Tipo').fill('Jogo reduzido');
  await form.getByLabel('Variantes').fill('Mais difícil: golo só depois de 5 passes.');
  await form.getByLabel(/Material/).fill('16 cones, 2 balizas pequenas, 1 bola e apito');
  await form.getByRole('button', { name: 'Guardar exercício' }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de exercícios' });
  const card = library.getByRole('listitem').filter({ hasText: 'Jogo 5x5 com balizas' });
  await expect(card).toContainText('Jogo reduzido · 15 min');
  await expect(card).toContainText('🎒 16 cones, 2 balizas pequenas, 1 bola e apito');
  await card.getByRole('button', { name: 'Editar' }).click();
  await expect(form.getByLabel('Variantes')).toHaveValue('Mais difícil: golo só depois de 5 passes.');
  await expect(form.getByLabel('Tipo')).toHaveValue('Jogo reduzido');
  await form.getByRole('button', { name: 'Cancelar' }).click();

  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.getByRole('button', { name: /Da biblioteca/ }).click();
  await page
    .getByRole('group', { name: 'Escolher da biblioteca' })
    .getByRole('button', { name: /Jogo 5x5 com balizas/ })
    .click();
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();
  await page.locator('[data-training-row]').first().click();
  const kit = page.getByRole('region', { name: 'Levar para o treino' });
  await expect(kit).toContainText('16 cones');
  await expect(kit).toContainText('2 balizas pequenas');
  await expect(kit).toContainText('apito');
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

test('crónica do jogo e cromo do atleta (imagem e PDF de todos)', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /jogo/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Crónica do jogo/ }).click();
  const chronicle = page.getByRole('dialog', { name: 'Crónica do jogo' });
  const text = chronicle.getByLabel('Mensagem');
  // No Gemini key in the tests: the app writes the plain version itself and says so
  await expect(chronicle.getByRole('note')).toContainText('texto mais simples');
  await expect(text).toHaveValue(/venceu por \d-\d frente a Tramagal SU/);
  await expect(text).toHaveValue(/Golos de Rui \(2\)/);
  await chronicle.getByLabel('Dizer quem marcou').uncheck();
  await expect(text).not.toHaveValue(/Rui/);
  await chronicle.getByRole('button', { name: '💬 Grupo dos pais' }).click();
  await expect(text).toHaveValue(/^⚽ Vitória/);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cronica.png` : undefined });
  await chronicle.getByRole('button', { name: 'Fechar' }).click();

  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  // The athlete's card is one of the actions at the top of the sheet
  await page.getByRole('button', { name: 'Cromo', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Cromo do atleta' });
  await expect(card.getByRole('img', { name: 'Cromo de Rui Silva' })).toBeVisible();
  await page.waitForTimeout(600);
  await card
    .getByRole('img', { name: 'Cromo de Rui Silva' })
    .screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cromo.png` : undefined });
  await card.getByRole('button', { name: 'Fechar cromo' }).click();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Fechar' })
    .first()
    .click()
    .catch(() => {});

  await page.getByRole('button', { name: 'Mais ações do plantel' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Cromos de todos (PDF)' }).click();
  expect((await download).suggestedFilename()).toMatch(/^Cromos_Drag.*\.pdf$/);
  await expect(page.getByText(/^\d+ cromos prontos a imprimir 🃏$/)).toBeVisible();
});

test('vídeo do jogo: link do YouTube, início das partes e cada lance no seu momento', async ({ page }) => {
  // The test does not depend on YouTube's own player (its scripts change and can throw on their own): an empty page
  await page.route(/youtube(-nocookie)?\.com\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Vídeo</title>' })
  );
  await signedIn(page);
  await navTo(page, /jogo/i);
  await page.getByRole('button', { name: 'Resultados', exact: true }).first().click();
  await page.getByText('Tramagal SU').click();
  await page.getByRole('button', { name: /Vídeo do jogo/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Vídeo do jogo' });
  await dialog.getByPlaceholder('https://youtu.be/…').fill('https://vimeo.com/1');
  await expect(dialog.getByText('Este link não é de um vídeo do YouTube.')).toBeVisible();
  await dialog.getByPlaceholder('https://youtu.be/…').fill('https://www.youtube.com/watch?v=aB3xQ_9-zZk');
  await dialog.getByLabel('Início da 1.ª parte no vídeo').fill('2:15');
  await dialog.getByLabel('Início da 2.ª parte no vídeo').fill('33:40');
  await dialog.getByRole('button', { name: 'Guardar e ver os lances' }).click();
  await expect(page.getByText('Vídeo ligado ao jogo ✓')).toBeVisible();

  const list = dialog.getByRole('list', { name: 'Lances do jogo' });
  // Rui's goal at 12' of the 1st half: 2:15 + 11:00 − 10 s
  await expect(list).toContainText('Golo · Rui');
  await expect(list).toContainText('13:05 no vídeo');
  await dialog.getByRole('button', { name: /^⚽ Golos \d+$/ }).click();
  await expect(list).not.toContainText('Golo sofrido');
  await expect(list).not.toContainText('Sai ');
  await list.getByRole('button', { name: /^Ver 12' Golo · Rui/ }).click();
  await list.getByRole('button', { name: '+5 s' }).click();
  await expect(list).toContainText('13:10 no vídeo');
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/video-jogo.png` : undefined });
  await dialog.getByRole('button', { name: 'Fechar vídeo' }).click();

  // Kept with the game in the cloud
  await expect(page.getByRole('button', { name: /Vídeo do jogo ✓/ })).toBeVisible();
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        return JSON.stringify(await res.json()).includes('aB3xQ_9-zZk');
      },
      { timeout: 30_000, message: 'vídeo guardado no jogo na nuvem' }
    )
    .toBe(true);
});

test('testes: resultados por momento com cronómetro e evolução só na ficha do atleta', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await page.getByRole('button', { name: 'Testes', exact: true }).click();
  const section = page.getByRole('region', { name: 'Testes' });
  await section.getByRole('button', { name: /^Setembro/ }).click();
  await section.getByLabel('Sprint 20 m de Rui Silva').fill('4,1');
  await section.getByLabel('Sprint 20 m de Rui Silva').press('Enter');
  await expect(section).toContainText('1 de');

  await section.getByRole('button', { name: /^Janeiro/ }).click();
  await expect(section.getByLabel('Sprint 20 m de Rui Silva')).toHaveValue('');
  await expect(section.getByRole('listitem').filter({ hasText: 'Rui Silva' })).toContainText('set 4,10');
  // Stopwatch: "Partida" at the start, "Chegou" at the line
  await section.getByRole('button', { name: 'Cronómetro para Rui Silva' }).click();
  const watch = page.getByRole('dialog', { name: 'Cronómetro do teste' });
  // Both taps in the same instant, whatever the speed of the machine running the test
  await watch.evaluate(async (dialog) => {
    const button = (text: string) =>
      [...dialog.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
        HTMLButtonElement | undefined;
    button('Partida')!.click();
    while (!button('Chegou')) await new Promise((r) => requestAnimationFrame(r));
    button('Chegou')!.click();
  });
  // A tap too quick for a 20 m sprint cannot be saved
  await expect(watch.getByRole('alert')).toContainText('demasiado curto');
  await expect(watch.getByRole('button', { name: '✓ Guardar' })).toBeDisabled();
  await watch.getByRole('button', { name: '↺ Repetir' }).click();
  await page.waitForTimeout(2300);
  await watch.getByRole('button', { name: '■ Chegou' }).click();
  await watch.getByRole('button', { name: '✓ Guardar' }).click();
  await expect(watch).toBeHidden();
  await expect(page.getByText(/Sprint 20 m de Rui Silva: 2,\d\d s ✓/)).toBeVisible();
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/testes.png` : undefined });

  // The athlete's own evolution, in the athlete's sheet
  await page.getByRole('button', { name: 'Plantel', exact: false }).first().click();
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await page.getByRole('navigation', { name: 'Secções da ficha' }).getByRole('button', { name: 'Físico' }).click();
  const own = page.getByRole('region', { name: 'Testes da época' });
  await expect(own).toContainText(/Sprint 20 m.*4,10 s → 2,\d\d s 🚀/);
  await expect(own).toContainText('Melhorou em 1 de 1 teste 💪');
});

test('exercício criado pela IA, pausas de água com calor e a minha carreira', async ({ page }) => {
  // The AI and the weather answer with fixed data (no real internet in the tests)
  const asked: Array<Record<string, unknown>> = [];
  await page.route('**/api/exercicio-ia', async (route) => {
    const body = route.request().postDataJSON();
    asked.push(body);
    await route.fulfill({
      json: {
        success: true,
        exercise: {
          name: asked.length === 1 ? 'Rondo 4+1 com terceiro homem' : 'Jogo 4x4 com zona de saída',
          category: 'tatica',
          durationMinutes: 15,
          objective: 'Encontrar o terceiro homem para sair da pressão',
          description: 'Quadrado 15x15 m, 4 fora e 1 joker contra 3.',
          material: { cones: 4, coletes: 3, bolas: 6 }
        }
      }
    });
  });
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { results: [{ latitude: 39.46, longitude: -8.2 }] } })
  );
  const hours = (v: number) => Array.from({ length: 24 }, () => v);
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        hourly: {
          temperature_2m: hours(33),
          precipitation_probability: hours(0),
          weather_code: hours(0),
          wind_speed_10m: hours(5)
        }
      }
    })
  );
  await signedIn(page);
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '✨ Criar exercício com IA' }).click();
  const ai = page.getByRole('region', { name: 'Criar exercício com IA' });
  await ai.getByLabel('O que quer trabalhar?').fill('terceiro homem na saída de bola');
  await ai.getByLabel('Jogadores').fill('9');
  await ai.getByRole('button', { name: '✨ Criar exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await expect(form.getByLabel('Nome')).toHaveValue('Rondo 4+1 com terceiro homem');
  await expect(form.getByLabel(/Material/)).toHaveValue(/4 cones/);
  expect(asked[0]).toMatchObject({ goal: 'terceiro homem na saída de bola', players: 9, ageGroup: 'Sub-11' });
  await form.getByRole('button', { name: '🔄 Outra proposta' }).click();
  await expect(form.getByLabel('Nome')).toHaveValue('Jogo 4x4 com zona de saída');
  expect(asked[1]).toMatchObject({ avoid: ['Rondo 4+1 com terceiro homem'] });
  await form.getByRole('button', { name: 'Guardar exercício' }).click();
  await expect(page.getByRole('region', { name: 'Biblioteca de exercícios' })).toContainText(
    'Jogo 4x4 com zona de saída'
  );

  // Hot day: water breaks between the blocks of the training
  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.getByPlaceholder('Ex: Campo Sintético, Campo Principal, Pavilhão...').fill('Campo Municipal');
  await page.getByRole('button', { name: /Da biblioteca/ }).click();
  await page
    .getByRole('group', { name: 'Escolher da biblioteca' })
    .getByRole('button', { name: /Jogo 4x4 com zona de saída/ })
    .click();
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();
  await page.locator('[data-training-row]').first().click();
  const heat = page.getByRole('region', { name: 'Calor: pausas de água' });
  await expect(heat).toContainText('33 °C');
  await expect(heat).toContainText('Pausas de água de 3 min a cada 15 min');
  await expect(heat.getByRole('link', { name: /Avisar os pais/ })).toHaveAttribute('href', /garrafa/);

  // My career: title, credits and the warning before it expires
  await openMore(page, /A minha carreira/);
  const career = page.getByRole('dialog', { name: 'A minha carreira' });
  await career.getByRole('textbox', { name: 'Título', exact: true }).fill('Grau I · UEFA C');
  await career.getByRole('textbox', { name: 'Título', exact: true }).blur();
  const soon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  await career.locator('input[type=date]').first().fill(soon);
  await career.getByLabel('Créditos precisos para renovar').fill('15');
  await career.getByRole('button', { name: '＋ Formação' }).click();
  await career.getByLabel('Nome da formação').fill('Ação de formação Futebol de 7');
  await career.getByLabel('Créditos da formação').fill('4');
  await career.getByRole('button', { name: 'Guardar formação' }).click();
  await expect(career).toContainText('4 de 15 créditos');
  // Clubs by year
  await career.getByRole('button', { name: '＋ Clube' }).click();
  await career.getByLabel('Clube', { exact: true }).fill('CD Falcões');
  await career.getByLabel('Ano ou época').fill('2019–2021');
  await career.getByLabel('Função').fill('Adjunto');
  await career.getByRole('button', { name: 'Guardar clube' }).click();
  await career.getByRole('button', { name: '＋ Clube' }).click();
  await career.getByLabel('Clube', { exact: true }).fill('GD Ribeira');
  await career.getByLabel('Ano ou época').fill('2023/2024');
  await career.getByLabel('Escalão').fill('Sub-11');
  await career.getByRole('button', { name: 'Guardar clube' }).click();
  await expect(career.getByRole('list', { name: 'Clubes' }).getByRole('listitem')).toHaveText([
    /GD Ribeira.*Sub-11.*2023\/2024/,
    /CD Falcões.*Adjunto.*2019–2021/
  ]);
  await expect(career.getByRole('alert').first()).toContainText(/O título caduca em [23] meses/);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/carreira.png` : undefined });
  // The coach's photo goes at the top of the CV
  await career.getByLabel('Foto do treinador').setInputFiles('e2e/fixtures/exercicio.jpg');
  await expect(career.getByRole('img', { name: 'A minha foto' })).toBeVisible();
  const download = page.waitForEvent('download');
  await career.getByRole('button', { name: '📄 Currículo em PDF' }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/^Curriculo_.*\.pdf$/);
  expect(readFileSync(await pdf.path()).toString('latin1')).toMatch(/\/Subtype\s*\/Image/);
});

test('exercício sem explicação para as crianças, assinatura nos PDFs e visita guiada', async ({ page }) => {
  await signedIn(page);
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '➕ Novo exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await form.getByLabel('Nome').fill('Rondo 4+1');
  await form.getByLabel('Descrição / regras (opcional)').fill('Quadrado 15x15 m, 4 fora e 1 joker contra 3.');
  // The "explicar às crianças" part was taken out of the exercises
  await expect(form.getByRole('region', { name: 'Para as crianças' })).toHaveCount(0);
  await expect(form.getByRole('button', { name: /Explicar às crianças/ })).toHaveCount(0);
  await form.getByRole('button', { name: 'Guardar exercício' }).click();
  await expect(page.getByRole('region', { name: 'Biblioteca de exercícios' })).toContainText('Rondo 4+1');

  // ✍️ Sign once with the finger
  await openMore(page, /Assinatura/);
  const sign = page.getByRole('dialog', { name: 'Assinatura' });
  const board = sign.getByLabel('Quadro para assinar');
  // The window slides in: wait until the board stops moving before measuring it, or the stroke misses it
  await board.hover({ position: { x: 20, y: 40 } });
  const box = (await board.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 20 + i * 25, box.y + box.height / 2 + (i % 2 ? -20 : 20));
  await page.mouse.up();
  // Something was drawn on the board (dark pixels on the white)
  expect(
    await board.evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    })
  ).toBe(true);
  await sign.getByRole('button', { name: '✓ Guardar' }).click();
  await expect(page.getByText('Assinatura guardada ✓')).toBeVisible();
  await openMore(page, /Assinatura/);
  await expect(
    page.getByRole('dialog', { name: 'Assinatura' }).getByRole('img', { name: 'Assinatura guardada' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fechar assinatura' }).click();

  // 🧭 Guided tour, from Mais
  await openMore(page, /Visita guiada/);
  const tour = page.getByRole('dialog', { name: 'Visita guiada' });
  await expect(tour).toContainText('Bem-vindo à BolaComVisão');
  await tour.getByRole('button', { name: 'Seguinte →' }).click();
  await expect(tour).toContainText('Treino de hoje');
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/visita.png` : undefined });
  for (let i = 0; i < 4; i++) await tour.getByRole('button', { name: 'Seguinte →' }).click();
  await expect(tour).toContainText('Clube');
  await tour.getByRole('button', { name: 'Começar ✓' }).click();
  await expect(tour).toBeHidden();
});

test('fichas PDF antigas: cada exercício passa para a biblioteca só com o seu desenho e a explicação', async ({
  page
}) => {
  await signedIn(page);
  // The AI reads the page: two exercises, each with the box of its own drawing
  const modes: string[] = [];
  await page.route('**/api/ler-jornada', async (route) => {
    const body = route.request().postDataJSON() as { mode: string; image: string };
    modes.push(body.mode);
    expect(body.image).toMatch(/^data:image\/jpeg;base64,/);
    await route.fulfill({
      json: {
        success: true,
        games: {
          exercises: [
            {
              name: 'Rondo 5x2',
              category: 'tecnica',
              durationMinutes: 12,
              objective: 'Circulação de bola sob pressão',
              description: 'Quadrado de 12x12 metros. Dois toques; ao recuperar, os defesas saem a conduzir.',
              material: { cones: 4, bolas: 2, coletes: 2 },
              drawing: { x: 0.07, y: 0.084, w: 0.381, h: 0.202 }
            },
            {
              name: 'Finalização 2x1',
              category: 'jogo',
              objective: 'Finalizar em superioridade',
              description: 'Ataque à baliza em superioridade numérica. Remate em 6 segundos.',
              drawing: { x: 0.07, y: 0.37, w: 0.381, h: 0.202 }
            }
          ]
        }
      }
    });
  });
  // An old sheet of the Biblioteca de PDFs, kept only in this browser (IndexedDB)
  const fileData = `data:application/pdf;base64,${readFileSync('e2e/fixtures/ficha.pdf').toString('base64')}`;
  await page.evaluate(
    (data) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('BolaComVisao_PDFLibrary_DB', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('pdf_documents', { keyPath: 'id' });
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('pdf_documents', 'readwrite');
          tx.objectStore('pdf_documents').put({
            id: 'ficha-antiga-1',
            title: 'Ficha de treino Sub-11',
            category: 'tecnica',
            tags: [],
            fileName: 'ficha.pdf',
            fileSize: 6456,
            uploadedAt: '2026-10-01T10:00:00.000Z',
            fileData: data
          });
          tx.oncomplete = () => resolve();
        };
      }),
    fileData
  );
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  const sheets = page.getByRole('region', { name: 'Fichas PDF' });
  await expect(sheets).toContainText('1 guardada neste aparelho');
  await expect(sheets).toContainText('Ficha de treino Sub-11');

  await sheets.getByRole('button', { name: 'Passar a ficha para a biblioteca' }).click();
  await expect(sheets).toContainText('✓ 2 exercícios', { timeout: 30_000 });
  expect(modes).toEqual(['exercicios']);
  const library = page.getByRole('region', { name: 'Biblioteca de exercícios' });
  const rondo = library.getByRole('listitem').filter({ hasText: 'Rondo 5x2' });
  await expect(rondo).toContainText('Circulação de bola sob pressão');
  await expect(rondo).toContainText('🎒 4 cones · 2 coletes · 2 bolas');
  await expect(library.getByRole('listitem').filter({ hasText: 'Finalização 2x1' })).toContainText('15 min');
  // Only the drawing: much wider than tall, not the whole (tall) page
  const size = await rondo.locator('img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size[0]).toBeGreaterThan(size[1]);

  await rondo.getByRole('button', { name: 'Editar' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await expect(form.getByLabel('Descrição / regras (opcional)')).toHaveValue(/os defesas saem a conduzir/);
  await expect(form.getByLabel('Descrição / regras (opcional)')).not.toHaveValue(/Remate em 6 segundos/);
  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()].filter(
          (r) => r.kind === 'exercise' && /^(Rondo 5x2|Finalização 2x1)$/.test(r.name || '') && r.hasImage
        ).length,
      { timeout: 30_000, message: 'exercícios da ficha na nuvem com o desenho' }
    )
    .toBe(2);

  // The original PDF still opens on this device
  await sheets.getByRole('button', { name: 'Ver Ficha de treino Sub-11' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
});

test('montar o campo: meio campo à quinta, medidas em falta, passo a passo e envio ao adjunto', async ({ page }) => {
  await signedIn(page);
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  const library = page.getByRole('region', { name: 'Biblioteca de exercícios' });
  for (const [name, rules] of [
    ['Quadrado de aquecimento', 'Quadrado de 15x15, passe e movimento.'],
    ['Jogo de posse', 'Duas equipas, quem perde a bola sai.']
  ]) {
    await page.getByRole('button', { name: '➕ Novo exercício' }).click();
    const form = page.getByRole('region', { name: 'Editar exercício' });
    await form.getByLabel('Nome').fill(name);
    await form.getByLabel('Descrição / regras (opcional)').fill(rules);
    await form.getByRole('button', { name: 'Guardar exercício' }).click();
    await expect(library).toContainText(name);
  }

  // A Thursday training with both exercises
  await page
    .getByRole('button', { name: /^Sessões/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
  await page.locator('input[type="date"]').first().fill('2099-03-05');
  await page.getByPlaceholder('Ex: Campo Sintético, Campo Principal, Pavilhão...').fill('Campo do teste de montar');
  await page.getByRole('button', { name: /Da biblioteca/ }).click();
  const pick = page.getByRole('group', { name: 'Escolher da biblioteca' });
  await pick.getByRole('button', { name: /Quadrado de aquecimento/ }).click();
  await page.getByRole('button', { name: /Da biblioteca/ }).click();
  await pick.getByRole('button', { name: /Jogo de posse/ }).click();
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();
  await page.locator('[data-training-row]').filter({ hasText: 'Campo do teste de montar' }).click();
  await page.getByRole('button', { name: '📐 Montar o campo' }).click();

  const setup = page.getByRole('dialog', { name: 'Montar o campo' });
  // Thursdays: half of the 7-a-side pitch
  await expect(setup.getByRole('radio', { name: /Meio campo de 7/ })).toHaveAttribute('aria-checked', 'true');
  await expect(setup).toContainText('Fica guardado para as quintas');
  // The size written in the exercise is used; the other one is asked once
  const missing = setup.getByRole('region', { name: 'Medidas em falta' });
  await expect(missing).toContainText('Jogo de posse');
  await missing.getByLabel('Largura de Jogo de posse').fill('30');
  await missing.getByLabel('Comprimento de Jogo de posse').fill('20');
  await missing.getByRole('button', { name: 'Guardar medidas de Jogo de posse' }).click();
  await expect(missing).toBeHidden();

  const drawn = setup.getByRole('region', { name: 'Campo desenhado' });
  await expect(drawn.getByRole('img', { name: 'Campo com as zonas dos exercícios' })).toBeVisible();
  await expect(drawn).toContainText('A Quadrado de aquecimento');
  await expect(drawn).toContainText('B Jogo de posse');
  await setup.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/montar-campo.png` : undefined });

  // Half a pitch: the game goes in the warm-up's space once it is over
  await setup.getByRole('tab', { name: 'Passo a passo' }).click();
  const steps = setup.getByRole('region', { name: 'Passo a passo' });
  await expect(steps).toContainText('Da 🚩, anda 2 passos ao longo da linha de fundo');
  await expect(steps).toContainText(
    'Quando acabar a zona A, muda os cones dela para um retângulo de 30 passos × 20 passos'
  );
  await steps.getByRole('checkbox').first().click();
  await expect(steps).toContainText('1 de 2 feitos');
  await setup.getByRole('button', { name: /Ver em metros/ }).click();
  await expect(steps).toContainText('30 m × 20 m');

  // The whole pitch: both fit at the same time
  await setup
    .getByRole('radio', { name: /Campo de 7/ })
    .first()
    .click();
  await expect(setup.getByRole('radio', { name: '⚽ Campo de 7' })).toHaveAttribute('aria-checked', 'true');
  await expect(steps).not.toContainText('Quando acabar');

  // No link for the assistant yet: it opens the link window
  await setup.getByRole('button', { name: '📲 Mandar ao adjunto' }).click();
  await expect(page.getByRole('dialog', { name: 'Plano para o adjunto' })).toBeVisible();
});

test('exercício no nível certo: marcar como correu, variante no treino seguinte e evolução na biblioteca', async ({
  page
}) => {
  await signedIn(page);
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page.getByRole('button', { name: /Exercícios/ }).click();
  await page.getByRole('button', { name: '➕ Novo exercício' }).click();
  const form = page.getByRole('region', { name: 'Editar exercício' });
  await form.getByLabel('Nome').fill('Rondo com joker');
  await form.getByLabel('Descrição / regras (opcional)').fill('Quadrado de 15x15, o joker joga com quem tem a bola.');
  await form.getByRole('button', { name: 'Guardar exercício' }).click();

  const newTraining = async (date: string) => {
    await page
      .getByRole('button', { name: /^Sessões/ })
      .first()
      .click();
    await page.getByRole('button', { name: /Inserir Treino Único/ }).click();
    await page.locator('input[type="date"]').first().fill(date);
    await page.getByPlaceholder('Ex: Campo Sintético, Campo Principal, Pavilhão...').fill(`Campo do nível ${date}`);
    await page.getByRole('button', { name: /Da biblioteca/ }).click();
    await page
      .getByRole('group', { name: 'Escolher da biblioteca' })
      .getByRole('button', { name: /Rondo com joker/ })
      .click();
  };

  // Monday: the rondo was easy
  await newTraining('2099-04-06');
  await expect(page.getByRole('region', { name: /Sugestão para/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();
  await page.locator('[data-training-row]').filter({ hasText: 'Campo do nível 2099-04-06' }).click();
  const rate = page.getByRole('group', { name: 'Como correu: Rondo com joker' });
  await rate.getByRole('button', { name: '😴 Fácil' }).click();
  await expect(rate.getByRole('button', { name: '😴 Fácil' })).toHaveAttribute('aria-pressed', 'true');

  // Thursday: the plan proposes how to make it harder
  await newTraining('2099-04-09');
  const tip = page.getByRole('region', { name: 'Sugestão para Rondo com joker' });
  await expect(tip).toContainText('😴 Da última vez (seg 06/04) foi fácil.');
  await expect(tip.getByLabel('📐 Espaço mais pequeno: 12×12 (era 15×15)')).toBeChecked();
  await expect(tip.getByLabel('✋ Máximo 2 toques')).toBeChecked();
  await expect(tip.getByLabel('➖ Sem o joker (igualdade numérica)')).not.toBeChecked();
  await tip.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/nivel-sugestao.png` : undefined });
  await tip.getByRole('button', { name: 'Aplicar ao plano' }).click();
  await expect(tip).toBeHidden();
  await expect(page.getByPlaceholder(/Instruções específicas para este bloco/).first()).toHaveValue(
    '⬆️ Mais difícil: espaço 12×12, máximo 2 toques.'
  );
  await page.getByRole('button', { name: /Guardar como agendado/i }).click();

  // The new space goes to "Montar o campo"
  await page.locator('[data-training-row]').filter({ hasText: 'Campo do nível 2099-04-09' }).click();
  await page.getByRole('button', { name: '📐 Montar o campo' }).click();
  await expect(page.getByRole('region', { name: 'Campo desenhado' })).toContainText('A Rondo com joker');
  await page.getByRole('dialog', { name: 'Montar o campo' }).getByRole('tab', { name: 'Passo a passo' }).click();
  await expect(page.getByRole('region', { name: 'Passo a passo' })).toContainText('quadrado de 12 passos');
  await page.getByRole('button', { name: 'Fechar montar o campo' }).click();

  // The library shows how it went
  await page.getByRole('button', { name: /Exercícios/ }).click();
  const card = page
    .getByRole('region', { name: 'Biblioteca de exercícios' })
    .getByRole('listitem')
    .filter({ hasText: 'Rondo com joker' });
  await expect(card.getByLabel('Como correu')).toContainText('😴 06/04');
  await expect(card).toContainText('Da última vez foi fácil: da próxima, dificulta.');
});

test('antes e depois da época: foto da equipa na nuvem, autorização dos pais e imagem para partilhar', async ({
  page
}) => {
  await signedIn(page);
  await openMore(page, /Antes e depois da época/);
  const dialog = page.getByRole('dialog', { name: 'Antes e depois da época' });
  await dialog.getByLabel('Foto da equipa no início da época').setInputFiles('e2e/fixtures/exercicio.jpg');
  await expect(page.getByText('Foto do início guardada ✓')).toBeVisible();
  await expect(dialog.getByRole('img', { name: /Foto da equipa: Setembro/ })).toBeVisible();
  // Off by default: without the parents' authorisation the picture has only the numbers
  const auth = dialog.getByLabel(/Os pais autorizaram/);
  await expect(auth).not.toBeChecked();
  await auth.check();
  await expect(dialog.getByRole('region', { name: 'Números da época' })).toContainText(/Treinos/i);
  await expect(dialog.getByRole('img', { name: 'Imagem antes e depois da época' })).toBeVisible();
  await expect
    .poll(async () => [...(await cloudRecords()).values()].filter((r) => r.kind === 'teamphoto' && r.hasImage).length, {
      timeout: 30_000,
      message: 'foto da equipa na nuvem'
    })
    .toBeGreaterThan(0);
  await dialog.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/antes-depois-app.png` : undefined });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '📲 Partilhar imagem' }).click();
  expect((await download).suggestedFilename()).toMatch(/^Antes_e_depois_.*\.png$/);
});

test('atleta inativo: conta sempre como falta no treino até mudar o estado', async ({ page }) => {
  await signedIn(page);
  await navTo(page, /equipa/i);
  await addPlayer(page, 'Inativo Teste', '88');
  await page.getByRole('heading', { name: 'Inativo Teste' }).click();
  await page.getByRole('button', { name: /Editar Dados/ }).click();
  await page
    .locator('select')
    .filter({ has: page.locator('option[value=inativo]') })
    .selectOption('inativo');
  await page.locator('#player-form button[type=submit]').click();

  await navTo(page, /início/i);
  await page
    .getByRole('navigation', { name: 'Atalhos' })
    .getByRole('button', { name: /Treino de hoje/ })
    .click();
  const today = page.getByRole('dialog', { name: 'Treino de hoje' });
  // Shown as absent ("Inativo"), with no button to mark them present
  const row = today.getByTitle(/Atleta inativo/).filter({ hasText: 'Inativo Teste' });
  await expect(row).toContainText('⏸️ Inativo');
  await expect(today.getByRole('button', { name: /Inativo Teste/ })).toHaveCount(0);
  await today.getByRole('button', { name: /Guardar (treino|presenças)/ }).click();

  // The training counts the absence, with the reason "Inativo"
  await openAgendaList(page);
  await page.getByRole('button', { name: 'Treinos', exact: true }).first().click();
  await page
    .getByRole('button', { name: /^Presenças/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Inativo Teste/ }).click();
  await expect(page.getByRole('list', { name: 'Faltas de Inativo Teste' })).toContainText('Inativo');
});

test('acompanhar ao vivo: o outro treinador vê o jogo a acontecer no telemóvel dele', async ({ page, browser }) => {
  await signedIn(page);
  await openAgendaList(page);
  await addToAgenda(page, 'Jogo');
  await page.getByPlaceholder('Nome da equipa adversária').fill('Equipa Ao Vivo');
  await page.locator('input[type=date]').first().fill(new Date().toISOString().slice(0, 10));
  await page.locator('input[type=time]').first().fill('10:00');
  await page.getByRole('button', { name: /Guardar no Calendário/ }).click();
  await openAgendaRow(page, /vs Equipa Ao Vivo/);
  await page
    .getByRole('button', { name: /Iniciar Jogo/ })
    .first()
    .click();
  await page.getByRole('button', { name: /Selecionar 7 Titulares/i }).click();
  await page.getByRole('button', { name: /1\.ºs 7/ }).click();
  await page.getByRole('button', { name: /Confirmar 7 Titulares/i }).click();
  await page.getByRole('button', { name: /Iniciar 1.ª parte/i }).click();

  // The other coach (at home) sees the game on his Início and follows it
  const watcherContext = await browser.newContext();
  const watcher = await newCoachPage(watcherContext, COACH_B);
  const liveCard = watcher.getByRole('region', { name: 'Jogo em direto' });
  await expect(liveCard).toContainText('0 – 0', { timeout: 30_000 });
  await expect(liveCard).toContainText('Registado por Treinador A');
  await liveCard.getByRole('button', { name: '📡 Acompanhar ao vivo' }).click();
  const follow = watcher.getByRole('dialog', { name: 'Ao vivo' });
  await expect(follow.getByRole('region', { name: 'Resultado' })).toContainText('EM DIRETO');
  // Only to watch: no buttons to change the game
  await expect(follow.getByRole('button')).toHaveText(['✕']);

  // A goal on the director's phone arrives on the coach's phone a moment later
  await page.getByRole('button', { name: /GOLO MARCADO/i }).click();
  await page.locator('select').nth(0).selectOption('p2'); // 7 - Tomás Gonçalves
  await page.locator('select').nth(1).selectOption('p6'); // 3 - Lucas Pereira
  await page.getByRole('button', { name: 'Confirmar Golo' }).click();
  await expect(follow.getByRole('alert')).toContainText('⚽ Golo! Dragões 1 – 0', { timeout: 30_000 });
  await expect(follow.getByRole('region', { name: 'Resultado' })).toContainText('1 – 0');
  const events = follow.getByRole('region', { name: 'Lances' });
  await expect(events).toContainText('⚽ Golo · Tomás');
  await expect(events).toContainText('Assist. Lucas');

  // Then a goal conceded and a card
  await page.getByRole('button', { name: /GOLO SOFRIDO/i }).click();
  await page.getByRole('button', { name: 'Confirmar Golo Sofrido' }).click();
  await page.getByRole('button', { name: /Cartão/ }).click();
  await page.locator('select').first().selectOption('p5'); // 2 - Martim Costa
  await page.getByRole('button', { name: 'Confirmar Cartão' }).click();
  // First in the cloud (the director's phone sent it)…
  await expect
    .poll(
      async () =>
        [...(await cloudRecords()).values()].find((r) => r.kind === 'match' && r.opponent === 'Equipa Ao Vivo')?.goals,
      { timeout: 30_000, message: 'golo sofrido na nuvem' }
    )
    .toBe(2);
  // …then on the other phone (it received it)
  await expect(follow.getByRole('region', { name: 'Resultado' })).toContainText('1 – 1', { timeout: 30_000 });
  await expect(events).toContainText('Golo sofrido');
  await expect(events).toContainText('🟨 Martim', { timeout: 30_000 });
  await expect(follow.getByRole('region', { name: 'Números do jogo' })).toContainText('Cartões amarelos');
  await watcher.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/ao-vivo.png` : undefined });
  await watcherContext.close();
});

test('link do jogo para os pais: quem tem o link vê o jogo sem conta, sem substituições', async ({ page, browser }) => {
  // The game of the test above is still being played (Treinador A records it)
  await signedIn(page);
  await openMore(page, /Link do jogo para os pais/);
  const share = page.getByRole('dialog', { name: 'Link para os pais' });
  await share.getByRole('button', { name: 'Criar link para os pais' }).click();
  const input = share.getByLabel('Endereço do link');
  await expect(input).toHaveValue(/\/aovivo\/[a-zA-Z0-9]{24}$/);
  const link = await input.inputValue();

  // A parent opens it on their phone: no account, no app (the page the app's server makes from the published game)
  const token = link.split('/').pop()!;
  const published = async () => {
    const res = await fetch(`${FIRESTORE}/public_lives/${token}`);
    return res.ok ? parentsLiveFromRestDocument(await res.json()) : null;
  };
  const parentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const parent = await parentContext.newPage();
  const open = async () => {
    const live = await published();
    await parent.setContent(live ? renderParentsLivePage(live, token) : '<p>Este link do jogo não existe</p>');
    return parent.locator('main').innerText();
  };
  await expect.poll(open, { timeout: 30_000 }).toContain('Equipa Ao Vivo');
  const body = parent.locator('main');
  await expect(body).toContainText('1 – 1');
  await expect(body).toContainText('EM DIRETO');
  await expect(body).toContainText('Golo · Tomás');
  await expect(body).toContainText('Golo sofrido');
  await expect(body).toContainText('EQUIPA INICIAL (1.ª PARTE)');
  // Never the substitutions; the cards only when the coach turns them on
  await expect(body).not.toContainText(/Substitui|Sai |entra /);
  await expect(body).not.toContainText('🟨');
  await share.getByLabel('Cartões').check();
  await expect.poll(open, { timeout: 30_000 }).toContain('🟨 Martim');
  await parent.screenshot({
    path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/link-pais.png` : undefined,
    fullPage: true
  });

  // Switched off: the link stops working
  await share.getByRole('button', { name: 'Desligar o link' }).click();
  await expect.poll(published, { timeout: 30_000 }).toBeNull();
  await parentContext.close();
});

test('avisos do jogo: cada treinador liga no seu telemóvel; no iPhone primeiro instala a app', async ({
  page,
  browser
}) => {
  await signedIn(page);
  await openMore(page, /Avisos do jogo/);
  const settings = page.getByRole('dialog', { name: 'Avisos do jogo' });
  await expect(settings.getByRole('switch', { name: /Receber avisos neste telemóvel/ })).toHaveAttribute(
    'aria-checked',
    'false'
  );
  for (const option of ['⚽ Início do jogo', '🥅 Golos', '🏁 Fim do jogo'])
    await expect(settings.getByRole('checkbox', { name: new RegExp(option) })).toBeChecked();
  await settings.getByRole('checkbox', { name: /Fim do jogo/ }).uncheck();
  await settings.getByRole('button', { name: 'Fechar avisos' }).click();
  await openMore(page, /Avisos do jogo/);
  await expect(settings.getByRole('checkbox', { name: /Fim do jogo/ })).not.toBeChecked();

  // On an iPhone, in Safari (app not installed): the steps to add it to the home screen first
  const iphone = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852 }
  });
  const phone = await newCoachPage(iphone, COACH_A);
  await openMore(phone, /Avisos do jogo/);
  const install = phone.getByRole('region', { name: 'Instalar no iPhone' });
  await expect(install).toContainText('Adicionar ao ecrã principal');
  await expect(phone.getByRole('switch')).toHaveCount(0);
  await phone
    .getByRole('dialog', { name: 'Avisos do jogo' })
    .screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/avisos-iphone.png` : undefined });
  await iphone.close();
});
