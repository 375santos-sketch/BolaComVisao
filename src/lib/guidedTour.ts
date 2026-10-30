/** 🧭 Visita guiada: whether this account (or this phone) already saw it. */

const DONE_KEY = 'bcv_tour_done_v1';

export const tourDone = (userId?: string): boolean => {
  try {
    return (
      localStorage.getItem(DONE_KEY) === '1' || (userId ? localStorage.getItem(`${DONE_KEY}:${userId}`) === '1' : false)
    );
  } catch {
    return true;
  }
};

export const markTourDone = (userId?: string) => {
  try {
    localStorage.setItem(userId ? `${DONE_KEY}:${userId}` : DONE_KEY, '1');
  } catch {
    // Not remembered: it may show again next time
  }
};
