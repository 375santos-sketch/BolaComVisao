import { Match, Player } from '../../types';
import { normalizeEventTiming } from '../gameAnalysisUtils';
import { isSeasonMatching } from '../utils';
import { AggregatedAnalysis, StandardGoalType } from './types';
import { computeGameAnalysis } from './index';

export interface CoachViewPlayerStat {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  position: string;
  count: number;
  rank: number;
}

export interface CoachViewPlayerFullStat {
  playerId: string;
  playerName: string;
  playerNumber: number | null;
  position: string;
  photoUrl?: string;
  status?: string;
  goals: number;
  assists: number;
  totalContributions: number;
  matchesPlayed: number;
  rankGoals: number;
  rankAssists: number;
}

export type CoachFilterMode =
  | 'season'
  | 'last5'
  | 'last10'
  | 'this_month'
  | 'month'
  | 'opponent'
  | 'match';

export interface CoachViewFilter {
  mode: CoachFilterMode;
  season?: string;
  month?: string; // YYYY-MM
  opponent?: string;
  matchId?: string;
}

export type DeltaStatus = 'positive' | 'negative' | 'neutral' | 'insufficient';

export interface CoachViewIndicator {
  id: string;
  label: string;
  value: string;
  numericValue: number | null;
  deltaText: string;
  deltaStatus: DeltaStatus;
  deltaNumeric: number | null;
  subtext: string;
  hasSufficientHistory: boolean;
  targetAnalysisTab?: string;
}

export interface CoachViewRecentMatch {
  matchId: string;
  opponent: string;
  date: string;
  formattedDate: string;
  scored: number;
  conceded: number;
  result: 'V' | 'E' | 'D';
  resultLabel: string;
  badgeVariant: 'emerald' | 'rose' | 'amber';
}

export interface CoachViewTrendMatch {
  matchId: string;
  opponent: string;
  date: string;
  scored: number;
  conceded: number;
  result: 'V' | 'E' | 'D';
}

export interface CoachViewTrend {
  matches: CoachViewTrendMatch[];
  scoredBars: number[];
  concededBars: number[];
  status: 'improving' | 'declining' | 'stable' | 'insufficient';
  statusLabel: string;
  statusDescription: string;
}

export interface CoachViewStrength {
  id: string;
  title: string;
  text: string;
  icon: string;
  targetTab?: string;
}

export interface CoachViewAttentionPoint {
  id: string;
  title: string;
  text: string;
  icon: string;
  targetTab?: string;
}

export interface CoachViewFirstGoalStats {
  scoredFirstRate: number;
  scoredFirstCount: number;
  totalFinishedMatches: number;
  scoredFirstWins: number;
  scoredFirstDraws: number;
  scoredFirstLosses: number;
  avgScoredFirstMinute: number | null;
  hasSufficientData: boolean;
}

export interface CoachViewSetPieceStats {
  scoredCount: number;
  scoredRate: number;
  concededCount: number;
  concededRate: number;
  status: 'strength' | 'warning' | 'neutral';
  statusLabel: string;
  hasSufficientData: boolean;
}

export interface CoachViewTimingStats {
  mostScoredPeriod: { label: string; count: number; percentage: number } | null;
  mostConcededPeriod: { label: string; count: number; percentage: number } | null;
  hasSufficientData: boolean;
}

export interface CoachViewData {
  totalMatches: number;
  finishedMatchesCount: number;
  wins: number;
  draws: number;
  losses: number;
  recordText: string;
  goalsScoredTotal: number;
  goalsConcededTotal: number;
  goalDifference: number;
  filterLabel: string;
  filter: CoachViewFilter;

  // 5 Main Indicators
  indicators: {
    goalsScored: CoachViewIndicator;
    goalsConceded: CoachViewIndicator;
    winRate: CoachViewIndicator;
    corners: CoachViewIndicator;
    firstGoalMinute: CoachViewIndicator;
  };

  // Recent 5 Matches
  recentMatches: CoachViewRecentMatch[];

  // Trend
  trend: CoachViewTrend;

  // Real data-driven strengths & areas of attention
  strengths: CoachViewStrength[];
  areasOfAttention: CoachViewAttentionPoint[];

  // First goal metrics
  firstGoalStats: CoachViewFirstGoalStats;

  // Set Pieces metrics
  setPieces: CoachViewSetPieceStats;

  // Timing metrics
  timing: CoachViewTimingStats;

  // Top 3 Scorers & Assists
  topScorers: CoachViewPlayerStat[];
  topAssisters: CoachViewPlayerStat[];
  allSquadStats: CoachViewPlayerFullStat[];

  // Underlying analysis reference
  analysis: AggregatedAnalysis;
}

/**
 * Filter matches according to coach view filter mode
 */
