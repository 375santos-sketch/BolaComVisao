import { Player, Training } from '../types';

/**
 * ⏸️ Atletas inativos: while an athlete is inactive (Equipa → ficha → Estado: Inativo), every training counts as an
 * absence ("Inativo"), from the day they were made inactive until the coach changes the status again. Earlier
 * trainings are left as they were; when the athlete comes back, the trainings from that day on are free again.
 */

const isInactive = (p: Player) => p.status === 'inativo';

/**
 * The roster and trainings with the inactive athletes marked absent (null when nothing changes). `today` is the day an
 * athlete made inactive now starts counting from (and the day from which a returning athlete is free again).
 */
export function withInactiveAbsences(
  roster: Player[] | undefined,
  trainings: Training[] | undefined,
  today: string
): { roster: Player[]; trainings: Training[] } | null {
  let rosterChanged = false;
  const players = (roster || []).map((p) => {
    if (!p) return p;
    if (isInactive(p) && !p.inactiveSince) {
      rosterChanged = true;
      return { ...p, inactiveSince: today };
    }
    if (!isInactive(p) && p.inactiveSince) {
      rosterChanged = true;
      const rest = { ...p };
      delete rest.inactiveSince;
      return rest;
    }
    return p;
  });
  const inactive = players.filter((p) => p && isInactive(p));
  const back = new Set(players.filter((p) => p && !isInactive(p)).map((p) => p.id));

  let trainingsChanged = false;
  const list = (trainings || []).map((t) => {
    if (!t) return t;
    const date = (t.date || '').slice(0, 10);
    let absences = t.absences || [];
    let reasons = t.absenceReasons || {};
    let changed = false;
    for (const p of inactive) {
      if (!date || date < (p.inactiveSince || today)) continue;
      if (!absences.includes(p.id)) {
        absences = [...absences, p.id];
        changed = true;
      }
      if (reasons[p.id] !== 'inativo') {
        reasons = { ...reasons, [p.id]: 'inativo' };
        changed = true;
      }
    }
    // An athlete active again: the trainings from today on no longer count them as absent
    for (const [id, reason] of Object.entries(reasons)) {
      if (reason === 'inativo' && back.has(id) && date >= today) {
        absences = absences.filter((a) => a !== id);
        const rest = { ...reasons };
        delete rest[id];
        reasons = rest;
        changed = true;
      }
    }
    if (!changed) return t;
    trainingsChanged = true;
    return { ...t, absences, absenceReasons: reasons };
  });

  if (!rosterChanged && !trainingsChanged) return null;
  return { roster: players, trainings: list };
}
