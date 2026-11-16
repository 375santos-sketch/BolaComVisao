/**
 * E1 — Contas dos encarregados: the coach (or the director) invites a guardian for ONE athlete; the guardian accepts
 * once, with the data consent, and reads ONLY the page the coaches' phones publish for that invitation — never the
 * club's records. Real rules and the app's own service. Fictitious data only.
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

const ORG = 'orgFamilias';
const PEOPLE: Array<[string, string, string[]]> = [
  ['diretor', 'diretor', ['*']],
  ['treinadorA', 'treinador', ['eqA']],
  ['adjuntoA', 'adjunto', ['eqA']],
  ['staffA', 'staff', ['eqA']],
  ['treinadorB', 'treinador', ['eqB']]
];
const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  await fa.signInWithEmailAndPassword(fb.auth, `${who}@familias.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
const athlete = (teamId: string, athleteId = 'a1') => ({
  clubId: ORG,
  teamId,
  athleteId,
  athleteName: 'Atleta Exemplo',
  teamName: 'Sub-11',
  clubName: 'Clube Exemplo'
});
const view = {
  athleteName: 'Atleta Exemplo',
  teamName: 'Sub-11',
  clubName: 'Clube Exemplo',
  season: '2026/2027',
  next: [],
  trainings: { attended: 3, total: 4 },
  updatedAt: 1
};

beforeAll(async () => {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: 'DELETE'
  });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const [who, role, teams] of PEOPLE) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@familias.pt`, 'segredo123')).user.uid;
    await fs.setDoc(ref('users', uids[who]), {
      account: { id: uids[who], username: who, name: who, role: 'Treinador Principal', status: 'approved' }
    });
    await fs.setDoc(ref('organizations', ORG, 'members', uids[who]), {
      uid: uids[who],
      displayName: who,
      email: `${who}@familias.pt`,
      role,
      teamIds: teams,
      status: 'active',
      addedBy: 'x',
      addedAt: 1
    });
  }
  // Guardians: accounts WITHOUT a profile in "users" (they never belong to the club)
  for (const who of ['mae', 'pai', 'outro']) {
    uids[who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${who}@familias.pt`, 'segredo123')).user.uid;
  }
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: 'Clube Exemplo',
    status: 'active',
    ownerUid: 'x',
    createdAt: 1,
    createdBy: 'x',
    plan: null
  });
  await fs.setDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a1'), {
    kind: 'player',
    teamId: 'eqA',
    entityId: 'a1',
    data: { id: 'a1', name: 'Atleta Exemplo', coachNotes: 'nota interna' },
    updatedAt: 1,
    deleted: false
  });
  // An invitation that already expired
  await fs.setDoc(ref('guardian_invites', 'expiradoexpiradoexpirado'), {
    id: 'expiradoexpiradoexpirado',
    ...athlete('eqA'),
    createdBy: 'x',
    createdAt: 1,
    expiresAt: 2,
    status: 'pending'
  });
  await setRules(RULES_NOW);
});

let code = '';
describe('E1 — convidar o encarregado', () => {
  it("the team's coach and the director invite; the assistant, staff or another team's coach do not", async () => {
    await signInAs('treinadorA');
    code = (await g.createGuardianInvite(athlete('eqA'))).id;
    expect(code.length).toBeGreaterThanOrEqual(20);
    await signInAs('diretor');
    expect(await ok(g.createGuardianInvite(athlete('eqA', 'a2')))).toBe(true);
    for (const who of ['adjuntoA', 'staffA', 'treinadorB']) {
      await signInAs(who);
      expect(await ok(g.createGuardianInvite(athlete('eqA')))).toBe(false);
    }
  });

  it('the coach lists the invitations of the team; a guardian lists none', async () => {
    await signInAs('treinadorA');
    expect((await g.teamGuardianInvites(ORG, 'eqA')).length).toBeGreaterThanOrEqual(2);
    await signInAs('mae');
    expect(await ok(g.teamGuardianInvites(ORG, 'eqA'))).toBe(false);
  });
});

describe('E1 — o encarregado aceita e vê só a página do educando', () => {
  it('reads the invitation with the code and accepts it once, with the consent', async () => {
    await signInAs('mae');
    expect((await g.readInvite(code))?.athleteName).toBe('Atleta Exemplo');
    // without the data consent: refused
    expect(
      await ok(
        fs.updateDoc(ref('guardian_invites', code), {
          status: 'accepted',
          acceptedBy: uids.mae,
          consentData: false,
          consentVideo: false
        })
      )
    ).toBe(false);
    expect(await ok(g.acceptInvite(code, { video: false }, { name: 'Mãe Exemplo' }))).toBe(true);
    await signInAs('pai');
    expect(await ok(g.acceptInvite(code, { video: false }, { name: 'Outro' }))).toBe(false); // already used
    expect(await ok(g.acceptInvite('expiradoexpiradoexpirado', { video: false }, { name: 'Pai' }))).toBe(false);
  });

  it("the coach's phone publishes the page; staff cannot; it never goes to another athlete", async () => {
    const invite = (await (await signInAs('treinadorA'), g.readInvite(code)))!;
    expect(await ok(g.publishFamilyView(invite, view as never))).toBe(true);
    expect(await ok(g.publishFamilyView({ ...invite, athleteId: 'a9' }, view as never))).toBe(false);
    await signInAs('adjuntoA');
    expect(await ok(g.publishFamilyView(invite, view as never))).toBe(true);
    await signInAs('staffA');
    expect(await ok(g.publishFamilyView(invite, view as never))).toBe(false);
  });

  it("the guardian reads the page, never the club's records; another account reads nothing", async () => {
    await signInAs('mae');
    expect((await g.readFamilyView(code))?.view.trainings).toEqual({ attended: 3, total: 4 });
    expect(await ok(fs.getDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a1')))).toBe(false);
    expect(await ok(fs.getDoc(ref('organizations', ORG)))).toBe(false);
    await signInAs('outro');
    expect(await ok(g.readFamilyView(code))).toBe(false);
    expect(await ok(fs.getDoc(ref('guardians', uids.mae)))).toBe(false);
  });

  it('the guardian changes the video consent, but nothing else of the invitation', async () => {
    await signInAs('mae');
    expect(await ok(g.setVideoConsent(code, true))).toBe(true);
    expect(await ok(fs.updateDoc(ref('guardian_invites', code), { athleteId: 'a2' }))).toBe(false);
  });

  it('when the coach takes the access away, the page closes', async () => {
    await signInAs('treinadorA');
    expect(await ok(g.revokeGuardianInvite(code))).toBe(true);
    await signInAs('mae');
    expect(await ok(g.readFamilyView(code))).toBe(false);
  });
});
