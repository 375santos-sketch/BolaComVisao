import { AppState, SquadProfile, UserAccount, Player, Match, ScheduledMatch, ClubSeason } from '../types';
import { saveToIndexedDB, defaultSyncState } from './syncEngine';
import { normalizeAndMigrateTrainings } from './trainingNumbering';
import { buildDefaultSeasons, defaultSeason, seasonFromDate, normalizeSeasonString } from './utils';

const STORAGE_KEY = 'coach-app-data-v1';

// Placeholder matches injected by older versions that must never be shown or synced again.
const REMOVED_PLACEHOLDER_MATCH_IDS = ['match_tramagal_20261017', 'match_ouriense_20261010'];

export const defaultClubSeasons = buildDefaultSeasons();

/** Shown when a club has no name yet. */
export const DEFAULT_CLUB_NAME = 'O Meu Clube';

/**
 * Demo squad that older versions injected into every club ("Atleta Dragão 1..12"). Kept only to recognise
 * demo players nobody edited, which are removed; real clubs start with an empty squad.
 */
const LEGACY_DEMO_PLAYERS: Player[] = [
  {
    id: 'dragao_1',
    name: 'Atleta Dragão 1',
    number: 1,
    positions: 'Guarda-Redes',
    birthDate: '2016-01-15',
    active: true
  },
  { id: 'dragao_2', name: 'Atleta Dragão 2', number: 2, positions: 'Defesa', birthDate: '2016-02-18', active: true },
  { id: 'dragao_3', name: 'Atleta Dragão 3', number: 3, positions: 'Defesa', birthDate: '2016-03-22', active: true },
  { id: 'dragao_4', name: 'Atleta Dragão 4', number: 4, positions: 'Defesa', birthDate: '2016-04-10', active: true },
  { id: 'dragao_5', name: 'Atleta Dragão 5', number: 5, positions: 'Defesa', birthDate: '2016-05-14', active: true },
  { id: 'dragao_6', name: 'Atleta Dragão 6', number: 6, positions: 'Médio', birthDate: '2016-06-19', active: true },
  { id: 'dragao_7', name: 'Atleta Dragão 7', number: 7, positions: 'Médio', birthDate: '2016-07-25', active: true },
  { id: 'dragao_8', name: 'Atleta Dragão 8', number: 8, positions: 'Médio', birthDate: '2016-08-30', active: true },
  { id: 'dragao_9', name: 'Atleta Dragão 9', number: 9, positions: 'Médio', birthDate: '2016-09-12', active: true },
  {
    id: 'dragao_10',
    name: 'Atleta Dragão 10',
    number: 10,
    positions: 'Avançado',
    birthDate: '2016-10-05',
    active: true
  },
  {
    id: 'dragao_11',
    name: 'Atleta Dragão 11',
    number: 11,
    positions: 'Avançado',
    birthDate: '2016-11-17',
    active: true
  },
  {
    id: 'dragao_12',
    name: 'Atleta Dragão 12',
    number: 12,
    positions: 'Avançado',
    birthDate: '2016-12-08',
    active: true
  }
];

const isUntouchedDemoPlayer = (p: Player | null | undefined) => {
  if (!p) return false;
  const demo = LEGACY_DEMO_PLAYERS.find((d) => d.id === p.id);
  return Boolean(demo && demo.name === p.name && demo.number === p.number && demo.birthDate === p.birthDate);
};
const withoutDemoPlayers = (roster: Player[] | undefined) => (roster || []).filter((p) => !isUntouchedDemoPlayer(p));

