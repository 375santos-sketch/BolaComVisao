import { AppState, Player, SquadProfile } from '../types';
import { buildPlayerSeason } from './playerSeason';

/**
 * F4 — The athlete as a person across seasons and teams. Each player of a team keeps `athleteId` (the person);
 * an athlete from before F4 is identified by their own id. Copying a squad to the next season keeps the person,
 * and the coach can join an old copy to the person with one tap (suggested when the name and the date of birth
 * are the same; never joined without the coach's confirmation).
 */

export const athleteIdOf = (p: Pick<Player, 'id' | 'athleteId'>): string => p.athleteId || p.id;

/** A copy of an athlete for another team or season: a new id, the same person. */
export const copyForNewTeam = (p: Player, newId: string): Player => ({ ...p, id: newId, athleteId: athleteIdOf(p) });

interface Entry {
  team: SquadProfile;
  player: Player;
}

const entriesOf = (teams: SquadProfile[]): Entry[] =>
  teams.flatMap((team) => (team.roster || []).filter((p) => p && p.id).map((player) => ({ team, player })));

/** Groups of the same person: two copies are the same when one points to the other or both point to the same id. */
function personGroups(entries: Entry[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  entries.forEach(({ player }) => {
    if (!parent.has(player.id)) parent.set(player.id, player.id);
    union(player.id, athleteIdOf(player));
  });
  const groupOf = new Map<string, string>();
  entries.forEach(({ player }) => groupOf.set(player.id, find(player.id)));
  return groupOf;
}

export interface CareerLine {
  teamId: string;
  label: string; // "Sub-11 · 2025/2026"
  season?: string;
  played: number;
  minutes: number;
  goals: number;
  trainings: { present: number; held: number };
}

const seasonStart = (s?: string) => Number(String(s || '').slice(0, 4)) || 0;

/** The other seasons and teams of this athlete (only teams this device sees), most recent first. */
export function careerOf(state: Pick<AppState, 'teams'>, teamId: string, playerId: string): CareerLine[] {
  const entries = entriesOf(state.teams || []);
  const groups = personGroups(entries);
  const me = groups.get(playerId);
  if (!me) return [];
  return entries
    .filter((e) => groups.get(e.player.id) === me && !(e.team.id === teamId && e.player.id === playerId))
    .map(({ team, player }) => {
      const s = buildPlayerSeason(
        {
          matches: team.matches || [],
          trainings: team.trainings || [],
          roster: team.roster || [],
          category: team.category
        },
        player.id,
        team.season
      );
      return {
        teamId: team.id,
        label: [team.category, team.season].filter(Boolean).join(' · '),
        season: team.season,
        played: s.games.played,
        minutes: s.games.minutes,
        goals: s.goals,
        trainings: { present: s.trainings.present, held: s.trainings.held }
      };
    })
    .sort((a, b) => seasonStart(b.season) - seasonStart(a.season));
}

const sameName = (a: string, b: string) => {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b) && norm(a).length > 0;
};

export interface LinkCandidate {
  teamId: string;
  playerId: string;
  name: string;
  label: string;
  /** Same name and same date of birth: suggested (the coach still confirms). */
  suggested: boolean;
}

/** Copies of other teams that may be this athlete: suggested ones first, then the others to choose by hand. */
export function linkCandidates(state: Pick<AppState, 'teams'>, teamId: string, playerId: string): LinkCandidate[] {
  const entries = entriesOf(state.teams || []);
  const groups = personGroups(entries);
  const me = entries.find((e) => e.team.id === teamId && e.player.id === playerId);
  if (!me) return [];
  return entries
    .filter((e) => e.team.id !== teamId && groups.get(e.player.id) !== groups.get(playerId))
    .map(({ team, player }) => ({
      teamId: team.id,
      playerId: player.id,
      name: player.name,
      label: [team.category, team.season].filter(Boolean).join(' · '),
      suggested:
        Boolean(me.player.birthDate) &&
        player.birthDate === me.player.birthDate &&
        sameName(player.name, me.player.name)
    }))
    .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.name.localeCompare(b.name, 'pt'));
}

/** Joins this athlete to the person of another copy (only this team's player changes). */
export function linkToPerson(player: Player, other: Pick<Player, 'id' | 'athleteId'>): Player {
  return { ...player, athleteId: athleteIdOf(other) };
}
