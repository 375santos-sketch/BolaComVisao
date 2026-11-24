/**
 * P0-04 — Base de comparação dos acessos (Tarefa 03 da auditoria, docs/desenvolvimento/TAREFA_01.md).
 *
 * Fixes, under the REAL rules, what each kind of account reads and writes TODAY in the places the audit marked as
 * weak, so that the next steps (F3 private data, migration of "main", strict rules v3) have a measured "before":
 *  - «A manter»: behaviour that must stay as it is after every next step;
 *  - «Estado atual — a corrigir»: known weaknesses, written as they are today. Each one names the task that must
 *    change it; when that task changes the rules, its test here fails on purpose and is updated in the same PR (it
 *    turns into a «recusado» check). Nothing here weakens or changes the rules.
 *
 * Fictitious data only (no real athlete, no real club).
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

const ORG = 'orgBase'; // a club that is an organization (new model)
const LEGACY = 'clubeAntigoBase'; // a club without organization (old model)
const MAIN = 'main'; // the default club of accounts without clubId (no organization here)

// Accounts: who, their user document (old model) and their membership (new model)
const PEOPLE: Array<{
  who: string;
  account?: { role: string; status: string; clubId?: string };
  member?: { role: string; teams: string[] };
}> = [
  {
    who: 'treinadorA',
    account: { role: 'Treinador Principal', status: 'approved', clubId: ORG },
    member: { role: 'treinador', teams: ['eqA'] }
  },
  {
    who: 'staffA',
    account: { role: 'Fisioterapeuta', status: 'approved', clubId: ORG },
    member: { role: 'staff', teams: ['eqA'] }
  },
  {
    who: 'treinadorB',
    account: { role: 'Treinador Principal', status: 'approved', clubId: ORG },
    member: { role: 'treinador', teams: ['eqB'] }
  },
  { who: 'antigo', account: { role: 'Treinador Principal', status: 'approved', clubId: LEGACY } },
  { who: 'semClube', account: { role: 'Treinador Adjunto', status: 'approved' } },
  { who: 'pendente', account: { role: 'Treinador Principal', status: 'pending', clubId: LEGACY } },
  { who: 'encarregado' }, // a signed-in account with no club at all (e.g. a guardian)
  { who: 'anonimo' }
];

// Athlete records with the private fields still inside the sport profile (F3 phase 0). Fictitious values.
const PRIVATE_FIELDS = {
  phone: '900000000',
  email: 'atleta.ficticio@exemplo.pt',
  emergencyContact: 'Contacto fictício',
  statusNote: 'Lesão fictícia',
  coachNotes: 'Nota fictícia do treinador',
  evaluations: [{ id: 'e1', date: '2026-01-01', scores: { tecnica: 3 } }]
};
const player = (teamId: string, id: string) => ({
  kind: 'player',
  teamId,
  entityId: id,
  updatedAt: Date.now(),
  deleted: false,
  data: { id, name: `Atleta Fictício ${id}`, number: 7, active: true, ...PRIVATE_FIELDS }
});

const uids: Record<string, string> = {};
const ref = (...p: string[]) => fs.doc(fb.db, p.join('/'));
const signInAs = async (who: string) => {
  await fa.signOut(fb.auth);
  if (who !== 'anonimo') await fa.signInWithEmailAndPassword(fb.auth, `${who}@base.pt`, 'segredo123');
};
const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      if ((e as { code?: string }).code !== 'permission-denied') throw e;
      return false;
    }
  );
/** The athlete fields a person really receives (empty when refused). */
const readData = async (...path: string[]) => {
  try {
    return ((await fs.getDoc(ref(...path))).data()?.data ?? {}) as Record<string, unknown>;
  } catch (e) {
    if ((e as { code?: string }).code !== 'permission-denied') throw e;
    return null;
  }
};
/** Direct access outside the app: the Firestore REST API with the person's own sign-in. */
const restStatus = async (path: string[]) => {
  const t = fb.auth.currentUser ? await fb.auth.currentUser.getIdToken() : null;
  return (await fetch(`${REST}/${path.join('/')}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })).status;
};
const invitation = (code: string, clubId: string, invitedBy: string) => ({
  id: `inv_${code}`,
  email: '',
  name: 'Convidado Fictício',
  clubId,
  teamId: 'eqM',
  teamName: 'Equipa fictícia',
  role: 'Treinador Adjunto',
  inviteCode: code,
  invitedBy,
  invitedByName: 'Fictício',
  createdAt: Date.now(),
  expiresAt: Date.now() + 7 * 86_400_000,
  status: 'pending'
});

beforeAll(async () => {
  await fetch(`${REST.replace('/v1/', '/emulator/v1/')}`, { method: 'DELETE' });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await setRules(OPEN_RULES);
  for (const p of PEOPLE) {
    if (p.who === 'anonimo') continue;
    uids[p.who] = (await fa.createUserWithEmailAndPassword(fb.auth, `${p.who}@base.pt`, 'segredo123')).user.uid;
    if (p.account)
      await fs.setDoc(ref('users', uids[p.who]), {
        account: { id: uids[p.who], username: p.who, name: p.who, ...p.account }
      });
  }
  await fs.setDoc(ref('organizations', ORG), {
    id: ORG,
    type: 'club',
    name: ORG,
    status: 'active',
    ownerUid: uids.treinadorA,
    createdAt: 1,
    createdBy: uids.treinadorA,
    plan: null
  });
  for (const p of PEOPLE.filter((x) => x.member))
    await fs.setDoc(ref('organizations', ORG, 'members', uids[p.who]), {
      uid: uids[p.who],
      displayName: p.who,
      email: `${p.who}@base.pt`,
      role: p.member!.role,
      teamIds: p.member!.teams,
      status: 'active',
      addedBy: uids.treinadorA,
      addedAt: 1
    });
  // Two teams in each club, one athlete each
  for (const [club, teams] of [
    [ORG, ['eqA', 'eqB']],
    [LEGACY, ['eqL1', 'eqL2']],
    [MAIN, ['eqM']]
  ] as const)
    for (const team of teams)
      await fs.setDoc(ref('club_workspace', club, 'records', `player__${team}__a1`), player(team, 'a1'));
  await fs.setDoc(ref('system', 'dadosPrivados'), { clubesLigados: [ORG], updatedAt: Date.now() });
  await fa.signOut(fb.auth);
  await setRules(RULES_NOW);
}, 120_000);

describe('P0-04 · A manter (deve continuar igual depois de cada passo)', () => {
  it('quem não tem sessão não lê nada, nem pela API direta', async () => {
    await signInAs('anonimo');
    expect(await readData('club_workspace', ORG, 'records', 'player__eqA__a1')).toBeNull();
    expect(await readData('club_workspace', LEGACY, 'records', 'player__eqL1__a1')).toBeNull();
    expect(await restStatus(['club_workspace', ORG, 'records', 'player__eqA__a1'])).toBe(403);
  });

  it('o treinador da equipa A lê o atleta da sua equipa, com os dados privados', async () => {
    await signInAs('treinadorA');
    const data = await readData('club_workspace', ORG, 'records', 'player__eqA__a1');
    expect(data?.phone).toBe(PRIVATE_FIELDS.phone);
    expect(data?.coachNotes).toBe(PRIVATE_FIELDS.coachNotes);
  });

  it('no modelo novo, cada um só lê a sua equipa (A não lê B, B não lê A)', async () => {
    await signInAs('treinadorA');
    expect(await readData('club_workspace', ORG, 'records', 'player__eqB__a1')).toBeNull();
    await signInAs('treinadorB');
    expect(await readData('club_workspace', ORG, 'records', 'player__eqA__a1')).toBeNull();
  });

  it('o staff não escreve no atleta nem lê os registos privados separados', async () => {
    await signInAs('staffA');
    expect(await ok(fs.setDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a1'), player('eqA', 'a1')))).toBe(
      false
    );
    expect(await ok(fs.getDoc(ref('club_workspace', ORG, 'private', 'pcontact__eqA__a1')))).toBe(false);
  });

  it('ninguém de fora do clube lê o clube: encarregado, conta antiga de outro clube', async () => {
    await signInAs('encarregado');
    expect(await readData('club_workspace', ORG, 'records', 'player__eqA__a1')).toBeNull();
    expect(await readData('club_workspace', LEGACY, 'records', 'player__eqL1__a1')).toBeNull();
    await signInAs('antigo');
    expect(await readData('club_workspace', ORG, 'records', 'player__eqA__a1')).toBeNull();
  });

  it('uma conta pendente não lê o clube (security_spec D04)', async () => {
    await signInAs('pendente');
    expect(await readData('club_workspace', LEGACY, 'records', 'player__eqL1__a1')).toBeNull();
  });

  it('uma conta antiga de um clube não convida para «main»', async () => {
    await signInAs('antigo');
    expect(await ok(fs.setDoc(ref('invitations', 'BCV-BASE0001'), invitation('BCV-BASE0001', MAIN, uids.antigo)))).toBe(
      false
    );
  });
});

describe('P0-04 · Estado atual — a corrigir (pontos fracos conhecidos, tal como estão hoje)', () => {
  it('[A CORRIGIR no F3.6/F3.7 · P0-05] o staff recebe os dados privados que ainda estão no perfil do atleta, também pela API direta', async () => {
    await signInAs('staffA');
    const data = await readData('club_workspace', ORG, 'records', 'player__eqA__a1');
    // Today: contacts, health note, coach notes and evaluations reach staff (the app only hides them on the device)
    expect(data?.phone).toBe(PRIVATE_FIELDS.phone);
    expect(data?.statusNote).toBe(PRIVATE_FIELDS.statusNote);
    expect(data?.coachNotes).toBe(PRIVATE_FIELDS.coachNotes);
    expect(Array.isArray(data?.evaluations)).toBe(true);
    expect(await restStatus(['club_workspace', ORG, 'records', 'player__eqA__a1'])).toBe(200);
  });

  it('[A CORRIGIR com F1.10 · P0-07] no modelo antigo, uma conta aprovada lê TODAS as equipas do clube, com os dados privados', async () => {
    await signInAs('antigo');
    for (const team of ['eqL1', 'eqL2']) {
      const data = await readData('club_workspace', LEGACY, 'records', `player__${team}__a1`);
      expect(data?.phone, team).toBe(PRIVATE_FIELDS.phone);
    }
    // …and the whole list of the club, without any team filter
    expect(await ok(fs.getDocs(fs.collection(fb.db, 'club_workspace', LEGACY, 'records')))).toBe(true);
  });

  it('[A CORRIGIR com F1.8 · P0-06] uma conta aprovada SEM clube lê o clube «main»', async () => {
    await signInAs('semClube');
    expect((await readData('club_workspace', MAIN, 'records', 'player__eqM__a1'))?.phone).toBe(PRIVATE_FIELDS.phone);
  });

  it('[A CORRIGIR com F1.8 · P0-06] uma conta aprovada SEM clube cria convites para «main»', async () => {
    await signInAs('semClube');
    expect(
      await ok(fs.setDoc(ref('invitations', 'BCV-BASE0002'), invitation('BCV-BASE0002', MAIN, uids.semClube)))
    ).toBe(true);
  });

  it('[A CORRIGIR · P0-07] «clubs/{clube}/…» aceita qualquer documento, de qualquer tamanho, de um membro do clube', async () => {
    const big = {
      livre: 'x'.repeat(200_000),
      ...Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, i]))
    };
    await signInAs('antigo');
    expect(await ok(fs.setDoc(ref('clubs', LEGACY, 'qualquerColecao', 'doc1'), big))).toBe(true);
    await signInAs('treinadorA');
    expect(await ok(fs.setDoc(ref('clubs', ORG, 'outraColecao', 'doc1'), big))).toBe(true);
    // …but never another club's
    expect(await ok(fs.setDoc(ref('clubs', LEGACY, 'qualquerColecao', 'doc2'), { a: 1 }))).toBe(false);
  });

  it('[A CORRIGIR · P0-07] «system/…» é lido por qualquer conta com sessão, mesmo sem clube', async () => {
    await signInAs('encarregado');
    expect(await ok(fs.getDoc(ref('system', 'dadosPrivados')))).toBe(true);
    await signInAs('anonimo');
    expect(await ok(fs.getDoc(ref('system', 'dadosPrivados')))).toBe(false);
  });

  it('[A REVER · P0-07] o conteúdo dos registos (campo «data») não é validado: aceita chaves arbitrárias', async () => {
    await signInAs('treinadorA');
    const rec = player('eqA', 'a2');
    const data = { ...rec.data, ...Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`campoLivre${i}`, i])) };
    expect(await ok(fs.setDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a2'), { ...rec, data }))).toBe(true);
    // The envelope IS validated: an extra top-level key is refused
    expect(
      await ok(
        fs.setDoc(ref('club_workspace', ORG, 'records', 'player__eqA__a3'), { ...player('eqA', 'a3'), extra: 1 })
      )
    ).toBe(false);
  });
});