export const initialDefaultState: AppState = {
  activeTeamId: 'team_dragons_sub11',
  teams: [
    {
      id: 'team_dragons_sub11',
      clubName: DEFAULT_CLUB_NAME,
      category: 'Sub-11',
      season: defaultSeason(),
      createdAt: new Date(0).toISOString(),
      roster: [],
      matches: [],
      trainings: [],
      schedule: [],
      staffMembers: [],
      staffMessages: [],
      tactics: [],
      tacticFormat: 11,
      opponentScouting: [],
      exerciseLibrary: [],
      clubEvents: [],
      staffUnavailability: []
    }
  ],
  roster: [],
  staffMembers: [],
  staffMessages: [],
  matches: [],
  trainings: [],
  schedule: [],
  tactics: [],
  tacticFormat: 11,
  lastBackupDate: null,
  trackSubs: true,
  theme: 'original',
  lang: 'pt',
  myClubName: DEFAULT_CLUB_NAME,
  category: 'Sub-11',
  season: defaultSeason(),
  seasons: defaultClubSeasons,
  currentUser: null,
  users: [],
  invitations: [],
  auditLogs: [],
  notifications: [],
  syncInfo: defaultSyncState,
  opponentScouting: [],
  exerciseLibrary: [],
  staffUnavailability: [],
  clubEvents: []
};

/**
 * Normalizes any partial or full AppState (from Firestore, LocalStorage or IndexedDB)
 * to ensure that teams and active team rosters/matches are ALWAYS fully synchronized,
 * preventing any accidental squad data loss or matches disappearing.
 */
export function normalizeClubState(raw: Partial<AppState> | null | undefined): AppState {
  if (!raw) {
    return { ...initialDefaultState };
  }
  const normalized = normalizeClubStateFields(raw);
  return (raw.version || 1) < SEASON_MIGRATION_VERSION ? migrateSeasonsFromDates(normalized) : normalized;
}

