import React, { useEffect, useMemo, useState } from 'react';
import { teamSettings } from '../../lib/teamSettings';
import { AppState, ScheduledMatch, Training, UserAccount, ClubEvent } from '../../types';
import { TabType } from '../Navbar';
import { UnifiedEvent } from '../dashboard/DashboardNextEvent';
import { TodayFocusCard } from '../dashboard/TodayFocusCard';
import { LiveFollowModal, LiveMatchCard } from '../live/LiveFollow';
import { Icon, IconName } from '../ui/Icon';
import { attendanceReminder, homeNotices, seasonMatches } from '../../lib/homeSummary';
import { BlockHead, HomeGreeting, NextUpBlock, Shortcuts, TasksBlock, TeamStrip } from '../dashboard/HomeBlocks';
import { buildHomeTasks, needsNextTraining, TaskAction, teamPulse } from '../../lib/homeTasks';
import { weeklyFocus } from '../../lib/teamTrends';
import { newsletterDue, weekLabel } from '../../lib/weeklyNewsletter';
import { addDaysISO } from '../../lib/trainingQuick';
import { isAppAdmin } from '../../services/cloudAuthService';
import { BirthdayImageModal } from '../birthday/BirthdayImageModal';
import { BirthdayPerson, getAllBirthdays } from '../../lib/birthdayUtils';

