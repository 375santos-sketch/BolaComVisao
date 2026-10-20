import { Match, GoalEvent } from '../../types';
import { AggregatedAnalysis, StandardGoalType } from './types';
import { normalizeEventTiming } from '../gameAnalysisUtils';
import {
  OutcomeGroupStats,
  SetPieceDetailedBreakdown,
  FirstGoalDetailedAnalysis,
  CoachReportData
} from './advancedTacticalTypes';

/**
 * Computes deep first goal metrics with win/draw/loss distribution
 * and comeback rates.
 */
export function computeDetailedFirstGoalImpact(
  matches: Match[],
  defaultHalfDuration: number
): FirstGoalDetailedAnalysis {
  let scoredFirstMatches = 0;
  let scoredFirstWins = 0;
  let scoredFirstDraws = 0;
  let scoredFirstLosses = 0;
  const scoredFirstMins: number[] = [];

  let concededFirstMatches = 0;
  let concededFirstComebackWins = 0;
  let concededFirstComebackDraws = 0;
  let concededFirstLosses = 0;
  const concededFirstMins: number[] = [];

  let goallessMatches = 0;

  const finishedMatches = matches.filter((m) => !!m.finished);

  finishedMatches.forEach((m) => {
    const halfDur = m.halfDurationMinutes || m.firstHalfDurationMinutes || defaultHalfDuration;
    const scoredGoals = (m.goals || []).filter((g) => g.type === 'scored');
    const concededGoals = (m.goals || []).filter((g) => g.type === 'conceded');

    let earliestScoredMin: number | null = null;
    let earliestConcededMin: number | null = null;

    scoredGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestScoredMin === null || t.absoluteMinute < earliestScoredMin) {
          earliestScoredMin = t.absoluteMinute;
        }
      }
    });

    concededGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestConcededMin === null || t.absoluteMinute < earliestConcededMin) {
          earliestConcededMin = t.absoluteMinute;
        }
      }
    });

    const isWin = scoredGoals.length > concededGoals.length;
    const isDraw = scoredGoals.length === concededGoals.length;
    const isLoss = scoredGoals.length < concededGoals.length;

    if (scoredGoals.length === 0 && concededGoals.length === 0) {
      goallessMatches++;
      return;
    }

    if (earliestScoredMin !== null && (earliestConcededMin === null || earliestScoredMin < earliestConcededMin)) {
      // Scored first
      scoredFirstMatches++;
      scoredFirstMins.push(earliestScoredMin);
      if (isWin) scoredFirstWins++;
      else if (isDraw) scoredFirstDraws++;
      else if (isLoss) scoredFirstLosses++;
    } else if (earliestConcededMin !== null && (earliestScoredMin === null || earliestConcededMin < earliestScoredMin)) {
      // Conceded first
      concededFirstMatches++;
      concededFirstMins.push(earliestConcededMin);
      if (isWin) concededFirstComebackWins++;
      else if (isDraw) concededFirstComebackDraws++;
      else if (isLoss) concededFirstLosses++;
    }
  });

  const avgScoredFirstMinute =
    scoredFirstMins.length > 0 ? Math.round(scoredFirstMins.reduce((a, b) => a + b, 0) / scoredFirstMins.length) : null;

  const avgConcededFirstMinute =
    concededFirstMins.length > 0
      ? Math.round(concededFirstMins.reduce((a, b) => a + b, 0) / concededFirstMins.length)
      : null;

  const scoredFirstWinRate = scoredFirstMatches > 0 ? Math.round((scoredFirstWins / scoredFirstMatches) * 100) : 0;
  const scoredFirstDrawRate = scoredFirstMatches > 0 ? Math.round((scoredFirstDraws / scoredFirstMatches) * 100) : 0;
  const scoredFirstLossRate = scoredFirstMatches > 0 ? Math.round((scoredFirstLosses / scoredFirstMatches) * 100) : 0;

  const concededFirstWinRate = concededFirstMatches > 0 ? Math.round((concededFirstComebackWins / concededFirstMatches) * 100) : 0;
  const concededFirstDrawRate = concededFirstMatches > 0 ? Math.round((concededFirstComebackDraws / concededFirstMatches) * 100) : 0;
  const concededFirstLossRate = concededFirstMatches > 0 ? Math.round((concededFirstLosses / concededFirstMatches) * 100) : 0;
  const concededFirstComebackRate =
    concededFirstMatches > 0
      ? Math.round(((concededFirstComebackWins + concededFirstComebackDraws) / concededFirstMatches) * 100)
      : 0;

  return {
    scoredFirstMatches,
    scoredFirstWins,
    scoredFirstDraws,
    scoredFirstLosses,
    scoredFirstWinRate,
    scoredFirstDrawRate,
    scoredFirstLossRate,
    avgScoredFirstMinute,

    concededFirstMatches,
    concededFirstComebackWins,
    concededFirstComebackDraws,
    concededFirstLosses,
    concededFirstWinRate,
    concededFirstDrawRate,
    concededFirstLossRate,
    concededFirstComebackRate,
    avgConcededFirstMinute,

    goallessMatches
  };
}

