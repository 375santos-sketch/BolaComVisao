/**
 * F3.2 — Double writing of the athletes' private copies (phase 0 of the F3 plan), with the REAL rules:
 *  - only in a club the platform Administrator switched on (system/dadosPrivados); elsewhere nothing is written;
 *  - each member writes only the kinds the rules let it write (a refused kind never stops the save of the records);
 *  - changes and removals reach the private copies; the sport profile (records/player) stays as it was.
 * Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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

const ORG = 'orgDuplaEscrita';
const OFF = 'orgDesligado';
const PEOPLE = [
  { who: 'treinador', role: 'treinador', org: ORG },
  { who: 'diretor', role: 'diretor', org: ORG },
  { who: 'staff', role: 'staff', org: ORG },
  { who: 'treinadorOff', role: 'treinador', org: OFF }
];
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@dupla.pt`, 'segredo123');
  storage.clear();
  // As the app does for a member of one team (F2.2): only its team, never the club record
  const org = PEOPLE.find((p) => p.who === who)!.org;
  cloud.setTeamScope(org, ['eqA']);
  await cloud.loadClubStateFromRecords(org);
};
const club = (org: string, who: string, notes: string, withRatings = true) =>
  normalizeClubState({
    activeTeamId: 'eqA',
    currentUser: { id: uids[who], name: who, orgId: org, orgRole: PEOPLE.find((p) => p.who === who)!.role },
    myClubName: 'Clube Dupla',
    teams: [
      {
        id: 'eqA',
        clubName: 'Clube Dupla',
        category: 'Sub-11',
        season: '2026/2027',
        roster: [
          {
            id: 'p1',
            name: 'Atleta Um',
            number: 7,
            positions: 'Médio',
            birthDate: null,
            active: true,
            phone: '910000000',
            coachNotes: notes,
            competencyEvaluations: [{ id: 'c1', date: '2026-10-02', levels: { passe: 3 } }]
          }
        ],
        matches: [
          {
            id: 'm1',
            date: '2026-10-05',
            opponent: 'Adversário',
            goals: [],
            ...(withRatings ? { ratings: { p1: 4 } } : {})
          }
        ]
      }
    ],
    updatedAt: Date.now(),
    lastLocalMutationAt: Date.now()
  } as never);
const privateIds = async (org: string) => {
  await setRules(OPEN_RULES);
  const snap = await fs.getDocs(fs.collection(fb.db, 'club_workspace', org, 'private'));
  const out = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  await setRules(RULES_NOW);
  return out;
};

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const p of PEOPLE)
    uids[p.who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${p.who}@dupla.pt`, 'segredo123')).user.uid;
  for (const org of [ORG, OFF]) {
    await fs.setDoc(ref('organizations', org), {
      id: org,
      type: 'club',
      name: org,
      status: 'active',
      ownerUid: uids.treinador,
      createdAt: 1,
      createdBy: uids.treinador,
      plan: null
    });
  }
  for (const p of PEOPLE)
    await fs.setDoc(ref('organizations', p.org, 'members', uids[p.who]), {
      uid: uids[p.who],
      displayName: p.who,
      email: `${p.who}@dupla.pt`,
      role: p.role,
      teamIds: ['eqA'],
      status: 'active',
      addedBy: uids.treinador,
      addedAt: 1
    });
  // Both clubs already in per-record storage; only ORG switched on by the Administrator
  for (const org of [ORG, OFF]) {
    cloud.setTeamScope(org, null);
    expect((await cloud.migrateClubToRecords(org, club(org, 'treinador', 'inicial'), uids.treinador)).success).toBe(
      true
    );
  }
  await fs.setDoc(ref('system', 'dadosPrivados'), { clubesLigados: [ORG], updatedAt: Date.now() });
  await setRules(RULES_NOW);
}, 120_000);

describe('F3.2 — dupla escrita das cópias privadas', () => {
  it('a coach saving in a switched-on club writes the 5 kinds; the sport profile keeps everything', async () => {
    await signInAs('treinador');
    expect(await cloud.privateDataClubs(true)).toEqual([ORG]);
    await cloud.resolveCloudMode(ORG);
    const res = await fb.saveMasterClubState(ORG, club(ORG, 'treinador', 'nota 1'), uids.treinador);
    expect(res.message).toMatch(/Nuvem atualizada/);
    const priv = await privateIds(ORG);
    expect(Object.keys(priv).sort()).toEqual([
      'mratings__eqA__m1',
      'pcontact__eqA__p1',
      'peval__eqA__p1',
      'pnotes__eqA__p1'
    ]);
    expect(priv['pnotes__eqA__p1'].data.coachNotes).toBe('nota 1');
    expect(priv['pnotes__eqA__p1'].updatedBy).toBe(uids.treinador);
    // phase 0: the profile still holds the private fields (it is the source until F3.5)
    await setRules(OPEN_RULES);
    const profile = (await fs.getDoc(ref('club_workspace', ORG, 'records', 'player__eqA__p1'))).data()!;
    await setRules(RULES_NOW);
    expect(profile.data.coachNotes).toBe('nota 1');
  });

  it('a change reaches the copy; what disappears becomes a tombstone (nothing hard-deleted)', async () => {
    await signInAs('treinador');
    await cloud.resolveCloudMode(ORG);
    // first save from this (fresh) device, then a change: the notes change and the game ratings are removed
    await fb.saveMasterClubState(ORG, club(ORG, 'treinador', 'nota 1'), uids.treinador);
    const res = await fb.saveMasterClubState(ORG, club(ORG, 'treinador', 'nota 2', false), uids.treinador);
    expect(res.success).toBe(true);
    const priv = await privateIds(ORG);
    expect(priv['pnotes__eqA__p1'].data.coachNotes).toBe('nota 2');
    expect(priv['mratings__eqA__m1']).toMatchObject({ deleted: true, data: null });
  });

  it('a director writes only the contacts; the save of the records still succeeds', async () => {
    await signInAs('diretor');
    await cloud.resolveCloudMode(ORG);
    const before = await privateIds(ORG);
    const state = club(ORG, 'diretor', 'nota do diretor');
    state.teams[0].roster[0].phone = '939999999';
    state.roster = state.teams[0].roster;
    const res = await fb.saveMasterClubState(ORG, state, uids.diretor);
    expect(res.success).toBe(true);
    const priv = await privateIds(ORG);
    expect(priv['pcontact__eqA__p1'].data.phone).toBe('939999999');
    expect(priv['pcontact__eqA__p1'].updatedBy).toBe(uids.diretor);
    // the notes copy was not touched by the director (the rules would refuse it)
    expect(priv['pnotes__eqA__p1'].updatedAt).toBe(before['pnotes__eqA__p1'].updatedAt);
  });

  it('staff writes nothing at all', async () => {
    await signInAs('staff');
    expect((await cloud.pushPrivateRecords(ORG, club(ORG, 'staff', 'x'), [] as never)).written).toBe(0);
  });

  it('in a club that is not switched on, nothing private is written', async () => {
    await signInAs('treinadorOff');
    await cloud.resolveCloudMode(OFF);
    const res = await fb.saveMasterClubState(OFF, club(OFF, 'treinadorOff', 'nota'), uids.treinadorOff);
    expect(res.success).toBe(true);
    expect(await privateIds(OFF)).toEqual({});
  });

  it('only the platform Administrator switches it on or off', async () => {
    await signInAs('treinador');
    await expect(cloud.setPrivateDataClub(ORG, false)).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
