import { Match, MatchType, Player } from '../types';
import { isSeasonMatching, seasonFromDate } from './utils';

/**
 * Suspensions from cards in official games (league and tournaments; friendlies do not count): every N yellow cards
 * (the team's rule, 5 by default) and every red card (or two yellows in the same game) mean one game out. A
 * suspension is served in the next official game the athlete is not called up for.
 */

interface CardStatus {
  playerId: string;
  name: string;
  yellows: number;
  reds: number;
  /** Games of suspension still to serve. */
  pendingGames: number;
  /** Why the pending suspension(s): "5.º amarelo (26/10)", "vermelho (12/10)". */
  reasons: string[];
  /** Yellow cards until the next suspension. */
  yellowsToBan: number;
}

const OFFICIAL: MatchType[] = ['campeonato', 'torneio'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const isRed = (c: { color?: string; type?: string }) => c.color === 'Vermelho' || c.type === 'red';

export function cardStatuses(
  matches: Match[],
  roster: Player[],
  season: string | undefined,
  yellowsForBan: number
): CardStatus[] {
  const games = (matches || [])
    .filter(
      (m) =>
        m &&
        m.finished &&
        OFFICIAL.includes(m.type) &&
        isSeasonMatching(m.season || (m.date ? seasonFromDate(m.date) : undefined), season)
    )
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (roster || [])
    .filter((p) => p && p.active !== false)
    .map((p) => {
      let yellows = 0;
      let reds = 0;
      let counted = 0; // yellows counting towards the next suspension
      const pending: string[] = [];
      games.forEach((m) => {
        const involved = [...(m.convocados || []), ...(m.lineup || [])].includes(p.id);
        // Not called up while suspended: one game served
        if (!involved && pending.length > 0) pending.shift();
        const cards = (m.cards || []).filter((c) => c.playerId === p.id);
        const y = cards.filter((c) => !isRed(c)).length;
        const r = cards.filter(isRed).length;
        const date = (m.date || '').slice(0, 10);
        if (r > 0 || y >= 2) {
          reds++;
          pending.push(`${r > 0 ? 'vermelho' : 'dois amarelos no jogo'} (${ddmm(date)})`);
          // The yellows of a sending-off game do not count towards the accumulation
          yellows += y;
          return;
        }
        if (y === 1) {
          yellows++;
          counted++;
          if (counted >= yellowsForBan) {
            counted = 0;
            pending.push(`${yellows}.º amarelo (${ddmm(date)})`);
          }
        }
      });
      return {
        playerId: p.id,
        name: p.name,
        yellows,
        reds,
        pendingGames: pending.length,
        reasons: pending,
        yellowsToBan: yellowsForBan - counted
      };
    });
}

/** Athletes with a suspension to serve, and those one yellow away from one (for the call-up and the home screen). */
export function cardAlerts(statuses: CardStatus[]) {
  return {
    suspended: statuses.filter((s) => s.pendingGames > 0),
    atRisk: statuses.filter((s) => s.pendingGames === 0 && s.yellowsToBan === 1 && s.yellows > 0)
  };
}
