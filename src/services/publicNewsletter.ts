import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { NewsletterIssue, archiveAfter } from '../lib/weeklyNewsletter';
import { toPlainData } from '../lib/recordSync';

/**
 * 📰 Publishes the team's weekly summary to public_newsletters/{token}; the app's server shows it at /semana/{token}.
 * The summary that was on the link moves to "Semanas anteriores" (archiveAfter).
 * Rules: readable by its exact id, written only by the club's coaches.
 */
export async function publishNewsletter(
  token: string,
  data: { clubId: string; teamId: string; teamName: string; issue: NewsletterIssue; card?: string | null }
): Promise<void> {
  const ref = doc(db, 'public_newsletters', token);
  const previous = await getDoc(ref)
    .then((snap) => (snap.exists() ? (snap.data() as { issue?: NewsletterIssue; archive?: NewsletterIssue[] }) : null))
    .catch(() => null); // a new link, or offline: published without the earlier weeks
  const archive = archiveAfter(previous, data.issue);
  const { card, ...rest } = data;
  await setDoc(ref, toPlainData({ ...rest, ...(card ? { card } : {}), archive, updatedAt: Date.now() }));
}

/** Switches the link off: it stops working for everyone who has it (the earlier weeks go with it). */
export async function unpublishNewsletter(token: string): Promise<void> {
  await deleteDoc(doc(db, 'public_newsletters', token));
}

export const newsletterLink = (token: string, origin = window.location.origin) => `${origin}/semana/${token}`;
