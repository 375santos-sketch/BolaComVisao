import { Training } from '../types';

/**
 * Calculates the next unique training number for a team & season.
 * Permanent numbering rule:
 * - Starts at 1 for a new team / season.
 * - Always takes the highest previously assigned number (+1), even if prior trainings were deleted.
 */
export function getNextTrainingNumber(trainings: Training[] = [], lastAssignedNumber?: number): number {
  let highest =
    typeof lastAssignedNumber === 'number' && !isNaN(lastAssignedNumber) ? Math.max(0, lastAssignedNumber) : 0;

  for (const tr of trainings) {
    if (typeof tr.trainingNumber === 'number' && !isNaN(tr.trainingNumber) && tr.trainingNumber > highest) {
      highest = tr.trainingNumber;
    }
  }

  return highest + 1;
}

/**
 * Allocates a sequential range of unique training numbers for batch training creation.
 * Example: if next is 10 and count is 3, returns [10, 11, 12] and newMax = 12.
 */
export function allocateBatchTrainingNumbers(
  trainings: Training[] = [],
  count: number,
  lastAssignedNumber?: number
): { numbers: number[]; newMaxNumber: number } {
  if (count <= 0) {
    return { numbers: [], newMaxNumber: lastAssignedNumber || 0 };
  }

  const startNumber = getNextTrainingNumber(trainings, lastAssignedNumber);
  const numbers: number[] = [];

  for (let i = 0; i < count; i++) {
    numbers.push(startNumber + i);
  }

  const newMaxNumber = startNumber + count - 1;
  return { numbers, newMaxNumber };
}

/**
 * Migrates and normalizes training numbers for an existing team/season dataset.
 * - Identifies all existing trainings without trainingNumber.
 * - Sorts them chronologically (oldest date first).
 * - Assigns sequential trainingNumber (1, 2, 3...) respecting already assigned numbers.
 * - Resolves any duplicate numbers safely.
 * - Returns the updated trainings and the permanent highest lastTrainingNumber.
 */
export function normalizeAndMigrateTrainings(
  trainings: Training[] = [],
  lastAssignedNumber?: number
): { trainings: Training[]; maxNumber: number; hasChanges: boolean } {
  if (!trainings || trainings.length === 0) {
    return {
      trainings: [],
      maxNumber: typeof lastAssignedNumber === 'number' ? Math.max(0, lastAssignedNumber) : 0,
      hasChanges: false
    };
  }

  let hasChanges = false;
  const existingNumbers = new Set<number>();
  let highestKnown =
    typeof lastAssignedNumber === 'number' && !isNaN(lastAssignedNumber) ? Math.max(0, lastAssignedNumber) : 0;

  // 1. Separate trainings that already have a valid unique trainingNumber from those that need one
  const mappedTrainings: Training[] = [];
  const unassignedTrainings: { index: number; training: Training }[] = [];

  // Chronological sort helper for initial assignment
  const sortedChronologically = [...trainings].sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.time || '').localeCompare(b.time || '');
    if (timeComp !== 0) return timeComp;
    return (a.id || '').localeCompare(b.id || '');
  });

  for (let i = 0; i < sortedChronologically.length; i++) {
    const tr = sortedChronologically[i];
    const num = tr.trainingNumber;

    if (typeof num === 'number' && !isNaN(num) && num > 0 && !existingNumbers.has(num)) {
      existingNumbers.add(num);
      if (num > highestKnown) highestKnown = num;
      mappedTrainings.push({ ...tr });
    } else {
      // Needs assignment or duplicate resolution
      unassignedTrainings.push({ index: i, training: tr });
    }
  }

  if (unassignedTrainings.length > 0) {
    hasChanges = true;
    let nextAvailable = 1;

    for (const item of unassignedTrainings) {
      while (existingNumbers.has(nextAvailable)) {
        nextAvailable++;
      }
      existingNumbers.add(nextAvailable);
      if (nextAvailable > highestKnown) highestKnown = nextAvailable;

      mappedTrainings.push({
        ...item.training,
        trainingNumber: nextAvailable
      });
      nextAvailable++;
    }
  }

  // Preserve original ordering or sort by date/number
  // Keep the list matching the input order but with trainingNumber populated
  const idToUpdatedMap = new Map<string, Training>();
  mappedTrainings.forEach((t) => idToUpdatedMap.set(t.id, t));

  const resultTrainings = trainings.map((orig) => {
    const updated = idToUpdatedMap.get(orig.id);
    if (!updated) return orig;
    if (orig.trainingNumber !== updated.trainingNumber) {
      hasChanges = true;
    }
    return updated;
  });

  return {
    trainings: resultTrainings,
    maxNumber: highestKnown,
    hasChanges
  };
}

/**
 * Formats display label for a training.
 * e.g., "Treino 24" or "TREINO Nº 24"
 */
export function formatTrainingTitle(training: Partial<Training>, uppercase: boolean = false): string {
  const num = training.trainingNumber;
  if (typeof num === 'number' && num > 0) {
    return uppercase ? `TREINO ${num}` : `Treino ${num}`;
  }
  return uppercase ? 'TREINO' : 'Treino';
}

/**
 * Checks if search query matches a training by its number (e.g. "24", "Treino 24", "T24").
 */
export function matchesTrainingNumberSearch(training: Partial<Training>, query: string): boolean {
  if (!query || !query.trim()) return false;
  const q = query.trim().toLowerCase();
  const num = training.trainingNumber;

  if (typeof num === 'number') {
    const numStr = String(num);
    if (numStr === q) return true;
    if (`treino ${numStr}`.includes(q)) return true;
    if (`treino nº ${numStr}`.includes(q)) return true;
    if (`treino nº${numStr}`.includes(q)) return true;
    if (`t${numStr}` === q || `tr${numStr}` === q) return true;
  }

  return false;
}
