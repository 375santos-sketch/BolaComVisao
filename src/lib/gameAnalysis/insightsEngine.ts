import {
  GameAnalysisInsight,
  TimePeriodStat,
  GoalTypeStat,
  GoalOriginBreakdown,
  FirstGoalMetrics,
  BestTimingWindows
} from './types';
import { Match, GoalEvent } from '../../types';
import { normalizeEventTiming } from '../gameAnalysisUtils';

interface InsightEngineInput {
  filteredMatches: Match[];
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number;
  cleanSheets: number;
  configuredHalfDuration: number;
  timePeriodList: TimePeriodStat[];
  firstGoalMetrics: FirstGoalMetrics;
  timingWindows: BestTimingWindows;
  scoredOriginBreakdown: GoalOriginBreakdown;
  concededOriginBreakdown: GoalOriginBreakdown;
  goalTypes: GoalTypeStat[];
  concededGoalTypes: GoalTypeStat[];
  cornersForTotal: number;
  cornersForAvg: number | string | null;
  cornersAgainstTotal: number;
  cornersAgainstAvg: number | string | null;
  foulsCommittedTotal: number;
  foulsCommittedAvg: number | string | null;
  foulsSufferedTotal: number;
  foulsSufferedAvg: number | string | null;
  yellowCardsTotal: number;
  redCardsTotal: number;
  cardsPerMatchAvg: number;
}

/**
 * Generates automated, actionable insights ("O que os dados nos dizem")
 * turning raw stats into strategic coaching decisions:
 * - 🔥 PONTO FORTE (ex: 35% dos golos foram marcados através de bola parada)
 * - ⚠️ ALERTA (ex: 44% dos golos sofridos aconteceram depois dos 60')
 * - 📈 TENDÊNCIA (ex: A equipa marcou em 8 dos últimos 10 jogos)
 * - 🎯 EFICÁCIA (ex: Marcámos primeiro em 7 dos últimos 10 jogos, ou 83% vitória)
 */
