/**
 * P0-09 — The guard against deletions that look like a broken load, with the real rules and the real clubCloud: it
 * holds them back (they stay in the cloud) and now REPORTS how many (blockedDeletions), so the app can tell the coach.
 * Normal deletions (a few at a time) go through. Fictitious data only.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Training } from '../types';

vi.mock('../../firebase-applet-config.json', async (importOriginal) => {
  const original = (await importOriginal()) as { default: Record<string, unknown> };
  return { default: { ...original.default, firestoreDatabaseId: '(default)' } };
});

// localStorage for node (the synced hashes are kept there)
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, String(v)),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear()
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

const CLUB = 'clubeApagoes';
const training = (n: number) =>
  ({
    id: `t${n}`,
    date: `2026-10-${String((n % 28) + 1).padStart(2, '0')}`,
    absences: [],
    completed: true
  }) as unknown as Training;
const stateWith = (count: number) => {
  const trainings = Array.from({ length: count }, (_, i) => training(i + 1));
  return normalizeClubState({
    activeTeamId: 'sub11',
    trainings,
    teams: [{ id: 'sub11', clubName: 'Clube Fictício', category: 'Sub-11', season: '2026/2027', trainings } as any]
  });
};
const liveTrainings = async () =>
  (await fs.getDocs(fs.collection(fb.db, 'club_workspace', CLUB, 'records'))).docs.filter(
    (d) => d.data().kind === 'training' && d.data().deleted !== true
  ).length;

let uid = '';
beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  uid = (await fa.createUserWithEmailAndPassword(fb.auth, 'treinador@apagoes.pt', 'segredo123')).user.uid;
  await fs.setDoc(fs.doc(fb.db, 'users', uid), {
    account: { id: uid, username: 'treinador', role: 'Treinador Principal', status: 'approved', clubId: CLUB }
  });
  await setRules(RULES_NOW);
  // The club in the cloud with 30 trainings (the device now knows them as synced)
  const res = await cloud.migrateClubToRecords(CLUB, stateWith(30), uid);
  expect(res.success).toBe(true);
  expect(await liveTrainings()).toBe(30);
}, 120_000);

afterAll(async () => {
  await fa.signOut(fb.auth);
});

describe('P0-09 · travão de apagamentos em massa (clubCloud + regras reais)', () => {
  it('apagar os 30 treinos de uma vez: fica retido, a nuvem mantém-nos e a app sabe quantos foram', async () => {
    const res = await cloud.pushClubRecords(CLUB, stateWith(0), { authorId: uid });
    expect(res.success).toBe(true);
    expect(res.blockedDeletions).toBe(30);
    expect(await liveTrainings()).toBe(30);
  });

  it('apagar 10 (uso normal): passa, sem aviso', async () => {
    const res = await cloud.pushClubRecords(CLUB, stateWith(20), { authorId: uid });
    expect(res.success).toBe(true);
    expect(res.blockedDeletions).toBeUndefined();
    expect(await liveTrainings()).toBe(20);
  });

  it('com autorização explícita (apagar a equipa inteira, allowMassDelete) passa, como antes', async () => {
    const res = await cloud.pushClubRecords(CLUB, stateWith(0), { authorId: uid, allowMassDelete: true });
    expect(res.success).toBe(true);
    expect(res.blockedDeletions).toBeUndefined();
    expect(await liveTrainings()).toBe(0);
  });
});