/**
 * Calculates outcome profile stats for a specific subgroup of matches (Wins, Draws, or Losses)
 */
export function computeOutcomeGroupProfile(
  matchesSubset: Match[],
  totalFinishedMatches: number,
  defaultHalfDuration: number
): OutcomeGroupStats {
  const matchCount = matchesSubset.length;
  const percentage = totalFinishedMatches > 0 ? Math.round((matchCount / totalFinishedMatches) * 100) : 0;

  if (matchCount === 0) {
    return {
      matchCount: 0,
      percentage: 0,
      avgGoalsScored: 0,
      avgGoalsConceded: 0,
      avgCornersFor: null,
      avgCornersAgainst: null,
      avgFoulsCommitted: null,
      avgFoulsSuffered: null,
      avgYellowCards: 0,
      avgRedCards: 0,
      scoredFirstCount: 0,
      scoredFirstRate: 0,
      concededFirstCount: 0,
      concededFirstRate: 0,
      concededAfter60Count: 0,
      concededAfter60Rate: 0,
      concededSetPieceCount: 0,
      concededSetPieceRate: 0,
      scoredSetPieceCount: 0,
      scoredSetPieceRate: 0,
      cleanSheetCount: 0,
      failedToScoreCount: 0,
      matches: []
    };
  }

  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;

  let totalCornersFor = 0;
  let cornersForMatches = 0;
  let totalCornersAgainst = 0;
  let cornersAgainstMatches = 0;

  let totalFoulsCommitted = 0;
  let foulsCommittedMatches = 0;
  let totalFoulsSuffered = 0;
  let foulsSufferedMatches = 0;

  let totalYellowCards = 0;
  let totalRedCards = 0;

  let scoredFirstCount = 0;
  let concededFirstCount = 0;
  let concededAfter60Count = 0;
  let concededSetPieceCount = 0;
  let scoredSetPieceCount = 0;
  let cleanSheetCount = 0;
  let failedToScoreCount = 0;

  matchesSubset.forEach((m) => {
    const halfDur = m.halfDurationMinutes || m.firstHalfDurationMinutes || defaultHalfDuration;
    const lateCutoffMinute = Math.round(((halfDur * 2) * 2) / 3 / 5) * 5; // e.g. 60 min for 90m

    const scGoals = (m.goals || []).filter((g) => g.type === 'scored');
    const coGoals = (m.goals || []).filter((g) => g.type === 'conceded');

    totalGoalsScored += scGoals.length;
    totalGoalsConceded += coGoals.length;

    if (coGoals.length === 0) cleanSheetCount++;
    if (scGoals.length === 0) failedToScoreCount++;

    // Corners
    if (m.cornersFor !== undefined && m.cornersFor !== null) {
      totalCornersFor += m.cornersFor;
      cornersForMatches++;
    }
    if (m.cornersAgainst !== undefined && m.cornersAgainst !== null) {
      totalCornersAgainst += m.cornersAgainst;
      cornersAgainstMatches++;
    }

    // Fouls
    if (m.foulsCommitted !== undefined && m.foulsCommitted !== null) {
      totalFoulsCommitted += m.foulsCommitted;
      foulsCommittedMatches++;
    }
    if (m.foulsSuffered !== undefined && m.foulsSuffered !== null) {
      totalFoulsSuffered += m.foulsSuffered;
      foulsSufferedMatches++;
    }

    // Cards
    (m.cards || []).forEach((c) => {
      const cardType = (c.color || '').toLowerCase();
      if (cardType.includes('vermelho') || cardType.includes('red')) {
        totalRedCards++;
      } else {
        totalYellowCards++;
      }
    });

    // Check first goal
    let earliestScored: number | null = null;
    let earliestConceded: number | null = null;

    let hasLateConceded = false;
    let hasSetPieceConceded = false;
    let hasSetPieceScored = false;

    scGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestScored === null || t.absoluteMinute < earliestScored) {
          earliestScored = t.absoluteMinute;
        }
      }
      const gt = g.goalType;
      if (gt === 'Canto' || gt === 'Livre' || gt === 'Penálti' || gt === 'Pontapé de baliza') {
        hasSetPieceScored = true;
      }
    });

    coGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestConceded === null || t.absoluteMinute < earliestConceded) {
          earliestConceded = t.absoluteMinute;
        }
        if (t.absoluteMinute >= lateCutoffMinute) {
          hasLateConceded = true;
        }
      }
      const gt = g.goalType;
      if (gt === 'Canto' || gt === 'Livre' || gt === 'Penálti' || gt === 'Pontapé de baliza') {
        hasSetPieceConceded = true;
      }
    });

    if (earliestScored !== null && (earliestConceded === null || earliestScored < earliestConceded)) {
      scoredFirstCount++;
    } else if (earliestConceded !== null && (earliestScored === null || earliestConceded < earliestScored)) {
      concededFirstCount++;
    }

    if (hasLateConceded) concededAfter60Count++;
    if (hasSetPieceConceded) concededSetPieceCount++;
    if (hasSetPieceScored) scoredSetPieceCount++;
  });

  return {
    matchCount,
    percentage,
    avgGoalsScored: parseFloat((totalGoalsScored / matchCount).toFixed(1)),
    avgGoalsConceded: parseFloat((totalGoalsConceded / matchCount).toFixed(1)),
    avgCornersFor:
      cornersForMatches > 0 ? parseFloat((totalCornersFor / cornersForMatches).toFixed(1)) : null,
    avgCornersAgainst:
      cornersAgainstMatches > 0 ? parseFloat((totalCornersAgainst / cornersAgainstMatches).toFixed(1)) : null,
    avgFoulsCommitted:
      foulsCommittedMatches > 0 ? parseFloat((totalFoulsCommitted / foulsCommittedMatches).toFixed(1)) : null,
    avgFoulsSuffered:
      foulsSufferedMatches > 0 ? parseFloat((totalFoulsSuffered / foulsSufferedMatches).toFixed(1)) : null,
    avgYellowCards: parseFloat((totalYellowCards / matchCount).toFixed(1)),
    avgRedCards: parseFloat((totalRedCards / matchCount).toFixed(1)),
    scoredFirstCount,
    scoredFirstRate: Math.round((scoredFirstCount / matchCount) * 100),
    concededFirstCount,
    concededFirstRate: Math.round((concededFirstCount / matchCount) * 100),
    concededAfter60Count,
    concededAfter60Rate: Math.round((concededAfter60Count / matchCount) * 100),
    concededSetPieceCount,
    concededSetPieceRate: Math.round((concededSetPieceCount / matchCount) * 100),
    scoredSetPieceCount,
    scoredSetPieceRate: Math.round((scoredSetPieceCount / matchCount) * 100),
    cleanSheetCount,
    failedToScoreCount,
    matches: matchesSubset
  };
}

