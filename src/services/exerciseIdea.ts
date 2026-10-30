import { auth } from './firebase';
import { ExerciseIdeaRequest } from '../lib/exerciseIdea';
import { cleanPrintExercise } from '../lib/printExercise';

/** Asks the server for an exercise proposed by Gemini; errors come back as messages for the coach. */
export async function createExerciseIdea(request: ExerciseIdeaRequest) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Entre na app com a sua conta.');
  const resp = await fetch('/api/exercicio-ia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(request)
  });
  const data = await resp.json().catch(() => ({}));
  const exercise = resp.ok && data.success ? cleanPrintExercise(data.exercise) : null;
  if (!exercise) throw new Error(data.error || 'Não foi possível criar o exercício.');
  return exercise;
}
