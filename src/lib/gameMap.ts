/**
 * "Como chegar": the directions in Google Maps (app or site) to the game's pitch. Without a pitch written in the
 * game, the search uses the opponent's name, which usually finds its ground.
 */

/** Words that say nothing about where a club is ("AD", "GD", "SU", "'B'"…). */
const CLUB_WORDS = new Set(
  'ad gd cd cdr gdr grd ud uds sc fc cf acd adc csd sl sad su sab cp casa povo clube club desportivo desportiva associacao uniao futebol os as a b c'.split(
    ' '
  )
);

/** The town in a club name ("AD Mação" → "Mação", "Casa Povo Pego" → "Pego"). */
export function townOfClub(name: string): string {
  return (name || '')
    .replace(/['"«»“”().]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !CLUB_WORDS.has(w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()))
    .join(' ')
    .trim();
}

export function directionsUrl(game: { venue?: string; opponent: string }): string {
  const venue = game.venue?.trim();
  const destination = venue || `campo de futebol ${townOfClub(game.opponent) || game.opponent}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
