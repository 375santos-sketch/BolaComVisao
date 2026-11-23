import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { NewsletterIssue } from '../lib/weeklyNewsletter';
import { toPlainData } from '../lib/recordSync';

/**
 * 📰 Publishes the team's weekly summary to public_newsletters/{token}; the app's server shows it at /semana/{token}.
 * Rules: readable by its exact id, written only by the club's coaches.
 */
export async function publishNewsletter(
  token: string,
  data: { clubId: string; teamId: string; teamName: string; issue: NewsletterIssue | null }
): Promise<void> {
  await setDoc(doc(db, 'public_newsletters', token), toPlainData({ ...data, updatedAt: Date.now() }));
}

/** Switches the link off: it stops working for everyone who has it. */
export async function unpublishNewsletter(token: string): Promise<void> {
  await deleteDoc(doc(db, 'public_newsletters', token));
}

export const newsletterLink = (token: string, origin = window.location.origin) => `${origin}/semana/${token}`;
