import { auth } from './firebase';
import { ChronicleAudience, ChronicleFacts } from '../lib/matchChronicle';

/** Asks the server to write the "Crónica do jogo" with Gemini; errors come back as messages for the coach. */
export async function writeChronicle(facts: ChronicleFacts, audience: ChronicleAudience): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta.');
  const resp = await fetch('/api/cronica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ facts, audience })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success || typeof data.text !== 'string') {
    throw new Error(data.error || 'Não foi possível escrever a crónica.');
  }
  return data.text;
}
