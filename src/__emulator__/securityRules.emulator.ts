/**
 * Security rules: each attack is checked against the previous rules (to prove the hole existed) and the
 * current firestore.rules (to prove it is closed). Runs against the Firebase emulators (vitest.emulator.config.ts).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

/** Rules before this security fix (commit that introduced the review), for the "hole existed" checks. */
function rulesBeforeFix(): string | null {
  try {
    return execSync('git show 4eabf48:firestore.rules', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

async function setRules(content: string) {
  const res = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
  });
  if (!res.ok) throw new Error(`rules upload failed: ${res.status}`);
}

const fb = await import('../services/firebase');
const fs = await import('firebase/firestore');
const fa = await import('firebase/auth');
fs.connectFirestoreEmulator(fb.db, FIRESTORE.split(':')[0], Number(FIRESTORE.split(':')[1]));
fa.connectAuthEmulator(fb.auth, `http://${AUTH}`, { disableWarnings: true });

const uids: Record<string, string> = {};
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
};
const account = (who: string, clubId: string | null, extra: Record<string, unknown> = {}) => ({
  account: {
    id: uids[who],
    username: who,
    name: who,
    email: `${who}@teste.pt`,
    role: 'Treinador Principal',
    status: 'approved',
    assignedTeams: ['sub11'],
    ...(clubId ? { clubId } : {}),
    ...extra
  }
});
const userDoc = (who: string) => fs.doc(fb.db, 'users', uids[who]);
const denied = { code: 'permission-denied' };

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const who of ['admin', 'coachA', 'colegaA', 'coachB', 'semClube', 'semEquipas']) {
    const cred = await fa.createUserWithEmailAndPassword(fb.auth, `${who}@teste.pt`, 'segredo123');
    uids[who] = cred.user.uid;
  }
  await fs.setDoc(fs.doc(fb.db, 'admins', uids.admin), { uid: uids.admin, role: 'Administrador' });
  await fs.setDoc(userDoc('admin'), account('admin', 'clubA', { role: 'Administrador', assignedTeams: ['all'] }));
  await fs.setDoc(userDoc('coachA'), account('coachA', 'clubA', { phoneNumber: '912000001' }));
  await fs.setDoc(userDoc('colegaA'), account('colegaA', 'clubA'));
  await fs.setDoc(userDoc('coachB'), account('coachB', 'clubB', { phoneNumber: '912000002' }));
  await fs.setDoc(userDoc('semClube'), account('semClube', null));
  await fs.setDoc(userDoc('semEquipas'), {
    account: {
      id: uids.semEquipas,
      username: 'semEquipas',
      role: 'Treinador Adjunto',
      status: 'approved',
      clubId: 'clubA'
    }
  });
  await fs.setDoc(fs.doc(fb.db, 'invitations', 'BCV-AAAAA'), {
    inviteCode: 'BCV-AAAAA',
    email: 'pai@x.pt',
    clubId: 'clubB',
    status: 'pending',
    expiresAt: Date.now() + 86_400_000
  });
  await fs.setDoc(fs.doc(fb.db, 'audit_logs', 'log1'), { userId: uids.coachB, action: 'login', timestamp: 1 });
});

type Attack = { name: string; run: () => Promise<unknown> };
const attacks: Attack[] = [
  {
    name: 'coach of club A reads the profile (phone, email) of a coach of club B',
    run: async () => {
      await signInAs('coachA');
      return fs.getDoc(userDoc('coachB'));
    }
  },
  {
    name: 'coach lists every user of every club',
    run: async () => {
      await signInAs('coachA');
      return fs.getDocs(fs.collection(fb.db, 'users'));
    }
  },
  {
    name: 'coach without a club assigns himself to another club',
    run: async () => {
      await signInAs('semClube');
      return fs.setDoc(userDoc('semClube'), account('semClube', 'clubB'));
    }
  },
  {
    name: 'coach whose profile has no team list gives himself access to every team',
    run: async () => {
      await signInAs('semEquipas');
      return fs.setDoc(userDoc('semEquipas'), {
        account: {
          id: uids.semEquipas,
          username: 'semEquipas',
          role: 'Treinador Adjunto',
          status: 'approved',
          clubId: 'clubA',
          assignedTeams: ['all']
        }
      });
    }
  },
  {
    name: 'coach lists every invitation (codes and emails)',
    run: async () => {
      await signInAs('coachA');
      return fs.getDocs(fs.collection(fb.db, 'invitations'));
    }
  },
  {
    name: 'coach lists the audit logs of every club',
    run: async () => {
      await signInAs('coachA');
      return fs.getDocs(fs.collection(fb.db, 'audit_logs'));
    }
  }
];

