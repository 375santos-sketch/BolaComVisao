import { auth } from './firebase';
import { KidsRequest } from '../lib/kidsExplain';

/** Asks the server for the exercise explained to children; errors come back as messages for the coach. */
export async function explainToKids(request: KidsRequest): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta.');
  const resp = await fetch('/api/criancas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success || typeof data.text !== 'string') {
    throw new Error(data.error || 'Não foi possível explicar o exercício.');
  }
  return data.text;
}

/** Reads the text out with the phone's Portuguese voice (false when the phone cannot). */
export function readAloud(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ''));
  u.lang = 'pt-PT';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}
