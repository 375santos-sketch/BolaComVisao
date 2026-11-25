import { auth } from './firebase';
import { ChronicleAudience, ChronicleFacts, pseudonymizeChronicle } from '../lib/matchChronicle';
import { newsletterFacts, pseudonymizeNewsletterFacts } from '../lib/weeklyNewsletter';
import { Player } from '../types';

/**
 * The AI texts of the app (crónica and resumo da semana). P1-05: the names of the athletes never leave the device —
 * they go as codes (J1, J2…) and the text that comes back has the names put back here.
 */
async function askServer(body: Record<string, unknown>, failure: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta.');
  const resp = await fetch('/api/cronica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success || typeof data.text !== 'string') throw new Error(data.error || failure);
  return data.text;
}

/** Asks the server to write the "Crónica do jogo" with Gemini; errors come back as messages for the coach. */
export async function writeChronicle(
  facts: ChronicleFacts,
  audience: ChronicleAudience,
  roster: Player[]
): Promise<string> {
  const masked = pseudonymizeChronicle(facts, roster);
  const text = await askServer({ facts: masked.facts, audience }, 'Não foi possível escrever a crónica.');
  return masked.restore(text);
}

/** 📰 Resumo da semana: asks the server to write the coach's note to the parents from the week's facts. */
export async function writeNewsletterIntro(
  facts: ReturnType<typeof newsletterFacts>,
  roster: Player[]
): Promise<string> {
  const masked = pseudonymizeNewsletterFacts(facts, roster);
  const text = await askServer({ facts: masked.facts, kind: 'resumo' }, 'Não foi possível escrever a mensagem.');
  return masked.restore(text);
}
