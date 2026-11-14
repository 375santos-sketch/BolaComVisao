/**
 * F2.7 — Final validation of F2 against the emulator with the REAL rules (plan F2, section 7):
 *  - a club with two teams, about a season's worth of records each, and a second club;
 *  - ten people: owner, admin, diretor, coordenador, coach and assistant of team A, staff of A, coach of B,
 *    a revoked coach of A and the owner of the other club;
 *  - the app's own loader (with each person's team scope) under the real rules: who loads what;
 *  - the matrix read/write × team A, team B, the club record, the team settings and the old single document;
 *  - how many documents each person's app reads when it opens (the Firestore free quota counts documents read).
 * Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: (i: number) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  }
};

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
const cloud = await import('../services/clubCloud');
const { normalizeClubState } = await import('../lib/storage');

const ORG = 'orgValidacao';
const OTHER = 'orgOutroClube';
// A season per team: 25 athletes, 30 games, 110 trainings, 30 calendar entries
const SIZE = { players: 25, matches: 30, trainings: 110, schedule: 30 };

const seasonOf = (teamId: string, label: string) => ({
  id: teamId,
  clubName: 'Clube Validação',
  category: label,
  season: '2026/2027',
  createdAt: '2026-09-01',
  roster: Array.from({ length: SIZE.players }, (_, i) => ({
    id: `p${i}`,
    name: `Atleta ${label} ${i}`,
    number: i + 1,
    positions: 'Médio',
    birthDate: null,
    active: true
  })),
  matches: Array.from({ length: SIZE.matches }, (_, i) => ({
    id: `m${i}`,
    date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
    opponent: `Adversário ${i}`,
    type: 'campeonato',
    location: 'casa',
    goalsFor: 1,
    goalsAgainst: 0,
    goals: [],
    season: '2026/2027'
  })),
  trainings: Array.from({ length: SIZE.trainings }, (_, i) => ({
    id: `t${i}`,
    date: `2026-${String(9 + Math.floor(i / 28)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    time: '18:00',
    notes: '',
    absences: [],
    season: '2026/2027'
  })),
  schedule: Array.from({ length: SIZE.schedule }, (_, i) => ({
    id: `s${i}`,
    date: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
    time: '10:00',
    opponent: `Adversário ${i}`,
    type: 'campeonato',
    location: 'fora'
  })),
  tactics: [],
  tacticFormat: 7
});

const PEOPLE: Array<{ who: string; role: string; teams: string[]; status?: string; org?: string }> = [
  { who: 'dono', role: 'owner', teams: ['*'] },
  { who: 'admin', role: 'admin', teams: ['*'] },
  { who: 'diretor', role: 'diretor', teams: ['*'] },
  { who: 'coord', role: 'coordenador', teams: ['*'] },
  { who: 'treinadorA', role: 'treinador', teams: ['eqA'] },
  { who: 'adjuntoA', role: 'adjunto', teams: ['eqA'] },
  { who: 'staffA', role: 'staff', teams: ['eqA'] },
  { who: 'treinadorB', role: 'treinador', teams: ['eqB'] },
  { who: 'revogado', role: 'treinador', teams: ['eqA'], status: 'revoked' },
  { who: 'outroClube', role: 'owner', teams: ['*'], org: OTHER }
];
const uids: Record<string, string> = {};
const denied = { code: 'permission-denied' };
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@validacao.pt`, 'segredo123');
};
const scopeOf = (who: string) => {
  const p = PEOPLE.find((x) => x.who === who)!;
  return p.teams.includes('*') ? null : p.teams;
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const rec = (kind: string, teamId: string, id: string) => ({
  kind,
  teamId,
  entityId: id,
  data: { id, name: 'validação' },
  updatedAt: Date.now(),
  deleted: false
});
const measures: Array<Record<string, unknown>> = [];

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const p of PEOPLE) {
    const org = p.org ?? ORG;
    uids[p.who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${p.who}@validacao.pt`, 'segredo123')).user.uid;
    // Everyone also has the OLD access to their club (approved account with clubId): the membership must decide
    await fs.setDoc(ref('users', uids[p.who]), {
      account: {
        id: uids[p.who],
        username: p.who,
        name: p.who,
        role: 'Treinador Principal',
        status: 'approved',
        clubId: org
      }
    });
  }
  for (const org of [ORG, OTHER]) {
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
  }
  for (const p of PEOPLE) {
    await fs.setDoc(ref('organizations', p.org ?? ORG, 'members', uids[p.who]), {
      uid: uids[p.who],
      displayName: p.who,
      email: `${p.who}@validacao.pt`,
      role: p.role,
      teamIds: p.teams,
      status: p.status ?? 'active',
      addedBy: uids.dono,
      addedAt: 1
    });
  }
  // The club in per-record storage, written as a device that sees every team
  cloud.setTeamScope(ORG, null);
  const state = normalizeClubState({
    activeTeamId: 'eqA',
    teams: [seasonOf('eqA', 'Sub-9'), seasonOf('eqB', 'Sub-11')],
    myClubName: 'Clube Validação',
    updatedAt: 1,
    lastLocalMutationAt: 1
  } as any);
  expect((await cloud.migrateClubToRecords(ORG, state, uids.dono)).success).toBe(true);
  await fs.setDoc(ref('club_workspace', ORG), { state: {}, updatedAt: Date.now() });
  await fs.setDoc(ref('club_workspace', OTHER, 'records', 'club'), rec('club', '_club', 'club'));
  await setRules(RULES_NOW);
}, 120_000);

describe('F2.7 — o que a app de cada pessoa carrega (regras reais)', () => {
  const expected: Record<string, string[] | 'nada'> = {
    dono: ['eqA', 'eqB'],
    admin: ['eqA', 'eqB'],
    diretor: ['eqA', 'eqB'],
    coord: ['eqA', 'eqB'],
    treinadorA: ['eqA'],
    adjuntoA: ['eqA'],
    staffA: ['eqA'],
    treinadorB: ['eqB'],
    revogado: 'nada',
    outroClube: 'nada'
  };

  for (const [who, teams] of Object.entries(expected)) {
    it(`${who}: ${teams === 'nada' ? 'nada deste clube' : teams.join(' + ')}`, async () => {
      await signInAs(who);
      cloud.setTeamScope(ORG, scopeOf(who));
      const start = performance.now();
      const state = await cloud.loadClubStateFromRecords(ORG);
      const ms = Math.round(performance.now() - start);
      if (teams === 'nada') {
        expect(state).toBeNull();
        return;
      }
      expect(state?.teams.map((t) => t.id).sort()).toEqual(teams);
      const text = JSON.stringify(state);
      if (!teams.includes('eqA')) expect(text).not.toContain('Atleta Sub-9');
      if (!teams.includes('eqB')) expect(text).not.toContain('Atleta Sub-11');
      // Documents read when the app opens = documents its queries return (plus at most a few by the rules)
      const ids = scopeOf(who);
      const queries = ids
        ? [
            fs.query(
              fs.collection(fb.db, 'club_workspace', ORG, 'records'),
              fs.where('teamId', 'in', [...ids, '_club'])
            )
          ]
        : [fs.collection(fb.db, 'club_workspace', ORG, 'records')];
      let docs = 0;
      for (const q of queries) docs += (await fs.getDocs(q)).size;
      measures.push({ who, teams: teams.join('+'), docs, queries: queries.length, ms });
    });
  }
});

describe('F2.7 — matriz de escrita (regras reais)', () => {
  // [team A, team B, club record, settings of team A]
  const expected: Record<string, [boolean, boolean, boolean, boolean]> = {
    dono: [true, true, true, true],
    admin: [true, true, true, true],
    diretor: [true, true, false, true], // D1
    coord: [true, true, false, true], // D2
    treinadorA: [true, false, false, true],
    adjuntoA: [true, false, false, true],
    staffA: [false, false, false, false], // D4
    treinadorB: [false, true, false, false],
    revogado: [false, false, false, false],
    outroClube: [false, false, false, false]
  };
  for (const [who, [a, b, club, cfg]] of Object.entries(expected)) {
    it(`${who}: equipa A ${a ? '✔' : '✘'} · equipa B ${b ? '✔' : '✘'} · clube ${club ? '✔' : '✘'} · definições A ${cfg ? '✔' : '✘'}`, async () => {
      await signInAs(who);
      const w = (id: string, kind: string, team: string) =>
        ok(fs.setDoc(ref('club_workspace', ORG, 'records', id), rec(kind, team, id.split('__')[2] || 'club')));
      expect(await w(`player__eqA__v_${who}`, 'player', 'eqA')).toBe(a);
      expect(await w(`player__eqB__v_${who}`, 'player', 'eqB')).toBe(b);
      expect(await w('club', 'club', '_club')).toBe(club);
      expect(await w('teamconfig__eqA__config', 'teamconfig', 'eqA')).toBe(cfg);
    });
  }

  it('nobody moves a record of team A into team B (not even the coordinator)', async () => {
    await signInAs('coord');
    await expect(
      fs.setDoc(ref('club_workspace', ORG, 'records', 'player__eqA__p1'), rec('player', 'eqB', 'p1'))
    ).rejects.toMatchObject(denied);
  });
});

describe('F2.7 — leituras diretas e documento antigo', () => {
  it("a coach of A cannot open a record of B even by its exact id; nor the other club's records", async () => {
    await signInAs('treinadorA');
    await expect(fs.getDoc(ref('club_workspace', ORG, 'records', 'player__eqB__p1'))).rejects.toMatchObject(denied);
    await expect(fs.getDoc(ref('club_workspace', OTHER, 'records', 'club'))).rejects.toMatchObject(denied);
    await signInAs('outroClube');
    await expect(fs.getDoc(ref('club_workspace', ORG, 'records', 'player__eqA__p1'))).rejects.toMatchObject(denied);
  });

  it('the old single document (every team) is only for who manages the club', async () => {
    for (const [who, allowed] of [
      ['dono', true],
      ['admin', true],
      ['diretor', false],
      ['coord', false],
      ['treinadorA', false],
      ['staffA', false],
      ['revogado', false]
    ] as const) {
      await signInAs(who);
      expect(await ok(fs.getDoc(ref('club_workspace', ORG))), who).toBe(allowed);
    }
  });

  it('records the measurements', () => {
    expect(measures.length).toBe(8);
    if (process.env.F27_OUT) writeFileSync(process.env.F27_OUT, JSON.stringify({ size: SIZE, measures }, null, 2));
  });
});
