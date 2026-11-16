/**
 * VJ4 — Biblioteca BolaComVisão: sessions of Visão de Jogo prepared by the platform for every club, in their own
 * collection (platform_library/{id}). Read once when the tab opens (and kept on this device to work offline); only
 * the platform Administrator writes. Coaches never write here: they copy a session to their team.
 */
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { VjSession } from '../types';

const CACHE_KEY = 'bcv-platform-library-v1';
const col = () => collection(db, 'platform_library');
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** The sessions kept on this device (the last ones read), so the tab also works without network. */
export function cachedPlatformSessions(): VjSession[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const list = raw ? (JSON.parse(raw) as VjSession[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function keep(list: VjSession[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // a full device only loses the offline copy
  }
}

/** Reads the library: the published sessions (the Administrator reads every state). */
export async function loadPlatformSessions(isAdmin: boolean): Promise<VjSession[]> {
  const snap = await getDocs(isAdmin ? col() : query(col(), where('status', '==', 'publicado')));
  const list = snap.docs
    .map((d) => (d.data() as { session?: VjSession }).session)
    .filter((s): s is VjSession => !!s && !!s.id && s.format === 'sessao');
  keep(isAdmin ? list.filter((s) => s.status === 'publicado') : list);
  return list;
}

/** Saves a session of the library (Administrator only; the rules refuse anyone else). */
export async function savePlatformSession(session: VjSession): Promise<void> {
  await setDoc(doc(db, 'platform_library', session.id), {
    status: session.status,
    session: plain(session),
    updatedAt: Date.now(),
    updatedBy: auth.currentUser?.uid || ''
  });
}
