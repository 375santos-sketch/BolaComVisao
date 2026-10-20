import { Match } from '../../types';

export interface OutcomeGroupStats {
  matchCount: number;
  percentage: number;
  // Performance averages
  avgGoalsScored: number;
  avgGoalsConceded: number;
  // Corners & Fouls
  avgCornersFor: number | string | null;
  avgCornersAgainst: number | string | null;
  avgFoulsCommitted: number | string | null;
  avgFoulsSuffered: number | string | null;
  avgYellowCards: number;
  avgRedCards: number;
  // Key Behavioral Patterns
  scoredFirstCount: number;
  scoredFirstRate: number;
  concededFirstCount: number;
  concededFirstRate: number;
  concededAfter60Count: number; // Conceded in late game (>= 60m or >= 2/3 of match)
  concededAfter60Rate: number;
  concededSetPieceCount: number; // Conceded from corner, freekick, penalty
  concededSetPieceRate: number;
  scoredSetPieceCount: number;
  scoredSetPieceRate: number;
  cleanSheetCount: number;
  failedToScoreCount: number;
  // Sample of matches
  matches: Match[];
}

export interface SetPieceDetailedBreakdown {
  // Scored
  scoredCorner: number;
  scoredFreekick: number;
  scoredPenalty: number;
  scoredGoalKick: number;
  scoredTotal: number;
  scoredRate: number; // % of total scored goals
  // Conceded
  concededCorner: number;
  concededFreekick: number;
  concededPenalty: number;
  concededGoalKick: number;
  concededTotal: number;
  concededRate: number; // % of total conceded goals
  // Net Balance
  netBalance: number; // scoredTotal - concededTotal
  offensiveProductionIndex: 'Muito Alta' | 'Alta' | 'Equilibrada' | 'Baixa';
  defensiveVulnerabilityIndex: 'Risco Elevado' | 'Moderada' | 'Sólida' | 'Excelente';
}

export interface FirstGoalDetailedAnalysis {
  // Scored First
  scoredFirstMatches: number;
  scoredFirstWins: number;
  scoredFirstDraws: number;
  scoredFirstLosses: number;
  scoredFirstWinRate: number;
  scoredFirstDrawRate: number;
  scoredFirstLossRate: number;
  avgScoredFirstMinute: number | null;

  // Conceded First
  concededFirstMatches: number;
  concededFirstComebackWins: number;
  concededFirstComebackDraws: number;
  concededFirstLosses: number;
  concededFirstWinRate: number;
  concededFirstDrawRate: number;
  concededFirstLossRate: number;
  concededFirstComebackRate: number; // (wins + draws) / total conceded first
  avgConcededFirstMinute: number | null;

  // Goalless
  goallessMatches: number;
}

export interface CoachReportData {
  seasonLabel: string;
  periodLabel: string;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  // Attack
  goalsScored: number;
  avgGoalsScored: number;
  peakScoringPeriod: { label: string; count: number; percentage: number } | null;
  // Defense
  goalsConceded: number;
  avgGoalsConceded: number;
  peakVulnerabilityPeriod: { label: string; count: number; percentage: number } | null;
  cleanSheets: number;
  cleanSheetRate: number;
  // Set pieces
  setPieceScoredRate: number;
  setPieceConcededRate: number;
  setPieces: SetPieceDetailedBreakdown;
  // Discipline
  avgYellowCards: number;
  avgRedCards: number;
  avgCardsTotal: number;
  // First goal impact
  firstGoalImpact: FirstGoalDetailedAnalysis;
  // Outcome comparisons
  winsProfile: OutcomeGroupStats;
  drawsProfile: OutcomeGroupStats;
  lossesProfile: OutcomeGroupStats;
  // Key Conclusions (3 to 5 automated strategic bullets)
  keyConclusions: string[];
}
