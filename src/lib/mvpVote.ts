import { Player } from '../types';
import { newCalendarToken } from './calendarFeed';

/**
 * Parents' vote for the "Jogador do jogo": the coach opens a poll with the athletes who played and shares a secret
 * link (/votar.html?v=TOKEN). Each phone casts one anonymous vote; the app shows the two most voted. The public
 * poll only shows first name + surname initial and shirt number (never the full name, photo or other data).
 */

/** Hours the vote stays open after it is created. */
export const VOTE_HOURS = 24;

export interface VoteCandidate {
  id: string;
  label: string;
}

export interface VoteTally {
  candidate: VoteCandidate;
  votes: number;
}

/** "Rui S. (9)" */
export function candidateLabel(player: Pick<Player, 'name' | 'nickname' | 'number'>): string {
  const parts = (player.nickname?.trim() || player.name || '').trim().split(/\s+/).filter(Boolean);
  const short =
    parts.length > 1 && !player.nickname?.trim() ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts.join(' ');
  const n = player.number;
  return n !== null && n !== undefined && `${n}` !== '' ? `${short} (${n})` : short;
}

export const newVoteToken = newCalendarToken;

export const voteLink = (token: string, origin = window.location.origin) => `${origin}/votar.html?v=${token}`;

/** Votes per candidate, most voted first (ties in the order of the candidates). */
export function tallyVotes(candidates: VoteCandidate[], ballots: string[]): VoteTally[] {
  const count = new Map<string, number>();
  ballots.forEach((c) => count.set(c, (count.get(c) || 0) + 1));
  return candidates
    .map((candidate, i) => ({ candidate, votes: count.get(candidate.id) || 0, i }))
    .sort((a, b) => b.votes - a.votes || a.i - b.i)
    .map(({ candidate, votes }) => ({ candidate, votes }));
}

/** The two most voted (only candidates with votes). */
export const topTwo = (tally: VoteTally[]) => tally.filter((t) => t.votes > 0).slice(0, 2);

/** Message to send to the parents' group. */
export function voteMessage(title: string, link: string, closesAt: number): string {
  const d = new Date(closesAt);
  const when = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `⭐ Votação do jogador do jogo\n${title}\n\nVote aqui (é anónimo, um voto por telemóvel):\n${link}\n\nA votação fecha ${when}.`;
}
