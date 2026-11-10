import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ParentsGame } from '../lib/parentsLive';
import { toPlainData } from '../lib/recordSync';

/**
 * 📡 Publishes what the parents' link shows to public_lives/{token}; the app's server shows it at /aovivo/{token}.
 * Rules: readable by its exact id, written only by the club's coaches.
 */
export async function publishLive(
  token: string,
  data: {
    clubId: string;
    teamId: string;
    teamName: string;
    color: string;
    game: ParentsGame | null;
    next: { opponent: string; date: string; time: string; location: string; venue: string } | null;
  }
): Promise<void> {
  await setDoc(doc(db, 'public_lives', token), toPlainData({ ...data, updatedAt: Date.now() }));
}

/** Switches the link off: it stops working for everyone who has it. */
export async function unpublishLive(token: string): Promise<void> {
  await deleteDoc(doc(db, 'public_lives', token));
}

export const liveLink = (token: string, origin = window.location.origin) => `${origin}/aovivo/${token}`;
