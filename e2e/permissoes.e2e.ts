import { expect, test, type Page } from '@playwright/test';
import { FIRESTORE, owner, PASSWORD } from './seed';
import { enterPanel, navTo } from './helpers';

const AUTH = 'http://127.0.0.1:9099';
const ORG = 'orgPermissoes';

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

/** An organization in per-record storage with one team (eqP) and a person with the given role there. */
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
  await put(`organizations/${ORG}`, {
    id: ORG,
    type: 'club',
    name: 'Clube Permissões',
    status: 'active',
    ownerUid: 'dono-ficticio',
    createdAt: 1,
    createdBy: 'dono-ficticio',
    plan: null
  });
  await put(`organizations/${ORG}/members/${uid}`, {
    uid,
    displayName: email,
    email,
    role,
    teamIds: ['eqP'],
    status: 'active',
    addedBy: 'dono-ficticio',
    addedAt: 1
  });
  const now = Date.now();
  await put(`club_workspace/${ORG}/records/club`, {
    kind: 'club',
    teamId: '_club',
    entityId: 'club',
    data: {
      activeTeamId: 'eqP',
      version: 2,
      myClubName: 'Clube Permissões',
      teams: [{ id: 'eqP', clubName: 'Clube Permissões', category: 'Sub-15', season: '2026/2027' }]
    },
    updatedAt: now,
    deleted: false
  });
  await put(`club_workspace/${ORG}/records/teamconfig__eqP__config`, {
    kind: 'teamconfig',
    teamId: 'eqP',
    entityId: 'config',
    data: { id: 'eqP', clubName: 'Clube Permissões', category: 'Sub-15', season: '2026/2027', tacticFormat: 7 },
    updatedAt: now,
    deleted: false
  });
  await put(`club_workspace/${ORG}/records/player__eqP__p1`, {
    kind: 'player',
    teamId: 'eqP',
    entityId: 'p1',
    data: { id: 'p1', name: 'Atleta Permissões', number: 8, positions: 'Médio', birthDate: null, active: true },
    updatedAt: now,
    deleted: false
  });
  // A training this week, so the season (Época) has something to show
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  await put(`club_workspace/${ORG}/records/training__eqP__t1`, {
    kind: 'training',
    teamId: 'eqP',
    entityId: 't1',
    data: { id: 't1', date: today, time: '18:00', notes: '', absences: [], season: '2026/2027' },
    updatedAt: now,
    deleted: false
  });
  return uid;
}

/** Everything the browser's databases hold on this device (Firestore keeps its copy of the club there). */
const inDatabases = (page: Page) =>
  page.evaluate(async () => {
    const out: string[] = [];
    for (const { name } of (await indexedDB.databases?.()) || []) {
      if (!name) continue;
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
        out.push(JSON.stringify(all));
      }
      db.close();
    }
    return out.join('\n');
  });

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
  await expect(page.getByText('Sub-15').first()).toBeVisible({ timeout: 30_000 });
}

// F2.5: staff only reads (D4) and the club settings are only for who manages the club
test('staff: só leitura e sem definições do clube', async ({ page }) => {
  await personInOrg('staff.org@clube.pt', 'staff');
  await signIn(page, 'staff.org@clube.pt');
  await enterPanel(page);
  await navTo(page, /clube/i);
  await expect(page.getByRole('button', { name: /Cópias de segurança/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Definições do clube/ })).toHaveCount(0);
  // Trying to change data (the month's objectives) is refused in the app, with a message
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
  await page.getByLabel(/^Objetivos de/).fill('Não deve gravar');
  await page.getByRole('button', { name: 'Guardar objetivos' }).click();
  await expect(page.getByText('Só leitura: o seu papel no clube não altera dados.')).toBeVisible();
  await page.waitForTimeout(4000);
  const cfg = await fetch(`${FIRESTORE}/club_workspace/${ORG}/records/teamconfig__eqP__config`, { headers: owner });
  expect(JSON.stringify(await cfg.json())).not.toContain('Não deve gravar');
});

// F2.6: an access taken away leaves the device at once (when the app checks again: here, when it is reopened)
test('acesso retirado: os dados do clube saem do aparelho', async ({ page }) => {
  const uid = await personInOrg('treinador.revogado@clube.pt', 'treinador');
  await signIn(page, 'treinador.revogado@clube.pt');
  await enterPanel(page);
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).join('|')))
    .toContain(`bcv-state:${uid}:${ORG}`);
  // The copy of the club on the device (Firestore's cache) is there while the access lasts
  await expect.poll(() => inDatabases(page)).toContain('Atleta Permissões');
  // The club takes the access away
  await put(`organizations/${ORG}/members/${uid}`, {
    uid,
    displayName: 'x',
    email: 'treinador.revogado@clube.pt',
    role: 'treinador',
    teamIds: ['eqP'],
    status: 'revoked',
    addedBy: 'dono-ficticio',
    addedAt: 1,
    revokedAt: Date.now(),
    revokedBy: 'dono-ficticio'
  });
  await page.reload();
  await expect(page.getByText('O seu acesso a este clube foi retirado').first()).toBeVisible({ timeout: 30_000 });
  const keys = await page.evaluate(() => Object.keys(localStorage).join('|'));
  expect(keys).not.toContain(`bcv-state:${uid}:${ORG}`);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Atleta Permissões');
  // Nor in the browser's databases (Firestore's copy of the club on the device)
  await expect.poll(() => inDatabases(page)).not.toContain('Atleta Permissões');
  // …and the cloud refuses it too (the rules, F2.3)
  const direct = await fetch(`${FIRESTORE}/club_workspace/${ORG}/records/player__eqP__p1`, { headers: owner });
  expect(direct.ok).toBe(true); // (the emulator's admin still reads it: the data stays in the club)
});
