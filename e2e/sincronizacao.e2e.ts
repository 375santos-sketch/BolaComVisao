import { expect, test } from '@playwright/test';
import { COACH_B, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo, syncBadge, clubSettingsText } from './helpers';

const SCHEDULE = 'club_workspace/clubA/records/schedule__sub11__s1';

const cloudTime = async (): Promise<string | undefined> => {
  const res = await fetch(`${FIRESTORE}/${SCHEDULE}`, { headers: owner });
  const body = (await res.json()) as { fields?: Record<string, any> };
  return body.fields?.data?.mapValue?.fields?.time?.stringValue;
};

/**
 * Two coaches at the same time: coach B saves something (the month's objectives) and, while B's app is waiting to
 * send it, another phone changes the game time in the cloud. B's app must send only B's change: the other phone's
 * change must stay in the cloud (before, B sent a copy taken before that change and put the old time back — the
 * same way a goal seen live could disappear).
 */
test('dois treinadores ao mesmo tempo: guardar uma coisa não apaga o que outro telemóvel acabou de mudar', async ({
  page
}) => {
  await login(page, COACH_B);
  await enterPanel(page);
  await expect(syncBadge(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 });
  // The club is in per-record storage (the app moves an old single-document club there on first use)
  await expect.poll(cloudTime, { timeout: 30_000, message: 'jogo da agenda na nuvem' }).toBeTruthy();
  await page.waitForTimeout(2000);
  const before = await cloudTime();
  const changedTime = before === '19:45' ? '20:15' : '19:45';

  // Coach B writes the month's objectives (a change that leaves for the cloud a few seconds later)
  await navTo(page, /Planeamento/);
  await page
    .getByRole('button', { name: /^Treinos/ })
    .first()
    .click();
  await page.getByRole('button', { name: /^Época/ }).click();
  await page
    .getByRole('button', { name: /Objetivos do mês|Editar objetivos/ })
    .first()
    .click();
  await page.getByLabel(/^Objetivos de/).fill('Teste de dois telemóveis ao mesmo tempo');
  await page.getByRole('button', { name: 'Guardar objetivos' }).click();

  // Meanwhile, another phone changes the game time in the cloud
  const res = await fetch(`${FIRESTORE}/${SCHEDULE}?updateMask.fieldPaths=data.time&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({
      fields: {
        data: { mapValue: { fields: { time: { stringValue: changedTime } } } },
        updatedAt: { integerValue: String(Date.now()) }
      }
    })
  });
  expect(res.ok).toBe(true);

  // B's objectives reach the cloud (watching the game time from now on)…
  await expect
    .poll(
      async () => {
        return (await clubSettingsText()).includes('Teste de dois telemóveis ao mesmo tempo');
      },
      { timeout: 30_000, message: 'objetivos do treinador B na nuvem' }
    )
    .toBe(true);
  // …and the other phone's change stays there ALL the time (before, it went back to the old time for a moment
  // when B's delayed save left, and only came back when B's app noticed)
  const seen = new Set<string | undefined>();
  const until = Date.now() + 6000;
  while (Date.now() < until) {
    seen.add(await cloudTime());
    await page.waitForTimeout(50);
  }
  expect([...seen]).toEqual([changedTime]);
});
