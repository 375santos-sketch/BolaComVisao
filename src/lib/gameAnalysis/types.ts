import { Match, GoalEvent, MatchType, MatchLocation } from '../../types';

export type StandardGoalType =
  | 'Bola jogada'
  | 'Recuperação de bola'
  | 'Canto'
  | 'Livre'
  | 'Penálti'
  | 'Pontapé de baliza'
  | 'Ressalto'
  | 'Outro';

export type GoalOriginCategory = 'bola_corrida' | 'bola_parada' | 'outro';

export type InsightType =
  | 'strength'     // 🔥 Ponto forte
  | 'warning'      // ⚠️ Alerta
  | 'trend'        // 📈 Tendência
  | 'efficiency'   // 🎯 Eficácia
  | 'set_piece'    // 🚩 Bola parada
  | 'opportunity'  // 💡 Oportunidade
  | 'milestone';   // 🏆 Destaque

export interface GameAnalysisInsight {
  id: string;
  type: InsightType;
  icon: string;
  badgeText: string;
  title: string;
  description: string;
  stat?: string;
  category: 'attack' | 'defense' | 'timing' | 'set_pieces' | 'discipline' | 'form';
  impact: 'positive' | 'warning' | 'neutral' | 'highlight';
}

export type EventTypeFilter =
  | 'todos'
  | 'golos'
  | 'golos_canto'
  | 'golos_livre'
  | 'golos_penalti'
  | 'golos_bola_jogada'
  | 'golos_recuperacao'
  | 'golos_ressalto'
  | 'golos_pontape_baliza'
  | 'golos_sofridos'
  | 'cantos'
  | 'faltas_cometidas'
  | 'faltas_sofridas'
  | 'amarelos'
  | 'vermelhos'
  | 'substituicoes';

export type TimePeriodKey =
  | '0-5'
  | '6-10'
  | '11-15'
  | '16-20'
  | '21-25'
  | '26-30'
  | '31-35'
  | '36-40'
  | '41-45'
  | '46-50'
  | '51-55'
  | '56-60'
  | '61-75'
  | '76-90'
  | '60+'
  | '90+'
  | string;

export interface TimePeriodStat {
  key: string;
  label: string;
  half: 1 | 2 | 'extra';
  startMin: number;
  endMin: number;
  scored: number;
  conceded: number;
  scoredEvents: { match: Match; goal: GoalEvent }[];
  concededEvents: { match: Match; goal: GoalEvent }[];
}

export interface GoalTypeStat {
  type: StandardGoalType;
  category: GoalOriginCategory;
  count: number;
  percentage: number;
  events: { match: Match; goal: GoalEvent }[];
}

export interface GoalOriginBreakdown {
  openPlayCount: number; // Bola corrida
  openPlayPercentage: number;
  setPieceCount: number; // Bola parada
  setPiecePercentage: number;
  otherCount: number;
  otherPercentage: number;
}

export interface FirstGoalMetrics {
  firstGoalScoredAvgMin: number | null;
  firstGoalScoredMatchesCount: number;
  firstGoalConcededAvgMin: number | null;
  firstGoalConcededMatchesCount: number;
  scoredFirstCount: number;
  scoredFirstWinCount: number;
  scoredFirstWinRate: number;
  concededFirstCount: number;
  concededFirstComebackWins: number;
  goallessDrawsCount: number;
}

export interface BestTimingWindows {
  mostScoredPeriod: { periodKey: string; label: string; count: number } | null;
  mostConcededPeriod: { periodKey: string; label: string; count: number } | null;
  safestPeriod: { periodKey: string; label: string; matchesCount: number } | null;
}

export interface NormalizedEventTiming {
  rawMinute: number | string | null;
  displayMinute: string;
  absoluteMinute: number | null;
  period: '1ª Parte' | '2ª Parte' | 'Prolongamento' | 'Intervalo' | 'Desconhecido';
  half: 1 | 2 | 'extra' | null;
  stoppageMinutes: number;
}

export interface EventFilterMetrics {
  activeFilter: EventTypeFilter;
  filterLabel: string;
  isFiltered: boolean;
  totalOccurrences: number;
  avgMinute: number | null;
  firstOccurrenceMinuteAvg: number | null;
  matchesWithOccurrencesCount: number;
  totalMatchesAnalyzed: number;
  matchOccurrenceRate: number;
  avgPerMatch: number;
  topPlayerOccurrences: { playerId: string; count: number }[];
  mostFrequentPeriod: { periodKey: string; label: string; count: number } | null;
  periodDistribution: { periodKey: string; label: string; count: number; percentage: number }[];
}

