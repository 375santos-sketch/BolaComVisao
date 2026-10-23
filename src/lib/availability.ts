import { Player } from '../types';

/**
 * Injuries and suspensions with a return date (Player.status + statusUntil + statusNote): on a given day an athlete
 * marked "lesionado"/"suspenso" is unavailable until the return date (from that day on he is available again, with
 * no need to change the record). No return date = unavailable until the coach changes the status.
 */

export interface Availability {
  available: boolean;
  status: 'lesionado' | 'suspenso' | 'inativo' | 'disponivel';
  /** Return date (YYYY-MM-DD), when known. */
  until?: string;
  note?: string;
  /** Short text for badges: "Lesionado até 12/11", "Castigo · 2 jogos", "Regressou a 05/11". */
  label: string;
}

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

export function availabilityOn(player: Player, date: string = today()): Availability {
  const status = player.status || 'disponivel';
  const until = player.statusUntil || undefined;
  const note = player.statusNote?.trim() || undefined;
  if (player.active === false || status === 'inativo') {
    return { available: false, status: 'inativo', label: 'Inativo' };
  }
  if (status !== 'lesionado' && status !== 'suspenso') return { available: true, status: 'disponivel', label: '' };
  const name = status === 'lesionado' ? 'Lesionado' : 'Castigado';
  if (until && date >= until) {
    return { available: true, status, until, note, label: `Regressou a ${ddmm(until)}` };
  }
  return {
    available: false,
    status,
    until,
    note,
    label: `${name}${until ? ` até ${ddmm(until)}` : ''}${note ? ` · ${note}` : ''}`
  };
}

/** Athletes unavailable on that day (for the call-up of a game). */
export function unavailableOn(roster: Player[], date: string): { player: Player; availability: Availability }[] {
  return (roster || [])
    .filter((p) => p && p.active !== false)
    .map((player) => ({ player, availability: availabilityOn(player, date) }))
    .filter((r) => !r.availability.available);
}

/** " até 12/11" while injured/suspended with a return date (for the squad badges), else "". */
export function returnSuffix(player: Player, date: string = today()): string {
  const a = availabilityOn(player, date);
  return !a.available && a.until ? ` até ${ddmm(a.until)}` : '';
}
