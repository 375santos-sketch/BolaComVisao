/**
 * F2.8 — The team's sheet ("Base de dados da equipa") and the phones for notices follow the memberships, like the
 * records (F2.3): who sees a team sees its sheet; staff only reads; nobody sees another team's sheet; the list of
 * everyone's phones is only for who can send notices. Old sheets (club 'default' or, by an old mistake, the age
 * group) belong to the shared space 'main'. Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT = 'glowing-orbit-vk8sk';
const RULES_NOW = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const OPEN_RULES = `rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }`;

async function setRules(content: string) {
  const res = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
  });
  if (!res.ok) throw new Error(`rules upload failed: ${res.status} ${await res.text()}`);
}

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });

const ORG = 'orgFolha';
// [who, organization, role, teams, old account's club]
const PEOPLE: Array<[string, string, string, string[], string | null]> = [
  ['coord', ORG, 'coordenador', ['*'], ORG],
  ['treinadorA', ORG, 'treinador', ['eqA'], ORG],
  ['staffA', ORG, 'staff', ['eqA'], ORG],
  ['treinadorB', ORG, 'treinador', ['eqB'], ORG],
  ['treinadorM', 'main', 'treinador', ['eqM'], null],
  ['outroM', 'main', 'treinador', ['eqN'], null],
  // No membership yet (old access, until F1.10): keeps what it had
  ['semInscricao', '', '', [], 'clubeAntigo']
];
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@folha.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const meta = (clubId: string, who: string) => ({
  clubId,
  name: 'Equipa',
  createdBy: uids[who] || 'x',
  updatedAt: Date.now(),
  updatedBy: who
});
const dataset = (who: string) => ({
  name: 'Plantel',
  columns: ['NOME'],
  rowCount: 1,
  version: 1,
  updatedAt: Date.now(),
  updatedBy: who
});
const row = (who: string) => ({ data: { NOME: 'Atleta Exemplo' }, order: 0, updatedAt: Date.now(), updatedBy: who });
const readSheet = (team: string) => fs.getDocs(fs.collection(fb.db, 'team_databases', team, 'datasets', 'd1', 'rows'));
const writeSheet = async (team: string, clubId: string, who: string) => {
  await fs.setDoc(ref('team_databases', team), meta(clubId, who), { merge: true });
  await fs.setDoc(ref('team_databases', team, 'datasets', 'd1'), dataset(who));
  await fs.setDoc(ref('team_databases', team, 'datasets', 'd1', 'rows', 'r1'), row(who));
};
const sub = (uid: string) => ({
  uid,
  endpoint: 'https://push.example/x',
  keys: { p256dh: 'p', auth: 'a' },
  prefs: { inicio: true, golo: true, fim: true },
  teamIds: ['eqA'],
  updatedAt: Date.now()
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, org, role, teams, club] of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@folha.pt`, 'segredo123')).user.uid;
    // The OLD access is wide on purpose (every team): the membership must decide
    await fs.setDoc(ref('users', uids[who]), {
      account: {
        id: uids[who],
        username: who,
        name: who,
        role: 'Treinador Principal',
        status: 'approved',
        assignedTeams: org ? ['all'] : ['eqZ'],
        ...(club ? { clubId: club } : {})
      }
    });
    if (!org) continue;
    await fs.setDoc(ref('organizations', org, 'members', uids[who]), {
      uid: uids[who],
      displayName: who,
      email: `${who}@folha.pt`,
      role,
      teamIds: teams,
      status: 'active',
      addedBy: 'x',
      addedAt: 1
    });
  }
  for (const org of [ORG, 'main']) {
    await fs.setDoc(ref('organizations', org), {
      id: org,
      type: 'club',
      name: org,
      status: 'active',
      ownerUid: 'x',
      createdAt: 1,
      createdBy: 'x',
      plan: null
    });
  }
  // Sheets: team A and B of the club; an OLD sheet of team M of "main" that says its age group
  await writeSheet('eqA', ORG, 'x');
  await writeSheet('eqB', ORG, 'x');
  await writeSheet('eqM', 'Sub-11', 'x');
  await writeSheet('eqZ', 'clubeAntigo', 'x');
  await fs.setDoc(ref('club_workspace', ORG, 'push_subscriptions', 's_staff'), sub(uids.staffA));
  await fs.setDoc(ref('club_workspace', ORG, 'push_subscriptions', 's_treinador'), sub(uids.treinadorA));
  await setRules(RULES_NOW);
});

describe('F2.8 — folha da equipa', () => {
  it('the coach of A reads and saves the sheet of A, several times (it failed after the first save)', async () => {
    await signInAs('treinadorA');
    expect(await ok(readSheet('eqA'))).toBe(true);
    expect(await ok(writeSheet('eqA', ORG, 'treinadorA'))).toBe(true);
    expect(await ok(writeSheet('eqA', ORG, 'treinadorA'))).toBe(true);
  });

  it("nobody sees another team's sheet, even with the old access to every team", async () => {
    await signInAs('treinadorA');
    expect(await ok(readSheet('eqB'))).toBe(false);
    expect(await ok(writeSheet('eqB', ORG, 'treinadorA'))).toBe(false);
    expect(await ok(readSheet('eqM'))).toBe(false); // another club's (main) sheet
  });

  it('staff reads the sheet of its team but does not change it', async () => {
    await signInAs('staffA');
    expect(await ok(readSheet('eqA'))).toBe(true);
    expect(await ok(writeSheet('eqA', ORG, 'staffA'))).toBe(false);
  });

  it('the coordinator (all teams) reads and saves every team', async () => {
    await signInAs('coord');
    expect(await ok(readSheet('eqB'))).toBe(true);
    expect(await ok(writeSheet('eqB', ORG, 'coord'))).toBe(true);
  });

  it('an old sheet (age group instead of club) is of "main": its coach keeps it and moves it to the right club', async () => {
    await signInAs('outroM');
    expect(await ok(readSheet('eqM'))).toBe(false);
    await signInAs('treinadorM');
    expect(await ok(readSheet('eqM'))).toBe(true);
    expect(await ok(writeSheet('eqM', 'default', 'treinadorM'))).toBe(true);
    expect(await ok(readSheet('eqM'))).toBe(true);
  });

  it("a sheet cannot be moved to a club where the coach can't write it now", async () => {
    await signInAs('treinadorB');
    expect(await ok(fs.setDoc(ref('team_databases', 'eqA'), meta(ORG + 'X', 'treinadorB'), { merge: true }))).toBe(
      false
    );
  });
});

describe('F2.8 — quem ainda não tem inscrição', () => {
  it('keeps the old access to its own team sheet, and nothing else', async () => {
    await signInAs('semInscricao');
    expect(await ok(readSheet('eqZ'))).toBe(true);
    expect(await ok(writeSheet('eqZ', 'clubeAntigo', 'semInscricao'))).toBe(true);
    expect(await ok(readSheet('eqA'))).toBe(false);
  });
});

describe('F2.8 — telemóveis para os avisos', () => {
  it('staff sees only its own phone; who sends notices sees the list', async () => {
    const phones = fs.collection(fb.db, 'club_workspace', ORG, 'push_subscriptions');
    await signInAs('staffA');
    expect(await ok(fs.getDocs(phones))).toBe(false);
    expect(await ok(fs.getDoc(ref('club_workspace', ORG, 'push_subscriptions', 's_staff')))).toBe(true);
    expect(await ok(fs.getDoc(ref('club_workspace', ORG, 'push_subscriptions', 's_treinador')))).toBe(false);
    expect(await ok(fs.deleteDoc(ref('club_workspace', ORG, 'push_subscriptions', 's_treinador')))).toBe(false);
    await signInAs('treinadorA');
    expect((await fs.getDocs(phones)).size).toBe(2);
  });
});
