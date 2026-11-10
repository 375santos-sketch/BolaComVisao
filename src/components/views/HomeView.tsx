import React, { useEffect, useMemo, useState } from 'react';
import { teamSettings } from '../../lib/teamSettings';
import { AppState, ScheduledMatch, Training, UserAccount, ClubEvent } from '../../types';
import { TabType } from '../Navbar';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { UnifiedEvent } from '../dashboard/DashboardNextEvent';
import { TodayFocusCard } from '../dashboard/TodayFocusCard';
import { LiveFollowModal, LiveMatchCard } from '../live/LiveFollow';
import { Icon, IconName } from '../ui/Icon';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { attendanceReminder, homeNotices, seasonMatches, seasonSummary } from '../../lib/homeSummary';
import { HomeOverview } from '../dashboard/HomeOverview';
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

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-6">
      {/* 1. Header with Club Branding & Quick Management Controls */}
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

      {/* 2. HOJE: Today Focus Card (Jogo, Treino, Reunião) */}
      <TodayFocusCard
        unifiedEvents={unifiedEvents}
        scheduledMatches={scheduledMatches}
        activeMatch={activeMatch}
        onNavigate={onNavigate}
      />

      {/* 📊 The season in four figures and the focus of the week (from the team's trends) */}
      <HomeOverview
        season={state.season}
        summary={summary}
        matches={seasonMatches(state)}
        onOpenStats={() => onNavigate('stats')}
        onOpenAnalysis={() => onNavigate('analise_jogos')}
      />

      {/* 🎂 Birthdays today, with the picture to share */}
      {birthdaysToday.length > 0 && (
        <section aria-label="Aniversários de hoje" className="ui-card p-3.5 border-fuchsia-500/40 space-y-2">
          <div className="text-xs font-bold text-fuchsia-300 uppercase tracking-wide">🎂 Hoje faz anos</div>
          {birthdaysToday.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0 text-sm text-white font-bold truncate">
                {b.name} <span className="text-fuchsia-200 font-normal">· {b.nextAge} anos</span>
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
      {birthdayImage && (
        <BirthdayImageModal
          person={birthdayImage}
          state={state}
          onShowToast={(msg) => onShowToast?.(msg)}
          onClose={() => setBirthdayImage(null)}
        />
      )}

      {/* 2. Shortcuts */}
      <nav aria-label="Atalhos" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {shortcuts.map((sc) => (
          <button
            key={sc.label}
            type="button"
            onClick={() => onNavigate(sc.tab, sc.targetId)}
            className="ui-card px-3 py-3 text-sm font-bold text-ui-text flex items-center gap-2.5 text-left hover:border-ui-line-strong"
          >
            <Icon name={sc.icon} className="w-5 h-5 text-ui-brand shrink-0" />
            <span>{sc.label}</span>
          </button>
        ))}
      </nav>

      {/* 3. What needs attention (only when there is something) */}
      {notices.length > 0 && (
        <section aria-label="Avisos">
          <h2 className="ui-kicker mb-2 px-1">Para fazer</h2>
          <div className="ui-card divide-y divide-slate-800 overflow-hidden">
            {notices.map((n) => {
              // "Convocatória por fechar: vs Abrantes (sábado 01/11)" → short title, the detail below
              const cut = n.text.indexOf(': ');
              const title = cut > 0 ? n.text.slice(0, cut) : n.text;
              const detail = cut > 0 ? n.text.slice(cut + 2) : '';
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onNavigate(n.tab, n.targetId)}
                  className="w-full text-left px-3.5 py-3 flex items-start gap-3 hover:bg-slate-800/40"
                >
                  <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-100">{title}</span>
                    {detail && (
                      <span className="block text-xs text-slate-400 leading-snug">
                        <span className="sr-only">: </span>
                        {detail}
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500 text-sm shrink-0">›</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Questions about the team, answered from the app's data */}
      <AssistantCard state={state} />

      {/* 5. Next 7 days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Next 4 Scheduled Events Agenda */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="ui-kicker px-1">Próximos 7 dias</h2>
            <button
              onClick={() => onNavigate('calendario')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Ver a agenda ›
            </button>
          </div>

          <Card padding="none" className="p-1.5 sm:p-2 divide-y divide-ui-line">
            {nextDays.length > 0 ? (
              nextDays.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() =>
                    onNavigate(
                      evt.kind === 'jogo' ? 'convocatoria' : evt.kind === 'treino' ? 'treinos' : 'calendario',
                      evt.kind === 'jogo' ? evt.id : undefined
                    )
                  }
                  className="py-3 px-2 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="ui-inset w-12 h-12 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                        {new Date(evt.date).toLocaleDateString('pt-PT', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-white font-mono">{new Date(evt.date).getDate()}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={evt.kind === 'jogo' ? 'cyan' : evt.kind === 'treino' ? 'emerald' : 'purple'}
                          size="xs"
                        >
                          {evt.kind === 'jogo'
                            ? 'Jogo'
                            : evt.kind === 'treino'
                              ? 'Treino'
                              : evt.clubEventType === 'formacao'
                                ? 'Formação'
                                : evt.clubEventType === 'reuniao'
                                  ? 'Reunião'
                                  : evt.clubEventType === 'estagio'
                                    ? 'Estágio'
                                    : 'Evento'}
                        </Badge>
                        <span className="text-xs sm:text-sm font-bold text-white truncate">{evt.title}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {evt.time}h {evt.venue ? `• ${evt.venue}` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="text-slate-500 font-mono text-xs shrink-0">➔</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs font-mono text-slate-500">
                Nada marcado para os próximos 7 dias.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
