/**
 * E1 — Contas dos encarregados: invitations (guardian_invites/{code}), the family pages published by the coaches'
 * phones (family_views/{code}) and the guardian's own account (guardians/{uid}). The guardian never reads the club.
 */
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { FamilyView, GuardianInvite, INVITE_DAYS } from '../lib/familyView';
import { AthleteView } from '../lib/athleteView';
import { newCalendarToken } from '../lib/calendarFeed';

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const inviteRef = (code: string) => doc(db, 'guardian_invites', code);

// ---------- Coach side ----------

export async function createGuardianInvite(input: {
  clubId: string;
  teamId: string;
  athleteId: string;
  athleteName: string;
  teamName: string;
  clubName: string;
}): Promise<GuardianInvite> {
  const now = Date.now();
  const invite: GuardianInvite = {
    ...input,
    id: newCalendarToken(),
    createdBy: auth.currentUser?.uid || '',
    createdAt: now,
    expiresAt: now + INVITE_DAYS * 86400000,
    status: 'pending'
  };
  await setDoc(inviteRef(invite.id), plain(invite));
  return invite;
}

/** The team's invitations (for the athletes' sheets and to publish the family pages). */
export async function teamGuardianInvites(clubId: string, teamId: string): Promise<GuardianInvite[]> {
  const snap = await getDocs(
    query(collection(db, 'guardian_invites'), where('clubId', '==', clubId), where('teamId', '==', teamId))
  );
  return snap.docs.map((d) => d.data() as GuardianInvite);
}

export async function revokeGuardianInvite(code: string): Promise<void> {
  await updateDoc(inviteRef(code), {
    status: 'revoked',
    revokedAt: Date.now(),
    revokedBy: auth.currentUser?.uid || ''
  });
}

export async function publishFamilyView(invite: GuardianInvite, view: FamilyView): Promise<void> {
  await setDoc(doc(db, 'family_views', invite.id), {
    clubId: invite.clubId,
    teamId: invite.teamId,
    athleteId: invite.athleteId,
    view: plain(view),
    updatedAt: Date.now()
  });
}

// ---------- Guardian side ----------

export async function readInvite(code: string): Promise<GuardianInvite | null> {
  const snap = await getDoc(inviteRef(code));
  return snap.exists() ? (snap.data() as GuardianInvite) : null;
}

export interface GuardianAccount {
  uid: string;
  name: string;
  email: string;
  codes: string[];
  /** MC2a: the athlete invitations this guardian sent (13+). */
  sent?: string[];
  createdAt: number;
  updatedAt: number;
}

export async function readGuardianAccount(uid: string): Promise<GuardianAccount | null> {
  const snap = await getDoc(doc(db, 'guardians', uid));
  return snap.exists() ? (snap.data() as GuardianAccount) : null;
}

/** Accepts the invitation (with the consents) and keeps it in the guardian's account. */
export async function acceptInvite(code: string, consents: { video: boolean }, who: { name: string }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sem sessão.');
  const now = Date.now();
  const account = await readGuardianAccount(uid);
  const codes = [...new Set([...(account?.codes || []), code])].slice(-6);
  await setDoc(doc(db, 'guardians', uid), {
    uid,
    name: who.name.trim().slice(0, 120) || account?.name || '',
    email: auth.currentUser?.email || '',
    codes,
    ...(account?.sent?.length ? { sent: account.sent } : {}),
    createdAt: account?.createdAt || now,
    updatedAt: now
  });
  await updateDoc(inviteRef(code), {
    status: 'accepted',
    acceptedBy: uid,
    acceptedAt: now,
    consentData: true,
    consentVideo: consents.video,
    consentAt: now
  });
}

export async function setVideoConsent(code: string, video: boolean) {
  await updateDoc(inviteRef(code), { consentVideo: video, consentAt: Date.now() });
}

export async function leaveInvite(code: string) {
  await updateDoc(inviteRef(code), { status: 'left', consentAt: Date.now() });
}

export async function readFamilyView(code: string): Promise<{ view: FamilyView; updatedAt: number } | null> {
  const snap = await getDoc(doc(db, 'family_views', code));
  return snap.exists() ? (snap.data() as { view: FamilyView; updatedAt: number }) : null;
}

// ---------- MC2a: O Meu Percurso ----------

/** The clubs where «O Meu Percurso» is on (only the platform Administrator changes it). */
export async function careerClubs(): Promise<string[]> {
  const snap = await getDoc(doc(db, 'system', 'modoCarreira'));
  const list = snap.exists() ? (snap.data() as { clubesLigados?: unknown }).clubesLigados : [];
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

/** Platform Administrator: switch «O Meu Percurso» on or off for one club. */
export async function setCareerClub(clubId: string, on: boolean): Promise<string[]> {
  const now = await careerClubs();
  const next = on ? [...new Set([...now, clubId])] : now.filter((c) => c !== clubId);
  await setDoc(doc(db, 'system', 'modoCarreira'), { clubesLigados: next, updatedAt: Date.now() });
  return next;
}

/** The guardian invites the athlete's own account (13+): the guardian's consent is this invitation itself. */
export async function createAthleteInvite(parent: GuardianInvite): Promise<GuardianInvite> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sem sessão.');
  const now = Date.now();
  const invite: GuardianInvite = {
    id: newCalendarToken(),
    clubId: parent.clubId,
    teamId: parent.teamId,
    athleteId: parent.athleteId,
    athleteName: parent.athleteName,
    teamName: parent.teamName,
    clubName: parent.clubName,
    createdBy: uid,
    createdAt: now,
    expiresAt: now + INVITE_DAYS * 86400000,
    status: 'pending',
    kind: 'atleta',
    parentCode: parent.id
  };
  await setDoc(inviteRef(invite.id), plain(invite));
  const account = await readGuardianAccount(uid);
  if (account)
    await setDoc(doc(db, 'guardians', uid), {
      ...account,
      sent: [...new Set([...(account.sent || []), invite.id])].slice(-6),
      updatedAt: now
    });
  return invite;
}

export async function publishAthleteView(invite: GuardianInvite, view: AthleteView): Promise<void> {
  await setDoc(doc(db, 'athlete_views', invite.id), {
    clubId: invite.clubId,
    teamId: invite.teamId,
    athleteId: invite.athleteId,
    view: plain(view),
    updatedAt: Date.now()
  });
}

export async function readAthleteView(code: string): Promise<{ view: AthleteView; updatedAt: number } | null> {
  const snap = await getDoc(doc(db, 'athlete_views', code));
  return snap.exists() ? (snap.data() as { view: AthleteView; updatedAt: number }) : null;
}