export function generateGameAnalysisInsights(input: InsightEngineInput): GameAnalysisInsight[] {
  const {
    filteredMatches,
    goalsScored,
    goalsConceded,
    cleanSheets,
    configuredHalfDuration,
    timePeriodList,
    firstGoalMetrics,
    timingWindows,
    scoredOriginBreakdown,
    concededOriginBreakdown,
    goalTypes,
    concededGoalTypes: _concededGoalTypes,
    cornersForTotal,
    cornersForAvg,
    cornersAgainstTotal,
    cornersAgainstAvg
  } = input;

  if (filteredMatches.length === 0) {
    return [
      {
        id: 'no-matches',
        type: 'trend',
        icon: 'ℹ️',
        badgeText: 'Sem Dados',
        title: 'Sem jogos registados',
        description: 'Selecione ou registe jogos para gerar insights automáticos da equipa.',
        category: 'form',
        impact: 'neutral'
      }
    ];
  }

  const insights: GameAnalysisInsight[] = [];

  // Sort matches chronologically (oldest to newest) to calculate recent form trends
  const sortedMatches = [...filteredMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Recent 10 matches sample (or all if less)
  const recent10 = sortedMatches.slice(-10);
  const recent10Count = recent10.length;

  // Count matches in recent 10 where team scored
  let recent10ScoredCount = 0;
  let recent10ScoredFirstCount = 0;

  recent10.forEach((m) => {
    const halfDur = m.halfDurationMinutes || m.firstHalfDurationMinutes || configuredHalfDuration;
    const scGoals = (m.goals || []).filter((g) => g.type === 'scored');
    const coGoals = (m.goals || []).filter((g) => g.type === 'conceded');

    if (scGoals.length > 0) {
      recent10ScoredCount++;
    }

    let earliestScored: number | null = null;
    let earliestConceded: number | null = null;

    scGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestScored === null || t.absoluteMinute < earliestScored) earliestScored = t.absoluteMinute;
      }
    });

    coGoals.forEach((g) => {
      const t = normalizeEventTiming(g.minute, g.half, g.period, halfDur);
      if (t.absoluteMinute !== null) {
        if (earliestConceded === null || t.absoluteMinute < earliestConceded) earliestConceded = t.absoluteMinute;
      }
    });

    if (earliestScored !== null && (earliestConceded === null || earliestScored < earliestConceded)) {
      recent10ScoredFirstCount++;
    }
  });

  // Calculate late-game cutoff minute based on match duration (e.g. 60' for 90m, 40' for 60m, 35' for 50m)
  const totalMatchMinutes = configuredHalfDuration * 2;
  const lateCutoffMinute = Math.round((totalMatchMinutes * 2) / 3 / 5) * 5;

  let lateConcededCount = 0;
  timePeriodList.forEach((p) => {
    if (p.startMin >= lateCutoffMinute) {
      lateConcededCount += p.conceded;
    }
  });

  // ---------------------------------------------------------------------------
  // 1. 🔥 PONTO FORTE (Bolas Paradas, Cantos, Recuperações, Ataque Apoiado)
  // ---------------------------------------------------------------------------
  if (scoredOriginBreakdown.setPieceCount > 0 && goalsScored >= 2 && scoredOriginBreakdown.setPiecePercentage >= 25) {
    insights.push({
      id: 'strength-set-pieces',
      type: 'strength',
      icon: '🔥',
      badgeText: 'Ponto forte',
      title: 'Letalidade em Bola Parada',
      description: `${scoredOriginBreakdown.setPiecePercentage}% dos golos foram marcados através de bola parada (${scoredOriginBreakdown.setPieceCount} de ${goalsScored} golos).`,
      stat: `${scoredOriginBreakdown.setPiecePercentage}%`,
      category: 'set_pieces',
      impact: 'positive'
    });
  } else {
    const cornerScored = goalTypes.find((g) => g.type === 'Canto');
    const recoveryScored = goalTypes.find((g) => g.type === 'Recuperação de bola');
    const openPlayScored = goalTypes.find((g) => g.type === 'Bola jogada');

    if (cornerScored && cornerScored.count >= 2 && cornerScored.percentage >= 20) {
      insights.push({
        id: 'strength-corners',
        type: 'strength',
        icon: '🔥',
        badgeText: 'Ponto forte',
        title: 'Eficácia em Cantos',
        description: `${cornerScored.percentage}% dos golos foram marcados através de cantos (${cornerScored.count} de ${goalsScored}).`,
        stat: `${cornerScored.percentage}%`,
        category: 'set_pieces',
        impact: 'positive'
      });
    } else if (recoveryScored && recoveryScored.count >= 2 && recoveryScored.percentage >= 20) {
      insights.push({
        id: 'strength-recovery',
        type: 'strength',
        icon: '⚡',
        badgeText: 'Ponto forte',
        title: 'Pressão Alta & Transição',
        description: `${recoveryScored.percentage}% dos golos surgiram de recuperação de bola (${recoveryScored.count} golos).`,
        stat: `${recoveryScored.percentage}%`,
        category: 'attack',
        impact: 'positive'
      });
    } else if (openPlayScored && openPlayScored.percentage >= 60 && goalsScored >= 3) {
      insights.push({
        id: 'strength-open-play',
        type: 'strength',
        icon: '🔥',
        badgeText: 'Ponto forte',
        title: 'Construção Ofensiva',
        description: `${openPlayScored.percentage}% dos golos resultam de lances de bola corrida (${openPlayScored.count} de ${goalsScored}).`,
        stat: `${openPlayScored.percentage}%`,
        category: 'attack',
        impact: 'positive'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. ⚠️ ALERTA (Golos sofridos nos últimos minutos, Bola parada sofrida, Entradas frias)
  // ---------------------------------------------------------------------------
  if (goalsConceded >= 2 && lateConcededCount > 0) {
    const latePct = Math.round((lateConcededCount / goalsConceded) * 100);
    if (latePct >= 35) {
      insights.push({
        id: 'warning-late-goals',
        type: 'warning',
        icon: '⚠️',
        badgeText: 'Alerta',
        title: 'Vulnerabilidade na Reta Final',
        description: `${latePct}% dos golos sofridos (${lateConcededCount} de ${goalsConceded}) aconteceram depois dos ${lateCutoffMinute}'.`,
        stat: `${latePct}%`,
        category: 'defense',
        impact: 'warning'
      });
    }
  }

  if (goalsConceded >= 2 && concededOriginBreakdown.setPiecePercentage >= 35 && concededOriginBreakdown.setPieceCount >= 2) {
    insights.push({
      id: 'warning-conceded-set-pieces',
      type: 'warning',
      icon: '⚠️',
      badgeText: 'Alerta',
      title: 'Vulnerabilidade em Bola Parada',
      description: `${concededOriginBreakdown.setPiecePercentage}% dos golos sofridos (${concededOriginBreakdown.setPieceCount} de ${goalsConceded}) nasceram de bolas paradas.`,
      stat: `${concededOriginBreakdown.setPiecePercentage}%`,
      category: 'defense',
      impact: 'warning'
    });
  }

  // ---------------------------------------------------------------------------
  // 3. 📈 TENDÊNCIA (Regularidade de golos nos últimos jogos)
  // ---------------------------------------------------------------------------
  if (recent10Count >= 4) {
    if (recent10ScoredCount >= Math.ceil(recent10Count * 0.7)) {
      insights.push({
        id: 'trend-recent-scoring',
        type: 'trend',
        icon: '📈',
        badgeText: 'Tendência',
        title: 'Consistência Ofensiva',
        description: `A equipa marcou em ${recent10ScoredCount} dos últimos ${recent10Count} jogos.`,
        stat: `${recent10ScoredCount}/${recent10Count}`,
        category: 'form',
        impact: 'positive'
      });
    } else {
      // Half time comparison trend
      const firstHalfScored = timePeriodList.filter((p) => p.half === 1).reduce((acc, p) => acc + p.scored, 0);
      const secondHalfScored = timePeriodList.filter((p) => p.half === 2).reduce((acc, p) => acc + p.scored, 0);
      if (secondHalfScored > firstHalfScored && goalsScored >= 3) {
        insights.push({
          id: 'trend-second-half-attack',
          type: 'trend',
          icon: '📈',
          badgeText: 'Tendência',
          title: 'Crescimento na 2.ª Parte',
          description: `A equipa marca mais na 2.ª parte (${secondHalfScored} golos vs ${firstHalfScored} na 1.ª parte).`,
          stat: `+${secondHalfScored - firstHalfScored} golos`,
          category: 'timing',
          impact: 'positive'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. 🎯 EFICÁCIA (Marcámos primeiro & Taxa de conversão de vitória)
  // ---------------------------------------------------------------------------
  if (recent10Count >= 4 && recent10ScoredFirstCount >= Math.ceil(recent10Count * 0.5)) {
    insights.push({
      id: 'efficiency-scored-first-recent',
      type: 'efficiency',
      icon: '🎯',
      badgeText: 'Eficácia',
      title: 'Iniciativa do Marcador',
      description: `Marcámos primeiro em ${recent10ScoredFirstCount} dos últimos ${recent10Count} jogos.`,
      stat: `${recent10ScoredFirstCount}/${recent10Count}`,
      category: 'form',
      impact: 'positive'
    });
  } else if (firstGoalMetrics.scoredFirstCount >= 2) {
    const rate = firstGoalMetrics.scoredFirstWinRate;
    insights.push({
      id: 'efficiency-first-goal-win',
      type: 'efficiency',
      icon: '🎯',
      badgeText: 'Eficácia',
      title: 'Conversão de Vantagem',
      description: `Taxa de vitória de ${rate}% após marcar primeiro (${firstGoalMetrics.scoredFirstWinCount} vitórias em ${firstGoalMetrics.scoredFirstCount} jogos).`,
      stat: `${rate}%`,
      category: 'form',
      impact: 'positive'
    });
  }

  // ---------------------------------------------------------------------------
  // 5. 🛡️ SOLIDEZ / BALIZA INVIOLADA
  // ---------------------------------------------------------------------------
  if (filteredMatches.length >= 3 && cleanSheets > 0) {
    const cleanSheetPct = Math.round((cleanSheets / filteredMatches.length) * 100);
    if (cleanSheetPct >= 30) {
      insights.push({
        id: 'milestone-clean-sheets',
        type: 'milestone',
        icon: '🛡️',
        badgeText: 'Solidez',
        title: 'Baliza Inviolada',
        description: `A equipa não sofreu golos em ${cleanSheets} de ${filteredMatches.length} jogos (${cleanSheetPct}% sem sofrer).`,
        stat: `${cleanSheetPct}%`,
        category: 'defense',
        impact: 'positive'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. 🚩 DOMÍNIO DE CANTOS
  // ---------------------------------------------------------------------------
  if (cornersForTotal > 0 && cornersAgainstTotal > 0 && typeof cornersForAvg === 'number' && typeof cornersAgainstAvg === 'number') {
    if (cornersForAvg > cornersAgainstAvg && cornersForAvg >= 4) {
      insights.push({
        id: 'dominance-corners',
        type: 'set_piece',
        icon: '🚩',
        badgeText: 'Bola parada',
        title: 'Volume Ofensivo em Cantos',
        description: `A equipa conquista em média ${cornersForAvg} cantos por jogo contra ${cornersAgainstAvg} cedidos.`,
        stat: `${cornersForAvg}/j`,
        category: 'set_pieces',
        impact: 'highlight'
      });
    }
  }

  // Fallbacks if fewer than 3 insights exist
  if (insights.length < 3 && timingWindows.mostScoredPeriod && timingWindows.mostScoredPeriod.count >= 2) {
    insights.push({
      id: 'peak-timing-window',
      type: 'trend',
      icon: '⏱️',
      badgeText: 'Pico ofensivo',
      title: 'Janela Mais Produtiva',
      description: `O intervalo ${timingWindows.mostScoredPeriod.label} concentra ${timingWindows.mostScoredPeriod.count} golos marcados.`,
      stat: timingWindows.mostScoredPeriod.label,
      category: 'timing',
      impact: 'positive'
    });
  }

  return insights.slice(0, 5);
}