/**
 * Computes dedicated Set Piece statistics (Scored vs Conceded across Corner, Freekick, Penalty)
 */
export function computeSetPieceDetailedBreakdown(
  goalTypes: AggregatedAnalysis['goalTypes'],
  concededGoalTypes: AggregatedAnalysis['concededGoalTypes'],
  totalGoalsScored: number,
  totalGoalsConceded: number
): SetPieceDetailedBreakdown {
  const getCount = (types: AggregatedAnalysis['goalTypes'], target: StandardGoalType) => {
    return types.find((t) => t.type === target)?.count || 0;
  };

  const scoredCorner = getCount(goalTypes, 'Canto');
  const scoredFreekick = getCount(goalTypes, 'Livre');
  const scoredPenalty = getCount(goalTypes, 'Penálti');
  const scoredGoalKick = getCount(goalTypes, 'Pontapé de baliza');
  const scoredTotal = scoredCorner + scoredFreekick + scoredPenalty + scoredGoalKick;
  const scoredRate = totalGoalsScored > 0 ? Math.round((scoredTotal / totalGoalsScored) * 100) : 0;

  const concededCorner = getCount(concededGoalTypes, 'Canto');
  const concededFreekick = getCount(concededGoalTypes, 'Livre');
  const concededPenalty = getCount(concededGoalTypes, 'Penálti');
  const concededGoalKick = getCount(concededGoalTypes, 'Pontapé de baliza');
  const concededTotal = concededCorner + concededFreekick + concededPenalty + concededGoalKick;
  const concededRate = totalGoalsConceded > 0 ? Math.round((concededTotal / totalGoalsConceded) * 100) : 0;

  const netBalance = scoredTotal - concededTotal;

  // Indices
  let offensiveProductionIndex: 'Muito Alta' | 'Alta' | 'Equilibrada' | 'Baixa' = 'Equilibrada';
  if (scoredRate >= 35 || scoredTotal >= 6) offensiveProductionIndex = 'Muito Alta';
  else if (scoredRate >= 20 || scoredTotal >= 3) offensiveProductionIndex = 'Alta';
  else if (scoredRate < 10) offensiveProductionIndex = 'Baixa';

  let defensiveVulnerabilityIndex: 'Risco Elevado' | 'Moderada' | 'Sólida' | 'Excelente' = 'Sólida';
  if (concededRate >= 35 && concededTotal >= 2) defensiveVulnerabilityIndex = 'Risco Elevado';
  else if (concededRate >= 20) defensiveVulnerabilityIndex = 'Moderada';
  else if (concededTotal === 0) defensiveVulnerabilityIndex = 'Excelente';

  return {
    scoredCorner,
    scoredFreekick,
    scoredPenalty,
    scoredGoalKick,
    scoredTotal,
    scoredRate,
    concededCorner,
    concededFreekick,
    concededPenalty,
    concededGoalKick,
    concededTotal,
    concededRate,
    netBalance,
    offensiveProductionIndex,
    defensiveVulnerabilityIndex
  };
}

