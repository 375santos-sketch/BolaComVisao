import { AppNotification, AppState, NotificationSettings, WeeklyTrainingSlot, UserAccount } from '../types';
import { MASTER_ADMIN_EMAIL } from './constants';
import {
  ABSENCE_STREAK_ALERT,
  RECENT_WINDOW_DAYS,
  absenceStreak,
  isExpectedToMiss,
  pastTrainings,
  recentAttendance
} from './attendanceAlerts';

export const defaultWeeklyTrainings: WeeklyTrainingSlot[] = [
  { day: 2, time: '18:15', label: 'Terça-feira' },
  { day: 4, time: '18:15', label: 'Quinta-feira' }
];

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  browserNotifications: false,
  notify24hTraining: true,
  notifyThursdayCallup: true,
  notifyLowAttendance: true,
  notifyBirthdays: true,
  attendanceThreshold: 50,
  thursdayHour: 18,
  weeklyTrainingDays: defaultWeeklyTrainings,
  adminContactEmail: MASTER_ADMIN_EMAIL,
  adminContactPhone: ''
};

/**
 * Request permission for standard browser desktop/mobile notifications
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (e) {
    console.warn('Browser notification permission request failed:', e);
  }
  return false;
}

/**
 * Trigger an actual OS / Browser notification if permitted
 */
export function sendBrowserNotification(title: string, body: string, icon?: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  } catch {
    // Ignored in restricted environments
  }
}

/**
 * Evaluates all automated notification rules against the current app state:
 * 1. 24h before training warning
 * 2. Thursday 18:00 pending match callup alert
 * 3. Player attendance < 50% critical warning
 */