describe('Falhas com as regras anteriores (prova de que existiam)', () => {
  const previous = rulesBeforeFix();
  beforeAll(async () => {
    if (previous) await setRules(previous);
  });
  for (const attack of attacks) {
    it.skipIf(!previous)(`was possible: ${attack.name}`, async () => {
      await attack.run(); // throws (and fails the test) if the rules deny it
    });
  }
});

describe('Regras atuais: as falhas estão fechadas', () => {
  beforeAll(async () => {
    await setRules(OPEN_RULES);
    // Undo what the "previous rules" attacks changed
    await fs.setDoc(userDoc('semClube'), account('semClube', null));
    await fs.setDoc(userDoc('coachA'), account('coachA', 'clubA', { phoneNumber: '912000001' }));
    await fs.setDoc(userDoc('semEquipas'), {
      account: {
        id: uids.semEquipas,
        username: 'semEquipas',
        role: 'Treinador Adjunto',
        status: 'approved',
        clubId: 'clubA'
      }
    });
    await setRules(RULES_NOW);
  });
  for (const attack of attacks) {
    it(`blocked: ${attack.name}`, async () => {
      await expect(attack.run()).rejects.toMatchObject(denied);
    });
  }
});

describe('Regras atuais: o uso normal continua a funcionar', () => {
  beforeAll(async () => {
    await setRules(RULES_NOW);
  });

  it('a coach reads their own profile and a colleague of the same club', async () => {
    await signInAs('coachA');
    expect((await fs.getDoc(userDoc('coachA'))).exists()).toBe(true);
    expect((await fs.getDoc(userDoc('colegaA'))).exists()).toBe(true);
  });

  it('a coach updates their own name and last activity', async () => {
    await signInAs('coachA');
    await fs.setDoc(userDoc('coachA'), {
      account: { ...account('coachA', 'clubA', { phoneNumber: '912000001' }).account, name: 'Novo Nome' },
      lastActiveAt: Date.now()
    });
    await fs.setDoc(userDoc('coachA'), { lastActiveAt: Date.now(), updatedAt: Date.now() }, { merge: true });
  });

  it('an invitation can be opened by its code', async () => {
    await signInAs('coachA');
    expect((await fs.getDoc(fs.doc(fb.db, 'invitations', 'BCV-AAAAA'))).exists()).toBe(true);
  });

  it('a coach records and reads their own audit entries', async () => {
    await signInAs('coachA');
    await fs.setDoc(fs.doc(fb.db, 'audit_logs', 'logA'), { userId: uids.coachA, action: 'login', timestamp: 2 });
    expect((await fs.getDoc(fs.doc(fb.db, 'audit_logs', 'logA'))).exists()).toBe(true);
    await expect(fs.getDoc(fs.doc(fb.db, 'audit_logs', 'log1'))).rejects.toMatchObject(denied);
  });

  it('the Administrator lists users, invitations and audit logs, and manages accounts', async () => {
    await signInAs('admin');
    expect((await fs.getDocs(fs.collection(fb.db, 'users'))).size).toBe(6);
    expect((await fs.getDocs(fs.collection(fb.db, 'invitations'))).size).toBe(1);
    expect((await fs.getDocs(fs.collection(fb.db, 'audit_logs'))).size).toBeGreaterThanOrEqual(2);
    await fs.setDoc(userDoc('semClube'), account('semClube', 'clubA'));
  });
});