function normalizeClubStateFields(raw: Partial<AppState>): AppState {
  const teams: SquadProfile[] =
    Array.isArray(raw.teams) && raw.teams.length > 0
      ? [...raw.teams]
      : [
          {
            id: raw.activeTeamId || 'team_dragons_sub11',
            clubName: raw.myClubName || DEFAULT_CLUB_NAME,
            category: raw.category || 'Sub-11',
            season: raw.season || defaultSeason(),
            createdAt: new Date().toISOString(),
            roster: Array.isArray(raw.roster) ? raw.roster : [],
            matches: Array.isArray(raw.matches) ? raw.matches : [],
            trainings: Array.isArray(raw.trainings) ? raw.trainings : [],
            schedule: Array.isArray(raw.schedule) ? raw.schedule : [],
            staffMembers: Array.isArray(raw.staffMembers) ? raw.staffMembers : [],
            staffMessages: Array.isArray(raw.staffMessages) ? raw.staffMessages : [],
            tactics: Array.isArray(raw.tactics) ? raw.tactics : [],
            tacticFormat: raw.tacticFormat || 11,
            opponentScouting: Array.isArray(raw.opponentScouting) ? raw.opponentScouting : [],
            exerciseLibrary: Array.isArray(raw.exerciseLibrary) ? raw.exerciseLibrary : [],
            clubEvents: Array.isArray(raw.clubEvents) ? raw.clubEvents : [],
            staffUnavailability: Array.isArray(raw.staffUnavailability) ? raw.staffUnavailability : []
          }
        ];

  let activeTeamId = raw.activeTeamId || teams[0]?.id || 'team_dragons_sub11';

  // Find best active team:
  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];
  activeTeamId = activeTeam?.id || '';

  // Synchronize roster and collections between activeTeam and top-level raw fields
  const finalRoster = withoutDemoPlayers(
    raw.roster !== undefined && raw.roster !== null && raw.roster.length > 0 ? raw.roster : activeTeam?.roster
  );

  // Each match belongs to exactly one team. Older versions pooled every team's matches into the active team
  // (and copied them into teams without matches), mixing squads' results and statistics. Rebuild per-team
  // lists: a match tagged with an existing team's id goes back to that team; untagged matches stay where they are.
  // The active team is processed first (top-level raw.matches mirrors it) so its latest edits win.
  const teamIds = new Set(teams.map((t) => t.id));
  const matchesByTeam = new Map<string, Map<string, Match>>(teams.map((t) => [t.id, new Map<string, Match>()]));
  const assignMatches = (listOwnerId: string, list: Match[] | undefined) => {
    (list || []).forEach((m) => {
      if (!m || !m.id || REMOVED_PLACEHOLDER_MATCH_IDS.includes(m.id)) return;
      const ownerId = m.teamId && teamIds.has(m.teamId) ? m.teamId : listOwnerId;
      const ownerMatches = matchesByTeam.get(ownerId);
      if (ownerMatches && !ownerMatches.has(m.id)) ownerMatches.set(m.id, m);
    });
  };
  if (activeTeam) {
    assignMatches(activeTeam.id, Array.isArray(raw.matches) ? raw.matches : []);
    assignMatches(activeTeam.id, activeTeam.matches);
  }
  teams.forEach((t) => {
    if (t !== activeTeam) assignMatches(t.id, t.matches);
  });
  const teamMatches = (teamId: string): Match[] => Array.from(matchesByTeam.get(teamId)?.values() || []);

  const finalMatches = activeTeam ? teamMatches(activeTeam.id) : [];

  const finalStaff =
    raw.staffMembers !== undefined && raw.staffMembers !== null ? raw.staffMembers : activeTeam?.staffMembers || [];
  const finalStaffMessages =
    raw.staffMessages !== undefined && raw.staffMessages !== null ? raw.staffMessages : activeTeam?.staffMessages || [];
  const finalTrainings =
    raw.trainings !== undefined && raw.trainings !== null ? raw.trainings : activeTeam?.trainings || [];
  const finalSchedule = raw.schedule !== undefined && raw.schedule !== null ? raw.schedule : activeTeam?.schedule || [];
  const finalTactics = raw.tactics !== undefined && raw.tactics !== null ? raw.tactics : activeTeam?.tactics || [];
  const finalTacticFormat =
    raw.tacticFormat !== undefined && raw.tacticFormat !== null ? raw.tacticFormat : activeTeam?.tacticFormat || 11;
  const finalOpponentScouting =
    raw.opponentScouting !== undefined && raw.opponentScouting !== null
      ? raw.opponentScouting.filter((s) => s.opponentName !== 'Adversário 1')
      : (activeTeam?.opponentScouting || []).filter((s) => s.opponentName !== 'Adversário 1');
  const finalExerciseLibrary =
    raw.exerciseLibrary !== undefined && raw.exerciseLibrary !== null
      ? raw.exerciseLibrary.filter((e) => !e.id.startsWith('ex-'))
      : (activeTeam?.exerciseLibrary || []).filter((e) => !e.id.startsWith('ex-'));
  const finalClubEvents =
    raw.clubEvents !== undefined && raw.clubEvents !== null ? raw.clubEvents : activeTeam?.clubEvents || [];
  const finalStaffUnavailability =
    raw.staffUnavailability !== undefined && raw.staffUnavailability !== null
      ? raw.staffUnavailability
      : activeTeam?.staffUnavailability || [];

  // Normalize each team's trainings, schedule, and trainingNumber
  const rawScheduleList = Array.isArray(raw.schedule) ? raw.schedule : [];

  const normalizedTeams = teams.map((t) => {
    const rawTeamTrainings = activeTeam && t.id === activeTeam.id ? finalTrainings : t.trainings || [];
    const { trainings: migratedTeamTrainings, maxNumber: teamMaxNumber } = normalizeAndMigrateTrainings(
      rawTeamTrainings,
      t.lastTrainingNumber
    );

    const teamScheduleMap = new Map<string, any>();
    (t.schedule || []).forEach((s: any) => {
      if (s && s.id) teamScheduleMap.set(s.id, s);
    });

    if (activeTeam && t.id === activeTeam.id) {
      (finalSchedule || []).forEach((s: any) => {
        if (s && s.id) teamScheduleMap.set(s.id, s);
      });
      const resolvedActiveSchedule = Array.from(teamScheduleMap.values());

      return {
        ...t,
        roster: finalRoster,
        staffMembers: finalStaff,
        staffMessages: finalStaffMessages,
        matches: finalMatches,
        trainings: migratedTeamTrainings,
        lastTrainingNumber: Math.max(t.lastTrainingNumber || 0, teamMaxNumber),
        schedule: resolvedActiveSchedule,
        tactics: finalTactics,
        tacticFormat: finalTacticFormat,
        opponentScouting: finalOpponentScouting,
        exerciseLibrary: finalExerciseLibrary,
        clubEvents: finalClubEvents,
        staffUnavailability: finalStaffUnavailability,
        clubName: t.clubName || raw.myClubName || DEFAULT_CLUB_NAME,
        clubLogoUrl: t.clubLogoUrl || raw.clubLogoUrl,
        category: t.category || raw.category || 'Sub-11',
        season: t.season || raw.season || defaultSeason()
      };
    }

    // Attach any matches from rawScheduleList tagged or identified for this team
    rawScheduleList.forEach((s: any) => {
      if (!s || !s.id) return;
      const sTeamId = s.teamId;
      const sTeamName = s.teamName?.toLowerCase().trim();
      const tClubLower = (t.clubName || '').toLowerCase().trim();
      if (
        sTeamId === t.id ||
        (sTeamName &&
          tClubLower &&
          (sTeamName === tClubLower || tClubLower.includes(sTeamName) || sTeamName.includes(tClubLower))) ||
        (tClubLower.includes('drag') && (sTeamName?.includes('drag') || !sTeamId))
      ) {
        if (!teamScheduleMap.has(s.id)) {
          teamScheduleMap.set(s.id, s);
        }
      }
    });

    return {
      ...t,
      roster: withoutDemoPlayers(t.roster),
      matches: teamMatches(t.id),
      schedule: Array.from(teamScheduleMap.values()),
      trainings: migratedTeamTrainings,
      lastTrainingNumber: Math.max(t.lastTrainingNumber || 0, teamMaxNumber)
    };
  });

  const activeNormalizedTeam = normalizedTeams.find((t) => t.id === activeTeamId) || normalizedTeams[0];
  const finalMigratedTrainings = activeNormalizedTeam?.trainings || [];
  const finalLastTrainingNumber = activeNormalizedTeam?.lastTrainingNumber || 0;
  const finalNormalizedSchedule = activeNormalizedTeam?.schedule || finalSchedule;

  if (activeTeam) {
    activeTeam.roster = finalRoster;
    activeTeam.staffMembers = finalStaff;
    activeTeam.staffMessages = finalStaffMessages;
    activeTeam.matches = finalMatches;
    activeTeam.trainings = finalMigratedTrainings;
    activeTeam.lastTrainingNumber = finalLastTrainingNumber;
    activeTeam.schedule = finalNormalizedSchedule;
    activeTeam.tactics = finalTactics;
    activeTeam.tacticFormat = finalTacticFormat;
    activeTeam.opponentScouting = finalOpponentScouting;
    activeTeam.exerciseLibrary = finalExerciseLibrary;
    activeTeam.clubEvents = finalClubEvents;
    activeTeam.staffUnavailability = finalStaffUnavailability;
  }

  return {
    ...initialDefaultState,
    ...raw,
    activeTeamId: activeTeamId || normalizedTeams[0]?.id || '',
    teams: normalizedTeams,
    roster: finalRoster,
    staffMembers: finalStaff,
    staffMessages: finalStaffMessages,
    matches: finalMatches,
    trainings: finalMigratedTrainings,
    lastTrainingNumber: finalLastTrainingNumber,
    schedule: finalNormalizedSchedule,
    tactics: finalTactics,
    tacticFormat: finalTacticFormat,
    opponentScouting: finalOpponentScouting,
    exerciseLibrary: finalExerciseLibrary,
    clubEvents: finalClubEvents,
    staffUnavailability: finalStaffUnavailability,
    myClubName: activeTeam?.clubName || raw.myClubName || DEFAULT_CLUB_NAME,
    clubLogoUrl: activeTeam?.clubLogoUrl || raw.clubLogoUrl,
    category: activeTeam?.category || raw.category || 'Sub-11',
    season: activeTeam?.season || raw.season || defaultSeason(),
    seasons: raw.seasons && raw.seasons.length > 0 ? raw.seasons : defaultClubSeasons,
    currentUser: raw.currentUser || null,
    users: raw.users || [],
    invitations: raw.invitations || [],
    auditLogs: raw.auditLogs || [],
    notifications: raw.notifications || [],
    notificationSettings: raw.notificationSettings || initialDefaultState.notificationSettings,
    // Missing timestamps mean "unknown age" (0), never "now": otherwise a stale copy would look newer than the cloud.
    updatedAt: raw.updatedAt || 0,
    lastLocalMutationAt: raw.lastLocalMutationAt || 0,
    version: raw.version || 1,
    syncInfo: raw.syncInfo
      ? {
          ...defaultSyncState,
          ...raw.syncInfo,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
        }
      : defaultSyncState
  };
}

