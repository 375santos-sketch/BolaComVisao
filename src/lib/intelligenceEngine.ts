import {
  AppState,
  Player,
  AttendancePeriod,
  AttendanceTrend,
  AttendanceCategory,
  PlayerAttendanceSummary,
  PlayerEvolutionMetrics
} from '../types';
import { calcPlayerMinutes } from './utils';

/**
 * 2. CÁLCULO DE ASSIDUIDADE & TENDÊNCIAS
 */
export function calculateAttendanceMetrics(
  state: AppState,
  period: AttendancePeriod = '30d'
): {
  playerSummaries: PlayerAttendanceSummary[];
  teamAverageRate: number;
  previousTeamAverageRate: number;
  teamTrend: AttendanceTrend;
  teamTrendDiff: number;
  totalTrainingsEvaluated: number;
  categoryCounts: Record<AttendanceCategory, number>;
  lowAttendancePlayers: PlayerAttendanceSummary[];
} {
  const activePlayers = (state.roster || []).filter((p) => p.active !== false);
  const trainings = (state.trainings || []).filter((t) => t.completed !== false && t.date);

  const now = new Date();
  const nowTs = now.getTime();

  // Determinar limites de data para o período atual e anterior
  let daysWindow = 30;
  if (period === '7d') daysWindow = 7;
  else if (period === '30d') daysWindow = 30;
  else if (period === '90d') daysWindow = 90;
  else if (period === 'season') daysWindow = 365;

  const currentPeriodStartTs = nowTs - daysWindow * 86400000;
  const prevPeriodStartTs = currentPeriodStartTs - daysWindow * 86400000;

  // Filtrar treinos do período atual
  const currentTrainings = trainings.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= currentPeriodStartTs && d <= nowTs;
  });

  // Filtrar treinos do período anterior (para cálculo de tendência)
  const prevTrainings = trainings.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= prevPeriodStartTs && d < currentPeriodStartTs;
  });

  // Se período atual tiver 0 treinos mas houver treinos na base de dados, usar todos os treinos existentes
  const effectiveTrainings = currentTrainings.length > 0 ? currentTrainings : trainings;
  const totalTrainingsCount = effectiveTrainings.length;

  const categoryCounts: Record<AttendanceCategory, number> = {
    excelente: 0,
    boa: 0,
    atencao: 0,
    baixa: 0
  };

  let totalRateSum = 0;
  let prevTotalRateSum = 0;

  const playerSummaries: PlayerAttendanceSummary[] = activePlayers.map((player) => {
    // Presenças no período atual
    const absences = effectiveTrainings.filter((t) => (t.absences || []).includes(player.id)).length;
    const presences = Math.max(0, totalTrainingsCount - absences);
    const rate = totalTrainingsCount > 0 ? Math.round((presences / totalTrainingsCount) * 100) : 0;
    totalRateSum += rate;

    // Presenças no período anterior
    let trend: AttendanceTrend;
    let trendDiff = 0;

    if (prevTrainings.length >= 2 && currentTrainings.length >= 2) {
      const prevAbsences = prevTrainings.filter((t) => (t.absences || []).includes(player.id)).length;
      const prevPresences = Math.max(0, prevTrainings.length - prevAbsences);
      const prevRate = Math.round((prevPresences / prevTrainings.length) * 100);
      prevTotalRateSum += prevRate;
      trendDiff = rate - prevRate;

      if (trendDiff >= 5) trend = 'melhorou';
      else if (trendDiff <= -5) trend = 'diminuiu';
      else trend = 'estavel';
    } else {
      trend = totalTrainingsCount < 2 ? 'insuficiente' : 'estavel';
    }

    // Classificação
    const category: AttendanceCategory =
      rate >= 90 ? 'excelente' : rate >= 75 ? 'boa' : rate >= 60 ? 'atencao' : 'baixa';

    categoryCounts[category]++;

    // Identificar última falta
    const playerAbsenceTrainings = effectiveTrainings.filter((t) => (t.absences || []).includes(player.id));
    const lastAbsence = playerAbsenceTrainings[playerAbsenceTrainings.length - 1];

    return {
      playerId: player.id,
      playerName: player.name,
      playerNumber: player.number,
      position: player.positions || '',
      status: player.status || 'disponivel',
      totalTrainings: totalTrainingsCount,
      presences,
      absences,
      justifiedAbsences: player.status === 'lesionado' || player.status === 'suspenso' ? absences : 0,
      rate,
      trend,
      trendDiff,
      category,
      lastAbsenceDate: lastAbsence?.date,
      lastAbsenceReason: lastAbsence
        ? player.status === 'lesionado'
          ? 'Lesão'
          : player.status === 'suspenso'
            ? 'Castigo'
            : lastAbsence.notes || 'Ausência Registada'
        : undefined
    };
  });

  const playerCount = activePlayers.length || 1;
  const teamAverageRate = Math.round(totalRateSum / playerCount);
  const previousTeamAverageRate =
    prevTrainings.length > 0 ? Math.round(prevTotalRateSum / playerCount) : teamAverageRate;
  const teamTrendDiff = teamAverageRate - previousTeamAverageRate;

  let teamTrend: AttendanceTrend = 'estavel';
  if (totalTrainingsCount < 2) teamTrend = 'insuficiente';
  else if (teamTrendDiff >= 3) teamTrend = 'melhorou';
  else if (teamTrendDiff <= -3) teamTrend = 'diminuiu';

  const lowAttendancePlayers = playerSummaries.filter((p) => p.rate < 60);

  return {
    playerSummaries: playerSummaries.sort((a, b) => a.rate - b.rate),
    teamAverageRate,
    previousTeamAverageRate,
    teamTrend,
    teamTrendDiff,
    totalTrainingsEvaluated: totalTrainingsCount,
    categoryCounts,
    lowAttendancePlayers
  };
}