export interface OpponentComparisonStat {
  opponent: string;
  matchesCount: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  cornersFor: number;
  cornersAgainst: number;
  foulsCommitted: number;
  foulsSuffered: number;
  yellowCards: number;
  redCards: number;
  last5Matches: {
    matchId: string;
    date: string;
    type: MatchType;
    location: MatchLocation;
    scored: number;
    conceded: number;
    result: 'V' | 'E' | 'D';
  }[];
}

export interface AnalysisFilters {
  matchId: string; // 'todos' or match.id
  month: string; // 'todos' or 'YYYY-MM'
  season: string; // 'todas' or season string
  opponent: string; // 'todos' or opponent name
  matchType: MatchType | 'todos';
  location: MatchLocation | 'todos';
  eventType: EventTypeFilter;
  halfDurationMinutes?: number; // Configurable duration per half (e.g. 25, 30, 35, 40, 45)
  searchQuery?: string;
}

export interface AggregatedAnalysis {
  filteredMatches: Match[];
  totalMatches: number;
  finishedMatchesCount: number;

  // Active Event Type Filter applied & dedicated filter stats (Item 1)
  activeEventType: EventTypeFilter;
  eventTypeLabel: string;
  filterMetrics: EventFilterMetrics;
  
  // Results
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number;
  drawPercentage: number;
  lossPercentage: number;

  // Goals
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  avgMinuteScored: number | null; // Item 9: ⏱️ Média do minuto dos golos
  avgMinuteConceded: number | null; // Item 9: ⏱️ Média do minuto sofrido
  unclassifiedGoalsCount: number; // Item 5: Golos sem tipo identificado
  cleanSheets: number;
  failedToScore: number;

  // Location breakdown
  homeMatches: number;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  homeGoalsScored: number;
  homeGoalsConceded: number;

  // Away matches
  awayMatches: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  awayGoalsScored: number;
  awayGoalsConceded: number;

  // Corners (Item 6: separation of 0 from unrecorded)
  cornersForTotal: number;
  cornersForMatchesCount: number;
  cornersForAvg: number | string | null;
  cornersAgainstTotal: number;
  cornersAgainstMatchesCount: number;
  cornersAgainstAvg: number | string | null;

  // Fouls & Cards (Item 6: separation of 0 from unrecorded)
  foulsCommittedTotal: number;
  foulsCommittedMatchesCount: number;
  foulsCommittedAvg: number | string | null;
  foulsSufferedTotal: number;
  foulsSufferedMatchesCount: number;
  foulsSufferedAvg: number | string | null;

  yellowCardsTotal: number;
  redCardsTotal: number;
  cardsPerMatchAvg: number;
  cardsMatchesCount: number;

  // First goal metrics (Item 5 & 9)
  firstGoalMetrics: FirstGoalMetrics;

  // Best/Worst timing windows (Item 6 & 8 & 9)
  timingWindows: BestTimingWindows;

  // Set piece vs Open play breakdown (Item 7)
  scoredOriginBreakdown: GoalOriginBreakdown;
  concededOriginBreakdown: GoalOriginBreakdown;

  // Dynamic time periods based on category duration (Item 2, 3, 8)
  configuredHalfDuration: number;
  timePeriods: Record<string, TimePeriodStat>;
  timePeriodList: TimePeriodStat[];

  // Goal types / origins (Item 8 & 9)
  goalTypes: GoalTypeStat[];
  concededGoalTypes: GoalTypeStat[];

  // Top individuals in filtered selection
  topScorers: { playerId: string; count: number; assistsCount: number }[];
  topAssisters: { playerId: string; count: number }[];
  cardedPlayers: { playerId: string; yellow: number; red: number }[];

  // Opponents comparisons
  opponentStats: OpponentComparisonStat[];

  // Automatic Decision Insights ("O que os dados nos dizem")
  insights: GameAnalysisInsight[];

  // All drill-down events (Item 1 & 7)
  allEvents: {
    id: string;
    kind: 'golo_marcado' | 'golo_sofrido' | 'cartao' | 'sub' | 'falta' | 'canto';
    match: Match;
    minute: number | string | null;
    displayMinute: string;
    absoluteMinute: number | null;
    period?: string;
    half?: 1 | 2 | 'extra' | null;
    playerPrimaryId?: string | null;
    playerSecondaryId?: string | null;
    detail: string;
    notes?: string;
    goalType?: StandardGoalType;
    originCategory?: GoalOriginCategory;
    cardColor?: 'Amarelo' | 'Vermelho';
    orderNum: number;
  }[];
}
