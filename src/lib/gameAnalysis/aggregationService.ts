import { Match, GoalEvent, Player } from '../../types';
import { isSeasonMatching } from '../utils';
import {
  AnalysisFilters,
  AggregatedAnalysis,
  StandardGoalType,
  TimePeriodStat,
  GoalTypeStat,
  GoalOriginBreakdown,
  FirstGoalMetrics,
  BestTimingWindows,
  OpponentComparisonStat,
  EventFilterMetrics
} from './types';
import {
  STANDARD_GOAL_TYPES,
  GOAL_ORIGIN_MAP,
  normalizeGoalType,
  EVENT_TYPE_OPTIONS,
  getCategoryHalfDuration
} from './constants';
import { generateTimePeriodsForDuration, classifyIntoPeriod, normalizeEventTiming } from './timingUtils';
import { generateGameAnalysisInsights } from './insightsEngine';
import { parseMinuteOrder } from '../utils';
import { withUnifiedSetPieces } from '../matchSetPieces';

/**
 * Computes complete game analysis statistics, fully recalculating all KPIs,
 * charts, timing windows, player performance, and event drill-downs based on active filters.
 * Restricts player-level statistics strictly to active squad members in roster when provided.
 */
export function computeGameAnalysis(
  matches: Match[],
  filters: AnalysisFilters,
  categoryName?: string,
  roster?: Player[]
): AggregatedAnalysis {
  // 1. Determine Default Half Duration (Item 2 & 4)
  const defaultHalfDuration = filters.halfDurationMinutes || getCategoryHalfDuration(categoryName);

  // Active squad lookup to guarantee only players in the current squad are counted in player metrics
  const activeRoster = (roster || []).filter((p) => p && p.active !== false);
  const squadPlayerLookup = new Map<string, Player>();
  if (activeRoster.length > 0) {
    activeRoster.forEach((p) => {
      squadPlayerLookup.set(p.id, p);
      if (p.name) squadPlayerLookup.set(p.name.trim().toLowerCase(), p);
      if (p.nickname) squadPlayerLookup.set(p.nickname.trim().toLowerCase(), p);
    });
  }

  const resolveSquadPlayer = (idOrName: string | null | undefined): Player | null => {
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
    if (activeRoster.length === 0) {
      return { id: clean, name: clean, number: null, positions: 'Jogador', birthDate: null, active: true };
    }
    return squadPlayerLookup.get(clean) || squadPlayerLookup.get(clean.toLowerCase()) || null;
  };

  // 2. Filter Matches based on matchId, month, season, opponent, matchType, location, searchQuery
  const filteredMatches = matches.map(withUnifiedSetPieces).filter((m) => {
    // Specific match ID
    if (filters.matchId && filters.matchId !== 'todos' && m.id !== filters.matchId) {
      return false;
    }

    // Season
    if (filters.season && filters.season !== 'todas' && filters.season.trim()) {
      const mSeason = m.season || 'Sem época';
      if (!isSeasonMatching(mSeason, filters.season)) return false;
    }

    // Month (YYYY-MM)
    if (filters.month && filters.month !== 'todos') {
      const mMonth = (m.date || '').slice(0, 7);
      if (mMonth !== filters.month) return false;
    }

    // Opponent
    if (filters.opponent && filters.opponent !== 'todos') {
      if ((m.opponent || '').trim().toLowerCase() !== filters.opponent.trim().toLowerCase()) {
        return false;
      }
    }

    // Competition Type
    if (filters.matchType && filters.matchType !== 'todos') {
      if (m.type !== filters.matchType) return false;
    }

    // Location (Casa / Fora)
    if (filters.location && filters.location !== 'todos') {
      const mLoc = m.location || 'casa';
      if (mLoc !== filters.location) return false;
    }

    // Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const opp = (m.opponent || '').toLowerCase();
      const tour = (m.tournamentName || '').toLowerCase();
      const date = (m.date || '').toLowerCase();
      if (!opp.includes(q) && !tour.includes(q) && !date.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sort matches chronologically
  filteredMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Initialize Dynamic Time Periods for the default half duration (Item 2 & 8)
  const periodList = generateTimePeriodsForDuration(defaultHalfDuration);
  // The map and the list share the same objects: goals counted through the map must show in the list (chart).
  const timePeriodsMap: Record<string, TimePeriodStat> = {};
  periodList.forEach((p) => {
    timePeriodsMap[p.key] = p;
  });
  let goalsWithoutMinuteCount = 0;

  // 4. Aggregators
  let wins = 0,
    draws = 0,
    losses = 0;
  let goalsScored = 0,
    goalsConceded = 0;
  let cleanSheets = 0,
    failedToScore = 0;

  let homeMatches = 0,
    homeWins = 0,
    homeDraws = 0,
    homeLosses = 0,
    homeGoalsScored = 0,
    homeGoalsConceded = 0;

  let awayMatches = 0,
    awayWins = 0,
    awayDraws = 0,
    awayLosses = 0,
    awayGoalsScored = 0,
    awayGoalsConceded = 0;

  // Separation of 0 from unrecorded (Item 6)
  let cornersForSum = 0;
  let cornersForRecordedCount = 0;
  let cornersAgainstSum = 0;
  let cornersAgainstRecordedCount = 0;

  let foulsCommittedSum = 0;
  let foulsCommittedRecordedCount = 0;
  let foulsSufferedSum = 0;
  let foulsSufferedRecordedCount = 0;

  let yellowCardsTotal = 0;
  let redCardsTotal = 0;
  let matchesWithCardInfoCount = 0;

  let unclassifiedGoalsCount = 0; // Item 5: Unknown/unclassified goal origins

  const allScoredMinutes: number[] = [];
  const allConcededMinutes: number[] = [];

  const scorerCounts: Record<string, { scored: number; assists: number }> = {};
  const yellowCounts: Record<string, number> = {};
  const redCounts: Record<string, number> = {};

  const goalTypeCounts: Record<StandardGoalType, { count: number; events: { match: Match; goal: GoalEvent }[] }> = {
    'Bola jogada': { count: 0, events: [] },
    'Recuperação de bola': { count: 0, events: [] },
    Canto: { count: 0, events: [] },
    Livre: { count: 0, events: [] },
    Penálti: { count: 0, events: [] },
    'Pontapé de baliza': { count: 0, events: [] },
    Ressalto: { count: 0, events: [] },
    Outro: { count: 0, events: [] }
  };

  const concededTypeCounts: Record<StandardGoalType, { count: number; events: { match: Match; goal: GoalEvent }[] }> = {
    'Bola jogada': { count: 0, events: [] },
    'Recuperação de bola': { count: 0, events: [] },
    Canto: { count: 0, events: [] },
    Livre: { count: 0, events: [] },
    Penálti: { count: 0, events: [] },
    'Pontapé de baliza': { count: 0, events: [] },
    Ressalto: { count: 0, events: [] },
    Outro: { count: 0, events: [] }
  };

  // First goal metrics tracking (Item 5 & 9)
  const firstGoalScoredMinutes: number[] = [];
  const firstGoalConcededMinutes: number[] = [];
  let scoredFirstCount = 0;
  let scoredFirstWinCount = 0;
  let concededFirstCount = 0;
  let concededFirstComebackWins = 0;
  let goallessDrawsCount = 0;

  // Opponents mapping
  const opponentsMap: Record<
    string,
    {
      matches: Match[];
      wins: number;
      draws: number;
      losses: number;
      scored: number;
      conceded: number;
      cornersFor: number;
      cornersAgainst: number;
      foulsCommitted: number;
      foulsSuffered: number;
      yellow: number;
      red: number;
    }
  > = {};

  const allRawEvents: AggregatedAnalysis['allEvents'] = [];
  let finishedMatchesCount = 0;

  // 5. Process each filtered match
  filteredMatches.forEach((m) => {
    // Determine effective half duration for this specific match (Item 4)
    const mHalfDuration = m.halfDurationMinutes || m.firstHalfDurationMinutes || defaultHalfDuration;
    const isFinished = !!m.finished;
    if (isFinished) finishedMatchesCount++;

    const mGoals = m.goals || [];
    const mCards = m.cards || [];
    const mSubs = m.subs || [];

    const scGoals = mGoals.filter((g) => g.type === 'scored');
    const coGoals = mGoals.filter((g) => g.type === 'conceded');

    const scCount = scGoals.length;
    const coCount = coGoals.length;

    goalsScored += scCount;
    goalsConceded += coCount;

    // Win / Draw / Loss
    if (isFinished) {
      if (coCount === 0) cleanSheets++;
      if (scCount === 0) failedToScore++;
      if (scCount === 0 && coCount === 0) goallessDrawsCount++;

      const isHome = (m.location || 'casa') === 'casa';
      const isWin = scCount > coCount;
      const isDraw = scCount === coCount;

      if (isHome) {
        homeMatches++;
        homeGoalsScored += scCount;
        homeGoalsConceded += coCount;
        if (isWin) {
          wins++;
          homeWins++;
        } else if (isDraw) {
          draws++;
          homeDraws++;
        } else {
          losses++;
          homeLosses++;
        }
      } else {
        awayMatches++;
        awayGoalsScored += scCount;
        awayGoalsConceded += coCount;
        if (isWin) {
          wins++;
          awayWins++;
        } else if (isDraw) {
          draws++;
          awayDraws++;
        } else {
          losses++;
          awayLosses++;
        }
      }

      // First Goal Analysis for this match (Item 5 & 9)
      let earliestScoredMin: number | null = null;
      let earliestConcededMin: number | null = null;

      scGoals.forEach((g) => {
        const timing = normalizeEventTiming(g.minute, g.half, g.period, mHalfDuration);
        if (timing.absoluteMinute !== null) {
          if (earliestScoredMin === null || timing.absoluteMinute < earliestScoredMin) {
            earliestScoredMin = timing.absoluteMinute;
          }
        }
      });

      coGoals.forEach((g) => {
        const timing = normalizeEventTiming(g.minute, g.half, g.period, mHalfDuration);
        if (timing.absoluteMinute !== null) {
          if (earliestConcededMin === null || timing.absoluteMinute < earliestConcededMin) {
            earliestConcededMin = timing.absoluteMinute;
          }
        }
      });

      if (earliestScoredMin !== null) {
        firstGoalScoredMinutes.push(earliestScoredMin);
      }
      if (earliestConcededMin !== null) {
        firstGoalConcededMinutes.push(earliestConcededMin);
      }

      // Did we score first or concede first?
      if (earliestScoredMin !== null && (earliestConcededMin === null || earliestScoredMin < earliestConcededMin)) {
        scoredFirstCount++;
        if (isWin) scoredFirstWinCount++;
      } else if (
        earliestConcededMin !== null &&
        (earliestScoredMin === null || earliestConcededMin < earliestScoredMin)
      ) {
        concededFirstCount++;
        if (isWin) concededFirstComebackWins++;
      }
    }

    // Opponent Comparison tracker
    const oppName = (m.opponent || 'Desconhecido').trim();
    if (!opponentsMap[oppName]) {
      opponentsMap[oppName] = {
        matches: [],
        wins: 0,
        draws: 0,
        losses: 0,
        scored: 0,
        conceded: 0,
        cornersFor: 0,
        cornersAgainst: 0,
        foulsCommitted: 0,
        foulsSuffered: 0,
        yellow: 0,
        red: 0
      };
    }
    opponentsMap[oppName].matches.push(m);
    opponentsMap[oppName].scored += scCount;
    opponentsMap[oppName].conceded += coCount;
    if (m.cornersFor !== undefined && m.cornersFor !== null) opponentsMap[oppName].cornersFor += m.cornersFor;
    if (m.cornersAgainst !== undefined && m.cornersAgainst !== null)
      opponentsMap[oppName].cornersAgainst += m.cornersAgainst;
    if (m.foulsCommitted !== undefined && m.foulsCommitted !== null)
      opponentsMap[oppName].foulsCommitted += m.foulsCommitted;
    if (m.foulsSuffered !== undefined && m.foulsSuffered !== null)
      opponentsMap[oppName].foulsSuffered += m.foulsSuffered;

    if (isFinished) {
      if (scCount > coCount) opponentsMap[oppName].wins++;
      else if (scCount === coCount) opponentsMap[oppName].draws++;
      else opponentsMap[oppName].losses++;
    }

    // Corners (Item 6: Separation of 0 from unrecorded)
    if (m.cornersFor !== undefined && m.cornersFor !== null) {
      cornersForSum += m.cornersFor;
      cornersForRecordedCount++;
    }
    if (m.cornersAgainst !== undefined && m.cornersAgainst !== null) {
      cornersAgainstSum += m.cornersAgainst;
      cornersAgainstRecordedCount++;
    }

    // Fouls (Item 6: Separation of 0 from unrecorded)
    if (m.foulsCommitted !== undefined && m.foulsCommitted !== null) {
      foulsCommittedSum += m.foulsCommitted;
      foulsCommittedRecordedCount++;
    }
    if (m.foulsSuffered !== undefined && m.foulsSuffered !== null) {
      foulsSufferedSum += m.foulsSuffered;
      foulsSufferedRecordedCount++;
    }

    // Cards check
    if (m.cards !== undefined && m.cards !== null) {
      matchesWithCardInfoCount++;
    }

    // Process Goals with Unified Timing (Item 7 & 5)
    mGoals.forEach((g) => {
      const timing = normalizeEventTiming(g.minute, g.half, g.period, mHalfDuration);
      const isScored = g.type === 'scored';
      const normType = normalizeGoalType(g.goalType);
      const originCategory = GOAL_ORIGIN_MAP[normType];

      // Track unclassified goal types (Item 5)
      if (isScored && (!g.goalType || normType === 'Outro')) {
        unclassifiedGoalsCount++;
      }

      if (timing.absoluteMinute !== null) {
        if (isScored) allScoredMinutes.push(timing.absoluteMinute);
        else allConcededMinutes.push(timing.absoluteMinute);
      }

      // A goal without a recorded minute has no period: never place it in one (that would invent its timing).
      const pKey =
        timing.absoluteMinute !== null
          ? classifyIntoPeriod(timing.absoluteMinute, timing.half === 2 ? 2 : 1, periodList, defaultHalfDuration)
          : null;
      if (pKey === null) goalsWithoutMinuteCount++;

      if (pKey && timePeriodsMap[pKey]) {
        if (isScored) {
          timePeriodsMap[pKey].scored++;
          timePeriodsMap[pKey].scoredEvents.push({ match: m, goal: g });
        } else {
          timePeriodsMap[pKey].conceded++;
          timePeriodsMap[pKey].concededEvents.push({ match: m, goal: g });
        }
      }

      if (isScored) {
        goalTypeCounts[normType].count++;
        goalTypeCounts[normType].events.push({ match: m, goal: g });

        // Scorer & Assist - resolve against active squad roster
        const rawScorer = g.scorerId || (g as any).player || 'unknown';
        const scorerPlayer = resolveSquadPlayer(rawScorer);
        const sId = scorerPlayer ? scorerPlayer.id : activeRoster.length === 0 ? rawScorer : 'unknown';

        if (sId !== 'unknown') {
          if (!scorerCounts[sId]) scorerCounts[sId] = { scored: 0, assists: 0 };
          scorerCounts[sId].scored++;
        }

        const rawAssist = g.assistId || (g as any).assistant;
        if (rawAssist && rawAssist !== 'none' && rawAssist !== 'unknown') {
          const assistPlayer = resolveSquadPlayer(rawAssist);
          const aId = assistPlayer ? assistPlayer.id : activeRoster.length === 0 ? rawAssist : null;
          if (aId) {
            if (!scorerCounts[aId]) scorerCounts[aId] = { scored: 0, assists: 0 };
            scorerCounts[aId].assists++;
          }
        }

        allRawEvents.push({
          id: g.id || `g-${m.id}-${Math.random()}`,
          kind: 'golo_marcado',
          match: m,
          minute: g.minute,
          displayMinute: timing.displayMinute,
          absoluteMinute: timing.absoluteMinute,
          period: timing.period,
          half: timing.half,
          playerPrimaryId: sId,
          playerSecondaryId: g.assistId || (g as any).assistant,
          detail: `Golo marcado (${normType})`,
          notes: g.notes,
          goalType: normType,
          originCategory,
          orderNum: timing.absoluteMinute ?? parseMinuteOrder(g.minute, g.period)
        });
      } else {
        concededTypeCounts[normType].count++;
        concededTypeCounts[normType].events.push({ match: m, goal: g });

        allRawEvents.push({
          id: g.id || `gc-${m.id}-${Math.random()}`,
          kind: 'golo_sofrido',
          match: m,
          minute: g.minute,
          displayMinute: timing.displayMinute,
          absoluteMinute: timing.absoluteMinute,
          period: timing.period,
          half: timing.half,
          detail: `Golo sofrido (${normType})`,
          notes: g.notes,
          goalType: normType,
          originCategory,
          orderNum: timing.absoluteMinute ?? parseMinuteOrder(g.minute, g.period)
        });
      }
    });

    // Process Cards
    mCards.forEach((c) => {
      const cColor = c.color || (c as any).type;
      const isYellow = cColor === 'Amarelo' || String(cColor).toLowerCase() === 'yellow';
      const isRed = cColor === 'Vermelho' || String(cColor).toLowerCase() === 'red';
      const rawPId = c.playerId || (c as any).player || 'unknown';
      const cardPlayer = resolveSquadPlayer(rawPId);
      const pId = cardPlayer ? cardPlayer.id : activeRoster.length === 0 ? rawPId : 'unknown';
      const timing = normalizeEventTiming(c.minute, c.half, c.period, mHalfDuration);

      if (isYellow) {
        yellowCardsTotal++;
        if (pId !== 'unknown') {
          yellowCounts[pId] = (yellowCounts[pId] || 0) + 1;
        }
        opponentsMap[oppName].yellow++;
      } else if (isRed) {
        redCardsTotal++;
        if (pId !== 'unknown') {
          redCounts[pId] = (redCounts[pId] || 0) + 1;
        }
        opponentsMap[oppName].red++;
      }

      allRawEvents.push({
        id: c.id || `c-${m.id}-${Math.random()}`,
        kind: 'cartao',
        match: m,
        minute: c.minute,
        displayMinute: timing.displayMinute,
        absoluteMinute: timing.absoluteMinute,
        period: timing.period,
        half: timing.half,
        playerPrimaryId: pId,
        cardColor: isYellow ? 'Amarelo' : 'Vermelho',
        detail: `Cartão ${isYellow ? 'Amarelo' : 'Vermelho'}`,
        orderNum: timing.absoluteMinute ?? parseMinuteOrder(c.minute, c.period)
      });
    });

    // Process Subs
    mSubs.forEach((s) => {
      const timing = normalizeEventTiming(s.minute, s.half, s.period, mHalfDuration);
      const absMin = s.isHalftime ? mHalfDuration + 0.5 : timing.absoluteMinute;
      allRawEvents.push({
        id: s.id || `s-${m.id}-${Math.random()}`,
        kind: 'sub',
        match: m,
        minute: s.minute,
        displayMinute: s.isHalftime ? 'INT' : timing.displayMinute,
        absoluteMinute: absMin,
        period: s.isHalftime ? 'Intervalo' : timing.period,
        half: s.isHalftime ? null : timing.half,
        playerPrimaryId: s.outId,
        playerSecondaryId: s.inId,
        detail: s.isHalftime ? 'Substituição ao Intervalo' : 'Substituição',
        notes: s.notes,
        orderNum: absMin ?? (s.isHalftime ? mHalfDuration + 0.5 : parseMinuteOrder(s.minute, s.period))
      });
    });
  });

  // 6. Filter Events According to Event Type Selection (Item 1)
  const activeEvType = filters.eventType || 'todos';
  const allEvents = allRawEvents.filter((ev) => {
    if (activeEvType === 'todos') return true;
    if (activeEvType === 'golos') return ev.kind === 'golo_marcado';
    if (activeEvType === 'golos_canto') return ev.kind === 'golo_marcado' && ev.goalType === 'Canto';
    if (activeEvType === 'golos_livre') return ev.kind === 'golo_marcado' && ev.goalType === 'Livre';
    if (activeEvType === 'golos_penalti') return ev.kind === 'golo_marcado' && ev.goalType === 'Penálti';
    if (activeEvType === 'golos_bola_jogada') return ev.kind === 'golo_marcado' && ev.goalType === 'Bola jogada';
    if (activeEvType === 'golos_recuperacao')
      return ev.kind === 'golo_marcado' && ev.goalType === 'Recuperação de bola';
    if (activeEvType === 'golos_ressalto') return ev.kind === 'golo_marcado' && ev.goalType === 'Ressalto';
    if (activeEvType === 'golos_pontape_baliza')
      return ev.kind === 'golo_marcado' && ev.goalType === 'Pontapé de baliza';
    if (activeEvType === 'golos_sofridos') return ev.kind === 'golo_sofrido';
    if (activeEvType === 'amarelos') return ev.kind === 'cartao' && ev.cardColor === 'Amarelo';
    if (activeEvType === 'vermelhos') return ev.kind === 'cartao' && ev.cardColor === 'Vermelho';
    if (activeEvType === 'substituicoes') return ev.kind === 'sub';
    return true;
  });

  // Sort events reverse chronologically by match date, then by minute order
  allEvents.sort((a, b) => {
    const dDiff = new Date(b.match.date).getTime() - new Date(a.match.date).getTime();
    if (dDiff !== 0) return dDiff;
    return a.orderNum - b.orderNum;
  });

  // 6B. Calculate Dedicated Filter Metrics (Item 1)
  const eventOption = EVENT_TYPE_OPTIONS.find((o) => o.id === activeEvType);
  const eventTypeLabel = eventOption ? eventOption.label : 'Todos os Acontecimentos';
  const isFiltered = activeEvType !== 'todos';

  const filterOccurrencesMinutes: number[] = [];
  const matchOccurrenceTracker: Record<string, number> = {};
  const filterPlayerTracker: Record<string, number> = {};
  const filterPeriodTracker: Record<string, number> = {};

  allEvents.forEach((ev) => {
    if (ev.absoluteMinute !== null) {
      filterOccurrencesMinutes.push(ev.absoluteMinute);
      const pKey = classifyIntoPeriod(ev.absoluteMinute, ev.half === 2 ? 2 : 1, periodList, defaultHalfDuration);
      filterPeriodTracker[pKey] = (filterPeriodTracker[pKey] || 0) + 1;
    }
    matchOccurrenceTracker[ev.match.id] = (matchOccurrenceTracker[ev.match.id] || 0) + 1;
    if (ev.playerPrimaryId && ev.playerPrimaryId !== 'unknown') {
      filterPlayerTracker[ev.playerPrimaryId] = (filterPlayerTracker[ev.playerPrimaryId] || 0) + 1;
    }
  });

  const filterAvgMinute =
    filterOccurrencesMinutes.length > 0
      ? Math.round(filterOccurrencesMinutes.reduce((a, b) => a + b, 0) / filterOccurrencesMinutes.length)
      : null;

  const matchesWithOccurrencesCount = Object.keys(matchOccurrenceTracker).length;
  const totalMatchesAnalyzed = filteredMatches.length;
  const matchOccurrenceRate =
    totalMatchesAnalyzed > 0 ? Math.round((matchesWithOccurrencesCount / totalMatchesAnalyzed) * 100) : 0;
  const avgPerMatch = totalMatchesAnalyzed > 0 ? parseFloat((allEvents.length / totalMatchesAnalyzed).toFixed(2)) : 0;

  const topPlayerOccurrences = Object.entries(filterPlayerTracker)
    .map(([playerId, count]) => ({ playerId, count }))
    .sort((a, b) => b.count - a.count);

  let mostFreqPeriod: { periodKey: string; label: string; count: number } | null = null;
  const periodDistribution = periodList.map((p) => {
    const c = filterPeriodTracker[p.key] || 0;
    const pct = allEvents.length > 0 ? Math.round((c / allEvents.length) * 100) : 0;
    if (!mostFreqPeriod || c > mostFreqPeriod.count) {
      if (c > 0) mostFreqPeriod = { periodKey: p.key, label: p.label, count: c };
    }
    return { periodKey: p.key, label: p.label, count: c, percentage: pct };
  });

  const filterMetrics: EventFilterMetrics = {
    activeFilter: activeEvType,
    filterLabel: eventTypeLabel,
    isFiltered,
    totalOccurrences: allEvents.length,
    avgMinute: filterAvgMinute,
    firstOccurrenceMinuteAvg: null,
    matchesWithOccurrencesCount,
    totalMatchesAnalyzed,
    matchOccurrenceRate,
    avgPerMatch,
    topPlayerOccurrences,
    mostFrequentPeriod: mostFreqPeriod,
    periodDistribution
  };

  // 7. Calculate First Goal Metrics (Item 5 & 9)
  const firstGoalScoredAvgMin =
    firstGoalScoredMinutes.length > 0
      ? Math.round(firstGoalScoredMinutes.reduce((a, b) => a + b, 0) / firstGoalScoredMinutes.length)
      : null;

  const firstGoalConcededAvgMin =
    firstGoalConcededMinutes.length > 0
      ? Math.round(firstGoalConcededMinutes.reduce((a, b) => a + b, 0) / firstGoalConcededMinutes.length)
      : null;

  const scoredFirstWinRate = scoredFirstCount > 0 ? Math.round((scoredFirstWinCount / scoredFirstCount) * 100) : 0;

  const firstGoalMetrics: FirstGoalMetrics = {
    firstGoalScoredAvgMin,
    firstGoalScoredMatchesCount: firstGoalScoredMinutes.length,
    firstGoalConcededAvgMin,
    firstGoalConcededMatchesCount: firstGoalConcededMinutes.length,
    scoredFirstCount,
    scoredFirstWinCount,
    scoredFirstWinRate,
    concededFirstCount,
    concededFirstComebackWins,
    goallessDrawsCount
  };

  // 8. Identify Highest Efficacy Timing Windows (Item 6, 8, 9)
  let bestScoredP: TimePeriodStat | null = null;
  let worstConcededP: TimePeriodStat | null = null;

  periodList.forEach((p) => {
    const currentP = timePeriodsMap[p.key] || p;
    if (!bestScoredP || currentP.scored > bestScoredP.scored) {
      bestScoredP = currentP;
    }
    if (!worstConcededP || currentP.conceded > worstConcededP.conceded) {
      worstConcededP = currentP;
    }
  });

  const timingWindows: BestTimingWindows = {
    mostScoredPeriod:
      bestScoredP && (bestScoredP as TimePeriodStat).scored > 0
        ? {
            periodKey: (bestScoredP as TimePeriodStat).key,
            label: (bestScoredP as TimePeriodStat).label,
            count: (bestScoredP as TimePeriodStat).scored
          }
        : null,
    mostConcededPeriod:
      worstConcededP && (worstConcededP as TimePeriodStat).conceded > 0
        ? {
            periodKey: (worstConcededP as TimePeriodStat).key,
            label: (worstConcededP as TimePeriodStat).label,
            count: (worstConcededP as TimePeriodStat).conceded
          }
        : null,
    safestPeriod: null
  };

  // 9. Calculate Open Play vs Set Piece breakdowns (Item 7)
  let scoredOpenPlay = 0,
    scoredSetPiece = 0,
    scoredOther = 0;
  STANDARD_GOAL_TYPES.forEach((gt) => {
    const c = goalTypeCounts[gt].count;
    const cat = GOAL_ORIGIN_MAP[gt];
    if (cat === 'bola_corrida') scoredOpenPlay += c;
    else if (cat === 'bola_parada') scoredSetPiece += c;
    else scoredOther += c;
  });

  const scoredOriginBreakdown: GoalOriginBreakdown = {
    openPlayCount: scoredOpenPlay,
    openPlayPercentage: goalsScored > 0 ? Math.round((scoredOpenPlay / goalsScored) * 100) : 0,
    setPieceCount: scoredSetPiece,
    setPiecePercentage: goalsScored > 0 ? Math.round((scoredSetPiece / goalsScored) * 100) : 0,
    otherCount: scoredOther,
    otherPercentage: goalsScored > 0 ? Math.round((scoredOther / goalsScored) * 100) : 0
  };

  let concededOpenPlay = 0,
    concededSetPiece = 0,
    concededOther = 0;
  STANDARD_GOAL_TYPES.forEach((gt) => {
    const c = concededTypeCounts[gt].count;
    const cat = GOAL_ORIGIN_MAP[gt];
    if (cat === 'bola_corrida') concededOpenPlay += c;
    else if (cat === 'bola_parada') concededSetPiece += c;
    else concededOther += c;
  });

  const concededOriginBreakdown: GoalOriginBreakdown = {
    openPlayCount: concededOpenPlay,
    openPlayPercentage: goalsConceded > 0 ? Math.round((concededOpenPlay / goalsConceded) * 100) : 0,
    setPieceCount: concededSetPiece,
    setPiecePercentage: goalsConceded > 0 ? Math.round((concededSetPiece / goalsConceded) * 100) : 0,
    otherCount: concededOther,
    otherPercentage: goalsConceded > 0 ? Math.round((concededOther / goalsConceded) * 100) : 0
  };

  // 10. Format Goal Types list (Item 8)
  const goalTypes: GoalTypeStat[] = STANDARD_GOAL_TYPES.map((gt) => ({
    type: gt,
    category: GOAL_ORIGIN_MAP[gt],
    count: goalTypeCounts[gt].count,
    percentage: goalsScored > 0 ? Math.round((goalTypeCounts[gt].count / goalsScored) * 100) : 0,
    events: goalTypeCounts[gt].events
  })).sort((a, b) => b.count - a.count);

  const concededGoalTypes: GoalTypeStat[] = STANDARD_GOAL_TYPES.map((gt) => ({
    type: gt,
    category: GOAL_ORIGIN_MAP[gt],
    count: concededTypeCounts[gt].count,
    percentage: goalsConceded > 0 ? Math.round((concededTypeCounts[gt].count / goalsConceded) * 100) : 0,
    events: concededTypeCounts[gt].events
  })).sort((a, b) => b.count - a.count);

  // 11. Format Opponent Comparisons and Last 5 matches (Item 12)
  const opponentStats: OpponentComparisonStat[] = Object.entries(opponentsMap)
    .map(([opp, data]) => {
      const sortedMatches = [...data.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last5 = sortedMatches.slice(0, 5).map((m) => {
        const sc = (m.goals || []).filter((g) => g.type === 'scored').length;
        const co = (m.goals || []).filter((g) => g.type === 'conceded').length;
        const result: 'V' | 'E' | 'D' = sc > co ? 'V' : sc === co ? 'E' : 'D';
        return {
          matchId: m.id,
          date: m.date,
          type: m.type,
          location: m.location || 'casa',
          scored: sc,
          conceded: co,
          result
        };
      });

      const finishedCount = data.wins + data.draws + data.losses;
      const winRate = finishedCount > 0 ? Math.round((data.wins / finishedCount) * 100) : 0;

      return {
        opponent: opp,
        matchesCount: data.matches.length,
        wins: data.wins,
        draws: data.draws,
        losses: data.losses,
        winRate,
        goalsScored: data.scored,
        goalsConceded: data.conceded,
        goalDifference: data.scored - data.conceded,
        cornersFor: data.cornersFor,
        cornersAgainst: data.cornersAgainst,
        foulsCommitted: data.foulsCommitted,
        foulsSuffered: data.foulsSuffered,
        yellowCards: data.yellow,
        redCards: data.red,
        last5Matches: last5
      };
    })
    .sort((a, b) => b.matchesCount - a.matchesCount || b.wins - a.wins);

  // 12. Top individuals
  const topScorers = Object.entries(scorerCounts)
    .filter(([id, data]) => data.scored > 0 && id !== 'unknown')
    .map(([id, data]) => ({ playerId: id, count: data.scored, assistsCount: data.assists }))
    .sort((a, b) => b.count - a.count || b.assistsCount - a.assistsCount);

  const topAssisters = Object.entries(scorerCounts)
    .filter(([id, data]) => data.assists > 0 && id !== 'unknown')
    .map(([id, data]) => ({ playerId: id, count: data.assists }))
    .sort((a, b) => b.count - a.count);

  const allCardedPlayerIds = Array.from(new Set([...Object.keys(yellowCounts), ...Object.keys(redCounts)])).filter(
    (id) => id !== 'unknown'
  );
  const cardedPlayers = allCardedPlayerIds
    .map((id) => ({
      playerId: id,
      yellow: yellowCounts[id] || 0,
      red: redCounts[id] || 0
    }))
    .sort((a, b) => b.red * 3 + b.yellow - (a.red * 3 + a.yellow));

  // General metrics
  const totalCompleted = finishedMatchesCount;
  const winPercentage = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) : 0;
  const drawPercentage = totalCompleted > 0 ? Math.round((draws / totalCompleted) * 100) : 0;
  const lossPercentage = totalCompleted > 0 ? Math.round((losses / totalCompleted) * 100) : 0;

  const totalMatchesCount = filteredMatches.length;
  const avgGoalsScored = totalMatchesCount > 0 ? parseFloat((goalsScored / totalMatchesCount).toFixed(2)) : 0;
  const avgGoalsConceded = totalMatchesCount > 0 ? parseFloat((goalsConceded / totalMatchesCount).toFixed(2)) : 0;
  const goalDifference = goalsScored - goalsConceded;

  // Minute averages (Item 9)
  const avgMinuteScored =
    allScoredMinutes.length > 0
      ? Math.round(allScoredMinutes.reduce((a, b) => a + b, 0) / allScoredMinutes.length)
      : null;
  const avgMinuteConceded =
    allConcededMinutes.length > 0
      ? Math.round(allConcededMinutes.reduce((a, b) => a + b, 0) / allConcededMinutes.length)
      : null;

  // Separation of 0 from unrecorded (Item 6)
  const foulsCommittedAvg =
    foulsCommittedRecordedCount > 0 ? (foulsCommittedSum / foulsCommittedRecordedCount).toFixed(1) : null;
  const foulsSufferedAvg =
    foulsSufferedRecordedCount > 0 ? (foulsSufferedSum / foulsSufferedRecordedCount).toFixed(1) : null;

  const cornersForAvg = cornersForRecordedCount > 0 ? (cornersForSum / cornersForRecordedCount).toFixed(1) : null;
  const cornersAgainstAvg =
    cornersAgainstRecordedCount > 0 ? (cornersAgainstSum / cornersAgainstRecordedCount).toFixed(1) : null;

  const cardsPerMatchAvg =
    totalMatchesCount > 0 ? parseFloat(((yellowCardsTotal + redCardsTotal) / totalMatchesCount).toFixed(2)) : 0;

  return {
    filteredMatches,
    totalMatches: totalMatchesCount,
    finishedMatchesCount,
    activeEventType: activeEvType,
    eventTypeLabel,
    filterMetrics,
    wins,
    draws,
    losses,
    winPercentage,
    drawPercentage,
    lossPercentage,
    goalsScored,
    goalsConceded,
    goalDifference,
    avgGoalsScored,
    avgGoalsConceded,
    avgMinuteScored,
    avgMinuteConceded,
    unclassifiedGoalsCount,
    cleanSheets,
    failedToScore,
    homeMatches,
    homeWins,
    homeDraws,
    homeLosses,
    homeGoalsScored,
    homeGoalsConceded,
    awayMatches,
    awayWins,
    awayDraws,
    awayLosses,
    awayGoalsScored,
    awayGoalsConceded,
    cornersForTotal: cornersForSum,
    cornersForMatchesCount: cornersForRecordedCount,
    cornersForAvg,
    cornersAgainstTotal: cornersAgainstSum,
    cornersAgainstMatchesCount: cornersAgainstRecordedCount,
    cornersAgainstAvg,
    foulsCommittedTotal: foulsCommittedSum,
    foulsCommittedMatchesCount: foulsCommittedRecordedCount,
    foulsCommittedAvg,
    foulsSufferedTotal: foulsSufferedSum,
    foulsSufferedMatchesCount: foulsSufferedRecordedCount,
    foulsSufferedAvg,
    yellowCardsTotal,
    redCardsTotal,
    cardsPerMatchAvg,
    cardsMatchesCount: matchesWithCardInfoCount,
    firstGoalMetrics,
    timingWindows,
    scoredOriginBreakdown,
    concededOriginBreakdown,
    configuredHalfDuration: defaultHalfDuration,
    timePeriods: timePeriodsMap,
    timePeriodList: periodList,
    goalsWithoutMinuteCount,
    goalTypes,
    concededGoalTypes,
    topScorers,
    topAssisters,
    cardedPlayers,
    opponentStats,
    insights: generateGameAnalysisInsights({
      filteredMatches,
      goalsScored,
      goalsConceded,
      goalDifference,
      wins,
      draws,
      losses,
      winPercentage,
      cleanSheets,
      configuredHalfDuration: defaultHalfDuration,
      timePeriodList: periodList,
      firstGoalMetrics,
      timingWindows,
      scoredOriginBreakdown,
      concededOriginBreakdown,
      goalTypes,
      concededGoalTypes,
      cornersForTotal: cornersForSum,
      cornersForAvg,
      cornersAgainstTotal: cornersAgainstSum,
      cornersAgainstAvg,
      foulsCommittedTotal: foulsCommittedSum,
      foulsCommittedAvg,
      foulsSufferedTotal: foulsSufferedSum,
      foulsSufferedAvg,
      yellowCardsTotal,
      redCardsTotal,
      cardsPerMatchAvg
    }),
    allEvents
  };
}
