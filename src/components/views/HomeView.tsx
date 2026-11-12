import React, { useEffect, useMemo, useState } from 'react';
import { teamSettings } from '../../lib/teamSettings';
import { AppState, ScheduledMatch, Training, UserAccount, ClubEvent } from '../../types';
import { TabType } from '../Navbar';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { UnifiedEvent } from '../dashboard/DashboardNextEvent';
import { TodayFocusCard } from '../dashboard/TodayFocusCard';
import {
  DashboardHighlights,
  MonthObjectivesCard,
  QuoteCard,
  RecentActivityCard
} from '../dashboard/DashboardHighlights';
import { LiveFollowModal, LiveMatchCard } from '../live/LiveFollow';
import { Icon, IconName } from '../ui/Icon';
import {
  attendanceReminder,
  homeNotices,
  seasonMatches,
  seasonSummary,
  recentForm,
  minutesBehind
} from '../../lib/homeSummary';
import { FormCard, MinutesCard, SeasonTiles, WeeklyFocusCard } from '../dashboard/HomeOverview';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { AssistantCard } from '../assistant/AssistantCard';
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
}

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  onUpdateState: _onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenDatabase,
  onOpenNotifications,
  onOpenSync,
  onOpenAdminUsers,
  pendingUsersCount = 0,
  latestPendingUser,
  onExportBackup,
  onShowToast
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

  // What needs attention and the season at a glance (details live in Estatísticas).
  const reminder = attendanceReminder(state.trainings, teamSettings(state));
  // The attendance reminder comes on top of the usual notices (never pushing one of them out)
  const notices = [
    ...(reminder ? [reminder] : []),
    ...homeNotices(state, undefined, teamSettings(state).yellowsForBan)
  ];
  const summary = seasonSummary(state);
  const nextDays = unifiedEvents.filter((e) => e.daysUntil <= 7);

  const shortcuts: { icon: IconName; label: string; tab: TabType; targetId?: string }[] = [
    { icon: 'zap', label: 'Treino de hoje', tab: 'treinos', targetId: 'hoje' },
    { icon: 'clipboard', label: 'Convocatória', tab: 'convocatoria' },
    { icon: 'ball', label: 'Modo Jogo', tab: 'jogo' },
    { icon: 'users', label: 'Plantel', tab: 'plantel' }
  ];
  const form = recentForm(state);
  const kindLabel = (evt: UnifiedEvent) =>
    evt.kind === 'jogo'
      ? 'Jogo'
      : evt.kind === 'treino'
        ? 'Treino'
        : evt.clubEventType === 'formacao'
          ? 'Formação'
          : evt.clubEventType === 'reuniao'
            ? 'Reunião'
            : evt.clubEventType === 'estagio'
              ? 'Estágio'
              : 'Evento';

  /*
   * Dashboard: one column on the phone, in order of what the coach needs first (today, the season, what to do, the
   * last games, minutes, shortcuts, the week); on a computer a 12-column grid: today | the week, the season |
   * minutes, what to do | shortcuts, then the last games. `order` sets the phone order and `lg:order` the computer one.
   */
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 pb-6 sm:gap-5">
      <DashboardHeader
        state={state}
        onOpenSettings={onOpenSettings}
        onOpenDatabase={onOpenDatabase}
        onOpenNotifications={onOpenNotifications}
        onOpenSync={onOpenSync}
        onOpenAdminUsers={onOpenAdminUsers}
        pendingUsersCount={pendingUsersCount}
        latestPendingUser={latestPendingUser}
        onExportBackup={onExportBackup}
      />

      {/* 📡 A game being recorded now (by the director or another coach): follow it live */}
      <LiveMatchCard state={state} onOpen={() => setFollowLive(true)} />
      {followLive && <LiveFollowModal state={state} onClose={() => setFollowLive(false)} />}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-flow-dense lg:grid-cols-12">
        {/* Today (only when there is something today or a game being recorded): what to do now */}
        {(activeMatch || unifiedEvents.some((e) => e.isToday)) && (
          <div className="order-1 lg:order-1 lg:col-span-12">
            <TodayFocusCard
              unifiedEvents={unifiedEvents}
              scheduledMatches={scheduledMatches}
              activeMatch={activeMatch}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* Next training, next game and this week's minutes */}
        <div className="order-1 lg:order-2 lg:col-span-12">
          <DashboardHighlights
            state={state}
            onNavigate={onNavigate}
            callupOpenFor={notices.find((n) => n.id === 'convocatoria')?.targetId}
          />
        </div>

        {/* The month's objectives, what happened lately and a line for the day */}
        <div className="order-2 lg:order-3 lg:col-span-4">
          <MonthObjectivesCard state={state} onNavigate={onNavigate} />
        </div>
        <div className="order-3 lg:order-3 lg:col-span-4">
          <RecentActivityCard state={state} onNavigate={onNavigate} />
        </div>
        <div className="hidden lg:order-3 lg:col-span-4 lg:block">
          <QuoteCard />
        </div>

        {/* The next 7 days: beside today on a computer, at the end on the phone */}
        <section aria-label="Próximos 7 dias" className="order-10 space-y-2 lg:order-4 lg:col-span-4">
          <SectionHeader
            title="Próximos 7 dias"
            action={{ label: 'Ver a agenda', onClick: () => onNavigate('calendario') }}
          />
          {nextDays.length > 0 ? (
            <ul className="ui-card divide-y divide-ui-line overflow-hidden">
              {nextDays.map((evt) => (
                <li key={evt.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(
                        evt.kind === 'jogo' ? 'convocatoria' : evt.kind === 'treino' ? 'treinos' : 'calendario',
                        evt.kind === 'jogo' ? evt.id : undefined
                      )
                    }
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ui-surface-2"
                  >
                    <span className="ui-inset flex h-11 w-11 shrink-0 flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase text-ui-brand">
                        {new Date(evt.date).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="ui-figure text-ui-body">{new Date(evt.date).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`ui-badge ${evt.kind === 'jogo' ? 'ui-badge-brand' : evt.kind === 'treino' ? 'ui-badge-success' : ''}`}
                        >
                          {kindLabel(evt)}
                        </span>
                        <span className="truncate text-ui-body font-bold text-ui-text">{evt.title}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-ui-caption text-ui-muted">
                        {evt.time}h{evt.venue ? ` · ${evt.venue}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-ui-muted" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon="calendar" title="Nada marcado para os próximos 7 dias." />
          )}
        </section>

        {/* The season in four figures */}
        <div className="order-5 lg:order-5 lg:col-span-8">
          <SeasonTiles season={state.season} summary={summary} onOpenStats={() => onNavigate('stats')} />
        </div>

        {/* What needs attention (only when there is something) */}
        {notices.length > 0 && (
          <section aria-label="Avisos" className="order-4 space-y-2 lg:order-4 lg:col-span-8">
            <SectionHeader title="Para fazer" />
            <ul className="ui-card divide-y divide-ui-line overflow-hidden">
              {notices.map((n) => {
                // "Convocatória por fechar: vs Abrantes (sábado 01/11)" → short title, the detail below
                const cut = n.text.indexOf(': ');
                const title = cut > 0 ? n.text.slice(0, cut) : n.text;
                const detail = cut > 0 ? n.text.slice(cut + 2) : '';
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(n.tab, n.targetId)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ui-surface-2"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ui-warning" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-ui-body font-bold text-ui-text">{title}</span>
                        {detail && (
                          <span className="block text-ui-caption text-ui-muted">
                            <span className="sr-only">: </span>
                            {detail}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-ui-muted" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* The last games and the minutes, side by side on a computer */}
        {form.length >= 2 && (
          <div className="order-6 lg:order-6 lg:col-span-8">
            <FormCard form={form} onOpenStats={() => onNavigate('stats')} />
          </div>
        )}
        {form.length >= 2 && (
          <div className="order-7 lg:order-5 lg:col-span-4">
            <MinutesCard minutes={minutesBehind(state)} onOpenStats={() => onNavigate('stats')} />
          </div>
        )}

        <div className="order-8 empty:hidden lg:order-7 lg:col-span-12">
          <WeeklyFocusCard matches={seasonMatches(state)} onOpenAnalysis={() => onNavigate('analise_jogos')} />
        </div>

        {/* Shortcuts */}
        <nav aria-label="Atalhos" className="order-9 space-y-2 lg:order-6 lg:col-span-4">
          <SectionHeader title="Atalhos" className="hidden lg:flex" />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {shortcuts.map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => onNavigate(sc.tab, sc.targetId)}
                className="ui-card flex items-center gap-3 px-3.5 py-3 text-left text-ui-body font-bold text-ui-text transition-colors hover:border-ui-line-strong"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-brand">
                  <Icon name={sc.icon} className="h-4 w-4" />
                </span>
                <span>{sc.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* 🎂 Birthdays today, with the picture to share */}
        {birthdaysToday.length > 0 && (
          <section
            aria-label="Aniversários de hoje"
            className="ui-card order-11 space-y-2 p-4 lg:order-8 lg:col-span-12"
          >
            <div className="ui-kicker">🎂 Hoje faz anos</div>
            {birthdaysToday.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-ui-body font-bold text-ui-text">
                  {b.name} <span className="font-normal text-ui-muted">· {b.nextAge} anos</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBirthdayImage(b)}
                  className="ui-btn ui-btn-secondary shrink-0 px-3 py-1.5 text-xs"
                >
                  🖼️ Imagem de parabéns
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Questions about the team, answered from the app's data */}
        <div className="order-12 lg:order-9 lg:col-span-12">
          <AssistantCard state={state} />
        </div>
      </div>
      <div className="dash-foot" aria-hidden>
        <span />
        PLANEAR • TRABALHAR • EVOLUIR
        <span />
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
