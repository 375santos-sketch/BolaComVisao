import { Exercise, Training } from '../types';

/** The drawing of a training: the picture of its first exercise that has one (none: an empty pitch). */
export const trainingImage = (t: Training, library: Exercise[] = []) => {
  for (const b of t.sessionPlan?.blocks || []) {
    const ex = b.exerciseId ? library.find((e) => e.id === b.exerciseId) : undefined;
    if (ex?.image) return ex.image;
  }
  return undefined;
};
