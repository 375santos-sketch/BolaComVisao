import { expect, test } from '@playwright/test';
import { FIRESTORE, owner, PASSWORD } from './seed';
import { readWholeDatabase } from './emulatorData';

const AUTH = 'http://127.0.0.1:9099';
const MEMBER = 'membro.org@clube.pt';
const ORG = 'orgTeste';

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

/**
 * F1.5 — An account that is an active member of an APPROVED organization works in that organization's data (found
 * through the members list, not through the old "club or main" rule), and never writes to "main".
 * Fictitious data only.
 */
test('organização pelos membros: o membro trabalha nos dados da sua organização e nunca escreve em «main»', async ({
  page
}) => {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MEMBER, password: PASSWORD, returnSecureToken: true })
  });
  const { localId: uid } = (await res.json()) as { localId: string };
  // An approved account WITHOUT a club (the old rule would put it in "main") whose organization is orgTeste
  await put(`users/${uid}`, {
    account: {
      id: uid,
      username: 'membro.org',
      email: MEMBER,
      name: 'Membro Org',
      role: 'Treinador Principal',
      status: 'approved',
      assignedTeams: ['all'],
      createdAt: '2026-09-01T00:00:00Z',
      defaultOrgId: ORG
    },
    createdAt: 1,
    updatedAt: 1
  });
  await put(`organizations/${ORG}`, {
    id: ORG,
    type: 'club',
    name: 'Clube Org',
    status: 'active',
    ownerUid: uid,
    createdAt: 1,
    createdBy: uid,
    plan: null
  });
  await put(`organizations/${ORG}/members/${uid}`, {
    uid,
    displayName: 'Membro Org',
    email: MEMBER,
    role: 'owner',
    teamIds: ['*'],
    status: 'active',
    addedBy: uid,
    addedAt: 1
  });
  const team = {
    id: 'equipaOrg',
    clubName: 'Clube Org',
    category: 'Sub-13',
    season: '2026/2027',
    createdAt: '2026-09-01',
    roster: [{ id: 'po1', name: 'Atleta Org', number: 4, positions: 'Médio', birthDate: null, active: true }],
    matches: [],
    trainings: [],
    schedule: [],
    tactics: [],
    tacticFormat: 7
  };
  await put(`club_workspace/${ORG}`, {
    state: { activeTeamId: 'equipaOrg', version: 2, teams: [team], myClubName: 'Clube Org', updatedAt: 1000 },
    updatedAt: 1000,
    lastUpdatedBy: 'teste'
  });
  const mainBefore = [...(await readWholeDatabase()).keys()].filter((p) => p.startsWith('club_workspace/main'));

  await page.addInitScript(() => {
    try {
      localStorage.setItem('bcv_tour_done_v1', '1');
    } catch {
      // about:blank
    }
  });
  await page.goto('/');
  await page.getByPlaceholder('ex: treinador ou treinador@email.com').fill(MEMBER);
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.locator('button[type=submit]').first().click();
  await expect(page.getByRole('heading', { name: 'Escolher Equipa' })).toBeVisible();
  // The app confirms the organization through the members and opens its data
  await expect(page.getByText('Sub-13').first()).toBeVisible({ timeout: 30_000 });

  // Its data is saved in the organization (the app moves the club to per-record storage there)…
  await expect
    .poll(
      async () => {
        const r = await fetch(`${FIRESTORE}/club_workspace/${ORG}/records/club`, { headers: owner });
        return r.ok;
      },
      { timeout: 30_000, message: 'dados da organização na nuvem' }
    )
    .toBe(true);
  // …and nothing was written to "main"
  await page.waitForTimeout(3000);
  const mainAfter = [...(await readWholeDatabase()).keys()].filter((p) => p.startsWith('club_workspace/main'));
  expect(mainAfter).toEqual(mainBefore);
  // The device keeps it under the account + organization key
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain(`bcv-state:${uid}:${'orgTeste'}`);
});
