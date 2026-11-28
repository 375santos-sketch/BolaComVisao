import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo } from './helpers';

// MC2a: «O Meu Percurso» in a club switched on by the platform Administrator: the guardian's «Modo atleta» (a step
// done on the phone, nothing saved; leaving needs the password) and the athlete's own account (13+) invited by the
// guardian. Fictitious data.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const toValue = (v: Json): Record<string, unknown> => {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
};
const put = async (path: string, obj: { [key: string]: Json }) => {
  const res = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({ fields: (toValue(obj) as { mapValue: { fields: unknown } }).mapValue.fields })
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
};
const record = (kind: string, id: string, data: { [key: string]: Json }) =>
  put(`club_workspace/clubA/records/${kind}__sub11__${id}`, {
    kind,
    teamId: 'sub11',
    entityId: id,
    updatedAt: Date.now(),
    deleted: false,
    data
  });
const NOW = '2026-11-17T10:00:00.000Z';
const captureWhatsApp = (page: import('@playwright/test').Page) =>
  page.addInitScript(() => {
    (window as unknown as { open: (u: string) => null }).open = (u: string) => {
      (window as unknown as { __wa: string }).__wa = u;
      return null;
    };
  });
const codeFrom = async (page: import('@playwright/test').Page) => {
  const wa = await page.evaluate(() => (window as unknown as { __wa: string }).__wa);
  return decodeURIComponent(wa).match(/\/encarregado\?c=([A-Za-z0-9]+)/)![1];
};