interface HomeViewProps {
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: TabType, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenDatabase: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
  latestPendingUser?: UserAccount | null;
  onExportBackup: () => void;
  onShowToast?: (msg: string) => void;
  /** Opens the summary of the week (to check and send to the parents). */
  onOpenNewsletter?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  onUpdateState: _onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenDatabase: _onOpenDatabase,
  onOpenNotifications,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  latestPendingUser,
  onExportBackup: _onExportBackup,
  onShowToast,
  onOpenNewsletter
}) => {
  const [birthdayImage, setBirthdayImage] = useState<BirthdayPerson | null>(null);
  // 🔔 A notice tapped on the phone opens the app here with ?aoVivo=1: straight to "📡 Ao vivo"
  const [followLive, setFollowLive] = useState(() => {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('aoVivo')) return false;
      url.searchParams.delete('aoVivo');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      return true;
    } catch {
      return false;
    }
  });
  // …and with the app already open, the tapped notice brings it here
  useEffect(() => {
    const open = () => setFollowLive(true);
    window.addEventListener('bcv-ao-vivo', open);
    return () => window.removeEventListener('bcv-ao-vivo', open);
  }, []);
  // Who has a birthday today (athletes and staff)
  const birthdaysToday = useMemo(
    () => getAllBirthdays(state.roster || [], state.staffMembers || []).filter((b) => b.isToday),
    [state.roster, state.staffMembers]
  );
  const activeMatch = (state.matches || []).find((m) => !m.finished);

  // Date Calculations for "Hoje" and "Próximos Compromissos"
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // 1. Build unified chronological list of upcoming events (Matches, Trainings & Club Events/Reuniões/Formações)
  const scheduledMatches: ScheduledMatch[] = state.schedule || [];
  const scheduledTrainings: Training[] = state.trainings || [];
  const clubEvents: ClubEvent[] = state.clubEvents || [];

  const unifiedEvents: UnifiedEvent[] = [];

  scheduledMatches.forEach((m) => {
    if (!m.date) return;
    const eventDate = new Date(`${m.date}T${m.time || '00:00'}:00`);
    const isToday = m.date === todayStr;
    const isTomorrow = m.date === tomorrowStr;
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (m.date >= todayStr || isToday) {
      unifiedEvents.push({
        id: m.id,
        kind: 'jogo',
        title: `vs ${m.opponent || 'Adversário'}`,
        opponent: m.opponent,
        date: m.date,
        time: m.time || '15:00',
        venue: m.venue,
        location: m.location,
        tournamentName: m.tournamentName || m.type,
        meetingTime: m.meetingTime,
        rawDate: eventDate,
        isToday,
        isTomorrow,
        daysUntil
      });
    }
  });

  scheduledTrainings.forEach((tr) => {
    if (!tr.date) return;
    const eventDate = new Date(`${tr.date}T${tr.time || '00:00'}:00`);
    const isToday = tr.date === todayStr;
    const isTomorrow = tr.date === tomorrowStr;
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (tr.date >= todayStr || isToday) {
      const trainingTitle = tr.trainingNumber
        ? `Treino ${tr.trainingNumber}${tr.type ? ` (${tr.type})` : ''}`
        : tr.notes
          ? tr.notes.slice(0, 30)
          : tr.type || 'Treino Técnico-Tático';

      unifiedEvents.push({
        id: tr.id,
        kind: 'treino',
        title: trainingTitle,
        date: tr.date,
        time: tr.time || '19:00',
        venue: tr.location,
        theme: tr.type || tr.notes,
        durationMinutes: tr.durationMinutes,
        rawDate: eventDate,
        isToday,
        isTomorrow,
        daysUntil
      });
    }
  });

  clubEvents.forEach((ce) => {
    if (!ce.date || ce.isCompleted) return;
    const eventDate = new Date(`${ce.date}T${ce.time || '00:00'}:00`);
    const isToday = ce.date === todayStr;
    const isTomorrow = ce.date === tomorrowStr;
    const diffTime = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const typePrefix =
      ce.type === 'reuniao'
        ? 'Reunião'
        : ce.type === 'formacao'
          ? 'Formação'
          : ce.type === 'estagio'
            ? 'Estágio'
            : 'Evento';

    if (ce.date >= todayStr || isToday) {
      unifiedEvents.push({
        id: ce.id,
        kind: 'club_event',
        title: ce.title ? `${typePrefix}: ${ce.title}` : typePrefix,
        date: ce.date,
        time: ce.time || '18:30',
        venue: ce.location,
        location: ce.location,
        attendees: ce.attendees,
        clubEventType: ce.type,
        notes: ce.notes,
        rawDate: eventDate,
        isToday,
        isTomorrow,
        daysUntil
      });
    }
  });

  unifiedEvents.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  // What needs attention, all in "Tarefas" (the attendance reminder comes on top of the usual notices)
  const settings = teamSettings(state);
  const reminder = attendanceReminder(state.trainings, settings);
  const notices = [...(reminder ? [reminder] : []), ...homeNotices(state, undefined, settings.yellowsForBan)];
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const newsletterFrom = state.currentUser?.id && team ? newsletterDue(new Date(), team.newsletterWeek) : null;
  const focus = weeklyFocus(seasonMatches(state));
  const tasks = buildHomeTasks({
    notices,
    newsletterWeek:
      newsletterFrom && onOpenNewsletter ? weekLabel(newsletterFrom, addDaysISO(newsletterFrom, 6)) : null,
    pendingUsers:
      isAppAdmin(state.currentUser) && onOpenAdminUsers
        ? {
            count: pendingUsersCount,
            latest: latestPendingUser ? `${latestPendingUser.name} (${latestPendingUser.role})` : undefined
          }
        : undefined,
    noTrainingSoon: needsNextTraining(state.trainings),
    focus
  });
  const runTask = (action: TaskAction) => {
    if (action.kind === 'newsletter') onOpenNewsletter?.();
    else if (action.kind === 'adminUsers') onOpenAdminUsers?.();
    else onNavigate(action.tab, action.targetId);
  };
  const nextUp = unifiedEvents.filter((e) => !e.isToday).slice(0, 2);
  const pulse = teamPulse(state);

  const shortcuts: { icon: IconName; label: string; tab: TabType; targetId?: string }[] = [
    { icon: 'check', label: 'Treino de hoje', tab: 'treinos', targetId: 'hoje' },
    { icon: 'clipboard', label: 'Convocatória', tab: 'convocatoria' },
    { icon: 'users', label: 'Plantel', tab: 'plantel' },
    { icon: 'chart', label: 'Análise', tab: 'analise_jogos' }
  ];

  /*
   * Início (design · etapa 1, docs/design/PROPOSTA_DASHBOARD.md). Phone: Hoje → Tarefas → A seguir → A equipa →
   * Atalhos, one column. Computer: two columns, Hoje and Tarefas on the left; A seguir, A equipa and Atalhos on the
   * right. Everything that left the old Início is still in its own module (Época, Agenda, Estatísticas, Mais).
   */
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5 pb-6 lg:gap-6">
      <HomeGreeting
        state={state}
        onOpenSettings={onOpenSettings}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        onOpenAdminUsers={onOpenAdminUsers}
        pendingUsersCount={pendingUsersCount}
      />

      {/* A game being recorded now (by the director or another coach): follow it live */}
      <LiveMatchCard state={state} onOpen={() => setFollowLive(true)} />
      {followLive && <LiveFollowModal state={state} onClose={() => setFollowLive(false)} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:gap-6">
          <section aria-label="Hoje">
            <TodayFocusCard
              unifiedEvents={unifiedEvents}
              scheduledMatches={scheduledMatches}
              activeMatch={activeMatch}
              callupOpenFor={notices.find((n) => n.id === 'convocatoria')?.targetId}
              onNavigate={onNavigate}
            />
          </section>
          <TasksBlock tasks={tasks} onRun={runTask} />

          {/* Birthdays today, with the picture to share */}
          {birthdaysToday.length > 0 && (
            <section aria-label="Aniversários de hoje">
              <BlockHead title="Hoje faz anos" />
              <ul className="ui-card divide-y divide-ui-line overflow-hidden">
                {birthdaysToday.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-brand">
                      <Icon name="cake" className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ui-body font-bold text-ui-text">
                      {b.name} <span className="font-normal text-ui-muted">· {b.nextAge} anos</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setBirthdayImage(b)}
                      className="ui-btn ui-btn-secondary min-h-10 shrink-0 px-3 text-ui-caption"
                    >
                      Imagem de parabéns
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:gap-6">
          <NextUpBlock events={nextUp} onNavigate={onNavigate} />
          <TeamStrip pulse={pulse} onNavigate={onNavigate} />
          <Shortcuts items={shortcuts} onNavigate={onNavigate} />
        </div>
      </div>

      {birthdayImage && (
        <BirthdayImageModal
          person={birthdayImage}
          state={state}
          onShowToast={(msg) => onShowToast?.(msg)}
          onClose={() => setBirthdayImage(null)}
        />
      )}
    </div>
  );
};