export function filterMatchesForCoachView(
  allMatches: Match[],
  filter: CoachViewFilter,
  currentSeason?: string
): { currentMatches: Match[]; previousMatches: Match[]; filterLabel: string } {
  // Sort all finished matches chronologically (oldest to newest)
  const sorted = [...(allMatches || [])]
    .filter((m) => !!m.finished)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (filter.mode === 'last5') {
    const current = sorted.slice(-5);
    const previous = sorted.length > 5 ? sorted.slice(Math.max(0, sorted.length - 10), sorted.length - 5) : [];
    return {
      currentMatches: current,
      previousMatches: previous,
      filterLabel: 'Últimos 5 Jogos'
    };
  }

  if (filter.mode === 'last10') {
    const current = sorted.slice(-10);
    const previous = sorted.length > 10 ? sorted.slice(Math.max(0, sorted.length - 20), sorted.length - 10) : [];
    return {
      currentMatches: current,
      previousMatches: previous,
      filterLabel: 'Últimos 10 Jogos'
    };
  }

  if (filter.mode === 'this_month') {
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const current = sorted.filter((m) => m.date && m.date.startsWith(currentYm));
    const previous = sorted.filter((m) => m.date && m.date.startsWith(prevYm));
    return {
      currentMatches: current,
      previousMatches: previous,
      filterLabel: 'Este Mês'
    };
  }

  if (filter.mode === 'month' && filter.month) {
    const [y, mth] = filter.month.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(mth, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const prevDate = new Date(parseInt(y, 10), parseInt(mth, 10) - 2, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const current = sorted.filter((m) => m.date && m.date.startsWith(filter.month!));
    const previous = sorted.filter((m) => m.date && m.date.startsWith(prevYm));
    return {
      currentMatches: current,
      previousMatches: previous,
      filterLabel: monthLabel
    };
  }

  if (filter.mode === 'opponent' && filter.opponent) {
    const current = sorted.filter((m) => (m.opponent || '').trim().toLowerCase() === filter.opponent!.trim().toLowerCase());
    return {
      currentMatches: current,
      previousMatches: [],
      filterLabel: `vs ${filter.opponent}`
    };
  }

  if (filter.mode === 'match' && filter.matchId) {
    const current = sorted.filter((m) => m.id === filter.matchId);
    return {
      currentMatches: current,
      previousMatches: [],
      filterLabel: current.length > 0 ? `Jogo vs ${current[0].opponent}` : 'Jogo Específico'
    };
  }

  // Default: Season filter
  const targetSeason = filter.season || currentSeason;
  let current = sorted;
  let label = 'Todas as Épocas';

  if (targetSeason && targetSeason !== 'todas' && targetSeason !== '') {
    current = sorted.filter((m) => isSeasonMatching(m.season, targetSeason));
    label = `Época ${targetSeason}`;
  }

  // If we have >= 4 matches in the season, split into current second half vs first half for period comparison
  let previous: Match[] = [];
  if (current.length >= 4) {
    const halfIndex = Math.floor(current.length / 2);
    previous = current.slice(0, halfIndex);
    // current is the most recent half
    // Note: for global statistics of the season, we analyze the entire season, but compare the recent half with previous half!
  }

  return {
    currentMatches: current,
    previousMatches: previous,
    filterLabel: label
  };
}

/**
 * Format delta string with mathematical precision
 */
function formatDeltaString(delta: number, prefix: string = '', suffix: string = ''): string {
  const sign = delta > 0 ? '+' : '';
  const numStr = (Math.round(delta * 10) / 10).toFixed(1).replace('.', ',');
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  return `${arrow} ${prefix}${sign}${numStr}${suffix} vs período anterior`;
}

/**
 * Computes the top 3 goal scorers and top 3 assist providers for a given set of matches
 */
/**
 * Computes the top 3 goal scorers and top 3 assist providers for a given set of matches.
 * Strictly limits and attributes statistics to active players currently present in the team squad (roster).
 */
export function computeTopScorersAndAssisters(
  matches: Match[],
  roster: Player[] = []
): { topScorers: CoachViewPlayerStat[]; topAssisters: CoachViewPlayerStat[] } {
  const scorerMap = new Map<string, number>();
  const assistMap = new Map<string, number>();

  // Filter to active squad members only (active !== false)
  const activeRoster = (roster || []).filter((p) => p && p.active !== false);

  // Map to resolve player IDs or player names to a canonical squad Player
  const playerLookup = new Map<string, Player>();
  activeRoster.forEach((p) => {
    playerLookup.set(p.id, p);
    if (p.name) {
      playerLookup.set(p.name.trim().toLowerCase(), p);
    }
    if (p.nickname) {
      playerLookup.set(p.nickname.trim().toLowerCase(), p);
    }
  });

  const resolvePlayer = (idOrName: string | null | undefined): Player | null => {
    if (!idOrName) return null;
    const clean = idOrName.trim();
    if (
      clean === 'autogolo' ||
      clean === 'auto_golo' ||
      clean === 'auto-golo' ||
      clean === 'none' ||
      clean === 'unknown'
    ) {
      return null;
    }
    // If activeRoster is empty (e.g. tests without roster), create a fallback pseudo-player
    if (activeRoster.length === 0) {
      return {
        id: clean,
        name: clean,
        number: null,
        positions: 'Jogador',
        birthDate: null,
        active: true
      };
    }
    return playerLookup.get(clean) || playerLookup.get(clean.toLowerCase()) || null;
  };

  (matches || []).forEach((m) => {
    (m.goals || []).forEach((g) => {
      if (g.type === 'scored') {
        const scorer = resolvePlayer(g.scorerId || (g as any).scorer);
        if (scorer) {
          scorerMap.set(scorer.id, (scorerMap.get(scorer.id) || 0) + 1);
        }

        const assister = resolvePlayer(g.assistId || (g as any).assist);
        if (assister) {
          assistMap.set(assister.id, (assistMap.get(assister.id) || 0) + 1);
        }
      }
    });
  });

  const getPlayerInfo = (id: string) => {
    const p = activeRoster.find((x) => x.id === id) || playerLookup.get(id);
    return {
      playerName: p ? (p.nickname || p.name) : id,
      playerNumber: p?.number ?? null,
      position: p?.positions || 'Jogador'
    };
  };

  const topScorers: CoachViewPlayerStat[] = Array.from(scorerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count], idx) => {
      const info = getPlayerInfo(id);
      return {
        playerId: id,
        playerName: info.playerName,
        playerNumber: info.playerNumber,
        position: info.position,
        count,
        rank: idx + 1
      };
    });

  const topAssisters: CoachViewPlayerStat[] = Array.from(assistMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count], idx) => {
      const info = getPlayerInfo(id);
      return {
        playerId: id,
        playerName: info.playerName,
        playerNumber: info.playerNumber,
        position: info.position,
        count,
        rank: idx + 1
      };
    });

  // Track matches played per player in the analyzed matches
  const matchesPlayedMap = new Map<string, number>();
  (matches || []).forEach((m) => {
    const playedInThisMatch = new Set<string>();
    (m.lineup || []).forEach((idOrName) => {
      const p = resolvePlayer(idOrName);
      if (p) playedInThisMatch.add(p.id);
    });
    (m.subs || []).forEach((sub) => {
      const idOrName = typeof sub === 'string' ? sub : (sub as any)?.playerId || (sub as any)?.name;
      const p = resolvePlayer(idOrName);
      if (p) playedInThisMatch.add(p.id);
    });
    (m.goals || []).forEach((g) => {
      const sp = resolvePlayer(g.scorerId || (g as any).scorer);
      if (sp) playedInThisMatch.add(sp.id);
      const ap = resolvePlayer(g.assistId || (g as any).assist);
      if (ap) playedInThisMatch.add(ap.id);
    });
    (m.cards || []).forEach((c) => {
      const cp = resolvePlayer(c.playerId || (c as any).player);
      if (cp) playedInThisMatch.add(cp.id);
    });

    playedInThisMatch.forEach((pId) => {
      matchesPlayedMap.set(pId, (matchesPlayedMap.get(pId) || 0) + 1);
    });
  });

  // Base list of players strictly belonging to the active squad
  const basePlayers: Player[] =
    activeRoster.length > 0
      ? activeRoster
      : Array.from(new Set([...scorerMap.keys(), ...assistMap.keys()])).map((id) => {
          const info = getPlayerInfo(id);
          return {
            id,
            name: info.playerName,
            number: info.playerNumber,
            positions: info.position,
            birthDate: null,
            active: true
          };
        });

  const allSquadStats: CoachViewPlayerFullStat[] = basePlayers.map((player) => {
    const goals = scorerMap.get(player.id) || 0;
    const assists = assistMap.get(player.id) || 0;
    const matchesPlayed = matchesPlayedMap.get(player.id) || 0;
    return {
      playerId: player.id,
      playerName: player.nickname ? `${player.name} (${player.nickname})` : player.name,
      playerNumber: player.number ?? null,
      position: player.positions || 'Jogador',
      photoUrl: player.photoUrl,
      status: player.status || 'disponivel',
      goals,
      assists,
      totalContributions: goals + assists,
      matchesPlayed,
      rankGoals: 0,
      rankAssists: 0
    };
  });

  // Assign ranks for goals
  const byGoals = [...allSquadStats].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName, 'pt-PT')
  );
  byGoals.forEach((p, idx) => {
    p.rankGoals = idx + 1;
  });

  // Assign ranks for assists
  const byAssists = [...allSquadStats].sort(
    (a, b) => b.assists - a.assists || b.goals - a.goals || a.playerName.localeCompare(b.playerName, 'pt-PT')
  );
  byAssists.forEach((p, idx) => {
    p.rankAssists = idx + 1;
  });

  return { topScorers, topAssisters, allSquadStats };
}

