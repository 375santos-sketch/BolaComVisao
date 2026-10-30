import { compressImageFile } from './imageCompress';
import { auth } from '../services/firebase';

/**
 * Sends a picture (results of a round, or a calendar of games) to the server, which reads it with Gemini. Returns
 * the raw games of the answer; the caller cleans them. Errors come back as messages for the coach.
 */
export async function readPrintImage(file: File, mode: 'resultados' | 'calendario'): Promise<unknown> {
  return readPrintData(await compressImageFile(file, 1600, 600_000), mode);
}

/** Same, for a picture already prepared (a data URL), e.g. when the app also crops the drawing from it. */
export async function readPrintData(image: string, mode: 'resultados' | 'calendario' | 'exercicio'): Promise<unknown> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta para ler prints.');
  const resp = await fetch('/api/ler-jornada', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image, mode })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) throw new Error(data.error || 'Não foi possível ler o print.');
  return data.games;
}
