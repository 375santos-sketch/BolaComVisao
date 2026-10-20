import {
  AppState,
  Player,
  Training,
  ClubEvent,
  SmartAlert,
  SmartRecommendation,
  DashboardContextMode,
  ScheduledMatch,
  Match,
  AttendancePeriod,
  AttendanceTrend,
  AttendanceCategory,
  PlayerAttendanceSummary,
  PlayerEvolutionMetrics,
  SmartPriority
} from '../types';
import { calcPlayerMinutes } from './utils';

/**
 * Normaliza datas para comparações temporais
 */
export function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    const clean = dateStr.trim().replace(/\//g, '-');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * 1. DETETOR DE CONTEXTO DO DASHBOARD
 * Avalia a situação do dia (Dia de Jogo, Antes de Jogo 48h, Pós-Jogo, Dia de Treino, Dia Normal)
 */
export interface DashboardContextInfo {
  mode: DashboardContextMode;
  headline: string;
  subheadline: string;
  featuredMatch?: ScheduledMatch;
  recentFinishedMatch?: Match;
  featuredTraining?: Training;
  featuredClubEvent?: ClubEvent;
  hoursUntilMatch?: number;
  hoursSinceLastMatch?: number;
  isTodayMatch: boolean;
  isTodayTraining: boolean;
  isTodayClubEvent?: boolean;
}

export function detectDashboardContext(state: AppState): DashboardContextInfo {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTs = now.getTime();

  // 1. Procurar jogos marcados futuros ou de hoje
  const schedule = state.schedule || [];
  const upcomingMatches = [...schedule]
    .filter((m) => m.date)
    .map((m) => {
      const matchDate = new Date(`${m.date}T${m.time || '10:00'}`);
      const diffMs = matchDate.getTime() - nowTs;
      const diffHours = diffMs / (1000 * 60 * 60);
      return { match: m, dateObj: matchDate, diffHours, isToday: m.date === todayStr };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // 2. Verificar se hoje é dia de jogo
  const todayMatch = upcomingMatches.find((m) => m.isToday || (m.diffHours >= -3 && m.diffHours <= 14));
  if (todayMatch) {
    return {
      mode: 'match_day',
      headline: '🏆 É DIA DE JOGO',
      subheadline: `Jogo contra ${todayMatch.match.opponent} hoje às ${todayMatch.match.time || '10:00'}${todayMatch.match.venue ? ` em ${todayMatch.match.venue}` : ''}`,
      featuredMatch: todayMatch.match,
      hoursUntilMatch: Math.max(0, Math.round(todayMatch.diffHours)),
      isTodayMatch: true,
      isTodayTraining: false
    };
  }

  // 3. Verificar se estamos a menos de 48h de um jogo
  const imminentMatch = upcomingMatches.find((m) => m.diffHours > 0 && m.diffHours <= 48);
  if (imminentMatch) {
    const hours = Math.round(imminentMatch.diffHours);
    return {
      mode: 'pre_match',
      headline: '🧠 Preparação do Jogo',
      subheadline: `Faltam ${hours}h para o jogo contra ${imminentMatch.match.opponent} (${imminentMatch.match.date} às ${imminentMatch.match.time})`,
      featuredMatch: imminentMatch.match,
      hoursUntilMatch: hours,
      isTodayMatch: false,
      isTodayTraining: false
    };
  }

  // 4. Verificar se houve um jogo recente nas últimas 48h (Pós-Jogo)
  const finishedMatches = (state.matches || [])
    .filter((m) => m.finished && m.date)
    .map((m) => {
      const d = new Date(m.date);
      const diffHours = (nowTs - d.getTime()) / (1000 * 60 * 60);
      return { match: m, diffHours };
    })
    .sort((a, b) => a.diffHours - b.diffHours);

  const recentMatch = finishedMatches.find((m) => m.diffHours >= 0 && m.diffHours <= 60);
  if (recentMatch) {
    return {
      mode: 'post_match',
      headline: '📊 Resumo do Último Jogo',
      subheadline: `Análise e rescaldo do jogo frente a ${recentMatch.match.opponent} (${recentMatch.match.date})`,
      recentFinishedMatch: recentMatch.match,
      hoursSinceLastMatch: Math.round(recentMatch.diffHours),
      isTodayMatch: false,
      isTodayTraining: false
    };
  }

  // 5. Verificar se hoje ou amanhã há treino agendado
  const trainings = state.trainings || [];
  const todayTraining = trainings.find((t) => t.date === todayStr);
  const tomorrowStr = new Date(nowTs + 86400000).toISOString().slice(0, 10);
  const tomorrowTraining = trainings.find((t) => t.date === tomorrowStr);

  if (todayTraining) {
    return {
      mode: 'training_day',
      headline: '⚽ Dia de Treino',
      subheadline: `Sessão de treino agendada para hoje às ${todayTraining.time || '19:00'}${todayTraining.location ? ` (${todayTraining.location})` : ''}`,
      featuredTraining: todayTraining,
      isTodayMatch: false,
      isTodayTraining: true
    };
  }

  // 6. Verificar se hoje ou amanhã há reunião / formação / evento de clube
  const clubEvents = state.clubEvents || [];
  const todayClubEvent = clubEvents.find((ce) => ce.date === todayStr && !ce.isCompleted);
  const tomorrowClubEvent = clubEvents.find((ce) => ce.date === tomorrowStr && !ce.isCompleted);

  if (todayClubEvent) {
    const typeLabel =
      todayClubEvent.type === 'formacao'
        ? 'Formação'
        : todayClubEvent.type === 'reuniao'
          ? 'Reunião'
          : todayClubEvent.type === 'estagio'
            ? 'Estágio'
            : 'Evento';

    return {
      mode: 'club_event',
      headline: `👥 Dia de ${typeLabel}`,
      subheadline: `${todayClubEvent.title || typeLabel} agendada para hoje às ${todayClubEvent.time || '18:30'}${todayClubEvent.location ? ` (${todayClubEvent.location})` : ''}`,
      featuredClubEvent: todayClubEvent,
      isTodayMatch: false,
      isTodayTraining: false,
      isTodayClubEvent: true
    };
  }

  // 7. Dia Normal
  return {
    mode: 'normal',
    headline: '📋 Centro de Comando',
    subheadline: tomorrowTraining
      ? `Próximo treino amanhã às ${tomorrowTraining.time || '19:00'}`
      : tomorrowClubEvent
        ? `Próxima ${tomorrowClubEvent.type === 'formacao' ? 'formação' : tomorrowClubEvent.type === 'reuniao' ? 'reunião' : 'atividade'} amanhã às ${tomorrowClubEvent.time || '18:30'}`
        : 'Painel executivo com o estado atual do plantel e planeamento',
    featuredTraining: tomorrowTraining,
    featuredClubEvent: tomorrowClubEvent,
    featuredMatch: upcomingMatches[0]?.match,
    isTodayMatch: false,
    isTodayTraining: false
  };
}

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
  const monthMap: Record<string, { monthKey: string; monthName: string; totalTrainings: number; presences: number; absences: number; rate: number }> = {};
  
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

  const category: AttendanceCategory =
    rate >= 85 ? 'excelente' : rate >= 75 ? 'boa' : rate >= 60 ? 'atencao' : 'baixa';

  return {
    rate,
    consecutiveAbsences,
    totalTrainings,
    presences,
    absences,
    category
  };
}

/**
 * 4. SISTEMA DE ALERTAS INTELIGENTES (COM DEDUPLICAÇÃO E AGRUPAMENTO ANTI-SPAM)
 */
export function generateSmartAlerts(state: AppState): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const hasTeam = Boolean(state.activeTeamId && state.activeTeamId.trim() !== '');
  const roster = (state.roster || []).filter((p) => p.active !== false);
  const schedule = state.schedule || [];
  const trainings = state.trainings || [];

  // Se não houver equipa ou plantel ativo registado com dados inseridos, não gerar alertas
  if (!hasTeam || roster.length === 0) {
    // Apenas verificar se existem pedidos de utilizadores pendentes para o Administrador
    const pendingUsers = (state.users || []).filter((u) => u.status === 'pending');
    if (pendingUsers.length > 0 && state.currentUser?.role === 'Admin') {
      alerts.push({
        id: `alert-pending-users`,
        title: `${pendingUsers.length} Novo(s) Treinador(es) a Aguardar Aprovação`,
        message: `${pendingUsers.map((u) => u.name || u.username).join(', ')} solicitaram acesso à plataforma.`,
        reason: 'Utilizadores registados precisam de aprovação de um Administrador.',
        category: 'administracao',
        priority: 'importante',
        timestamp: Date.now(),
        targetTab: 'plantel',
        actionLabel: 'Gerir Acessos'
      });
    }
    return alerts;
  }

  const now = new Date();
  const nowTs = now.getTime();
  const todayStr = now.toISOString().slice(0, 10);
  const context = detectDashboardContext(state);
  const unavailablePlayers = roster.filter((p) => p.status === 'lesionado' || p.status === 'suspenso');

  // =========================================================================
  // ALERTA 1: JOGO PRÓXIMO OU DIA DE JOGO SEM CONVOCATÓRIA COMPLETA (CRÍTICO/IMPORTANTE)
  // Só dispara se existirem jogos inseridos na agenda e plantel com pelo menos 7 jogadores
  // =========================================================================
  if (schedule.length > 0 && roster.length >= 7 && context.featuredMatch) {
    const match = context.featuredMatch;
    const callupCount = (match.callup || []).length;
    const isImminent = (context.hoursUntilMatch || 99) <= 48;

    if (callupCount === 0 || callupCount < 7) {
      alerts.push({
        id: `alert-callup-${match.id}`,
        title: callupCount === 0 ? 'Convocatória por Iniciar' : `Convocatória Incompleta (${callupCount} Atletas)`,
        message: `O jogo contra "${match.opponent}" realiza-se ${context.isTodayMatch ? 'hoje' : `em ${match.date}`} e tem apenas ${callupCount} atletas convocados.`,
        reason: `Mínimo recomendado para jogo é de pelo menos 7 a 11 atletas convocados. Registo atual: ${callupCount}.`,
        category: 'convocatoria',
        priority: context.isTodayMatch ? 'critico' : isImminent ? 'importante' : 'atencao',
        timestamp: nowTs,
        targetTab: 'convocatoria',
        targetId: match.id,
        actionLabel: 'Completar Convocatória'
      });
    }
  }

  // =========================================================================
  // ALERTA 2: JOGO PRÓXIMO SEM PLANO PRÉ-JOGO OU SCOUTING (IMPORTANTE)
  // Só dispara se faltarem menos de 48h para um jogo inserido e houver plantel
  // =========================================================================
  if (schedule.length > 0 && roster.length >= 7 && context.featuredMatch && (context.hoursUntilMatch || 99) <= 48) {
    const match = context.featuredMatch;
    const scoutings = state.opponentScouting || [];
    const matchScouting = scoutings.find(
      (s) => s.matchId === match.id || s.opponentName.toLowerCase() === match.opponent.toLowerCase()
    );

    const hasTacticalPlan =
      matchScouting && (matchScouting.ourFormation || matchScouting.gamePlan || matchScouting.keyObjectives?.length);

    if (!hasTacticalPlan) {
      alerts.push({
        id: `alert-prematch-${match.id}`,
        title: 'Plano Pré-Jogo Pendente',
        message: `Faltam menos de 48h para o jogo contra "${match.opponent}" e o plano tático pré-jogo ainda não foi estruturado.`,
        reason: 'O plano estratégico e o modelo de jogo ajudam a equipa a entrar concentrada.',
        category: 'jogos',
        priority: 'importante',
        timestamp: nowTs,
        targetTab: 'prejogo',
        targetId: match.id,
        actionLabel: 'Preparar Plano de Jogo'
      });
    }
  }

  // =========================================================================
  // ALERTA 3: JOGADORES INDISPONÍVEIS NA CONVOCATÓRIA OU NO PLANTEL (IMPORTANTE)
  // Só dispara se houver atletas com estatuto lesionado ou suspenso
  // =========================================================================
  if (unavailablePlayers.length > 0) {
    if (context.featuredMatch) {
      const match = context.featuredMatch;
      const convocadosIndisponiveis = unavailablePlayers.filter((p) => (match.callup || []).includes(p.id));

      if (convocadosIndisponiveis.length > 0) {
        alerts.push({
          id: `alert-unavail-callup-${match.id}`,
          title: `${convocadosIndisponiveis.length} Atleta(s) Indisponível(eis) Convocado(s)`,
          message: `Os atletas ${convocadosIndisponiveis.map((p) => `${p.name} (${p.status})`).join(', ')} estão convocados mas têm estatuto de indisponibilidade.`,
          reason:
            'Jogadores com estatuto lesionado ou suspenso foram detetados na lista de convocatória do próximo jogo.',
          category: 'jogadores',
          priority: 'importante',
          timestamp: nowTs,
          targetTab: 'convocatoria',
          targetId: match.id,
          actionLabel: 'Ajustar Convocatória'
        });
      } else {
        alerts.push({
          id: `alert-unavail-squad`,
          title: `${unavailablePlayers.length} Atleta(s) Indisponível(eis) no Plantel`,
          message: `${unavailablePlayers.map((p) => p.name).join(', ')} (${unavailablePlayers.map((p) => p.status).join(', ')}).`,
          reason: 'Atletas atualmente com estatuto desportivo lesionado ou suspenso.',
          category: 'jogadores',
          priority: 'atencao',
          timestamp: nowTs,
          targetTab: 'plantel',
          actionLabel: 'Ver Plantel'
        });
      }
    }
  }

  // =========================================================================
  // ALERTA 4: AGRUPAMENTO DE BAIXA ASSIDUIDADE (< 60%) (ANTI-SPAM)
  // Só dispara se houver pelo menos 2 treinos inseridos e concluídos com presenças
  // =========================================================================
  if (trainings.length >= 2) {
    const attendanceData = calculateAttendanceMetrics(state, '30d');
    if (attendanceData.lowAttendancePlayers.length > 0 && attendanceData.totalTrainingsEvaluated >= 2) {
      const count = attendanceData.lowAttendancePlayers.length;
      const names = attendanceData.lowAttendancePlayers.map((p) => `${p.playerName} (${p.rate}%)`).join(', ');

      alerts.push({
        id: `alert-grouped-low-attendance`,
        title: `${count} Atleta${count > 1 ? 's' : ''} com Assiduidade Baixa (< 60%)`,
        message: `${names}. É recomendável acompanhar a disponibilidade destes atletas nos treinos.`,
        reason: `Análise realizada nos últimos ${attendanceData.totalTrainingsEvaluated} treinos fechados.`,
        category: 'assiduidade',
        priority: count >= 3 ? 'importante' : 'atencao',
        timestamp: nowTs,
        targetTab: 'plantel',
        relatedCount: count,
        relatedPlayerIds: attendanceData.lowAttendancePlayers.map((p) => p.playerId),
        actionLabel: 'Ver Assiduidade'
      });
    }
  }

  // =========================================================================
  // ALERTA 5: TREINO CONCLUÍDO SEM REGISTO DE PRESENÇAS / FALTAS
  // Só dispara se um treino passado tiver sido inserido e faltar registar faltas
  // =========================================================================
  if (trainings.length > 0) {
    const pastTrainings = trainings.filter((t) => t.date && t.date < todayStr && t.completed !== false);
    const lastTraining = pastTrainings[pastTrainings.length - 1];

    if (lastTraining && lastTraining.absences === undefined) {
      alerts.push({
        id: `alert-training-unregistered-${lastTraining.id}`,
        title: 'Presenças do Último Treino Pendentes',
        message: `A sessão de treino de ${lastTraining.date} ainda não tem as presenças e faltas verificadas.`,
        reason: 'O fecho de presenças nos treinos garante métricas exatas de assiduidade e evolução.',
        category: 'treinos',
        priority: 'atencao',
        timestamp: nowTs,
        targetTab: 'treinos',
        targetId: lastTraining.id,
        actionLabel: 'Registar Presenças'
      });
    }
  }

  // =========================================================================
  // ALERTA 6: QUALIDADE DE DADOS EM FALTA (INFORMATIVO)
  // Só dispara se houver um plantel completo inserido (>= 7 atletas) e faltarem dados
  // =========================================================================
  if (roster.length >= 7) {
    const missingBirthDates = roster.filter((p) => !p.birthDate);
    const missingPhotos = roster.filter((p) => !p.photoUrl);

    if (missingBirthDates.length >= 3 || missingPhotos.length >= 5) {
      alerts.push({
        id: `alert-data-quality`,
        title: 'Melhoria de Qualidade dos Dados',
        message: `${missingBirthDates.length > 0 ? `${missingBirthDates.length} atletas sem data de nascimento. ` : ''}${missingPhotos.length > 0 ? `${missingPhotos.length} atletas sem foto.` : ''}`,
        reason: 'O preenchimento completo dos dados permite alertas de aniversário e fichas em PDF mais completas.',
        category: 'dados',
        priority: 'informativo',
        timestamp: nowTs,
        targetTab: 'plantel',
        actionLabel: 'Completar Fichas'
      });
    }
  }

  // =========================================================================
  // ALERTA 7: TREINADORES PENDENTES DE APROVAÇÃO (ADMIN)
  // =========================================================================
  const pendingUsers = (state.users || []).filter((u) => u.status === 'pending');
  if (pendingUsers.length > 0 && state.currentUser?.role === 'Admin') {
    alerts.push({
      id: `alert-pending-users`,
      title: `${pendingUsers.length} Novo(s) Treinador(es) a Aguardar Aprovação`,
      message: `${pendingUsers.map((u) => u.name || u.username).join(', ')} solicitaram acesso à plataforma.`,
      reason: 'Utilizadores registados precisam de aprovação de um Administrador.',
      category: 'administracao',
      priority: 'importante',
      timestamp: nowTs,
      targetTab: 'plantel',
      actionLabel: 'Gerir Acessos'
    });
  }

  // Ordenação por prioridade estrita: CRÍTICO > IMPORTANTE > ATENÇÃO > INFORMATIVO
  const priorityRank: Record<SmartPriority, number> = {
    critico: 4,
    importante: 3,
    atencao: 2,
    informativo: 1,
    normal: 0
  };

  return alerts.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
}

/**
 * 5. RECOMENDAÇÕES INTELIGENTES & INSIGHTS FACTUAIS
 */
export function generateSmartRecommendations(state: AppState): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = [];
  const hasTeam = Boolean(state.activeTeamId && state.activeTeamId.trim() !== '');
  const activePlayers = (state.roster || []).filter((p) => p.active !== false);
  const schedule = state.schedule || [];
  const trainings = state.trainings || [];

  // Se não houver equipa ou plantel ativo inserido, não gerar recomendações
  if (!hasTeam || activePlayers.length < 5) {
    return [];
  }

  const context = detectDashboardContext(state);
  const attendanceData = calculateAttendanceMetrics(state, '30d');

  // 1. Recomendação de Disponibilidade para o próximo jogo
  if (schedule.length > 0 && context.featuredMatch) {
    const match = context.featuredMatch;
    const unavailable = activePlayers.filter((p) => p.status === 'lesionado' || p.status === 'suspenso');
    if (unavailable.length >= 2) {
      recommendations.push({
        id: 'rec-unavailability',
        title: 'Disponibilidade Reduzida no Plantel',
        message: `${unavailable.length} atletas estão indisponíveis por lesão ou suspensão para o jogo contra "${match.opponent}".`,
        rationale: `Atletas indisponíveis: ${unavailable.map((p) => `${p.name} (${p.status})`).join(', ')}.`,
        category: 'jogadores',
        priority: 'importante',
        confidence: 'alta',
        targetTab: 'convocatoria',
        targetId: match.id,
        actionLabel: 'Ajustar Convocatória',
        metricLabel: 'Atletas Indisponíveis',
        metricValue: `${unavailable.length} / ${activePlayers.length}`
      });
    }
  }

  // 2. Recomendação de Assiduidade Global
  if (trainings.length >= 3 && attendanceData.totalTrainingsEvaluated >= 3) {
    if (attendanceData.teamTrend === 'melhorou') {
      recommendations.push({
        id: 'rec-attendance-improved',
        title: 'Evolução Positiva de Assiduidade',
        message: `A taxa média de presenças do plantel subiu ${Math.abs(attendanceData.teamTrendDiff)} pontos percentuais (${attendanceData.teamAverageRate}%).`,
        rationale: `Comparativo de assiduidade do plantel face ao período anterior (${attendanceData.previousTeamAverageRate}% ➔ ${attendanceData.teamAverageRate}%).`,
        category: 'assiduidade',
        priority: 'informativo',
        confidence: 'alta',
        targetTab: 'plantel',
        actionLabel: 'Ver Mapa de Assiduidade',
        metricLabel: 'Assiduidade Média',
        metricValue: `${attendanceData.teamAverageRate}%`
      });
    } else if (attendanceData.teamAverageRate < 70) {
      recommendations.push({
        id: 'rec-attendance-low',
        title: 'Atenção à Assiduidade Geral',
        message: `A média de presença nos últimos ${attendanceData.totalTrainingsEvaluated} treinos situa-se em ${attendanceData.teamAverageRate}%.`,
        rationale: `Existe um número significativo de ausências acumuladas no plantel que merece acompanhamento.`,
        category: 'assiduidade',
        priority: 'atencao',
        confidence: 'alta',
        targetTab: 'plantel',
        actionLabel: 'Consultar Histórico',
        metricLabel: 'Taxa Média',
        metricValue: `${attendanceData.teamAverageRate}%`
      });
    }
  }

  // 3. Recomendação de Preparação Pré-Jogo
  if (schedule.length > 0 && context.featuredMatch && (context.hoursUntilMatch || 99) <= 48) {
    const match = context.featuredMatch;
    recommendations.push({
      id: 'rec-prematch-prep',
      title: 'Conclusão da Preparação Tática',
      message: `Aproxima-se o confronto frente a "${match.opponent}". Verifique a estratégia de bolas paradas e os objetivos do balneário.`,
      rationale: `Jogo agendado para ${match.date} às ${match.time || '10:00'}.`,
      category: 'jogos',
      priority: 'importante',
      confidence: 'alta',
      targetTab: 'prejogo',
      targetId: match.id,
      actionLabel: 'Abrir Plano Pré-Jogo',
      metricLabel: 'Contagem Regressiva',
      metricValue: `${context.hoursUntilMatch || 0}h`
    });
  }

  // 4. Recomendação de Qualidade de Dados (se faltarem dados essenciais)
  const missingPositions = activePlayers.filter((p) => !p.positions || p.positions.trim() === '');
  if (activePlayers.length >= 7 && missingPositions.length > 0) {
    recommendations.push({
      id: 'rec-missing-positions',
      title: 'Atletas sem Posição Definida',
      message: `${missingPositions.length} atleta(s) ainda não têm posição tática atribuída no plantel.`,
      rationale: 'A definição da posição facilita a organização automática da convocatória e tática.',
      category: 'dados',
      priority: 'informativo',
      confidence: 'alta',
      targetTab: 'plantel',
      actionLabel: 'Atribuir Posições',
      metricLabel: 'Sem Posição',
      metricValue: `${missingPositions.length}`
    });
  }

  return recommendations;
}
