/**
 * F3.1 — The athletes' private records (club_workspace/{club}/private) under the REAL rules, before the app uses them.
 * The full matrix of the F3 plan (section 6.1): every person × every kind of document × every operation, through the
 * app's SDK AND through direct REST calls with each person's own sign-in (nothing may depend on the app's screens).
 *  - people: owner, admin, diretor (every team), coordenador (team A), coach, assistant and staff of A, coach of B, a
 *    revoked coach, the owner of another club, a guardian and an athlete (no membership), someone with the old club
 *    access, nobody signed in, and the platform Administrator;
 *  - documents: the sport profile (records/player) and the 5 private kinds of team A, team B and another club.
 * Fictitious data only.
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
const REST = `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
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

const ORG = 'orgPrivado';
const OTHER = 'orgOutroPrivado';
const LEGACY = 'clubeAntigoPrivado'; // a club without organization (old access only)
const PRIVATE = ['pcontact', 'peval', 'pnotes', 'pgoals', 'mratings'] as const;
type Kind = (typeof PRIVATE)[number] | 'player';
const KINDS: Kind[] = ['player', ...PRIVATE];
const DOCS: Array<{ org: string; team: string }> = [
  { org: ORG, team: 'eqA' },
  { org: ORG, team: 'eqB' },
  { org: OTHER, team: 'eqX' }
];

const PEOPLE: Array<{ who: string; role?: string; teams?: string[]; status?: string; org?: string }> = [
  { who: 'dono', role: 'owner', teams: ['*'] },
  { who: 'admin', role: 'admin', teams: ['*'] },
  { who: 'diretor', role: 'diretor', teams: ['*'] },
  { who: 'coord', role: 'coordenador', teams: ['eqA'] },
  { who: 'treinadorA', role: 'treinador', teams: ['eqA'] },
  { who: 'adjuntoA', role: 'adjunto', teams: ['eqA'] },
  { who: 'staffA', role: 'staff', teams: ['eqA'] },
  { who: 'treinadorB', role: 'treinador', teams: ['eqB'] },
  { who: 'revogado', role: 'treinador', teams: ['eqA'], status: 'revoked' },
  { who: 'outroClube', role: 'owner', teams: ['*'], org: OTHER },
  { who: 'encarregado' },
  { who: 'atleta' },
  { who: 'antigo', org: LEGACY },
  { who: 'anonimo' },
  { who: 'adminPlataforma' }
];

// ── The expected matrix (F3 plan, section 3, decisions D1–D8) ─────────────────────────────────────────────────────
// [org, team] pairs each person READS in private; the profile (records/player) is read by staff too.
const ALL_ORG = [`${ORG}/eqA`, `${ORG}/eqB`];
const readsPrivate: Record<string, string[]> = {
  dono: ALL_ORG,
  admin: ALL_ORG,
  diretor: ALL_ORG,
  coord: [`${ORG}/eqA`],
  treinadorA: [`${ORG}/eqA`],
  adjuntoA: [`${ORG}/eqA`],
  staffA: [],
  treinadorB: [`${ORG}/eqB`],
  outroClube: [`${OTHER}/eqX`],
  adminPlataforma: [...ALL_ORG, `${OTHER}/eqX`]
};
const readsProfile: Record<string, string[]> = { ...readsPrivate, staffA: [`${ORG}/eqA`] };
// What each club role writes, per kind (in the teams it reads)
const WRITES: Record<string, Kind[]> = {
  owner: ['player', 'pcontact', 'peval', 'pgoals'],
  admin: ['player', 'pcontact', 'peval', 'pgoals'],
  diretor: ['player', 'pcontact'],
  coordenador: ['player', 'peval', 'pgoals'],
  treinador: KINDS,
  adjunto: KINDS,
  staff: []
};
const canRead = (who: string, kind: Kind, org: string, team: string) =>
  (kind === 'player' ? readsProfile : readsPrivate)[who]?.includes(`${org}/${team}`) ?? false;
const canWrite = (who: string, kind: Kind, org: string, team: string) => {
  if (who === 'adminPlataforma') return true;
  const p = PEOPLE.find((x) => x.who === who)!;
  if (!p.role || p.status === 'revoked') return false;
  return canRead(who, kind, org, team) && WRITES[p.role].includes(kind);
};

const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const pathOf = (kind: Kind, org: string, id: string) =>
  kind === 'player' ? ['club_workspace', org, 'records', id] : ['club_workspace', org, 'private', id];
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  if (who !== 'anonimo') await fa.signInWithEmailAndPassword(fb.auth, `${who}@privado.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const rec = (kind: string, teamId: string, entityId: string, extra: Record<string, unknown> = {}) => ({
  kind,
  teamId,
  entityId,
  updatedAt: Date.now(),
  deleted: false,
  data: { id: entityId, nota: 'dado fictício' },
  ...extra
});
const restFields = (r: ReturnType<typeof rec>) => ({
  kind: { stringValue: r.kind },
  teamId: { stringValue: r.teamId },
  entityId: { stringValue: r.entityId },
  updatedAt: { integerValue: String(r.updatedAt) },
  deleted: { booleanValue: r.deleted },
  data: { mapValue: { fields: { id: { stringValue: r.entityId } } } }
});
const token = async () => (fb.auth.currentUser ? await fb.auth.currentUser.getIdToken() : null);
const restGet = async (path: string[]) => {
  const t = await token();
  const res = await fetch(`${REST}/${path.join('/')}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  return res.status;
};
const restPut = async (path: string[], body: ReturnType<typeof rec>) => {
  const t = await token();
  const res = await fetch(`${REST}/${path.join('/')}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify({ fields: restFields(body) })
  });
  return res.status;
};
let checks = 0;
const check = (got: unknown, want: unknown, label: string) => {
  checks++;
  expect(got, label).toBe(want);
};

beforeAll(async () => {
  await fetch(`${REST.replace('/v1/', '/emulator/v1/')}`, { method: 'DELETE' });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const p of PEOPLE) {
    if (p.who === 'anonimo') continue;
    uids[p.who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${p.who}@privado.pt`, 'segredo123')).user.uid;
    if (p.role || p.who === 'antigo')
      // Club people also have the OLD access to their club: the membership (or its absence) must decide
      await fs.setDoc(ref('users', uids[p.who]), {
        account: {
          id: uids[p.who],
          username: p.who,
          name: p.who,
          role: 'Treinador Principal',
          status: 'approved',
          clubId: p.org ?? ORG
        }
      });
  }
  await fs.setDoc(ref('admins', uids.adminPlataforma), { uid: uids.adminPlataforma });
  for (const org of [ORG, OTHER])
    await fs.setDoc(ref('organizations', org), {
      id: org,
      type: 'club',
      name: org,
      status: 'active',
      ownerUid: uids[org === ORG ? 'dono' : 'outroClube'],
      createdAt: 1,
      createdBy: uids.dono,
      plan: null
    });
  for (const p of PEOPLE.filter((x) => x.role))
    await fs.setDoc(ref('organizations', p.org ?? ORG, 'members', uids[p.who]), {
      uid: uids[p.who],
      displayName: p.who,
      email: `${p.who}@privado.pt`,
      role: p.role,
      teamIds: p.teams,
      status: p.status ?? 'active',
      addedBy: uids.dono,
      addedAt: 1
    });
  // One document of every kind per team, and in the old club
  for (const { org, team } of [...DOCS, { org: LEGACY, team: 'eqL' }])
    for (const kind of KINDS) await fs.setDoc(ref(...pathOf(kind, org, `${kind}__${team}__a1`)), rec(kind, team, 'a1'));
  await setRules(RULES_NOW);
}, 120_000);

describe('F3.1 — matriz completa: cada pessoa × cada documento (SDK e REST)', () => {
  for (const { who } of PEOPLE) {
    it(`${who}`, async () => {
      await signInAs(who);
      for (const { org, team } of DOCS)
        for (const kind of KINDS) {
          const id = `${kind}__${team}__a1`;
          const path = pathOf(kind, org, id);
          const r = canRead(who, kind, org, team);
          const w = canWrite(who, kind, org, team);
          const at = `${who} · ${kind} · ${org}/${team}`;
          // Read: by id (SDK and REST) and the team's list (as the app will load it)
          check(await ok(fs.getDoc(ref(...path))), r, `get ${at}`);
          check((await restGet(path)) === 200, r, `REST get ${at}`);
          const list = fs.query(
            fs.collection(fb.db, ...(path.slice(0, 3) as [string, string, string])),
            fs.where('teamId', '==', team)
          );
          check(await ok(fs.getDocs(list)), r, `list ${at}`);
          // Write: update the existing document, create a new one (SDK and REST), a tombstone
          check(await ok(fs.setDoc(ref(...path), rec(kind, team, 'a1'))), w, `update ${at}`);
          const newId = `${kind}__${team}__n_${who}`;
          check(await ok(fs.setDoc(ref(...pathOf(kind, org, newId)), rec(kind, team, `n_${who}`))), w, `create ${at}`);
          const restId = `${kind}__${team}__r_${who}`;
          check(
            [200].includes(await restPut(pathOf(kind, org, restId), rec(kind, team, `r_${who}`))),
            w,
            `REST create ${at}`
          );
          check(
            await ok(fs.setDoc(ref(...path), { ...rec(kind, team, 'a1'), deleted: true, data: null })),
            w && kind !== 'player' ? true : w,
            `tombstone ${at}`
          );
          if (w) await fs.setDoc(ref(...path), rec(kind, team, 'a1')); // restore it for the next person
          // Hard delete: only the platform Administrator
          if (kind !== 'player')
            check(
              await ok(fs.deleteDoc(ref(...pathOf(kind, org, `${kind}__${team}__nada`)))),
              who === 'adminPlataforma',
              `delete ${at}`
            );
        }
    });
  }
});

describe('F3.1 — listas sem filtro de equipa', () => {
  // Only who reads EVERY team of the club may list the whole private collection
  const whole: Record<string, string[]> = {
    dono: [ORG],
    admin: [ORG],
    diretor: [ORG],
    outroClube: [OTHER],
    adminPlataforma: [ORG, OTHER]
  };
  for (const { who } of PEOPLE) {
    it(`${who}: ${(whole[who] || []).join(', ') || 'nenhum clube'}`, async () => {
      await signInAs(who);
      for (const org of [ORG, OTHER])
        check(
          await ok(fs.getDocs(fs.collection(fb.db, 'club_workspace', org, 'private'))),
          (whole[who] || []).includes(org),
          `${who} lista ${org}`
        );
    });
  }
});

describe('F3.1 — o acesso antigo (sem organização) nunca abre os dados privados', () => {
  it('reads the old club records, but not its private records', async () => {
    await signInAs('antigo');
    check(await ok(fs.getDoc(ref('club_workspace', LEGACY, 'records', 'player__eqL__a1'))), true, 'antigo lê o perfil');
    for (const kind of PRIVATE) {
      check(await ok(fs.getDoc(ref('club_workspace', LEGACY, 'private', `${kind}__eqL__a1`))), false, `antigo ${kind}`);
      check(
        await ok(fs.setDoc(ref('club_workspace', LEGACY, 'private', `${kind}__eqL__b1`), rec(kind, 'eqL', 'b1'))),
        false,
        `antigo escreve ${kind}`
      );
    }
  });
});

describe('F3.1 — forma dos registos privados', () => {
  const P = (id: string) => ref('club_workspace', ORG, 'private', id);
  it('the id says the kind, the team and the athlete', async () => {
    await signInAs('treinadorA');
    check(await ok(fs.setDoc(P('peval__eqA__x1'), rec('peval', 'eqA', 'x1'))), true, 'id certo');
    check(await ok(fs.setDoc(P('peval__eqA__x2'), rec('peval', 'eqA', 'outro'))), false, 'atleta diferente do id');
    check(await ok(fs.setDoc(P('pnotes__eqA__x3'), rec('peval', 'eqA', 'x3'))), false, 'tipo diferente do id');
    check(await ok(fs.setDoc(P('peval__eqB__x4'), rec('peval', 'eqA', 'x4'))), false, 'equipa diferente do id');
  });
  it('only the private kinds, never the club record, no extra keys, data unless deleted', async () => {
    await signInAs('treinadorA');
    check(await ok(fs.setDoc(P('player__eqA__y1'), rec('player', 'eqA', 'y1'))), false, 'player não é privado');
    check(await ok(fs.setDoc(P('peval___club__y2'), rec('peval', '_club', 'y2'))), false, '_club');
    check(await ok(fs.setDoc(P('peval__eqA__y3'), rec('peval', 'eqA', 'y3', { extra: 1 }))), false, 'chave a mais');
    check(await ok(fs.setDoc(P('peval__eqA__y4'), rec('peval', 'eqA', 'y4', { data: null }))), false, 'sem data');
    check(
      await ok(fs.setDoc(P('peval__eqA__y5'), rec('peval', 'eqA', 'y5', { updatedAt: Date.now() + 3_600_000 }))),
      false,
      'data no futuro'
    );
  });
  it('a record never moves to another team nor changes kind (not even by the owner)', async () => {
    await signInAs('dono');
    await fs.setDoc(P('peval__eqA__z1'), rec('peval', 'eqA', 'z1'));
    // Same id, other team or kind in the body: the id no longer matches, and the stored team/kind must stay
    check(await ok(fs.setDoc(P('peval__eqA__z1'), rec('peval', 'eqB', 'z1'))), false, 'mudar de equipa');
    check(await ok(fs.setDoc(P('peval__eqA__z1'), rec('pgoals', 'eqA', 'z1'))), false, 'mudar de tipo');
  });
  it('the sport profile stays as it was (staff reads it; the private kinds are not records)', async () => {
    await signInAs('staffA');
    check(await ok(fs.getDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a1'))), true, 'staff lê perfil');
    await signInAs('treinadorA');
    check(
      await ok(fs.setDoc(ref('club_workspace', ORG, 'records', 'peval__eqA__w1'), rec('peval', 'eqA', 'w1'))),
      false,
      'tipo privado em records'
    );
  });
  it('records how many checks ran', () => {
    expect(checks).toBeGreaterThan(1500);
    console.info(`F3.1: ${checks} verificações`);
  });
});
