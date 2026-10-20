import {
  AppState,
  Player,
  Match,
  Training,
  ScheduledMatch,
  StaffMember,
  OpponentScouting,
  Exercise,
  ClubEvent,
  StaffUnavailability,
  SquadProfile
} from '../types';

/**
 * Modular Subcollection Paths Architecture:
 * Prepares the storage layer for scalable, document-size-safe partitioning
 * so large clubs with 50+ matches, 100+ trainings, and high-res data never breach 1MB document limits.
 */
export const MODULAR_PATHS = {
  CLUB_PROFILE: (clubId: string) => `clubs/${clubId}/profile/meta`,
  TEAMS: (clubId: string) => `clubs/${clubId}/teams`,
  TEAM_DOC: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}`,
  PLAYERS: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}/players`,
  PLAYER_DOC: (clubId: string, teamId: string, playerId: string) => `clubs/${clubId}/teams/${teamId}/players/${playerId}`,
  MATCHES: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}/matches`,
  MATCH_DOC: (clubId: string, teamId: string, matchId: string) => `clubs/${clubId}/teams/${teamId}/matches/${matchId}`,
  TRAININGS: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}/trainings`,
  TRAINING_DOC: (clubId: string, teamId: string, trainingId: string) => `clubs/${clubId}/teams/${teamId}/trainings/${trainingId}`,
  SCHEDULE: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}/schedule`,
  SCOUTING: (clubId: string, teamId: string) => `clubs/${clubId}/teams/${teamId}/scouting`,
  STAFF: (clubId: string) => `clubs/${clubId}/staff`,
  EXERCISES: (clubId: string) => `clubs/${clubId}/exercises`,
  EVENTS: (clubId: string) => `clubs/${clubId}/events`,
  UNAVAILABILITY: (clubId: string) => `clubs/${clubId}/unavailability`,
  NOTIFICATIONS: (clubId: string, userId: string) => `clubs/${clubId}/users/${userId}/notifications`
};

export interface ClubModularPayload {
  clubId: string;
  profile: {
    clubName: string;
    clubLogoUrl?: string;
    myClubStadium?: string;
    updatedAt: number;
  };
  teams: {
    id: string;
    name: string;
    category: string;
    season: string;
    tacticFormat: number;
  }[];
  players: (Player & { teamId: string })[];
  matches: (Match & { teamId: string })[];
  trainings: (Training & { teamId: string })[];
  schedule: (ScheduledMatch & { teamId: string })[];
  staff: StaffMember[];
  scouting: (OpponentScouting & { teamId: string })[];
  exercises: Exercise[];
  events: ClubEvent[];
  unavailability: StaffUnavailability[];
}

/**
 * Decomposes a monolithic AppState snapshot into isolated modular entities.
 */
export function convertMonolithicToModular(state: AppState, clubId = 'main'): ClubModularPayload {
  const currentTeamId = state.activeTeamId || 'default_team';

  // Extract all team profiles
  const teams = (state.teams || []).map((t) => ({
    id: t.id,
    name: t.clubName || state.myClubName || 'Equipa Principal',
    category: t.category || state.category || 'Sub-11',
    season: t.season || state.season || '2025/2026',
    tacticFormat: t.tacticFormat || state.tacticFormat || 7
  }));

  // If no teams array, inject primary team
  if (teams.length === 0) {
    teams.push({
      id: currentTeamId,
      name: state.myClubName || 'Equipa Principal',
      category: state.category || 'Sub-11',
      season: state.season || '2025/2026',
      tacticFormat: state.tacticFormat || 7
    });
  }

  const players: (Player & { teamId: string })[] = [];
  const matches: (Match & { teamId: string })[] = [];
  const trainings: (Training & { teamId: string })[] = [];
  const schedule: (ScheduledMatch & { teamId: string })[] = [];
  const scouting: (OpponentScouting & { teamId: string })[] = [];

  if (!state.teams || state.teams.length === 0) {
    // If no teams array, maintain fallback behavior using top-level state
    players.push(...(state.roster || []).map((p) => ({ ...p, teamId: currentTeamId })));
    matches.push(...(state.matches || []).map((m) => ({ ...m, teamId: currentTeamId })));
    trainings.push(...(state.trainings || []).map((t) => ({ ...t, teamId: currentTeamId })));
    schedule.push(...(state.schedule || []).map((s) => ({ ...s, teamId: currentTeamId })));
    scouting.push(...(state.opponentScouting || []).map((sc) => ({ ...sc, teamId: currentTeamId })));
  } else {
    // Iterate over ALL teams in state.teams and pull respective data
    const activeTeamId =
      state.activeTeamId && state.teams.some((t) => t.id === state.activeTeamId)
        ? state.activeTeamId
        : state.teams[0]?.id;

    for (const t of state.teams) {
      const isActive = t.id === activeTeamId;
      // For the active team, use the top-level AppState fields as they may be more up to date
      const teamRoster = isActive ? (state.roster || []) : (t.roster || []);
      const teamMatches = isActive ? (state.matches || []) : (t.matches || []);
      const teamTrainings = isActive ? (state.trainings || []) : (t.trainings || []);
      const teamSchedule = isActive ? (state.schedule || []) : (t.schedule || []);
      const teamScouting = isActive ? (state.opponentScouting || []) : (t.opponentScouting || []);

      for (const p of teamRoster) {
        players.push({ ...p, teamId: t.id });
      }
      for (const m of teamMatches) {
        matches.push({ ...m, teamId: t.id });
      }
      for (const tr of teamTrainings) {
        trainings.push({ ...tr, teamId: t.id });
      }
      for (const s of teamSchedule) {
        schedule.push({ ...s, teamId: t.id });
      }
      for (const sc of teamScouting) {
        scouting.push({ ...sc, teamId: t.id });
      }
    }
  }

  return {
    clubId,
    profile: {
      clubName: state.myClubName || 'O Meu Clube',
      clubLogoUrl: state.clubLogoUrl,
      myClubStadium: state.myClubStadium,
      updatedAt: Date.now()
    },
    teams,
    players,
    matches,
    trainings,
    schedule,
    staff: state.staffMembers || [],
    scouting,
    exercises: state.exerciseLibrary || [],
    events: state.clubEvents || [],
    unavailability: state.staffUnavailability || []
  };
}

/**
 * Reconstructs a full AppState snapshot from modular subcollection payloads.
 */
export function convertModularToMonolithic(
  modular: ClubModularPayload,
  activeTeamId?: string,
  baseState?: Partial<AppState>
): AppState {
  const selectedTeamId = activeTeamId || modular.teams[0]?.id || 'default_team';
  const targetTeam = modular.teams.find((t) => t.id === selectedTeamId) || modular.teams[0];

  const teamPlayers = modular.players.filter((p) => !p.teamId || p.teamId === selectedTeamId);
  const teamMatches = modular.matches.filter((m) => !m.teamId || m.teamId === selectedTeamId);
  const teamTrainings = modular.trainings.filter((t) => !t.teamId || t.teamId === selectedTeamId);
  const teamSchedule = modular.schedule.filter((s) => !s.teamId || s.teamId === selectedTeamId);
  const teamScouting = modular.scouting.filter((sc) => !sc.teamId || sc.teamId === selectedTeamId);

  const fullTeams: SquadProfile[] = modular.teams.map((t) => ({
    id: t.id,
    clubName: t.name,
    category: t.category,
    season: t.season,
    createdAt: new Date().toISOString(),
    roster: modular.players.filter((p) => p.teamId === t.id),
    matches: modular.matches.filter((m) => m.teamId === t.id),
    trainings: modular.trainings.filter((tr) => tr.teamId === t.id),
    schedule: modular.schedule.filter((s) => s.teamId === t.id),
    opponentScouting: modular.scouting.filter((sc) => sc.teamId === t.id),
    tactics: [],
    tacticFormat: (t.tacticFormat as any) || 7
  }));

  return {
    activeTeamId: selectedTeamId,
    teams: fullTeams,
    roster: teamPlayers,
    matches: teamMatches,
    trainings: teamTrainings,
    schedule: teamSchedule,
    tactics: baseState?.tactics || [],
    tacticFormat: (targetTeam?.tacticFormat as any) || 7,
    lastBackupDate: Date.now(),
    trackSubs: baseState?.trackSubs !== false,
    theme: baseState?.theme || 'original',
    lang: baseState?.lang || 'pt',
    myClubName: modular.profile.clubName,
    myClubStadium: modular.profile.myClubStadium,
    clubLogoUrl: modular.profile.clubLogoUrl,
    category: targetTeam?.category || 'Sub-11',
    season: targetTeam?.season || '2025/2026',
    staffMembers: modular.staff,
    opponentScouting: teamScouting,
    exerciseLibrary: modular.exercises,
    clubEvents: modular.events,
    staffUnavailability: modular.unavailability
  };
}