export function evaluateSystemNotifications(state: AppState): {
  notifications: AppNotification[];
  newTriggers: AppNotification[];
} {
  const settings: NotificationSettings = {
    ...defaultNotificationSettings,
    ...(state.notificationSettings || {})
  };

  if (!settings.enabled) {
    return { notifications: state.notifications || [], newTriggers: [] };
  }

  // Only evaluate alerts if a team exists and has actual data registered
  const hasTeam = Boolean(state.activeTeamId && state.activeTeamId.trim() !== '');
  const roster = (state.roster || []).filter((p) => p.active !== false);
  const trainings = state.trainings || [];
  const schedule = state.schedule || [];
  const staffMembers = state.staffMembers || [];

  // Se não houver equipa ou plantel ativo com dados inseridos, limpar todas as notificações desportivas
  if (!hasTeam || roster.length === 0) {
    // Manter apenas notificações de pedidos de registo se o utilizador for Admin
    const pendingRegNotifs = (state.notifications || []).filter((n) => n.type === 'novo_registo');
    return { notifications: pendingRegNotifs, newTriggers: [] };
  }

  const existingNotifications = state.notifications || [];
  const existingMap = new Map<string, AppNotification>();
  existingNotifications.forEach((n) => existingMap.set(n.id, n));

  const generatedNotifications: AppNotification[] = [];
  const newlyCreated: AppNotification[] = [];

  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  const currentHour = now.getHours();
  const todayDateStr = now.toISOString().slice(0, 10);

  // Tomorrow date string
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

  // =========================================================================
  // REGRA 1: NOTIFICAÇÃO 24H ANTES DO TREINO (APENAS COM TREINOS REAIS AGENDADOS)
  // =========================================================================
  if (settings.notify24hTraining && hasTeam && roster.length > 0 && trainings.length > 0) {
    // Apenas treinos explicitamente registados no calendário para hoje ou amanhã
    const activeUpcomingTrainings = trainings.filter((tr) => {
      if (!tr.date) return false;
      return tr.date === todayDateStr || tr.date === tomorrowDateStr;
    });

    activeUpcomingTrainings.forEach((tr) => {
      const isTomorrow = tr.date === tomorrowDateStr;
      const formattedDate =
        tr.date.split('-').length === 3
          ? `${tr.date.split('-')[2]}/${tr.date.split('-')[1]}/${tr.date.split('-')[0]}`
          : tr.date;
      const notifId = `notif-tr-entry-${tr.id}`;
      const existing = existingMap.get(notifId);
      if (!existing) {
        const notif: AppNotification = {
          id: notifId,
          type: 'treino_24h',
          title: isTomorrow ? '⚽ Treino Marcado para Amanhã' : '⚽ Treino Marcado para Hoje',
          message: `Sessão de treino agendada para ${formattedDate}${tr.time ? ` às ${tr.time}` : ''}${tr.notes ? ` (${tr.notes})` : ''}. Prepara o plano de treino!`,
          timestamp: Date.now(),
          read: false,
          priority: 'media',
          targetTab: 'treinos',
          targetId: tr.id,
          category: 'Treinos'
        };
        generatedNotifications.push(notif);
        newlyCreated.push(notif);
      } else {
        generatedNotifications.push(existing);
      }
    });
  }

  // =========================================================================
  // REGRA 2: NOTIFICAÇÃO ÀS 18H DE QUINTA-FEIRA (CONVOCATÓRIA NÃO FECHADA)
  // =========================================================================
  if (settings.notifyThursdayCallup && hasTeam && schedule.length > 0 && roster.length > 0) {
    const isThursdayOrLater =
      currentDayOfWeek === 4 || currentDayOfWeek === 5 || currentDayOfWeek === 6 || currentDayOfWeek === 0;
    const isPastThursday18 = currentDayOfWeek === 4 ? currentHour >= (settings.thursdayHour || 18) : isThursdayOrLater;

    if (isPastThursday18) {
      // Find upcoming matches in the schedule within the next 4 days (this weekend)
      const upcomingMatches = schedule.filter((match) => {
        if (!match.date) return false;
        const matchTime = new Date(`${match.date}T${match.time || '10:00'}`).getTime();
        const diffHours = (matchTime - now.getTime()) / (1000 * 60 * 60);
        // Upcoming within 96 hours (4 days) or today
        return diffHours >= -4 && diffHours <= 96;
      });

      upcomingMatches.forEach((match) => {
        const callupCount = (match.callup || []).length;
        // If callup has 0 players or is considered pending/not closed
        if (callupCount === 0 || callupCount < 7) {
          const notifId = `notif-callup-thu-${match.id}-${match.date}`;
          const existing = existingMap.get(notifId);

          const notif: AppNotification = existing || {
            id: notifId,
            type: 'convocatoria_quinta',
            title: '📋 Convocatória Pendente (Quinta-feira 18h)',
            message: `Alerta: É quinta-feira e a convocatória para o jogo contra "${match.opponent}" (${match.date} às ${match.time}) ainda não foi fechada (${callupCount} atletas convocados)!`,
            timestamp: Date.now(),
            read: false,
            priority: 'alta',
            targetTab: 'convocatoria',
            targetId: match.id,
            category: 'Convocatória',
            details: `Jogo: ${match.opponent} | Data: ${match.date} | Convocados atuais: ${callupCount}`
          };

          generatedNotifications.push(notif);
          if (!existing) {
            newlyCreated.push(notif);
          }
        }
      });
    }
  }

  // =========================================================================
  // REGRA 3: NOTIFICAÇÃO SE UM JOGADOR TIVER MENOS DE 50% DE PRESENÇAS NO TREINO (APENAS TREINOS CONCLUÍDOS)
  // =========================================================================
  const completedTrainings = trainings.filter((t) => t.completed !== false);
  if (settings.notifyLowAttendance && hasTeam && completedTrainings.length >= 2 && roster.length > 0) {
    const totalTrainings = completedTrainings.length;
    const threshold = settings.attendanceThreshold || 50;
    const activePlayers = roster.filter((p) => p.active !== false);

    activePlayers.forEach((player) => {
      const absences = completedTrainings.filter((tr) => (tr.absences || []).includes(player.id)).length;
      const presences = Math.max(0, totalTrainings - absences);
      const pct = Math.round((presences / totalTrainings) * 100);

      if (pct < threshold) {
        const notifId = `notif-att-low-${player.id}-${totalTrainings}`;
        const existing = existingMap.get(notifId);

        const notif: AppNotification = existing || {
          id: notifId,
          type: 'assiduidade_baixa',
          title: `🚨 Assiduidade Crítica: ${player.name} (${pct}%)`,
          message: `O atleta ${player.name}${player.number !== null ? ` (#${player.number})` : ''} tem apenas ${pct}% de presenças nos treinos (${presences} presenças em ${totalTrainings} treinos concluídos). Faltou a ${absences} treinos.`,
          timestamp: Date.now(),
          read: false,
          priority: 'alta',
          targetTab: 'plantel',
          targetId: player.id,
          category: 'Assiduidade',
          details: `Presenças: ${presences}/${totalTrainings} (${pct}%) | Faltas: ${absences}`
        };

        generatedNotifications.push(notif);
        if (!existing) {
          newlyCreated.push(notif);
        }
      }
    });
  }

  // =========================================================================
  // REGRA 3B: FALTAS SEGUIDAS E QUEBRA DE ASSIDUIDADE NOS ÚLTIMOS 30 DIAS
  // (ignora atletas lesionados, suspensos ou inativos, que é normal faltarem)
  // =========================================================================
  if (settings.notifyLowAttendance && hasTeam && roster.length > 0) {
    const recentFirst = pastTrainings(trainings);
    const lastTraining = recentFirst[0];
    const threshold = settings.attendanceThreshold || 50;

    if (lastTraining) {
      roster
        .filter((p) => p.active !== false && !isExpectedToMiss(p))
        .forEach((player) => {
          const label = `${player.name}${player.number !== null ? ` (#${player.number})` : ''}`;

          const streak = absenceStreak(player.id, recentFirst);
          if (streak >= ABSENCE_STREAK_ALERT) {
            const notifId = `notif-att-streak-${player.id}-${lastTraining.id}`;
            const existing = existingMap.get(notifId);
            const notif: AppNotification = existing || {
              id: notifId,
              type: 'assiduidade_baixa',
              title: `⚠️ ${streak} faltas seguidas: ${player.name}`,
              message: `O atleta ${label} faltou aos últimos ${streak} treinos. Pode valer a pena falar com o atleta ou com a família.`,
              timestamp: Date.now(),
              read: false,
              priority: 'alta',
              targetTab: 'plantel',
              targetId: player.id,
              category: 'Assiduidade',
              details: `Faltas seguidas: ${streak} (último treino: ${lastTraining.date.slice(0, 10)})`
            };
            generatedNotifications.push(notif);
            if (!existing) newlyCreated.push(notif);
            return;
          }

          const recent = recentAttendance(player.id, recentFirst);
          if (recent.total >= 3 && recent.pct < threshold) {
            const notifId = `notif-att-recent-${player.id}-${lastTraining.id}`;
            const existing = existingMap.get(notifId);
            const notif: AppNotification = existing || {
              id: notifId,
              type: 'assiduidade_baixa',
              title: `📉 Assiduidade a baixar: ${player.name} (${recent.pct}% em ${RECENT_WINDOW_DAYS} dias)`,
              message: `Nos últimos ${RECENT_WINDOW_DAYS} dias, ${label} esteve em ${recent.presences} de ${recent.total} treinos (${recent.pct}%).`,
              timestamp: Date.now(),
              read: false,
              priority: 'media',
              targetTab: 'plantel',
              targetId: player.id,
              category: 'Assiduidade',
              details: `Últimos ${RECENT_WINDOW_DAYS} dias: ${recent.presences}/${recent.total} (${recent.pct}%)`
            };
            generatedNotifications.push(notif);
            if (!existing) newlyCreated.push(notif);
          }
        });
    }
  }

  // =========================================================================
  // REGRA 4: ALERTAS AUTOMÁTICOS DE ANIVERSÁRIO (HOJE)
  // =========================================================================
  if (settings.notifyBirthdays !== false && hasTeam) {
    const todayMonth = now.getMonth() + 1; // 1-12
    const todayDay = now.getDate(); // 1-31

    // 1. Jogadores
    roster.forEach((player) => {
      if (!player.birthDate) return;
      const cleanDate = player.birthDate.trim().replace(/\//g, '-');
      const parts = cleanDate.split('-');
      if (parts.length < 3) return;
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let d = parseInt(parts[2], 10);
      if (parts[0].length <= 2 && parts[2].length === 4) {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      }
      if (m === todayMonth && d === todayDay) {
        const age = now.getFullYear() - y;
        const notifId = `notif-bday-player-${player.id}-${todayDateStr}`;
        const existing = existingMap.get(notifId);

        const notif: AppNotification = existing || {
          id: notifId,
          type: 'aniversario',
          title: `🎉 Hoje é o aniversário de ${player.name}!`,
          message: `🎉 Hoje é o aniversário do atleta ${player.name}${player.number !== null && player.number !== undefined ? ` (#${player.number})` : ''}! Jogador — ${age} anos. Dá-lhe os parabéns!`,
          timestamp: Date.now(),
          read: false,
          priority: 'alta',
          targetTab: 'plantel',
          targetId: player.id,
          category: 'Aniversários',
          details: `Data de nascimento: ${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y} | Completa ${age} anos hoje`
        };

        generatedNotifications.push(notif);
        if (!existing) {
          newlyCreated.push(notif);
        }
      }
    });

    // 2. Equipa Técnica
    staffMembers.forEach((staff) => {
      if (!staff.birthDate) return;
      const cleanDate = staff.birthDate.trim().replace(/\//g, '-');
      const parts = cleanDate.split('-');
      if (parts.length < 3) return;
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let d = parseInt(parts[2], 10);
      if (parts[0].length <= 2 && parts[2].length === 4) {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      }
      if (m === todayMonth && d === todayDay) {
        const age = now.getFullYear() - y;
        const notifId = `notif-bday-staff-${staff.id}-${todayDateStr}`;
        const existing = existingMap.get(notifId);

        const notif: AppNotification = existing || {
          id: notifId,
          type: 'aniversario',
          title: `🎉 Hoje é o aniversário de ${staff.name}!`,
          message: `🎉 Hoje é o aniversário de ${staff.name}! ${staff.role || 'Equipa Técnica'} — ${age} anos. Parabéns!`,
          timestamp: Date.now(),
          read: false,
          priority: 'alta',
          targetTab: 'plantel',
          targetId: staff.id,
          category: 'Aniversários',
          details: `Data de nascimento: ${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y} | Completa ${age} anos hoje`
        };

        generatedNotifications.push(notif);
        if (!existing) {
          newlyCreated.push(notif);
        }
      }
    });
  }

  // Preserve any other notifications (such as test notifications, registration requests, or general ones) that are still active
  existingNotifications.forEach((n) => {
    if (!generatedNotifications.some((g) => g.id === n.id)) {
      if (n.type === 'novo_registo') {
        generatedNotifications.push(n);
      } else if (n.id.startsWith('test-')) {
        const ageHours = (Date.now() - n.timestamp) / (1000 * 60 * 60);
        if (ageHours < 48) {
          generatedNotifications.push(n);
        }
      } else if (n.type === 'treino_24h' || n.id.startsWith('notif-tr-')) {
        // Não preservar alertas de treinos obsoletos ou fantasma que já não correspondem a treinos reais hoje/amanhã
      } else if (n.type === 'aniversario' || n.id.startsWith('notif-bday-')) {
        // Não preservar alertas de aniversários de dias anteriores
      } else {
        const ageHours = (Date.now() - n.timestamp) / (1000 * 60 * 60);
        if (ageHours < 72 || !n.read) {
          generatedNotifications.push(n);
        }
      }
    }
  });

  // Sort by unread first, then by timestamp descending
  generatedNotifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.timestamp - a.timestamp;
  });

  // If new high-priority triggers were found and browser push is active, send browser alerts
  if (settings.browserNotifications && newlyCreated.length > 0) {
    newlyCreated.forEach((n) => {
      sendBrowserNotification(n.title, n.message);
    });
  }

  return {
    notifications: generatedNotifications,
    newTriggers: newlyCreated
  };
}

/**
 * Format structured notification message for WhatsApp and Email approval requests
 */
export function buildRegistrationNotificationMessage(user: any, clubName?: string): string {
  const dateStr = user.createdAt
    ? new Date(user.createdAt).toLocaleString('pt-PT')
    : new Date().toLocaleString('pt-PT');
  return (
    `🛡️ *BOLACOMVISÃO - PEDIDO DE NOVO REGISTO* ⚽\n\n` +
    `Foi submetido um novo pedido de acesso à base de dados do clube${clubName ? ` *${clubName}*` : ''}:\n\n` +
    `👤 *Nome:* ${user.name}\n` +
    `🔑 *Utilizador:* @${user.username}\n` +
    (user.email ? `📧 *E-mail:* ${user.email}\n` : '') +
    `⚽ *Função Solicitada:* ${user.role || 'Treinador Principal'}\n` +
    `📅 *Data do Registo:* ${dateStr}\n\n` +
    `👉 *Para AUTORIZAR ou RECUSAR:*\n` +
    `1. Abra a aplicação *BolaComVisão*\n` +
    `2. No ecrã inicial / gestão, clique no botão *👥 Gestão de Treinadores*\n` +
    `3. Selecione *✓ Autorizar Acesso* ou *✕ Recusar*\n\n` +
    `_BolaComVisão - Gestão de Equipas e Plantel_`
  );
}

/**
 * Open WhatsApp with pre-filled approval request message
 */
export function openWhatsAppRegistrationRequest(user: any, phone?: string, clubName?: string): void {
  const text = buildRegistrationNotificationMessage(user, clubName);
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open Email client with pre-filled approval request
 */
export function openEmailRegistrationRequest(user: any, email?: string, clubName?: string): void {
  const targetEmail = email || MASTER_ADMIN_EMAIL;
  const subject = `[BolaComVisão] Pedido de Autorização de Registo: ${user.name} (@${user.username})`;
  const body = buildRegistrationNotificationMessage(user, clubName);
  const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

/**
 * Builds a persistent in-app notification for a pending coach registration
 */
export function buildPendingRegistrationNotification(user: UserAccount): AppNotification {
  const userRole = user.role || 'Treinador Principal';
  const timestamp = user.createdAt
    ? typeof user.createdAt === 'number'
      ? user.createdAt
      : new Date(user.createdAt).getTime() || Date.now()
    : Date.now();

  return {
    id: `pending-reg-${user.id}`,
    type: 'novo_registo',
    title: `🛡️ Pedido de Acesso: ${user.name}`,
    message: `${user.name} (@${user.username}) solicitou acesso como ${userRole} e aguarda autorização do Administrador.`,
    timestamp,
    read: false,
    priority: 'alta',
    category: 'Acessos & Utilizadores',
    details: `Utilizador: @${user.username} | Função solicitada: ${userRole}`
  };
}

/**
 * Resets and clears all system notifications, guaranteeing that alerts only trigger
 * when real data (teams, players, matches, trainings) is actually present and inserted.
 */
export function resetAppNotifications(): AppNotification[] {
  return [];
}