export function clearAllAppState(keepUser: UserAccount | null = null): AppState {
  const cleanState: AppState = {
    ...initialDefaultState,
    currentUser: keepUser,
    users: keepUser ? [keepUser] : [],
    theme: 'original',
    lang: 'pt'
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
    saveToIndexedDB('coach_active_state', cleanState).catch(() => {});
  } catch (e) {
    console.error('Failed to clear app state in storage', e);
  }
  return cleanState;
}

export function loadAppState(): AppState {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return normalizeClubState(parsed);
    }
  } catch (e) {
    console.error('Failed to load state from storage', e);
  }
  return initialDefaultState;
}

export function saveAppState(state: AppState): boolean {
  try {
    const normalized = normalizeClubState(state);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    // Dual offline persistence layer in IndexedDB (non-blocking)
    saveToIndexedDB('coach_active_state', normalized).catch(() => {});

    return true;
  } catch (e: any) {
    if (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (e.message && e.message.includes('quota'))
    ) {
      alert(
        '⚠️ Espaço Esgotado! O teu dispositivo não tem mais memória alocada para a app. Exporta os dados (JSON) e limpa o armazenamento.'
      );
    } else {
      console.error('Error saving state:', e);
    }
    return false;
  }
}

// Data version that introduced date-based seasons (see migrateSeasonsFromDates).
const SEASON_MIGRATION_VERSION = 2;

