import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { VoteCandidate } from '../lib/mvpVote';

/**
 * public_votes/{token}: the parents' vote for the "Jogador do jogo". Rules: anyone with the link reads the poll and
 * adds one ballot (public_votes/{token}/ballots/{randomId}); only the club's coaches open, close and count it.
 */
export async function openPoll(
  token: string,
  data: { clubId: string; teamId: string; title: string; candidates: VoteCandidate[]; closesAt: number }
): Promise<void> {
  await setDoc(doc(db, 'public_votes', token), {
    ...data,
    candidates: data.candidates.map((c) => ({ id: c.id, label: c.label })),
    candidateIds: data.candidates.map((c) => c.id),
    open: true,
    createdAt: Date.now()
  });
}

export async function closePoll(token: string): Promise<void> {
  await updateDoc(doc(db, 'public_votes', token), { open: false });
}

/** The candidate of every ballot cast so far. */
export async function fetchBallots(token: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'public_votes', token, 'ballots'));
  return snap.docs.map((d) => String(d.data().candidate || ''));
}