test('o meu percurso: Modo atleta do encarregado e conta própria do atleta (13+)', async ({ page, browser }) => {
  test.setTimeout(240_000);
  // The platform Administrator switched «O Meu Percurso» on for this (test) club
  await put('system/modoCarreira', { clubesLigados: ['clubA'], updatedAt: Date.now() });
  // An athlete of 13, a published question, a mission and its assignment to that athlete
  await record('player', 'mc2p13', {
    id: 'mc2p13',
    name: 'Atleta Treze',
    number: 33,
    positions: 'Médio',
    birthDate: '2012-03-01',
    active: true
  });
  for (const [id, title] of [
    ['mc2c1', 'MC2: para onde receber?'],
    ['mc2c2', 'MC2: depois do treino']
  ])
    await record('challenge', id, {
      id,
      format: 'sessao',
      title,
      competencies: [],
      status: 'publicado',
      items: [],
      createdAt: NOW,
      updatedAt: NOW,
      rights: { kind: 'proprio' },
      ...(id === 'mc2c1'
        ? {
            challengeType: 'pergunta',
            prompt: {
              id: 'q1',
              at: 0,
              kind: 'escolha',
              question: 'Para onde orientar a receção?',
              options: [
                { id: 'a', text: 'Para a frente', correct: true, explanation: 'Ganha tempo e espaço' },
                { id: 'b', text: 'Para trás', correct: false }
              ]
            }
          }
        : { challengeType: 'reflexao', reflection: { prompts: ['O que correu bem?'], emojiScale: true } })
    });
  await record('mission', 'mc2m1', {
    id: 'mc2m1',
    title: 'MC2: receção orientada',
    steps: [{ challengeId: 'mc2c1' }, { challengeId: 'mc2c2' }],
    status: 'publicado',
    createdAt: NOW,
    updatedAt: NOW
  });
  await record('assignment', 'mc2a1', {
    id: 'mc2a1',
    target: { kind: 'missao', id: 'mc2m1' },
    to: ['mc2p13'],
    status: 'ativa',
    progress: { mc2p13: { 0: '2026-11-16' } },
    createdAt: NOW,
    updatedAt: NOW
  });

  // The coach invites the guardian
  await captureWhatsApp(page);
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Atleta Treze' }).click({ timeout: 30_000 });
  await page.getByLabel('Encarregados de educação').getByRole('button', { name: '+ Convidar encarregado' }).click();
  await expect(page.getByLabel('Encarregados de educação')).toContainText('à espera');
  const guardianCode = await codeFrom(page);

  const g = await (await browser.newContext()).newPage();
  await captureWhatsApp(g);
  const suffix = guardianCode.slice(0, 6).toLowerCase();
  await g.goto(`/encarregado?c=${guardianCode}`);
  await g.getByLabel('Email').fill(`mae.mc2.${suffix}@familia.pt`);
  await g.getByLabel(/Palavra-passe/).fill('segredo123');
  await g.getByRole('button', { name: 'Continuar' }).click();
  const accept = g.getByRole('form', { name: 'Aceitar o convite' });
  await accept.getByLabel('O seu nome').fill('Mãe Exemplo');
  await accept.getByLabel(/Li e aceito/).check();
  await accept.getByRole('button', { name: 'Aceitar o convite' }).click();

  // The coach's phone publishes the pages (the family's and «O Meu Percurso»)
  await page.reload();
  await enterPanel(page).catch(() => {});
  const careerCard = g.getByLabel('O Meu Percurso do educando');
  await expect
    .poll(
      async () => {
        await g.reload();
        await g.waitForTimeout(1500);
        return careerCard.count();
      },
      { timeout: 90_000, intervals: [3000] }
    )
    .toBe(1);

  // «Modo atleta»: the mission, a question answered on the phone (nothing saved), leaving needs the password
  await careerCard.getByRole('button', { name: 'Passar ao Modo atleta' }).click();
  const percurso = g.getByRole('region', { name: 'O Meu Percurso' });
  await expect(percurso).toContainText('MC2: receção orientada');
  await expect(percurso).toContainText('1/2');
  await percurso.getByRole('button', { name: /Passo 1: MC2: para onde receber\?/ }).click();
  const step = g.getByRole('region', { name: 'Passo MC2: para onde receber?' });
  await step.getByRole('button', { name: /^A · Para a frente/ }).click();
  await step.getByRole('button', { name: 'Responder' }).click();
  await expect(step).toContainText('Ganha tempo e espaço');
  await expect(step).toContainText('não fica guardado');
  await step.getByRole('button', { name: 'Voltar ao percurso' }).click();
  await percurso.getByRole('button', { name: /Sair do Modo atleta/ }).click();
  const lock = g.getByRole('form', { name: 'Sair do Modo atleta' });
  await lock.getByLabel('Palavra-passe do encarregado').fill('errada123');
  await lock.getByRole('button', { name: 'Sair' }).click();
  await expect(lock).toContainText('Palavra-passe errada.');
  await lock.getByLabel('Palavra-passe do encarregado').fill('segredo123');
  await lock.getByRole('button', { name: 'Sair' }).click();
  await expect(careerCard).toBeVisible();

  // The guardian invites the athlete's own account (13+)
  await careerCard.getByRole('button', { name: 'Convidar o meu educando (conta própria)' }).click();
  await expect(careerCard).toContainText('Convite enviado · à espera');
  const athleteCode = await codeFrom(g);
  const a = await (await browser.newContext()).newPage();
  await a.goto(`/encarregado?c=${athleteCode}`);
  await a.getByLabel('Email').fill(`atleta.mc2.${suffix}@familia.pt`);
  await a.getByLabel(/Palavra-passe/).fill('segredo123');
  await a.getByRole('button', { name: 'Continuar' }).click();
  const acceptA = a.getByRole('form', { name: 'Aceitar o convite' });
  await expect(acceptA).toContainText('Conta de atleta de');
  await expect(acceptA.getByLabel(/Autorizo vídeos/)).toHaveCount(0);
  await acceptA.getByLabel('O seu nome').fill('Atleta Treze');
  await acceptA.getByLabel(/Aceito usar a app/).check();
  await acceptA.getByRole('button', { name: 'Aceitar o convite' }).click();
  await page.reload();
  await enterPanel(page).catch(() => {});
  await expect
    .poll(
      async () => {
        await a.reload();
        await a.waitForTimeout(1500);
        return a.getByRole('region', { name: 'O Meu Percurso' }).count();
      },
      { timeout: 90_000, intervals: [3000] }
    )
    .toBe(1);
  await expect(a.getByRole('region', { name: 'O Meu Percurso' })).toContainText('MC2: receção orientada');
  // The coach sees the athlete's account on the sheet
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Atleta Treze' }).click();
  await expect(page.getByLabel('Encarregados de educação')).toContainText('Atleta (conta própria)');
  await put('system/modoCarreira', { clubesLigados: [], updatedAt: Date.now() });
});