/**
 * 3. EVOLUÇÃO INDIVIDUAL DO JOGADOR
 */
export function calculatePlayerEvolution(player: Player, state: AppState): PlayerEvolutionMetrics {
  const matches = (state.matches || []).filter((m) => m.finished);
  const trainings = (state.trainings || []).filter((t) => t.completed !== false);

  // 1. Minutos, Jogos, Titularidades
  let totalMatches = 0;
  let starts = 0;
  let startsSecondHalf = 0;
  let partesTitular = 0;
  let minutes = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;

  const ratingsHistory: { matchId: string; opponent: string; date: string; rating: number }[] = [];

  matches.forEach((m) => {
    const isStarter = (m.lineup || []).includes(player.id);
    const isStarter2 = (m.lineupSecondHalf || []).includes(player.id);
    const enteredAsSub = (m.subs || []).some((s) => s.inId === player.id);
    const hasRating = m.ratings && m.ratings[player.id] !== undefined;
    const playerMins = calcPlayerMinutes(m, player.id);

    // "Jogos realizados/participou" passa a incluir quem esteve em qualquer das listas de titulares, ou entrou, ou tem avaliação
    const participated = isStarter || isStarter2 || enteredAsSub || hasRating || playerMins > 0;

    if (participated) {
      totalMatches++;
      if (isStarter) starts++;
      if (isStarter2) startsSecondHalf++;
      partesTitular += (isStarter ? 1 : 0) + (isStarter2 ? 1 : 0);
      minutes += playerMins;

      // Golos
      goals += (m.goals || []).filter((g) => g.scorerId === player.id).length;
      // Assistências
      assists += (m.goals || []).filter((g) => g.assistId === player.id).length;
      // Cartões
      yellowCards += (m.cards || []).filter((c) => c.playerId === player.id && c.color === 'Amarelo').length;
      redCards += (m.cards || []).filter((c) => c.playerId === player.id && c.color === 'Vermelho').length;

      if (hasRating) {
        ratingsHistory.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date,
          rating: m.ratings[player.id]
        });
      }
    }
  });

  // Média de avaliação
  const avgRating =
    ratingsHistory.length > 0
      ? Number((ratingsHistory.reduce((sum, r) => sum + r.rating, 0) / ratingsHistory.length).toFixed(1))
      : 0;

  // Assiduidade nos treinos
  const totalTrainings = trainings.length;
  const absences = trainings.filter((t) => (t.absences || []).includes(player.id)).length;
  const presences = Math.max(0, totalTrainings - absences);
  const attendanceRate = totalTrainings > 0 ? Math.round((presences / totalTrainings) * 100) : 0;

  // Cálculo de faltas consecutivas recentes (ordenando treinos por data decrescente)
  const sortedTrainingsDesc = [...trainings].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });

  let consecutiveAbsences = 0;
  for (const tr of sortedTrainingsDesc) {
    if ((tr.absences || []).includes(player.id)) {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  // Cálculo da evolução de assiduidade mês a mês (Setembro, Outubro, Novembro, etc.)
  const monthMap: Record<
    string,
    { monthKey: string; monthName: string; totalTrainings: number; presences: number; absences: number; rate: number }
  > = {};

  // Ordenar treinos por data cronológica para agrupamento
  const sortedTrainingsAsc = [...trainings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTrainingsAsc.forEach((t) => {
    if (!t.date) return;
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;

    const monthKey = t.date.slice(0, 7); // "YYYY-MM"
    const monthNameRaw = d.toLocaleDateString('pt-PT', { month: 'long' });
    const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        monthKey,
        monthName,
        totalTrainings: 0,
        presences: 0,
        absences: 0,
        rate: 0
      };
    }

    monthMap[monthKey].totalTrainings++;
    if ((t.absences || []).includes(player.id)) {
      monthMap[monthKey].absences++;
    } else {
      monthMap[monthKey].presences++;
    }
  });

  const monthlyAttendance = Object.values(monthMap).map((m) => ({
    ...m,
    rate: m.totalTrainings > 0 ? Math.round((m.presences / m.totalTrainings) * 100) : 0
  }));

  // Comparação temporal (primeira metade vs segunda metade ou histórico recente)
  let currentAvgRating = avgRating;
  let prevAvgRating = avgRating;
  let ratingDiff = 0;
  let ratingTrend: 'positiva' | 'negativa' | 'estavel' | 'insuficiente';

  if (ratingsHistory.length >= 4) {
    const half = Math.floor(ratingsHistory.length / 2);
    const firstHalf = ratingsHistory.slice(0, half);
    const secondHalf = ratingsHistory.slice(half);

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.rating, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.rating, 0) / secondHalf.length;

    prevAvgRating = Number(firstAvg.toFixed(1));
    currentAvgRating = Number(secondAvg.toFixed(1));
    ratingDiff = Number((currentAvgRating - prevAvgRating).toFixed(1));

    if (ratingDiff >= 0.3) ratingTrend = 'positiva';
    else if (ratingDiff <= -0.3) ratingTrend = 'negativa';
    else ratingTrend = 'estavel';
  } else {
    ratingTrend = ratingsHistory.length < 2 ? 'insuficiente' : 'estavel';
  }

  // Tendência de assiduidade
  let attendanceTrend: AttendanceTrend;
  let prevAttendance = attendanceRate;
  let attendanceDiff = 0;

  if (trainings.length >= 4) {
    const half = Math.floor(trainings.length / 2);
    const firstHalf = trainings.slice(0, half);
    const secondHalf = trainings.slice(half);

    const firstAbs = firstHalf.filter((t) => (t.absences || []).includes(player.id)).length;
    const secondAbs = secondHalf.filter((t) => (t.absences || []).includes(player.id)).length;

    const firstRate = Math.round(((firstHalf.length - firstAbs) / firstHalf.length) * 100);
    const secondRate = Math.round(((secondHalf.length - secondAbs) / secondHalf.length) * 100);

    prevAttendance = firstRate;
    attendanceDiff = secondRate - firstRate;

    if (attendanceDiff >= 5) attendanceTrend = 'melhorou';
    else if (attendanceDiff <= -5) attendanceTrend = 'diminuiu';
    else attendanceTrend = 'estavel';
  } else {
    attendanceTrend = totalTrainings < 2 ? 'insuficiente' : 'estavel';
  }

  // Confiança da análise
  let confidence: 'alta' | 'media' | 'insuficiente' = 'alta';
  if (totalMatches === 0 && totalTrainings === 0) confidence = 'insuficiente';
  else if (totalMatches < 2 && totalTrainings < 3) confidence = 'insuficiente';
  else if (totalMatches < 4 && totalTrainings < 6) confidence = 'media';

  // Resumo automático factual (sem invenções nem juízos clínicos)
  let summaryText: string;
  if (confidence === 'insuficiente') {
    summaryText = `Dados insuficientes registados nesta época para traçar uma evolução temporal completa.`;
  } else {
    const parts: string[] = [];
    if (totalTrainings > 0) {
      parts.push(
        `Participou em ${presences} dos ${totalTrainings} treinos registados (${attendanceRate}% de assiduidade).`
      );
    }
    if (totalMatches > 0) {
      parts.push(
        `Participou em ${totalMatches} jogos (${starts} a titular, somando ${minutes} minutos)${goals > 0 ? `, com ${goals} golo${goals > 1 ? 's' : ''}` : ''}.`
      );
    }
    if (avgRating > 0) {
      parts.push(
        `Apresenta uma avaliação média de ${avgRating}/5.${ratingTrend === 'positiva' ? ' A tendência de avaliação recente é positiva (+0.3+).' : ratingTrend === 'negativa' ? ' A média recente registou um ligeiro decréscimo.' : ''}`
      );
    }
    summaryText = parts.join(' ');
  }

  return {
    playerId: player.id,
    playerName: player.name,
    totalMatches,
    starts,
    startsSecondHalf,
    partesTitular,
    minutes,
    goals,
    assists,
    yellowCards,
    redCards,
    avgRating,
    ratingsHistory,
    attendanceRate,
    attendancePresences: presences,
    attendanceAbsences: absences,
    consecutiveAbsences,
    totalTrainings,
    monthlyAttendance,
    attendanceTrend,
    ratingTrend,
    ratingDiff,
    periodComparison: {
      periodLabel: '1ª Metade vs 2ª Metade da Época',
      currentAvgRating,
      prevAvgRating,
      ratingDiff,
      currentAttendance: attendanceRate,
      prevAttendance,
      attendanceDiff
    },
    summaryText,
    confidence
  };
}

