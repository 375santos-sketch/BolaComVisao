/**
 * VJ4 — Biblioteca BolaComVisão: every approved account reads the PUBLISHED sessions; only the platform
 * Administrator writes, publishes or withdraws them; an account not approved reads nothing. Real rules and the app's
 * own service. Fictitious data only.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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
const lib = await import('../services/platformLibrary');
const { newSession } = await import('../lib/vjLibrary');

const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@plataforma.pt`, 'segredo123');
};
const session = (id: string, status: 'rascunho' | 'publicado' | 'arquivado') => ({
  ...newSession({ id, title: `Sessão ${id}`, authorName: 'BolaComVisão', now: '2026-11-15T10:00:00.000Z' }),
  status
});

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, status, isAdmin] of [
    ['admin', 'approved', true],
    ['treinador', 'approved', false],
    ['pendente', 'pending', false]
  ] as const) {
    const uid = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@plataforma.pt`, 'segredo123')).user.uid;
    await fs.setDoc(fs.doc(fb.db, 'users', uid), {
      account: { id: uid, username: who, name: who, role: isAdmin ? 'Administrador' : 'Treinador Principal', status }
    });
    if (isAdmin) await fs.setDoc(fs.doc(fb.db, 'admins', uid), { uid });
  }
  await setRules(RULES_NOW);
});

describe('VJ4 — biblioteca BolaComVisão', () => {
  it('the Administrator writes, publishes and reads every state', async () => {
    await signInAs('admin');
    expect(await ok(lib.savePlatformSession(session('pub1', 'publicado')))).toBe(true);
    expect(await ok(lib.savePlatformSession(session('rasc1', 'rascunho')))).toBe(true);
    expect((await lib.loadPlatformSessions(true)).map((s) => s.id).sort()).toEqual(['pub1', 'rasc1']);
  });

  it('a coach reads only the published sessions, keeps them for offline, and never writes', async () => {
    await signInAs('treinador');
    storage.clear();
    expect((await lib.loadPlatformSessions(false)).map((s) => s.id)).toEqual(['pub1']);
    expect(lib.cachedPlatformSessions().map((s) => s.id)).toEqual(['pub1']);
    expect(await ok(fs.getDoc(fs.doc(fb.db, 'platform_library', 'rasc1')))).toBe(false);
    expect(await ok(fs.getDocs(fs.collection(fb.db, 'platform_library')))).toBe(false); // every state: refused
    expect(await ok(lib.savePlatformSession(session('meu', 'publicado')))).toBe(false);
    expect(await ok(lib.savePlatformSession(session('pub1', 'arquivado')))).toBe(false);
  });

  it('an account not approved reads nothing', async () => {
    await signInAs('pendente');
    expect(await ok(lib.loadPlatformSessions(false))).toBe(false);
  });

  it('the stored state always matches the session (a draft is never listed as published)', async () => {
    await signInAs('admin');
    const bad = { status: 'publicado', session: session('x1', 'rascunho'), updatedAt: Date.now() };
    expect(await ok(fs.setDoc(fs.doc(fb.db, 'platform_library', 'x1'), bad))).toBe(false);
  });
});
