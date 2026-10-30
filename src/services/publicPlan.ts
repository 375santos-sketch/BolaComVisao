import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SharedPlan } from '../lib/coachPlan';
import { toPlainData } from '../lib/recordSync';

/**
 * Publishes the plan of the next training to public_plans/{token}; the app's server shows it at /plano/{token}.
 * Rules: readable by its exact id, written only by the club's coaches.
 */
export async function publishPlan(
  token: string,
  data: { clubId: string; teamId: string; teamName: string; color: string; plan: SharedPlan | null }
): Promise<void> {
  await setDoc(doc(db, 'public_plans', token), toPlainData({ ...data, updatedAt: Date.now() }));
}

/** Switches the link off: it stops working for the assistant coach. */
export async function unpublishPlan(token: string): Promise<void> {
  await deleteDoc(doc(db, 'public_plans', token));
}

export const planLink = (token: string, origin = window.location.origin) => `${origin}/plano/${token}`;
