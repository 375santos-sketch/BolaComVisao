import {
  AppState,
  SquadProfile,
  UserAccount,
  Player,
  Match,
  ScheduledMatch,
  ClubSeason,
  OpponentScouting
} from '../types';
import { saveToIndexedDB, loadFromIndexedDB, defaultSyncState } from './syncEngine';
import { normalizeAndMigrateTrainings } from './trainingNumbering';
import { buildDefaultSeasons, defaultSeason, seasonFromDate, normalizeSeasonString } from './utils';

import { ACTIVE_STATE_POINTER, LEGACY_STATE_KEY, isClubDataKey, stateKeyFor } from './deviceCache';

// F1.4: the club data lives under one key per account and organization (deviceCache.ts); the old single key only
// holds the signed-out state, and an old device moves from it to the new key the first time it saves.

/** Writes the state under its account's key and marks it as the one to open next time. */
function writeStateToDevice(state: AppState) {
  const key = stateKeyFor(state.currentUser);
  localStorage.setItem(key, JSON.stringify(state));
  if (key === LEGACY_STATE_KEY) {
    localStorage.removeItem(ACTIVE_STATE_POINTER);
    return;
  }
  localStorage.setItem(ACTIVE_STATE_POINTER, key);
  // Moved: the old shared copy of THIS account is no longer needed (another account's copy is left alone)
  try {
    const legacy = localStorage.getItem(LEGACY_STATE_KEY);
    if (legacy && (JSON.parse(legacy) as Partial<AppState>)?.currentUser?.id === state.currentUser?.id) {
      localStorage.removeItem(LEGACY_STATE_KEY);
    }
  } catch {
    // An unreadable old copy is simply left as it was
  }
}

/** The state to open: the last account and organization used, or the old single key on an old device. */
function readStateFromDevice(): string | null {
  const key = localStorage.getItem(ACTIVE_STATE_POINTER);
  // The copy is in IndexedDB (the small storage was full): the app reads it from there right after opening
  if (key && localStorage.getItem('bcv-state-in-idb') === key) return null;
  const data = key ? localStorage.getItem(key) : null;
  return data ?? localStorage.getItem(LEGACY_STATE_KEY);
}

// Placeholder matches injected by older versions that must never be shown or synced again.
const REMOVED_PLACEHOLDER_MATCH_IDS = ['match_tramagal_20261017', 'match_ouriense_20261010'];

const defaultClubSeasons = buildDefaultSeasons();

/** Shown when a club has no name yet. */
const DEFAULT_CLUB_NAME = 'O Meu Clube';

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
  const normalized = withMatchRoundsRestored(withoutOpponentScouting(normalizeClubStateFields(raw)));
  const seasonsFixed = (raw.version || 1) < SEASON_MIGRATION_VERSION ? migrateSeasonsFromDates(normalized) : normalized;
  return (raw.version || 1) < PRE_MATCH_RESET_VERSION ? resetOldPreMatchFlags(seasonsFixed) : seasonsFixed;
}

// Data version that replaced the old Pré-jogo (see resetOldPreMatchFlags).
const PRE_MATCH_RESET_VERSION = 3;

/**
 * Runs once: the old Pré-jogo plans were deleted, so their "finalized" mark on the Agenda games would show a ✓
 * for a plan that no longer exists. Games that already have a new plan keep their mark.
 */
export function resetOldPreMatchFlags(state: AppState): AppState {
  const reset = (list?: ScheduledMatch[]) =>
    Array.isArray(list)
      ? list.map((m) => {
          if (!m || m.preMatchPlan || (m.preMatchFinalized === undefined && m.preMatchFinalizedAt === undefined))
            return m;
          const copy: Record<string, unknown> = { ...m };
          delete copy.preMatchFinalized;
          delete copy.preMatchFinalizedAt;
          return copy as unknown as ScheduledMatch;
        })
      : list;
  return {
    ...state,
    schedule: reset(state.schedule) || [],
    teams: (state.teams || []).map((t) => ({ ...t, schedule: reset(t.schedule) })),
    version: PRE_MATCH_RESET_VERSION
  };
}

const GAME_PHASES = new Set(['nao_iniciado', 'parte1', 'intervalo', 'parte2']);

/**
 * Match.phase is the round ("Jornada 5", "Fase de Grupos"), but older versions of the live match also wrote the
 * clock state there ("parte1"/"intervalo"/"parte2"), wiping the round. Moves the clock state to matchPhase and
 * restores the round from the Agenda copy kept in the match. Idempotent: running it again changes nothing.
 */
export function withMatchRoundsRestored(state: AppState): AppState {
  const isBroken = (m?: Match) => Boolean(m && typeof m.phase === 'string' && GAME_PHASES.has(m.phase));
  const fixList = (list?: Match[]): Match[] | undefined => {
    if (!Array.isArray(list) || !list.some(isBroken)) return list;
    return list.map((m) =>
      isBroken(m)
        ? {
            ...m,
            matchPhase: m.matchPhase || (m.phase as Match['matchPhase']),
            phase: m.originalSchedule?.phase || ''
          }
        : m
    );
  };
  return {
    ...state,
    matches: fixList(state.matches) || [],
    teams: (state.teams || []).map((t) => ({ ...t, matches: fixList(t.matches) || t.matches }))
  };
}

