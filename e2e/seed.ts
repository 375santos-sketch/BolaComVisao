/**
 * Fresh emulator data before the screen tests: two approved coaches of club "clubA" and the club in the legacy
 * single-document format (the app migrates it to per-record storage on first use, as in production).
 */
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));

export const PROJECT = config.projectId;
export const DATABASE = config.firestoreDatabaseId || '(default)';
export const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/${DATABASE}/documents`;
const AUTH = 'http://127.0.0.1:9099';
export const PASSWORD = 'segredo123';
export const COACH_A = 'coach.a@clube.pt';
export const COACH_B = 'coach.b@clube.pt';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined };

const toValue = (v: Json | undefined): Record<string, unknown> => {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(v)
          .filter(([, x]) => x !== undefined)
          .map(([k, x]) => [k, toValue(x)])
      )
    }
  };
};

/** Emulator admin access (bypasses the rules). */
export const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const put = async (path: string, obj: { [key: string]: Json }) => {
  const res = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({ fields: (toValue(obj) as { mapValue: { fields: unknown } }).mapValue.fields })
  });
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`);
};

const signUp = async (email: string): Promise<string> => {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true })
  });
  return ((await res.json()) as { localId: string }).localId;
};

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });

export default async function seed() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/${DATABASE}/documents`, {
    method: 'DELETE'
  });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

  for (const [email, name] of [
    [COACH_A, 'Treinador A'],
    [COACH_B, 'Treinador B']
  ]) {
    const uid = await signUp(email);
    await put(`users/${uid}`, {
      account: {
        id: uid,
        username: email.split('@')[0],
        email,
        name,
        role: 'Treinador Principal',
        status: 'approved',
        clubId: 'clubA',
        assignedTeams: ['all'],
        createdAt: '2026-10-01T00:00:00Z'
      },
      createdAt: 1,
      updatedAt: 1
    });
  }

  const player = (id: string, name: string, number: number) => ({
    id,
    name,
    number,
    positions: 'Médio',
    birthDate: '2016-01-01',
    active: true
  });
  const finished = (id: string, opponent: string, date: string) => ({
    id,
    teamId: 'sub11',
    opponent,
    date,
    season: '2026/2027',
    type: 'campeonato',
    location: 'fora',
    finished: true,
    goals: [] as Json[],
    subs: [],
    lineup: ['p1', 'p2', 'p3'],
    capitao: 'p1',
    halfDurationMinutes: 25
  });
  const roster = [player('p1', 'Rui Silva', 9), player('p2', 'Tomás Gonçalves', 7), player('p3', 'André Lopes', 10)];
  const tramagal = finished('m2', 'Tramagal SU', '2026-10-17');
  tramagal.goals = [
    { id: 'g1', type: 'scored', scorerId: 'p1', assistId: 'p2', minute: "12'" },
    { id: 'g2', type: 'conceded', scorerId: null, assistId: null, minute: "30'" },
    { id: 'g3', type: 'scored', scorerId: 'p1', assistId: null, minute: "40'" }
  ];
  const matches = [finished('m1', 'Esparteiros', '2026-10-10'), tramagal];
  const schedule = [
    {
      id: 's1',
      opponent: 'Abrantes',
      date: today(),
      time: '10:30',
      type: 'campeonato',
      location: 'casa',
      callup: ['p1', 'p2', 'p3']
    }
  ];
  const trainings = [
    { id: 't1', date: '2026-10-13', time: '18:15', notes: '', absences: [], completed: true },
    { id: 't2', date: '2026-10-15', time: '18:15', notes: '', absences: ['p3'], completed: true }
  ];
  const team = {
    id: 'sub11',
    clubName: 'Dragões',
    category: 'Sub-11',
    season: '2026/2027',
    createdAt: '2026-09-01',
    roster,
    matches,
    trainings,
    schedule,
    tactics: [],
    tacticFormat: 7
  };
  const state = {
    activeTeamId: 'sub11',
    version: 2,
    teams: [team],
    roster,
    matches,
    trainings,
    schedule,
    tactics: [],
    tacticFormat: 7,
    myClubName: 'Dragões',
    category: 'Sub-11',
    season: '2026/2027',
    lastBackupDate: null,
    trackSubs: true,
    theme: 'original',
    lang: 'pt',
    updatedAt: 1000,
    lastLocalMutationAt: 1000
  };
  await put('club_workspace/clubA', { state, updatedAt: 1000, lastUpdatedBy: 'seed' });
}
