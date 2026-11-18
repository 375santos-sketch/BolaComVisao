/**
 * MC2a — «O Meu Percurso»: only in clubs the platform Administrator switched on; the athlete's own account (13+) is
 * invited BY ITS GUARDIAN (from the guardian's accepted invitation of that athlete); the athlete's page is read only by
 * the accounts accepted for that athlete, never another athlete's, never the club's records; revoking closes it.
 * Real rules and the app's own service. Fictitious data only.
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
const g = await import('../services/guardians');

const ON = 'orgLigado';
const OFF = 'orgDesligado';
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@percurso.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const invite = (code: string, clubId: string, athleteId: string, acceptedBy: string, extra = {}) => ({
  id: code,
  clubId,
  teamId: 'eqA',
  athleteId,
  athleteName: 'Atleta Exemplo',
  teamName: 'Sub-15',
  clubName: 'Clube Exemplo',
  createdBy: 'x',
  createdAt: 1,
  expiresAt: Date.now() + 86_400_000,
  status: 'accepted',
  acceptedBy: uids[acceptedBy],
  consentData: true,
  consentVideo: false,
  ...extra
});
const view = { athleteName: 'Atleta Exemplo', assignments: [], canHaveOwnAccount: true };
let athleteCode = '';

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const who of ['admin', 'treinador', 'staff', 'mae', 'outraMae', 'atleta', 'intruso']) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@percurso.pt`, 'segredo123')).user.uid;
  }
  await fs.setDoc(ref('admins', uids.admin), { uid: uids.admin });
  for (const org of [ON, OFF]) {
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
    for (const [who, role] of [
      ['treinador', 'treinador'],
      ['staff', 'staff']
    ]) {
      await fs.setDoc(ref('organizations', org, 'members', uids[who]), {
        uid: uids[who],
        displayName: who,
        email: `${who}@percurso.pt`,
        role,
        teamIds: ['eqA'],
        status: 'active',
        addedBy: 'x',
        addedAt: 1
      });
    }
  }
  await fs.setDoc(ref('club_workspace', ON, 'records', 'player__eqA__a1'), {
    kind: 'player',
    teamId: 'eqA',
    entityId: 'a1',
    data: { id: 'a1', name: 'Atleta Exemplo', coachNotes: 'nota interna' },
    updatedAt: 1,
    deleted: false
  });
  // Accepted guardian invitations: the mother of a1 in both clubs; another mother of a2
  await fs.setDoc(
    ref('guardian_invites', 'maeLigadoCodigoA1xxxxxxxx'),
    invite('maeLigadoCodigoA1xxxxxxxx', ON, 'a1', 'mae')
  );
  await fs.setDoc(
    ref('guardian_invites', 'maeDesligadoCodigoA1xxxxx'),
    invite('maeDesligadoCodigoA1xxxxx', OFF, 'a1', 'mae')
  );
  await fs.setDoc(
    ref('guardian_invites', 'outraLigadoCodigoA2xxxxxx'),
    invite('outraLigadoCodigoA2xxxxxx', ON, 'a2', 'outraMae')
  );
  await setRules(RULES_NOW);
});

describe('MC2a — interruptor do Administrador', () => {
  it('only the platform Administrator switches a club on', async () => {
    await signInAs('treinador');
    expect(await ok(g.setCareerClub(ON, true))).toBe(false);
    await signInAs('admin');
    expect(await g.setCareerClub(ON, true)).toEqual([ON]);
  });
});

describe('MC2a — o encarregado convida a conta do atleta (13+)', () => {
  it('from their accepted invitation, only in a club switched on', async () => {
    await signInAs('mae');
    const parent = (await g.readInvite('maeLigadoCodigoA1xxxxxxxx'))!;
    await fs.setDoc(ref('guardians', uids.mae), {
      uid: uids.mae,
      name: 'Mãe',
      email: '',
      codes: [parent.id],
      createdAt: 1,
      updatedAt: 1
    });
    athleteCode = (await g.createAthleteInvite(parent)).id;
    expect(athleteCode.length).toBeGreaterThanOrEqual(20);
    const off = (await g.readInvite('maeDesligadoCodigoA1xxxxx'))!;
    expect(await ok(g.createAthleteInvite(off))).toBe(false); // club off
  });

  it('nobody else invites it: another guardian, a stranger, nor the coach as «atleta»', async () => {
    const parent = (await (await signInAs('mae'), g.readInvite('maeLigadoCodigoA1xxxxxxxx')))!;
    for (const who of ['outraMae', 'intruso', 'treinador']) {
      await signInAs(who);
      expect(await ok(g.createAthleteInvite(parent))).toBe(false);
    }
    // nor for another athlete from the mother's invitation
    await signInAs('mae');
    expect(await ok(g.createAthleteInvite({ ...parent, athleteId: 'a2' }))).toBe(false);
  });

  it('the athlete accepts it (once)', async () => {
    await signInAs('atleta');
    expect(await ok(g.acceptInvite(athleteCode, { video: false }, { name: 'Atleta' }))).toBe(true);
    await signInAs('intruso');
    expect(await ok(g.acceptInvite(athleteCode, { video: false }, { name: 'Outro' }))).toBe(false);
  });
});

describe('MC2a — a página «O Meu Percurso»', () => {
  it("the team's coach publishes it; staff cannot; not in a club switched off", async () => {
    await signInAs('treinador');
    for (const code of [athleteCode, 'maeLigadoCodigoA1xxxxxxxx']) {
      const inv = (await g.readInvite(code))!;
      expect(await ok(g.publishAthleteView(inv, view as never))).toBe(true);
    }
    const off = (await g.readInvite('maeDesligadoCodigoA1xxxxx'))!;
    expect(await ok(g.publishAthleteView(off, view as never))).toBe(false);
    await signInAs('staff');
    const inv = (await g.readInvite(athleteCode))!;
    expect(await ok(g.publishAthleteView(inv, view as never))).toBe(false);
  });

  it('the athlete and the guardian read their page; never another athlete, never the club', async () => {
    await signInAs('atleta');
    expect((await g.readAthleteView(athleteCode))?.view.athleteName).toBe('Atleta Exemplo');
    expect(await ok(g.readAthleteView('maeLigadoCodigoA1xxxxxxxx'))).toBe(false); // the mother's page
    expect(await ok(fs.getDoc(ref('club_workspace', ON, 'records', 'player__eqA__a1')))).toBe(false);
    await signInAs('mae');
    expect(await ok(g.readAthleteView('maeLigadoCodigoA1xxxxxxxx'))).toBe(true);
    await signInAs('outraMae');
    expect(await ok(g.readAthleteView('maeLigadoCodigoA1xxxxxxxx'))).toBe(false);
    expect(await ok(g.readAthleteView(athleteCode))).toBe(false);
  });

  it('switching the club off closes the pages', async () => {
    await signInAs('admin');
    await g.setCareerClub(ON, false);
    await signInAs('atleta');
    expect(await ok(g.readAthleteView(athleteCode))).toBe(false);
    await signInAs('admin');
    await g.setCareerClub(ON, true);
  });

  it('the guardian (or the coach) takes the athlete account away, and the page closes', async () => {
    await signInAs('mae');
    expect(await ok(g.revokeGuardianInvite(athleteCode))).toBe(true);
    await signInAs('atleta');
    expect(await ok(g.readAthleteView(athleteCode))).toBe(false);
    // another guardian cannot revoke the mother's guardian invitation
    await signInAs('outraMae');
    expect(await ok(g.revokeGuardianInvite('maeLigadoCodigoA1xxxxxxxx'))).toBe(false);
  });
});