/**
 * The old Pré-jogo and opponent scouting screens (both stored in opponentScouting) were replaced by
 * ScheduledMatch.preMatchPlan and Match.opponentReport: their data is deleted, as the Administrator asked
 * (21/10/2026). Idempotent: running it again changes nothing.
 */
export function withoutOpponentScouting(state: AppState): AppState {
  const cleanList = (list?: OpponentScouting[]): OpponentScouting[] | undefined =>
    Array.isArray(list) && list.length > 0 ? [] : list;
  const hasScouting = (m?: ScheduledMatch) =>
    Boolean(m && (m.scoutingFinalized !== undefined || m.scoutingFinalizedAt !== undefined));
  const cleanSchedule = (list?: ScheduledMatch[]): ScheduledMatch[] | undefined => {
    if (!Array.isArray(list) || !list.some(hasScouting)) return list;
    return list.map((m) => {
      if (!hasScouting(m)) return m;
      const copy: Record<string, unknown> = { ...m };
      delete copy.scoutingFinalized;
      delete copy.scoutingFinalizedAt;
      return copy as unknown as ScheduledMatch;
    });
  };
  return {
    ...state,
    opponentScouting: cleanList(state.opponentScouting) || [],
    schedule: cleanSchedule(state.schedule) || [],
    teams: (state.teams || []).map((t) => ({
      ...t,
      opponentScouting: cleanList(t.opponentScouting),
      schedule: cleanSchedule(t.schedule)
    }))
  };
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
    writeStateToDevice(cleanState);
    saveToIndexedDB('coach_active_state', cleanState).catch(() => {});
  } catch (e) {
    console.error('Failed to clear app state in storage', e);
  }
  return cleanState;
}

export function loadAppState(): AppState {
  try {
    const data = readStateFromDevice();
    if (data) {
      const parsed = JSON.parse(data);
      return normalizeClubState(parsed);
    }
  } catch (e) {
    console.error('Failed to load state from storage', e);
  }
  return initialDefaultState;
}

// ---------- When the browser's small storage (about 5 MB on an iPhone) is full ----------
// The club's copy then goes to IndexedDB (much larger), and the app reads it from there when it opens. The club's
// data is in the cloud either way: this copy only lets the app open fast and work without network.

/** Marker: the copy of the club for this state key is in IndexedDB, not in localStorage. */
export const STATE_IN_IDB_KEY = 'bcv-state-in-idb';
/** Window event the app shows a short message for (once per session). */
export const STORAGE_FULL_EVENT = 'bcv-storage-full';
const idbStateKey = (key: string) => `state:${key}`;

const isQuotaError = (e: any) =>
  e?.name === 'QuotaExceededError' ||
  e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));

/** Frees room: other accounts' and clubs' copies (they are in the cloud) and caches that are rebuilt by themselves. */
function freeDeviceSpace(keep: string) {
  const drop: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || k === keep || k === LEGACY_STATE_KEY || k === ACTIVE_STATE_POINTER) continue;
    if (
      (isClubDataKey(k) && k.startsWith('bcv-state:')) ||
      k.startsWith('bcv_team_db_v1_') ||
      k === 'bcv_weather_cache_v1'
    )
      drop.push(k);
  }
  drop.forEach((k) => localStorage.removeItem(k));
}

let quotaWarned = false;

export function saveAppState(state: AppState): boolean {
  const normalized = normalizeClubState(state);
  const key = stateKeyFor(normalized.currentUser);
  // The larger copy first (non-blocking): it is the one used when the small storage is full
  saveToIndexedDB(idbStateKey(key), normalized).catch(() => {});
  try {
    writeStateToDevice(normalized);
    if (localStorage.getItem(STATE_IN_IDB_KEY) === key) localStorage.removeItem(STATE_IN_IDB_KEY);
    return true;
  } catch (e: any) {
    if (!isQuotaError(e)) {
      console.error('Error saving state:', e);
      return false;
    }
  }
  try {
    freeDeviceSpace(key);
    writeStateToDevice(normalized);
    if (localStorage.getItem(STATE_IN_IDB_KEY) === key) localStorage.removeItem(STATE_IN_IDB_KEY);
    return true;
  } catch {
    // Still too big: keep only the small marker here; the copy is in IndexedDB (an old copy here would be stale)
    try {
      localStorage.removeItem(key);
      if (key !== LEGACY_STATE_KEY) localStorage.setItem(ACTIVE_STATE_POINTER, key);
      localStorage.setItem(STATE_IN_IDB_KEY, key);
    } catch {
      // Nothing more fits: IndexedDB and the cloud still have the club
    }
    if (!quotaWarned) {
      quotaWarned = true;
      try {
        window.dispatchEvent(new Event(STORAGE_FULL_EVENT));
      } catch {
        // No window (tests)
      }
    }
    return true;
  }
}

/** When the copy of the club is in IndexedDB (the small storage was full), the state to open; otherwise null. */
export async function loadAppStateFromLargeStorage(): Promise<AppState | null> {
  try {
    const key = localStorage.getItem(STATE_IN_IDB_KEY);
    if (!key || localStorage.getItem(ACTIVE_STATE_POINTER) !== key) return null;
    const data = await loadFromIndexedDB<AppState>(idbStateKey(key));
    return data ? normalizeClubState(data) : null;
  } catch {
    return null;
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
function migrateSeasonsFromDates(state: AppState): AppState {
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
