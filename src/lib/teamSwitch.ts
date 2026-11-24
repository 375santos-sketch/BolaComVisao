import { AppState, SquadProfile } from '../types';

/**
 * P0-02 — Changing the team being worked on, and what each team holds. Pure functions (no React, no Firebase).
 *
 * Each team's data is ITS OWN lists in `teams[]`; the top-level copies (roster, matches, schedule…) mirror the active
 * team only. Before, the change of team also pulled into the target team matches and scheduled games of the team
 * being left whose club name looked alike (or with no team, when the name had "drag"), and gave it the roster and
 * matches of the team being left when its own were empty: two age groups of the same club got each other's data.
 */

/**
 * The list of teams with the active team holding the top-level copies (what is being edited now). The fields are the
 * same ones the change of team copied before P0-02.
 */
export function teamsWithActiveSaved(state: AppState): SquadProfile[] {
  return (state.teams || []).map((t) =>
    t.id === state.activeTeamId
      ? {
          ...t,
          roster: state.roster || [],
          staffMembers: state.staffMembers || [],
          matches: state.matches || [],
          trainings: state.trainings || [],
          schedule: state.schedule || [],
          tactics: state.tactics || [],
          tacticFormat: state.tacticFormat || 11,
          opponentScouting: state.opponentScouting || [],
          clubEvents: state.clubEvents || [],
          staffUnavailability: state.staffUnavailability || []
        }
      : t
  );
}

/**
 * The state update that makes `teamId` the active team: the team being left keeps what was edited, and the new team
 * shows exactly its own data (empty lists when it has none). Null when the team does not exist.
 */
export function switchTeam(state: AppState, teamId: string): Partial<AppState> | null {
  const target = (state.teams || []).find((t) => t.id === teamId);
  if (!target) return null;
  const teams = teamsWithActiveSaved(state);
  const next = teams.find((t) => t.id === teamId)!;
  return {
    activeTeamId: teamId,
    teams,
    myClubName: next.clubName,
    clubLogoUrl: next.clubLogoUrl,
    category: next.category,
    season: next.season,
    roster: next.roster || [],
    staffMembers: next.staffMembers || [],
    matches: next.matches || [],
    trainings: next.trainings || [],
    schedule: next.schedule || [],
    tactics: next.tactics || [],
    tacticFormat: next.tacticFormat || 11,
    opponentScouting: next.opponentScouting || [],
    clubEvents: next.clubEvents || [],
    staffUnavailability: next.staffUnavailability || []
  };
}

export interface TeamCounts {
  /** Active athletes. */
  athletes: number;
  /** Trainings (all). */
  trainings: number;
  /** Games played or recorded. */
  played: number;
  /** Scheduled games not yet played (a scheduled game with the same id as a played one counts once). */
  scheduled: number;
  /** played + scheduled. */
  totalGames: number;
}

/** The numbers shown on a team's card: only that team's own data (the top-level copies for the active team). */
export function teamCounts(state: AppState, team: SquadProfile): TeamCounts {
  const active = team.id === state.activeTeamId;
  const roster = (active ? state.roster : team.roster) || [];
  const matches = ((active ? state.matches : team.matches) || []).filter((m) => m && m.id);
  const schedule = ((active ? state.schedule : team.schedule) || []).filter((s) => s && s.id);
  const trainings = (active ? state.trainings : team.trainings) || [];
  const played = new Set(matches.map((m) => m.id));
  const scheduled = schedule.filter((s) => !played.has(s.id)).length;
  return {
    athletes: roster.filter((p) => p && p.active !== false).length,
    trainings: trainings.length,
    played: played.size,
    scheduled,
    totalGames: played.size + scheduled
  };
}