const isIsoDate = (d?: string) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d);
const seasonStart = (season?: string) => Number(normalizeSeasonString(season).slice(0, 4)) || 0;

/**
 * One-off fix for data saved while the season list was hard-coded (2025/2026 was always "current"):
 * - every match / scheduled match gets the season of its date (July–June);
 * - a team whose active season is older than its latest played/scheduled game moves to that game's season;
 * - the season list covers the seasons in use plus previous/current/next by today's date.
 * Runs once (bumps `version`), so a season the coach picks afterwards is respected.
 */
export function migrateSeasonsFromDates(state: AppState): AppState {
  const today = new Date().toISOString().slice(0, 10);
  const fixMatch = <T extends Match | ScheduledMatch>(m: T): T =>
    m && isIsoDate(m.date) ? { ...m, season: seasonFromDate(m.date) } : m;

  const teams = state.teams.map((t) => {
    const matches = (t.matches || []).map(fixMatch);
    const schedule = (t.schedule || []).map(fixMatch);
    const latestSeason = [...matches, ...schedule.filter((s) => s.date <= today)]
      .filter((m) => m && isIsoDate(m.date))
      .map((m) => seasonFromDate(m.date))
      .sort((a, b) => seasonStart(b) - seasonStart(a))[0];
    const season = latestSeason && seasonStart(latestSeason) > seasonStart(t.season) ? latestSeason : t.season;
    return { ...t, matches, schedule, season };
  });

  const activeTeam = teams.find((t) => t.id === state.activeTeamId);
  const season = activeTeam?.season || state.season || defaultSeason();

  const seasonsByName = new Map<string, ClubSeason>();
  [...(state.seasons || []), ...buildDefaultSeasons(), ...buildDefaultSeasons(season)].forEach((s) => {
    if (!seasonsByName.has(s.name)) seasonsByName.set(s.name, s);
  });
  const seasons = Array.from(seasonsByName.values())
    .map((s) => ({ ...s, isCurrent: s.name === season }))
    .sort((a, b) => seasonStart(b.name) - seasonStart(a.name));

  return {
    ...state,
    teams,
    matches: (state.matches || []).map(fixMatch),
    schedule: (state.schedule || []).map(fixMatch),
    season,
    seasons,
    version: SEASON_MIGRATION_VERSION
  };
}
