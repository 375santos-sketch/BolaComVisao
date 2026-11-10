import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { PushMessage, PushPrefs, VAPID_PUBLIC_KEY, matchPushMessage } from '../lib/pushEvents';
import { AppState, Match } from '../types';

/**
 * 🔔 Avisos do jogo on this phone: asking for permission, subscribing to the phone's push service and saving the
 * subscription for the club (club_workspace/{club}/push_subscriptions/{id}); and, on the phone recording a game,
 * asking the app's server to send a notice to the other coaches.
 */

const SAVED = 'bcv_push_sub_v1';

/** What this phone can do: notices need an installed app on the iPhone (iOS 16.4 or newer). */
export function pushSupport() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ios = /iPhone|iPad|iPod/.test(ua);
  const standalone =
    typeof window !== 'undefined' &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  return { ios, standalone, supported, permission: supported ? Notification.permission : 'default' };
}

/** The subscription id saved on this phone, when the notices are on. */
export function savedSubscriptionId(): string | null {
  try {
    return localStorage.getItem(SAVED);
  } catch {
    return null;
  }
}

const keyBytes = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** A step that never answers (a phone without its service worker, no internet) ends with a clear message. */
function withTimeout<T>(job: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    job.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

/** The app's service worker on this phone, registered now when it is missing (it receives the notices). */
async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  if (!existing) await navigator.serviceWorker.register('/sw.js');
  return withTimeout(
    navigator.serviceWorker.ready,
    15000,
    'A app ainda não está pronta para avisos neste telemóvel. Feche a app, abra-a de novo pelo ícone e tente outra vez.'
  );
}

async function idOf(endpoint: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash))
    .slice(0, 20)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Turns the notices on (or saves new preferences): permission, subscription and the club's record of this phone. */
export async function enablePush(clubId: string, teamIds: string[], prefs: PushPrefs): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Entre na app com a sua conta para receber avisos.');
  const support = pushSupport();
  if (!support.supported) {
    throw new Error(
      support.ios && !support.standalone
        ? 'No iPhone, primeiro instale a app: Partilhar → Adicionar ao ecrã principal, e abra-a pelo ícone.'
        : 'Este telemóvel ou navegador não recebe avisos.'
    );
  }
  const permission = await withTimeout(
    Notification.requestPermission(),
    60000,
    'O telemóvel não pediu autorização para os avisos. Feche a app, abra-a de novo pelo ícone e tente outra vez.'
  );
  if (permission !== 'granted') {
    throw new Error('Os avisos foram recusados. Autorize as notificações da app nas definições do telemóvel.');
  }
  const reg = await serviceWorker();
  const sub = await withTimeout(
    (async () =>
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })))(),
    20000,
    'O telemóvel não respondeu ao ligar os avisos. Verifique a internet e tente outra vez.'
  );
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Não foi possível ligar os avisos.');
  const id = await idOf(json.endpoint);
  const saving = setDoc(doc(db, 'club_workspace', clubId, 'push_subscriptions', id), {
    uid,
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    prefs,
    teamIds,
    device: support.ios ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : 'Computador',
    updatedAt: Date.now()
  });
  await withTimeout(
    saving,
    20000,
    'Sem ligação à internet: não foi possível registar este telemóvel. Tente outra vez.'
  );
  try {
    localStorage.setItem(SAVED, id);
  } catch {
    /* the phone does not keep it: the switch shows off next time */
  }
}

/** Turns the notices off on this phone. */
export async function disablePush(clubId: string): Promise<void> {
  const id = savedSubscriptionId();
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } catch {
    /* already off */
  }
  if (id) await deleteDoc(doc(db, 'club_workspace', clubId, 'push_subscriptions', id)).catch(() => undefined);
  try {
    localStorage.removeItem(SAVED);
  } catch {
    /* nothing kept */
  }
}

/** Asks the server to send a notice (to the other coaches; a test only to this account's phones). */
export async function sendNotice(
  clubId: string,
  teamId: string,
  message: Pick<PushMessage, 'title' | 'body' | 'tag'> & { kind: PushMessage['kind'] | 'teste' }
): Promise<{ sent: number; phones: number; failed: Array<{ status: number; reason: string }> }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta.');
  const phones = collection(db, 'club_workspace', clubId, 'push_subscriptions');
  const snap = await getDocs(phones).catch(() => {
    throw new Error('Sem acesso aos avisos deste clube: confirme que entrou na app com a conta do clube.');
  });
  const subscriptions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const resp = await fetch('/api/avisar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ clubId, teamId, ...message, subscriptions })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) throw new Error(data.error || 'Não foi possível enviar o aviso.');
  // Phones the push service no longer knows are forgotten
  for (const id of Array.isArray(data.gone) ? data.gone : []) {
    if (typeof id === 'string') deleteDoc(doc(phones, id)).catch(() => undefined);
  }
  return { sent: data.sent || 0, phones: data.phones || 0, failed: Array.isArray(data.failed) ? data.failed : [] };
}

/**
 * On the phone recording the game: when the change is the start, a goal or the end, the other coaches are told
 * (silently skipped without a cloud sign-in; a failure never gets in the way of the game).
 */
export function announceMatchChange(
  state: Pick<AppState, 'currentUser' | 'activeTeamId' | 'myClubName' | 'roster'>,
  before: Match | null | undefined,
  after: Match
): void {
  if (!state.currentUser?.id || !state.activeTeamId || !auth.currentUser) return;
  const names = (id: string | null | undefined) => {
    const p = (state.roster || []).find((r) => r && r.id === id);
    return p ? p.nickname?.trim() || p.name.split(/\s+/)[0] : '';
  };
  const message = matchPushMessage(before, after, state.myClubName || '', names);
  if (!message) return;
  sendNotice(state.currentUser.clubId || 'main', state.activeTeamId, message).catch((err) =>
    console.warn('Aviso do jogo não enviado:', (err as Error).message)
  );
}
