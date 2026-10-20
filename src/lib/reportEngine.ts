import { AppState, ClubBoardSummary, TeamComparisonMetric, SquadProfile } from '../types';
import { defaultSeason } from './utils';

/**
 * Computes consolidated performance and attendance metrics for a single squad profile
 */
export function computeTeamMetric(team: SquadProfile): TeamComparisonMetric {
  const roster = team.roster || [];
  const matches = (team.matches || []).filter((m) => m.finished);
  const trainings = (team.trainings || []).filter((t) => t.completed !== false);
  const staff = team.staffMembers || [];

  const totalPlayers = roster.length;
  const activePlayers = roster.filter((p) => !p.status || p.status === 'disponivel').length;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsScored = 0;
  let goalsConceded = 0;

  matches.forEach((m) => {
    const goals = m.goals || [];
    const scored = goals.filter((g) => g.type === 'scored').length;
    const conceded = goals.filter((g) => g.type === 'conceded').length;
    goalsScored += scored;
    goalsConceded += conceded;

    if (scored > conceded) wins++;
    else if (scored === conceded) draws++;
    else losses++;
  });

  const totalMatches = matches.length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const goalDiff = goalsScored - goalsConceded;

  // Calculate training attendance rate
  let totalAttendedSlots = 0;
  let totalExpectedSlots = 0;

  trainings.forEach((tr) => {
    if (totalPlayers > 0) {
      const absencesCount = (tr.absences || []).length;
      const attended = Math.max(0, totalPlayers - absencesCount);
      totalExpectedSlots += totalPlayers;
      totalAttendedSlots += attended;
    }
  });

  const avgAttendanceRate = totalExpectedSlots > 0 ? Math.round((totalAttendedSlots / totalExpectedSlots) * 100) : 100;

  // Average player rating from match ratings
  const allMatchRatings: number[] = [];
  matches.forEach((m) => {
    if (m.ratings) {
      Object.values(m.ratings).forEach((r) => {
        if (typeof r === 'number' && r > 0) allMatchRatings.push(r);
      });
    }
  });

  const avgPlayerRating =
    allMatchRatings.length > 0
      ? Number((allMatchRatings.reduce((a, b) => a + b, 0) / allMatchRatings.length).toFixed(1))
      : 7.0;

  return {
    teamId: team.id,
    teamName: `${team.clubName} - ${team.category || 'Geral'}`,
    category: team.category || 'Sub-19',
    totalPlayers,
    activePlayers,
    totalMatches,
    wins,
    draws,
    losses,
    winRate,
    goalsScored,
    goalsConceded,
    goalDiff,
    totalTrainings: trainings.length,
    avgAttendanceRate,
    staffCount: staff.length,
    avgPlayerRating
  };
}

/**
 * Computes consolidated Board/Direction summary for the entire club across all teams
 */
export function computeClubBoardSummary(state: AppState): ClubBoardSummary {
  const teams = state.teams || [];

  // Make sure current active team has latest state
  const updatedTeams = teams.map((t) => {
    if (t.id === state.activeTeamId) {
      return {
        ...t,
        clubName: state.myClubName || t.clubName,
        category: state.category || t.category,
        season: state.season || t.season,
        roster: state.roster,
        staffMembers: state.staffMembers || [],
        matches: state.matches,
        trainings: state.trainings,
        schedule: state.schedule
      };
    }
    return t;
  });

  const metrics: TeamComparisonMetric[] = updatedTeams.map((t) => computeTeamMetric(t));

  const totalTeams = metrics.length;
  const totalPlayers = metrics.reduce((acc, m) => acc + m.totalPlayers, 0);
  const totalStaff = metrics.reduce((acc, m) => acc + m.staffCount, 0);
  const totalMatches = metrics.reduce((acc, m) => acc + m.totalMatches, 0);
  const totalTrainings = metrics.reduce((acc, m) => acc + m.totalTrainings, 0);

  const totalWins = metrics.reduce((acc, m) => acc + m.wins, 0);
  const overallWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const overallAttendanceRate =
    metrics.length > 0 ? Math.round(metrics.reduce((acc, m) => acc + m.avgAttendanceRate, 0) / metrics.length) : 100;

  const lowAttendanceTeams = metrics
    .filter((m) => m.avgAttendanceRate < 75)
    .map((m) => ({ teamName: m.teamName, rate: m.avgAttendanceRate }));

  const topScoringTeams = [...metrics]
    .sort((a, b) => b.goalsScored - a.goalsScored)
    .slice(0, 3)
    .map((m) => ({ teamName: m.teamName, goals: m.goalsScored }));

  return {
    clubName: state.myClubName || 'BolaComVisão Clube',
    season: state.season || defaultSeason(),
    totalTeams,
    totalPlayers,
    totalStaff,
    totalMatches,
    totalTrainings,
    overallWinRate,
    overallAttendanceRate,
    teamsComparison: metrics,
    lowAttendanceTeams,
    topScoringTeams
  };
}

/**
 * Generates downloadable CSV content for cross-team analysis
 */
export function exportTeamComparisonCSV(metrics: TeamComparisonMetric[]): string {
  const headers = [
    'Equipa / Escalão',
    'Categoria',
    'Nº Atletas',
    'Atletas Aptos',
    'Nº Jogos',
    'Vitórias',
    'Empates',
    'Derrotas',
    '% Vitórias',
    'Golos Marcados',
    'Golos Sofridos',
    'Dif. Golos',
    'Nº Treinos',
    'Taxa Assiduidade (%)',
    'Staff Técnico',
    'Média Classificação'
  ];

  const rows = metrics.map((m) => [
    `"${m.teamName.replace(/"/g, '""')}"`,
    `"${m.category}"`,
    m.totalPlayers,
    m.activePlayers,
    m.totalMatches,
    m.wins,
    m.draws,
    m.losses,
    `${m.winRate}%`,
    m.goalsScored,
    m.goalsConceded,
    m.goalDiff,
    m.totalTrainings,
    `${m.avgAttendanceRate}%`,
    m.staffCount,
    m.avgPlayerRating
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
