import { AppState, SquadProfile, UserAccount, Player, Match } from '../types';
import { defaultSeason } from './utils';
import { saveToIndexedDB, defaultSyncState } from './syncEngine';
import { normalizeAndMigrateTrainings } from './trainingNumbering';

const STORAGE_KEY = 'coach-app-data-v1';

export const defaultClubSeasons = [
  { id: 'season_2526', name: '2025/2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true },
  { id: 'season_2425', name: '2024/2025', startDate: '2024-08-01', endDate: '2025-06-30', isCurrent: false },
  { id: 'season_2627', name: '2026/2027', startDate: '2026-08-01', endDate: '2027-06-30', isCurrent: false }
];

export const defaultDragonsSub11Roster: Player[] = [
  { id: 'dragao_1', name: 'Atleta Dragão 1', number: 1, positions: 'Guarda-Redes', birthDate: '2016-01-15', active: true },
  { id: 'dragao_2', name: 'Atleta Dragão 2', number: 2, positions: 'Defesa', birthDate: '2016-02-18', active: true },
  { id: 'dragao_3', name: 'Atleta Dragão 3', number: 3, positions: 'Defesa', birthDate: '2016-03-22', active: true },
  { id: 'dragao_4', name: 'Atleta Dragão 4', number: 4, positions: 'Defesa', birthDate: '2016-04-10', active: true },
  { id: 'dragao_5', name: 'Atleta Dragão 5', number: 5, positions: 'Defesa', birthDate: '2016-05-14', active: true },
  { id: 'dragao_6', name: 'Atleta Dragão 6', number: 6, positions: 'Médio', birthDate: '2016-06-19', active: true },
  { id: 'dragao_7', name: 'Atleta Dragão 7', number: 7, positions: 'Médio', birthDate: '2016-07-25', active: true },
  { id: 'dragao_8', name: 'Atleta Dragão 8', number: 8, positions: 'Médio', birthDate: '2016-08-30', active: true },
  { id: 'dragao_9', name: 'Atleta Dragão 9', number: 9, positions: 'Médio', birthDate: '2016-09-12', active: true },
  { id: 'dragao_10', name: 'Atleta Dragão 10', number: 10, positions: 'Avançado', birthDate: '2016-10-05', active: true },
  { id: 'dragao_11', name: 'Atleta Dragão 11', number: 11, positions: 'Avançado', birthDate: '2016-11-17', active: true },
  { id: 'dragao_12', name: 'Atleta Dragão 12', number: 12, positions: 'Avançado', birthDate: '2016-12-08', active: true }
];

export const defaultTramagalMatch: Match = {
  id: 'match_tramagal_20261017',
  teamId: 'team_dragons_sub11',
  teamName: 'Dragões de Alferrarede',
  opponent: 'Tramagal',
  date: '2026-10-17',
  season: '2025/2026',
  type: 'campeonato',
  phase: 'Jornada 2',
  location: 'fora',
  finished: true,
  finalScore: { scored: 1, conceded: 0 },
  goals: [
    {
      id: 'g_tramagal_1',
      type: 'scored',
      scorerId: 'dragao_10',
      assistId: 'dragao_12',
      minute: "15'",
      minuteBase: 'game',
      half: 1,
      period: '1.ª parte',
      goalType: 'Bola jogada'
    }
  ],
  cards: [],
  subs: [],
  lineup: ['dragao_1', 'dragao_3', 'dragao_5', 'dragao_6', 'dragao_8', 'dragao_10', 'dragao_12'],
  capitao: 'dragao_1',
  rematesDentroArea: 4,
  rematesForaArea: 2,
  rematesDentroAreaAdv: 1,
  rematesForaAreaAdv: 1,
  cantos: 3,
  cantosAdv: 1,
  faltas: 4,
  faltasAdv: 5
};

export const defaultOurienseMatch: Match = {
  id: 'match_ouriense_20261010',
  teamId: 'team_dragons_sub11',
  teamName: 'Dragões de Alferrarede',
  opponent: 'Ouriense',
  date: '2026-10-10',
  season: '2025/2026',
  type: 'campeonato',
  phase: 'Jornada 1',
  location: 'casa',
  finished: true,
  finalScore: { scored: 2, conceded: 0 },
  goals: [
    {
      id: 'g_ouriense_1',
      type: 'scored',
      scorerId: 'dragao_11',
      assistId: 'dragao_10',
      minute: "12'",
      minuteBase: 'game',
      half: 1,
      period: '1.ª parte',
      goalType: 'Bola jogada'
    },
    {
      id: 'g_ouriense_2',
      type: 'scored',
      scorerId: 'dragao_11',
      assistId: 'dragao_7',
      minute: "28'",
      minuteBase: 'game',
      half: 2,
      period: '2.ª parte',
      goalType: 'Bola jogada'
    }
  ],
  cards: [],
  subs: [],
  lineup: ['dragao_1', 'dragao_2', 'dragao_3', 'dragao_4', 'dragao_7', 'dragao_10', 'dragao_11'],
  capitao: 'dragao_1',
  rematesDentroArea: 5,
  rematesForaArea: 3,
  rematesDentroAreaAdv: 2,
  rematesForaAreaAdv: 0,
  cantos: 4,
  cantosAdv: 2,
  faltas: 3,
  faltasAdv: 4
};

export const initialDefaultState: AppState = {
  activeTeamId: 'team_dragons_sub11',
  teams: [
    {
      id: 'team_dragons_sub11',
      clubName: 'Dragões de Alferrarede',
      category: 'Sub-11',
      season: defaultClubSeasons[0].name,
      roster: defaultDragonsSub11Roster,
      matches: [defaultOurienseMatch, defaultTramagalMatch],
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
  roster: defaultDragonsSub11Roster,
  staffMembers: [],
  staffMessages: [],
  matches: [defaultOurienseMatch, defaultTramagalMatch],
  trainings: [],
  schedule: [],
  tactics: [],
  tacticFormat: 11,
  lastBackupDate: null,
  trackSubs: true,
  theme: 'original',
  lang: 'pt',
  myClubName: 'Dragões de Alferrarede',
  category: 'Sub-11',
  season: defaultClubSeasons[0].name,
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

  const teams: SquadProfile[] = Array.isArray(raw.teams) && raw.teams.length > 0
    ? [...raw.teams]
    : [
        {
          id: raw.activeTeamId || 'team_dragons_sub11',
          clubName: raw.myClubName || 'Dragões de Alferrarede',
          category: raw.category || 'Sub-11',
          season: raw.season || defaultClubSeasons[0].name,
          roster: Array.isArray(raw.roster) && raw.roster.length > 0 ? raw.roster : defaultDragonsSub11Roster,
          matches: Array.isArray(raw.matches) && raw.matches.length > 0 ? raw.matches : [defaultOurienseMatch, defaultTramagalMatch],
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
  const finalRoster = raw.roster !== undefined && raw.roster !== null && raw.roster.length > 0
    ? raw.roster
    : (activeTeam?.roster && activeTeam.roster.length > 0 ? activeTeam.roster : defaultDragonsSub11Roster);

  // Master match pool: collect matches from raw.matches and all teams
  const allMatchesMap = new Map<string, Match>();
  if (Array.isArray(raw.matches)) {
    raw.matches.forEach((m) => {
      if (m && m.id) allMatchesMap.set(m.id, m);
    });
  }
  teams.forEach((t) => {
    (t.matches || []).forEach((m) => {
      if (m && m.id && !allMatchesMap.has(m.id)) {
        allMatchesMap.set(m.id, m);
      }
    });
  });

  // Guarantee that Tramagal completed match is never lost
  if (!allMatchesMap.has('match_tramagal_20261017') && !Array.from(allMatchesMap.values()).some((m) => m.opponent?.toLowerCase().includes('tramagal'))) {
    allMatchesMap.set(defaultTramagalMatch.id, defaultTramagalMatch);
  }
  // Guarantee Ouriense match is also available if matches pool is small
  if (!allMatchesMap.has('match_ouriense_20261010') && !Array.from(allMatchesMap.values()).some((m) => m.opponent?.toLowerCase().includes('ouriense'))) {
    allMatchesMap.set(defaultOurienseMatch.id, defaultOurienseMatch);
  }

  const finalMatches = Array.from(allMatchesMap.values());

  const finalStaff = raw.staffMembers !== undefined && raw.staffMembers !== null ? raw.staffMembers : (activeTeam?.staffMembers || []);
  const finalStaffMessages = raw.staffMessages !== undefined && raw.staffMessages !== null ? raw.staffMessages : (activeTeam?.staffMessages || []);
  const finalTrainings = raw.trainings !== undefined && raw.trainings !== null ? raw.trainings : (activeTeam?.trainings || []);
  const finalSchedule = raw.schedule !== undefined && raw.schedule !== null ? raw.schedule : (activeTeam?.schedule || []);
  const finalTactics = raw.tactics !== undefined && raw.tactics !== null ? raw.tactics : (activeTeam?.tactics || []);
  const finalTacticFormat = raw.tacticFormat !== undefined && raw.tacticFormat !== null ? raw.tacticFormat : (activeTeam?.tacticFormat || 11);
  const finalOpponentScouting = raw.opponentScouting !== undefined && raw.opponentScouting !== null
    ? raw.opponentScouting.filter((s) => s.opponentName !== 'Adversário 1')
    : (activeTeam?.opponentScouting || []).filter((s) => s.opponentName !== 'Adversário 1');
  const finalExerciseLibrary = raw.exerciseLibrary !== undefined && raw.exerciseLibrary !== null
    ? raw.exerciseLibrary.filter((e) => !e.id.startsWith('ex-'))
    : (activeTeam?.exerciseLibrary || []).filter((e) => !e.id.startsWith('ex-'));
  const finalClubEvents = raw.clubEvents !== undefined && raw.clubEvents !== null ? raw.clubEvents : (activeTeam?.clubEvents || []);
  const finalStaffUnavailability = raw.staffUnavailability !== undefined && raw.staffUnavailability !== null ? raw.staffUnavailability : (activeTeam?.staffUnavailability || []);

  // Normalize each team's trainings, schedule, and trainingNumber
  const rawScheduleList = Array.isArray(raw.schedule) ? raw.schedule : [];

  const normalizedTeams = teams.map((t) => {
    const rawTeamTrainings = activeTeam && t.id === activeTeam.id ? finalTrainings : (t.trainings || []);
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
        clubName: t.clubName || raw.myClubName || 'Dragões de Alferrarede',
        clubLogoUrl: t.clubLogoUrl || raw.clubLogoUrl,
        category: t.category || raw.category || 'Sub-11',
        season: t.season || raw.season || defaultClubSeasons[0].name
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
        (sTeamName && tClubLower && (sTeamName === tClubLower || tClubLower.includes(sTeamName) || sTeamName.includes(tClubLower))) ||
        (tClubLower.includes('drag') && (sTeamName?.includes('drag') || !sTeamId))
      ) {
        if (!teamScheduleMap.has(s.id)) {
          teamScheduleMap.set(s.id, s);
        }
      }
    });

    return {
      ...t,
      matches: t.matches && t.matches.length > 0 ? t.matches : finalMatches,
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
    activeTeamId: activeTeamId || (normalizedTeams[0]?.id || ''),
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
    myClubName: activeTeam?.clubName || raw.myClubName || 'Dragões de Alferrarede',
    clubLogoUrl: activeTeam?.clubLogoUrl || raw.clubLogoUrl,
    category: activeTeam?.category || raw.category || 'Sub-11',
    season: activeTeam?.season || raw.season || defaultClubSeasons[0].name,
    seasons: raw.seasons && raw.seasons.length > 0 ? raw.seasons : defaultClubSeasons,
    currentUser: raw.currentUser || null,
    users: raw.users || [],
    invitations: raw.invitations || [],
    auditLogs: raw.auditLogs || [],
    notifications: raw.notifications || [],
    notificationSettings: raw.notificationSettings || initialDefaultState.notificationSettings,
    updatedAt: raw.updatedAt || Date.now(),
    lastLocalMutationAt: raw.lastLocalMutationAt || raw.updatedAt || Date.now(),
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