/**
 * Consulta rápida de assiduidade e faltas consecutivas de um atleta para o seletor de convocatória
 */
export function getPlayerQuickAttendance(
  playerId: string,
  state: AppState
): {
  rate: number;
  consecutiveAbsences: number;
  totalTrainings: number;
  presences: number;
  absences: number;
  category: AttendanceCategory;
} {
  const trainings = (state.trainings || []).filter((t) => t.completed !== false && t.date);
  const totalTrainings = trainings.length;
  if (totalTrainings === 0) {
    return {
      rate: 100,
      consecutiveAbsences: 0,
      totalTrainings: 0,
      presences: 0,
      absences: 0,
      category: 'excelente'
    };
  }

  const absences = trainings.filter((t) => (t.absences || []).includes(playerId)).length;
  const presences = Math.max(0, totalTrainings - absences);
  const rate = Math.round((presences / totalTrainings) * 100);

  // Faltas consecutivas mais recentes
  const sortedTrainingsDesc = [...trainings].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });

  let consecutiveAbsences = 0;
  for (const tr of sortedTrainingsDesc) {
    if ((tr.absences || []).includes(playerId)) {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  const category: AttendanceCategory = rate >= 85 ? 'excelente' : rate >= 75 ? 'boa' : rate >= 60 ? 'atencao' : 'baixa';

  return {
    rate,
    consecutiveAbsences,
    totalTrainings,
    presences,
    absences,
    category
  };
}