/**
 * Builds the complete Coach Report (Relatório do Treinador)
 */
export function buildCoachReport(
  analysis: AggregatedAnalysis,
  matches: Match[],
  season: string,
  category: string
): CoachReportData {
  const {
    filteredMatches,
    finishedMatchesCount,
    wins,
    draws,
    losses,
    winPercentage,
    goalsScored,
    goalsConceded,
    avgGoalsScored,
    avgGoalsConceded,
    cleanSheets,
    cardsPerMatchAvg,
    timingWindows,
    configuredHalfDuration,
    goalTypes,
    concededGoalTypes
  } = analysis;

  const finishedMatches = filteredMatches.filter((m) => !!m.finished);
  const winMatches = finishedMatches.filter((m) => {
    const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
    const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
    return sc > co;
  });
  const drawMatches = finishedMatches.filter((m) => {
    const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
    const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
    return sc === co;
  });
  const lossMatches = finishedMatches.filter((m) => {
    const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
    const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
    return sc < co;
  });

  const firstGoalImpact = computeDetailedFirstGoalImpact(filteredMatches, configuredHalfDuration);
  const winsProfile = computeOutcomeGroupProfile(winMatches, finishedMatchesCount, configuredHalfDuration);
  const drawsProfile = computeOutcomeGroupProfile(drawMatches, finishedMatchesCount, configuredHalfDuration);
  const lossesProfile = computeOutcomeGroupProfile(lossMatches, finishedMatchesCount, configuredHalfDuration);

  const setPieces = computeSetPieceDetailedBreakdown(
    goalTypes,
    concededGoalTypes,
    goalsScored,
    goalsConceded
  );

  // Peak timing windows with percentage
  let peakScoringPeriod: { label: string; count: number; percentage: number } | null = null;
  if (timingWindows.mostScoredPeriod && timingWindows.mostScoredPeriod.count > 0) {
    peakScoringPeriod = {
      label: timingWindows.mostScoredPeriod.label,
      count: timingWindows.mostScoredPeriod.count,
      percentage: goalsScored > 0 ? Math.round((timingWindows.mostScoredPeriod.count / goalsScored) * 100) : 0
    };
  }

  let peakVulnerabilityPeriod: { label: string; count: number; percentage: number } | null = null;
  if (timingWindows.mostConcededPeriod && timingWindows.mostConcededPeriod.count > 0) {
    peakVulnerabilityPeriod = {
      label: timingWindows.mostConcededPeriod.label,
      count: timingWindows.mostConcededPeriod.count,
      percentage: goalsConceded > 0 ? Math.round((timingWindows.mostConcededPeriod.count / goalsConceded) * 100) : 0
    };
  }

  // Generate 3 to 5 automated strategic conclusions based on patterns
  const keyConclusions: string[] = [];

  // Conclusion 1: First goal conversion impact
  if (firstGoalImpact.scoredFirstMatches >= 2) {
    keyConclusions.push(
      `🎯 Impacto do 1.º Golo: A equipa venceu ${firstGoalImpact.scoredFirstWinRate}% dos jogos em que marcou primeiro (${firstGoalImpact.scoredFirstWins} vitórias em ${firstGoalImpact.scoredFirstMatches} jogos).`
    );
  } else if (finishedMatchesCount > 0 && winPercentage >= 60) {
    keyConclusions.push(
      `🏆 Alto Rendimento: Aproveitamento global de ${winPercentage}% com média de ${avgGoalsScored} golos marcados por jogo.`
    );
  }

  // Conclusion 2: Set piece tactical profile
  if (setPieces.scoredRate >= 25) {
    keyConclusions.push(
      `🚩 Arma Ofensiva: ${setPieces.scoredRate}% dos golos da equipa (${setPieces.scoredTotal} golos) surgiram de bolas paradas (cantos/livres/penáltis).`
    );
  } else if (setPieces.concededRate >= 30 && setPieces.concededTotal >= 2) {
    keyConclusions.push(
      `⚠️ Vulnerabilidade em Bola Parada: ${setPieces.concededRate}% dos golos sofridos (${setPieces.concededTotal} golos) nasceram de bolas paradas adversárias.`
    );
  }

  // Conclusion 3: Loss pattern analysis (Como perdemos)
  if (lossMatches.length > 0) {
    const lossCount = lossMatches.length;
    const parts: string[] = [];
    if (lossesProfile.concededFirstCount > 0) {
      parts.push(`${lossesProfile.concededFirstCount} sofreram primeiro`);
    }
    if (lossesProfile.concededAfter60Count > 0) {
      parts.push(`${lossesProfile.concededAfter60Count} sofreram após os 60'`);
    }
    if (lossesProfile.concededSetPieceCount > 0) {
      parts.push(`${lossesProfile.concededSetPieceCount} sofreram de bola parada`);
    }

    if (parts.length > 0) {
      keyConclusions.push(
        `🔍 Padrão nas Derrotas: Nas ${lossCount} derrotas registadas, em ${parts.join(', em ')}.`
      );
    }
  }

  // Conclusion 4: Timing & Late game rhythm
  if (peakScoringPeriod && peakScoringPeriod.percentage >= 25) {
    keyConclusions.push(
      `⏱️ Janela de Maior Eficácia: O período ${peakScoringPeriod.label} concentra ${peakScoringPeriod.percentage}% de toda a produção ofensiva (${peakScoringPeriod.count} golos).`
    );
  } else if (peakVulnerabilityPeriod && peakVulnerabilityPeriod.percentage >= 30) {
    keyConclusions.push(
      `🛡️ Alerta de Concentração: Maior volume de golos sofridos no intervalo ${peakVulnerabilityPeriod.label} (${peakVulnerabilityPeriod.percentage}% do total sofrido).`
    );
  }

  // Conclusion 5: Defensive resilience / Clean sheets
  if (cleanSheets > 0 && finishedMatchesCount >= 3) {
    const csPct = Math.round((cleanSheets / finishedMatchesCount) * 100);
    if (csPct >= 30) {
      keyConclusions.push(
        `🧤 Solidez Defensiva: Baliza inviolada em ${csPct}% das partidas (${cleanSheets} clean sheets em ${finishedMatchesCount} jogos).`
      );
    }
  }

  // Fallback if less than 3
  if (keyConclusions.length < 3) {
    keyConclusions.push(
      `📈 Equilíbrio Competitivo: Saldo global de golos de ${goalsScored - goalsConceded >= 0 ? '+' : ''}${goalsScored - goalsConceded} (${avgGoalsScored} marcados vs ${avgGoalsConceded} sofridos por jogo).`
    );
  }

  return {
    seasonLabel: season && season !== 'todas' ? `Época ${season}` : 'Todas as Épocas',
    periodLabel: category ? `${category}` : 'Geral',
    totalMatches: finishedMatchesCount,
    wins,
    draws,
    losses,
    winRate: winPercentage,
    goalsScored,
    avgGoalsScored,
    peakScoringPeriod,
    goalsConceded,
    avgGoalsConceded,
    peakVulnerabilityPeriod,
    cleanSheets,
    cleanSheetRate: finishedMatchesCount > 0 ? Math.round((cleanSheets / finishedMatchesCount) * 100) : 0,
    setPieceScoredRate: setPieces.scoredRate,
    setPieceConcededRate: setPieces.concededRate,
    setPieces,
    avgYellowCards: analysis.yellowCardsTotal > 0 && finishedMatchesCount > 0 ? parseFloat((analysis.yellowCardsTotal / finishedMatchesCount).toFixed(1)) : 0,
    avgRedCards: analysis.redCardsTotal > 0 && finishedMatchesCount > 0 ? parseFloat((analysis.redCardsTotal / finishedMatchesCount).toFixed(1)) : 0,
    avgCardsTotal: cardsPerMatchAvg,
    firstGoalImpact,
    winsProfile,
    drawsProfile,
    lossesProfile,
    keyConclusions: keyConclusions.slice(0, 5)
  };
}