/**
 * Computes the complete Coach View summary model
 */
export function computeCoachViewData(
  allMatches: Match[],
  filter: CoachViewFilter,
  category: string = 'Sub-11',
  currentSeason: string = '',
  roster: Player[] = []
): CoachViewData {
  const { currentMatches, previousMatches, filterLabel } = filterMatchesForCoachView(
    allMatches,
    filter,
    currentSeason
  );

  const { topScorers, topAssisters, allSquadStats } = computeTopScorersAndAssisters(currentMatches, roster);

  const defaultHalfDuration = 30; // standard fallback

  // Run comprehensive analysis on current filtered set
  const analysis = computeGameAnalysis(
    currentMatches,
    {
      matchId: 'todos',
      month: 'todos',
      season: 'todas',
      opponent: 'todos',
      matchType: 'todos',
      location: 'todos',
      eventType: 'todos',
      halfDurationMinutes: defaultHalfDuration
    },
    category,
    roster
  );

  // Compute previous period stats if enough history
  const hasSufficientHistory = previousMatches.length >= 2;
  let prevAnalysis: AggregatedAnalysis | null = null;
  if (hasSufficientHistory) {
    prevAnalysis = computeGameAnalysis(
      previousMatches,
      {
        matchId: 'todos',
        month: 'todos',
        season: 'todas',
        opponent: 'todos',
        matchType: 'todos',
        location: 'todos',
        eventType: 'todos',
        halfDurationMinutes: defaultHalfDuration
      },
      category,
      roster
    );
  }

  const finishedCount = analysis.finishedMatchesCount;
  const wins = analysis.wins;
  const draws = analysis.draws;
  const losses = analysis.losses;
  const goalsScored = analysis.goalsScored;
  const goalsConceded = analysis.goalsConceded;
  const goalDiff = goalsScored - goalsConceded;

  // 1. INDICADOR 1: Golos por jogo
  const avgScored = finishedCount > 0 ? parseFloat((goalsScored / finishedCount).toFixed(1)) : 0;
  let scoredDeltaText = 'Sem histórico suficiente';
  let scoredDeltaStatus: DeltaStatus = 'insufficient';
  let scoredDeltaNum: number | null = null;

  if (hasSufficientHistory && prevAnalysis && prevAnalysis.finishedMatchesCount > 0) {
    const prevAvg = parseFloat((prevAnalysis.goalsScored / prevAnalysis.finishedMatchesCount).toFixed(1));
    scoredDeltaNum = parseFloat((avgScored - prevAvg).toFixed(1));
    scoredDeltaText = formatDeltaString(scoredDeltaNum);
    scoredDeltaStatus = scoredDeltaNum > 0 ? 'positive' : scoredDeltaNum < 0 ? 'negative' : 'neutral';
  }

  const goalsScoredIndicator: CoachViewIndicator = {
    id: 'goals_scored',
    label: 'Golos por Jogo',
    value: avgScored.toFixed(1).replace('.', ','),
    numericValue: avgScored,
    deltaText: scoredDeltaText,
    deltaStatus: scoredDeltaStatus,
    deltaNumeric: scoredDeltaNum,
    subtext: `${goalsScored} golos em ${finishedCount} jogos`,
    hasSufficientHistory,
    targetAnalysisTab: 'origem'
  };

  // 2. INDICADOR 2: Golos sofridos por jogo
  const avgConceded = finishedCount > 0 ? parseFloat((goalsConceded / finishedCount).toFixed(1)) : 0;
  let concededDeltaText = 'Sem histórico suficiente';
  let concededDeltaStatus: DeltaStatus = 'insufficient';
  let concededDeltaNum: number | null = null;

  if (hasSufficientHistory && prevAnalysis && prevAnalysis.finishedMatchesCount > 0) {
    const prevAvg = parseFloat((prevAnalysis.goalsConceded / prevAnalysis.finishedMatchesCount).toFixed(1));
    concededDeltaNum = parseFloat((avgConceded - prevAvg).toFixed(1));
    concededDeltaText = formatDeltaString(concededDeltaNum);
    // For conceded goals, a decrease is POSITIVE/green, an increase is NEGATIVE/rose
    concededDeltaStatus = concededDeltaNum < 0 ? 'positive' : concededDeltaNum > 0 ? 'negative' : 'neutral';
  }

  const goalsConcededIndicator: CoachViewIndicator = {
    id: 'goals_conceded',
    label: 'Golos Sofridos por Jogo',
    value: avgConceded.toFixed(1).replace('.', ','),
    numericValue: avgConceded,
    deltaText: concededDeltaText,
    deltaStatus: concededDeltaStatus,
    deltaNumeric: concededDeltaNum,
    subtext: `${goalsConceded} sofridos em ${finishedCount} jogos`,
    hasSufficientHistory,
    targetAnalysisTab: 'periodos'
  };

  // 3. INDICADOR 3: Taxa de vitória
  const winRate = analysis.winPercentage;
  let winRateDeltaText = 'Sem histórico suficiente';
  let winRateDeltaStatus: DeltaStatus = 'insufficient';
  let winRateDeltaNum: number | null = null;

  if (hasSufficientHistory && prevAnalysis && prevAnalysis.finishedMatchesCount > 0) {
    const prevWinRate = prevAnalysis.winPercentage;
    winRateDeltaNum = winRate - prevWinRate;
    const arrow = winRateDeltaNum > 0 ? '↑' : winRateDeltaNum < 0 ? '↓' : '→';
    const sign = winRateDeltaNum > 0 ? '+' : '';
    winRateDeltaText = `${arrow} ${sign}${winRateDeltaNum}% vs período anterior`;
    winRateDeltaStatus = winRateDeltaNum > 0 ? 'positive' : winRateDeltaNum < 0 ? 'negative' : 'neutral';
  }

  const winRateIndicator: CoachViewIndicator = {
    id: 'win_rate',
    label: 'Taxa de Vitória',
    value: `${winRate}%`,
    numericValue: winRate,
    deltaText: winRateDeltaText,
    deltaStatus: winRateDeltaStatus,
    deltaNumeric: winRateDeltaNum,
    subtext: `${wins} ${wins === 1 ? 'vitória' : 'vitórias'} / ${finishedCount} jogos`,
    hasSufficientHistory,
    targetAnalysisTab: 'confronto'
  };

  // 4. INDICADOR 4: Cantos por jogo (com distinção de não registado)
  let cornersAvgStr = '—';
  let cornersSubtext = 'Não registado nos jogos';
  let cornersDeltaText = 'Sem histórico suficiente';
  let cornersDeltaStatus: DeltaStatus = 'insufficient';
  let cornersNum: number | null = null;

  if (analysis.cornersForMatchesCount > 0 && analysis.cornersForAvg !== null) {
    cornersNum =
      typeof analysis.cornersForAvg === 'number' ? analysis.cornersForAvg : parseFloat(analysis.cornersForAvg);
    cornersAvgStr = cornersNum.toFixed(1).replace('.', ',');
    cornersSubtext = `em ${analysis.cornersForMatchesCount} jogos registados`;

    if (
      hasSufficientHistory &&
      prevAnalysis &&
      prevAnalysis.cornersForMatchesCount > 0 &&
      prevAnalysis.cornersForAvg !== null
    ) {
      const prevCorners =
        typeof prevAnalysis.cornersForAvg === 'number' ? prevAnalysis.cornersForAvg : parseFloat(prevAnalysis.cornersForAvg);
      const cornersDelta = parseFloat((cornersNum - prevCorners).toFixed(1));
      cornersDeltaText = formatDeltaString(cornersDelta);
      cornersDeltaStatus = cornersDelta > 0 ? 'positive' : cornersDelta < 0 ? 'negative' : 'neutral';
    }
  }

  const cornersIndicator: CoachViewIndicator = {
    id: 'corners',
    label: 'Cantos por Jogo',
    value: cornersAvgStr,
    numericValue: cornersNum,
    deltaText: cornersDeltaText,
    deltaStatus: cornersDeltaStatus,
    deltaNumeric: null,
    subtext: cornersSubtext,
    hasSufficientHistory: hasSufficientHistory && analysis.cornersForMatchesCount > 0,
    targetAnalysisTab: 'bolas_paradas'
  };

  // 5. INDICADOR 5: Minuto médio do primeiro golo
  const firstGoalMetric = analysis.firstGoalMetrics;
  let firstGoalMinStr = '—';
  let firstGoalSubtext = 'Sem golos registados';
  const scoredFirstRate =
    finishedCount > 0 ? Math.round((firstGoalMetric.scoredFirstCount / finishedCount) * 100) : 0;

  if (firstGoalMetric.firstGoalScoredAvgMin !== null) {
    firstGoalMinStr = `${firstGoalMetric.firstGoalScoredAvgMin}'`;
    firstGoalSubtext = `marcamos primeiro em ${scoredFirstRate}% dos jogos`;
  }

  const firstGoalMinuteIndicator: CoachViewIndicator = {
    id: 'first_goal_minute',
    label: 'Minuto Médio do 1.º Golo',
    value: firstGoalMinStr,
    numericValue: firstGoalMetric.firstGoalScoredAvgMin,
    deltaText:
      firstGoalMetric.scoredFirstCount > 0
        ? `1.º golo em ${firstGoalMetric.scoredFirstCount} de ${finishedCount} jogos`
        : 'Sem histórico de 1.º golo',
    deltaStatus: scoredFirstRate >= 50 ? 'positive' : 'neutral',
    deltaNumeric: null,
    subtext: firstGoalSubtext,
    hasSufficientHistory: finishedCount >= 2,
    targetAnalysisTab: 'periodos'
  };

  // 3️⃣ Últimos 5 Jogos (ordenados do mais recente para o mais antigo)
  const sortedDesc = [...currentMatches]
    .filter((m) => !!m.finished)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recent5 = sortedDesc.slice(0, 5);
  const recentMatches: CoachViewRecentMatch[] = recent5.map((m) => {
    const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
    const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
    let res: 'V' | 'E' | 'D' = 'E';
    let label = `🟡 Empate ${sc}–${co}`;
    let variant: 'emerald' | 'rose' | 'amber' = 'amber';

    if (sc > co) {
      res = 'V';
      label = `🟢 Vitória ${sc}–${co}`;
      variant = 'emerald';
    } else if (sc < co) {
      res = 'D';
      label = `🔴 Derrota ${sc}–${co}`;
      variant = 'rose';
    }

    const dateFormatted = m.date
      ? new Date(m.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
      : '';

    return {
      matchId: m.id,
      opponent: m.opponent || 'Adversário',
      date: m.date,
      formattedDate: dateFormatted,
      scored: sc,
      conceded: co,
      result: res,
      resultLabel: label,
      badgeVariant: variant
    };
  });

  // 4️⃣ Tendência da Equipa (últimos 5 a 10 jogos em ordem cronológica)
  const trendMatchesSource = [...recent5].reverse(); // oldest to newest of the last 5
  const scoredBars = trendMatchesSource.map((m) => (m.goals || []).filter((g) => g.type === 'scored').length);
  const concededBars = trendMatchesSource.map((m) => (m.goals || []).filter((g) => g.type === 'conceded').length);

  let trendStatus: 'improving' | 'declining' | 'stable' | 'insufficient' = 'insufficient';
  let trendStatusLabel = 'Dados insuficientes para identificar tendência';
  let trendStatusDescription = 'Registe pelo menos 3 jogos para visualizar a dinâmica da equipa.';

  if (trendMatchesSource.length >= 3) {
    const firstHalfGoals = scoredBars.slice(0, Math.floor(scoredBars.length / 2)).reduce((a, b) => a + b, 0);
    const secondHalfGoals = scoredBars.slice(Math.floor(scoredBars.length / 2)).reduce((a, b) => a + b, 0);
    const firstHalfConceded = concededBars.slice(0, Math.floor(concededBars.length / 2)).reduce((a, b) => a + b, 0);
    const secondHalfConceded = concededBars.slice(Math.floor(concededBars.length / 2)).reduce((a, b) => a + b, 0);

    const winCountLast = trendMatchesSource.filter((m) => {
      const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
      const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
      return sc > co;
    }).length;

    if (secondHalfGoals >= firstHalfGoals && secondHalfConceded <= firstHalfConceded && winCountLast >= 2) {
      trendStatus = 'improving';
      trendStatusLabel = '📈 Tendência Positiva';
      trendStatusDescription = 'A equipa está a aumentar a eficácia ofensiva e a manter consistência defensiva.';
    } else if (secondHalfConceded > firstHalfConceded && secondHalfGoals <= firstHalfGoals) {
      trendStatus = 'declining';
      trendStatusLabel = '⚠️ Oscilação Recente';
      trendStatusDescription = 'Aumento recente de golos sofridos nos últimos jogos. Requer atenção defensiva.';
    } else {
      trendStatus = 'stable';
      trendStatusLabel = '📊 Desempenho Estável';
      trendStatusDescription = 'Produção e segurança defensiva mantêm níveis regulares de rendimento.';
    }
  }

  const trend: CoachViewTrend = {
    matches: trendMatchesSource.map((m) => {
      const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
      const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
      const res: 'V' | 'E' | 'D' = sc > co ? 'V' : sc < co ? 'D' : 'E';
      return {
        matchId: m.id,
        opponent: m.opponent || 'Adversário',
        date: m.date,
        scored: sc,
        conceded: co,
        result: res
      };
    }),
    scoredBars,
    concededBars,
    status: trendStatus,
    statusLabel: trendStatusLabel,
    statusDescription: trendStatusDescription
  };

  // 5️⃣ Pontos Fortes (2 a 3 conclusões automáticas calculadas a partir de dados reais)
  const strengths: CoachViewStrength[] = [];

  // Ponto 1: Regularidade goleadora nos últimos jogos
  if (sortedDesc.length >= 3) {
    const sample = sortedDesc.slice(0, Math.min(10, sortedDesc.length));
    const scoredGames = sample.filter((m) => (m.goals || []).some((g) => g.type === 'scored')).length;
    if (scoredGames >= Math.ceil(sample.length * 0.7)) {
      strengths.push({
        id: 'scored_streak',
        title: 'Regularidade Ofensiva',
        text: `Marcamos em ${scoredGames} dos últimos ${sample.length} jogos.`,
        icon: '🔥',
        targetTab: 'origem'
      });
    }
  }

  // Ponto 2: Bola parada ofensiva
  const setPieceGoalCount = analysis.goalTypes
    .filter((gt) => gt.category === 'bola_parada')
    .reduce((acc, gt) => acc + gt.count, 0);
  const setPiecePct = goalsScored > 0 ? Math.round((setPieceGoalCount / goalsScored) * 100) : 0;
  if (setPiecePct >= 25 && setPieceGoalCount >= 2) {
    strengths.push({
      id: 'set_pieces_power',
      title: 'Eficácia em Bola Parada',
      text: `${setPiecePct}% dos nossos golos (${setPieceGoalCount}) surgem de bola parada.`,
      icon: '🔥',
      targetTab: 'bolas_paradas'
    });
  }

  // Ponto 3: Período mais produtivo
  if (analysis.timingWindows.mostScoredPeriod && analysis.timingWindows.mostScoredPeriod.count >= 2) {
    const period = analysis.timingWindows.mostScoredPeriod;
    const periodPct = goalsScored > 0 ? Math.round((period.count / goalsScored) * 100) : 0;
    strengths.push({
      id: 'productive_timing',
      title: 'Pressão no Momento Certo',
      text: `Marcamos mais golos no período ${period.label} (${period.count} golos, ${periodPct}% do total).`,
      icon: '🔥',
      targetTab: 'periodos'
    });
  }

  // Ponto 4: Eficácia ao marcar primeiro
  if (firstGoalMetric.scoredFirstCount >= 2 && firstGoalMetric.scoredFirstWinRate >= 60) {
    strengths.push({
      id: 'first_goal_strength',
      title: 'Gestão de Vantagem',
      text: `${firstGoalMetric.scoredFirstWinRate}% de vitórias quando marcamos primeiro (${firstGoalMetric.scoredFirstWinCount} de ${firstGoalMetric.scoredFirstCount} jogos).`,
      icon: '🔥',
      targetTab: 'confronto'
    });
  }

  // Fallback se poucos pontos
  if (strengths.length === 0 && finishedCount >= 2) {
    if (avgScored >= 1.5) {
      strengths.push({
        id: 'avg_scored_strength',
        title: 'Média de Golos',
        text: `Média ofensiva competitiva de ${avgScored.toFixed(1).replace('.', ',')} golos marcados por partida.`,
        icon: '🔥',
        targetTab: 'origem'
      });
    } else {
      strengths.push({
        id: 'base_strength',
        title: 'Estrutura da Equipa',
        text: `Equipa a construir ritmo competitivo com ${finishedCount} jogos analisados.`,
        icon: '🔥',
        targetTab: 'confronto'
      });
    }
  }

  // 6️⃣ Pontos de Atenção (conclusões objetivas da equipa sem criticar jogadores individuais)
  const areasOfAttention: CoachViewAttentionPoint[] = [];

  // Ponto 1: Golos sofridos na reta final (> 60' ou 2.º tempo)
  const lateConcededGoals = analysis.allEvents.filter(
    (ev) => ev.kind === 'golo_sofrido' && ev.absoluteMinute !== null && ev.absoluteMinute >= 60
  ).length;
  const lateConcededPct = goalsConceded > 0 ? Math.round((lateConcededGoals / goalsConceded) * 100) : 0;
  if (lateConcededPct >= 35 && lateConcededGoals >= 2) {
    areasOfAttention.push({
      id: 'late_conceded',
      title: 'Concentração na Reta Final',
      text: `${lateConcededPct}% dos golos sofridos (${lateConcededGoals} golos) acontecem depois dos 60'.`,
      icon: '⚠️',
      targetTab: 'periodos'
    });
  }

  // Ponto 2: Sofremos primeiro frequentemente
  if (firstGoalMetric.concededFirstCount >= 2) {
    const concededFirstRate = Math.round((firstGoalMetric.concededFirstCount / finishedCount) * 100);
    if (concededFirstRate >= 40) {
      areasOfAttention.push({
        id: 'conceded_first_warning',
        title: 'Entrada nos Jogos',
        text: `Sofremos primeiro em ${firstGoalMetric.concededFirstCount} dos ${finishedCount} jogos (${concededFirstRate}%).`,
        icon: '⚠️',
        targetTab: 'periodos'
      });
    }
  }

  // Ponto 3: Bolas paradas sofridas
  const concededSetPieceGoals = analysis.concededGoalTypes
    .filter((gt) => gt.category === 'bola_parada')
    .reduce((acc, gt) => acc + gt.count, 0);
  const concededSetPiecePct = goalsConceded > 0 ? Math.round((concededSetPieceGoals / goalsConceded) * 100) : 0;
  if (concededSetPiecePct >= 30 && concededSetPieceGoals >= 2) {
    areasOfAttention.push({
      id: 'conceded_set_pieces',
      title: 'Defesa de Bola Parada',
      text: `Sofremos ${concededSetPieceGoals} golos de bola parada (${concededSetPiecePct}% do total sofrido).`,
      icon: '⚠️',
      targetTab: 'bolas_paradas'
    });
  }

  // Ponto 4: Período de maior vulnerabilidade
  if (
    analysis.timingWindows.mostConcededPeriod &&
    analysis.timingWindows.mostConcededPeriod.count >= 2 &&
    areasOfAttention.length < 3
  ) {
    const period = analysis.timingWindows.mostConcededPeriod;
    const periodPct = goalsConceded > 0 ? Math.round((period.count / goalsConceded) * 100) : 0;
    areasOfAttention.push({
      id: 'vulnerable_period',
      title: 'Janela de Maior Vulnerabilidade',
      text: `Período com maior número de golos sofridos: ${period.label} (${period.count} golos, ${periodPct}%).`,
      icon: '⚠️',
      targetTab: 'periodos'
    });
  }

  // Fallback se sem alertas críticos
  if (areasOfAttention.length === 0 && finishedCount >= 2) {
    if (goalsConceded > 0) {
      areasOfAttention.push({
        id: 'solid_defense_maintenance',
        title: 'Manutenção de Foco',
        text: `Manter a consistência defensiva e transição rápida para evitar golos em contra-ataque.`,
        icon: '⚠️',
        targetTab: 'periodos'
      });
    } else {
      areasOfAttention.push({
        id: 'clean_sheet_focus',
        title: 'Consolidação',
        text: `Excelente registo defensivo. Foco em manter intensidade e eficácia nas bolas paradas.`,
        icon: '⚠️',
        targetTab: 'bolas_paradas'
      });
    }
  }

  // 7️⃣ Marcámos Primeiro (🎯 MARCÁMOS PRIMEIRO)
  const scoredFirstWinsCount = firstGoalMetric.scoredFirstWinCount;
  const scoredFirstMatchesCount = firstGoalMetric.scoredFirstCount;
  // Compute draws and losses when scored first
  let scoredFirstDrawsCount = 0;
  let scoredFirstLossesCount = 0;

  currentMatches.forEach((m) => {
    const scGoals = (m.goals || []).filter((g) => g.type === 'scored');
    const coGoals = (m.goals || []).filter((g) => g.type === 'conceded');
    let earliestSc: number | null = null;
    let earliestCo: number | null = null;

    scGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, defaultHalfDuration);
      if (t.absoluteMinute !== null && (earliestSc === null || t.absoluteMinute < earliestSc)) {
        earliestSc = t.absoluteMinute;
      }
    });

    coGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, defaultHalfDuration);
      if (t.absoluteMinute !== null && (earliestCo === null || t.absoluteMinute < earliestCo)) {
        earliestCo = t.absoluteMinute;
      }
    });

    if (earliestSc !== null && (earliestCo === null || earliestSc < earliestCo)) {
      if (scGoals.length === coGoals.length) scoredFirstDrawsCount++;
      else if (scGoals.length < coGoals.length) scoredFirstLossesCount++;
    }
  });

  const firstGoalStats: CoachViewFirstGoalStats = {
    scoredFirstRate,
    scoredFirstCount: scoredFirstMatchesCount,
    totalFinishedMatches: finishedCount,
    scoredFirstWins: scoredFirstWinsCount,
    scoredFirstDraws: scoredFirstDrawsCount,
    scoredFirstLosses: scoredFirstLossesCount,
    avgScoredFirstMinute: firstGoalMetric.firstGoalScoredAvgMin,
    hasSufficientData: finishedCount >= 2
  };

  // 8️⃣ Bola Parada (🚩 BOLA PARADA)
  let setPieceStatus: 'strength' | 'warning' | 'neutral' = 'neutral';
  let setPieceStatusLabel = '⚪ Equilibrado';

  if (setPieceGoalCount > concededSetPieceGoals && setPiecePct >= 25) {
    setPieceStatus = 'strength';
    setPieceStatusLabel = '🟢 Força da equipa';
  } else if (concededSetPieceGoals > setPieceGoalCount && concededSetPiecePct >= 30) {
    setPieceStatus = 'warning';
    setPieceStatusLabel = '🔴 Ponto de atenção';
  }

  const setPieces: CoachViewSetPieceStats = {
    scoredCount: setPieceGoalCount,
    scoredRate: setPiecePct,
    concededCount: concededSetPieceGoals,
    concededRate: concededSetPiecePct,
    status: setPieceStatus,
    statusLabel: setPieceStatusLabel,
    hasSufficientData: goalsScored > 0 || goalsConceded > 0
  };

  // 9️⃣ Momento do Jogo (⏱️ QUANDO MARCAMOS & ⚠️ QUANDO SOFREMOS)
  let mostScoredPeriodData: { label: string; count: number; percentage: number } | null = null;
  if (analysis.timingWindows.mostScoredPeriod && analysis.timingWindows.mostScoredPeriod.count > 0) {
    mostScoredPeriodData = {
      label: analysis.timingWindows.mostScoredPeriod.label,
      count: analysis.timingWindows.mostScoredPeriod.count,
      percentage: goalsScored > 0 ? Math.round((analysis.timingWindows.mostScoredPeriod.count / goalsScored) * 100) : 0
    };
  }

  let mostConcededPeriodData: { label: string; count: number; percentage: number } | null = null;
  if (analysis.timingWindows.mostConcededPeriod && analysis.timingWindows.mostConcededPeriod.count > 0) {
    mostConcededPeriodData = {
      label: analysis.timingWindows.mostConcededPeriod.label,
      count: analysis.timingWindows.mostConcededPeriod.count,
      percentage: goalsConceded > 0 ? Math.round((analysis.timingWindows.mostConcededPeriod.count / goalsConceded) * 100) : 0
    };
  }

  const timing: CoachViewTimingStats = {
    mostScoredPeriod: mostScoredPeriodData,
    mostConcededPeriod: mostConcededPeriodData,
    hasSufficientData: finishedCount >= 2
  };

  return {
    totalMatches: currentMatches.length,
    finishedMatchesCount: finishedCount,
    wins,
    draws,
    losses,
    recordText: `${wins}V - ${draws}E - ${losses}D`,
    goalsScoredTotal: goalsScored,
    goalsConcededTotal: goalsConceded,
    goalDifference: goalDiff,
    filterLabel,
    filter,
    indicators: {
      goalsScored: goalsScoredIndicator,
      goalsConceded: goalsConcededIndicator,
      winRate: winRateIndicator,
      corners: cornersIndicator,
      firstGoalMinute: firstGoalMinuteIndicator
    },
    recentMatches,
    trend,
    strengths: strengths.slice(0, 3),
    areasOfAttention: areasOfAttention.slice(0, 3),
    firstGoalStats,
    setPieces,
    timing,
    topScorers,
    topAssisters,
    allSquadStats,
    analysis
  };
}
