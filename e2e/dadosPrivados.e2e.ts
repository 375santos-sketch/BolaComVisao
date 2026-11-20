import { expect, test, type Page } from '@playwright/test';
import { FIRESTORE, owner, PASSWORD } from './seed';
import { enterPanel, navTo } from './helpers';

// F3.2: in a club with the private data switched on (by the platform Administrator), staff keeps none of it on the
// device and the coach's phone keeps the separate private copies up to date. Fictitious data.
const AUTH = 'http://127.0.0.1:9099';
const ORG = 'orgPrivados';

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
  put(`club_workspace/${ORG}/records/${kind === 'club' ? 'club' : `${kind}__eqQ__${id}`}`, {
    kind,
    teamId: kind === 'club' ? '_club' : 'eqQ',
    entityId: id,
    data,
    updatedAt: Date.now(),
    deleted: false
  });

async function personInOrg(email: string, role: string): Promise<string> {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  await put(`users/${uid}`, {
    account: {
      id: uid,
      username: email.split('@')[0],
      email,
      name: email.split('@')[0],
      role: 'Treinador Principal',
      status: 'approved',
      assignedTeams: ['all'],
      createdAt: '2026-09-01T00:00:00Z',
      defaultOrgId: ORG
    }
  });
  await put(`organizations/${ORG}/members/${uid}`, {
    uid,
    displayName: email,
    email,
    role,
    teamIds: ['eqQ'],
    status: 'active',
    addedBy: 'dono-ficticio',
    addedAt: 1
  });
  return uid;
}

async function signIn(page: Page, email: string) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('bcv_tour_done_v1', '1');
    } catch {
      // about:blank
    }
  });
  await page.goto('/');
  await page.getByPlaceholder('ex: treinador ou treinador@email.com').fill(email);
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.locator('button[type=submit]').first().click();
  await expect(page.getByRole('heading', { name: 'Escolher Equipa' })).toBeVisible();
  await expect(page.getByText('Sub-13').first()).toBeVisible({ timeout: 30_000 });
}

test('dados privados: o staff não os guarda; o telemóvel do treinador mantém a cópia separada', async ({
  page,
  browser
}) => {
  test.setTimeout(300_000);
  await put(`organizations/${ORG}`, {
    id: ORG,
    type: 'club',
    name: 'Clube Privados',
    status: 'active',
    ownerUid: 'dono-ficticio',
    createdAt: 1,
    createdBy: 'dono-ficticio',
    plan: null
  });
  await record('club', 'club', {
    activeTeamId: 'eqQ',
    version: 2,
    myClubName: 'Clube Privados',
    teams: [{ id: 'eqQ', clubName: 'Clube Privados', category: 'Sub-13', season: '2026/2027' }]
  });
  await record('teamconfig', 'config', {
    id: 'eqQ',
    clubName: 'Clube Privados',
    category: 'Sub-13',
    season: '2026/2027',
    tacticFormat: 7
  });
  await record('player', 'p1', {
    id: 'p1',
    name: 'Atleta Privado',
    number: 9,
    positions: 'Avançado',
    birthDate: null,
    active: true,
    phone: '912345678',
    emergencyContact: 'Pai 934567890',
    coachNotes: 'NOTA SECRETA DO TREINADOR'
  });
  // A training this week, so the season (Época) has something to show
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  await record('training', 't1', {
    id: 't1',
    date: today,
    time: '18:00',
    notes: '',
    absences: [],
    season: '2026/2027'
  });
  await put('system/dadosPrivados', { clubesLigados: [ORG], updatedAt: Date.now() });

  // Staff: the athlete is there (sport profile), the private data is not, neither on screen nor on the device
  await personInOrg('staff.privados@clube.pt', 'staff');
  await signIn(page, 'staff.privados@clube.pt');
  await enterPanel(page);
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Atleta Privado' }).click({ timeout: 30_000 });
  await expect(page.getByText('912345678')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Object.values(localStorage).join('|')), { timeout: 30_000 })
    .not.toContain('912345678');
  const deviceCopy = await page.evaluate(() => Object.values(localStorage).join('|'));
  expect(deviceCopy).toContain('Atleta Privado');
  expect(deviceCopy).not.toContain('NOTA SECRETA');
  expect(deviceCopy).not.toContain('934567890');

  // The coach: a save (the month's objectives) also writes the private copies of the team
  const coach = await (await browser.newContext()).newPage();
  await personInOrg('treinador.privados@clube.pt', 'treinador');
  await signIn(coach, 'treinador.privados@clube.pt');
  await enterPanel(coach);
  await navTo(coach, /equipa/i);
  await coach.getByRole('heading', { name: 'Atleta Privado' }).click({ timeout: 30_000 });
  await expect(coach.getByText('912345678').first()).toBeVisible();
  await navTo(coach, /Planeamento/);
  await coach
    .getByRole('button', { name: /^Treinos/ })
    .first()
    .click();
  await coach.getByRole('button', { name: /^Época/ }).click();
  await coach
    .getByRole('button', { name: /Objetivos do mês|Editar objetivos/ })
    .first()
    .click();
  await coach.getByLabel(/^Objetivos de/).fill('Pressão alta');
  await coach.getByRole('button', { name: 'Guardar objetivos' }).click();
  await expect
    .poll(
      async () =>
        (await fetch(`${FIRESTORE}/club_workspace/${ORG}/private/pcontact__eqQ__p1`, { headers: owner })).status,
      { timeout: 60_000, intervals: [2000] }
    )
    .toBe(200);
  const contact = await (
    await fetch(`${FIRESTORE}/club_workspace/${ORG}/private/pcontact__eqQ__p1`, { headers: owner })
  ).json();
  expect(JSON.stringify(contact)).toContain('912345678');
  const notes = await (
    await fetch(`${FIRESTORE}/club_workspace/${ORG}/private/pnotes__eqQ__p1`, { headers: owner })
  ).json();
  expect(JSON.stringify(notes)).toContain('NOTA SECRETA DO TREINADOR');
  // phase 0: the sport profile still keeps everything (nothing removed)
  const profile = await (
    await fetch(`${FIRESTORE}/club_workspace/${ORG}/records/player__eqQ__p1`, { headers: owner })
  ).json();
  expect(JSON.stringify(profile)).toContain('912345678');
  await put('system/dadosPrivados', { clubesLigados: [], updatedAt: Date.now() });
});
