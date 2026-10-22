import React from 'react';
import { AppState, ScheduledMatch, Training, UserAccount, ClubEvent } from '../../types';
import { TabType } from '../Navbar';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { UnifiedEvent } from '../dashboard/DashboardNextEvent';
import { TodayFocusCard } from '../dashboard/TodayFocusCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { homeNotices, seasonSummary } from '../../lib/homeSummary';

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
  onExportBackup
}) => {
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
  const notices = homeNotices(state);
  const summary = seasonSummary(state);
  const nextDays = unifiedEvents.filter((e) => e.daysUntil <= 7);

  const shortcuts: { icon: string; label: string; tab: TabType; targetId?: string; tone: string }[] = [
    {
      icon: '✅',
      label: 'Treino de hoje',
      tab: 'treinos',
      targetId: 'hoje',
      tone: 'border-emerald-500/40 text-emerald-300'
    },
    { icon: '📋', label: 'Convocatória', tab: 'convocatoria', tone: 'border-purple-500/40 text-purple-300' },
    { icon: '⏱️', label: 'Modo Jogo', tab: 'jogo', tone: 'border-cyan-500/40 text-cyan-300' },
    { icon: '👥', label: 'Plantel', tab: 'plantel', tone: 'border-amber-500/40 text-amber-300' }
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-7xl mx-auto pb-6">
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

      {/* 2. HOJE: Today Focus Card (Jogo, Treino, Reunião) */}
      <TodayFocusCard
        unifiedEvents={unifiedEvents}
        scheduledMatches={scheduledMatches}
        activeMatch={activeMatch}
        onNavigate={onNavigate}
      />

      {/* 2. Shortcuts */}
      <nav aria-label="Atalhos" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {shortcuts.map((sc) => (
          <button
            key={sc.label}
            type="button"
            onClick={() => onNavigate(sc.tab, sc.targetId)}
            className={`py-3.5 px-3 rounded-2xl bg-slate-900/90 border ${sc.tone} hover:bg-slate-800 font-['Chakra_Petch'] font-bold text-sm uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all`}
          >
            <span className="text-lg">{sc.icon}</span>
            <span>{sc.label}</span>
          </button>
        ))}
      </nav>

      {/* 3. What needs attention (only when there is something) */}
      {notices.length > 0 && (
        <section aria-label="Avisos" className="space-y-2">
          {notices.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onNavigate(n.tab, n.targetId)}
              className="w-full text-left p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 hover:border-amber-400/70 text-sm text-amber-100 flex items-center justify-between gap-3 transition-all"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">{n.icon}</span>
                <span className="leading-snug">{n.text}</span>
              </span>
              <span className="text-amber-400 text-xs shrink-0">➔</span>
            </button>
          ))}
        </section>
      )}

      {/* 4. Season at a glance */}
      <section
        aria-label="Resumo da época"
        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="text-sm text-slate-200 font-mono">
          <span className="text-xs uppercase text-cyan-400 font-bold font-sans mr-2">Época {state.season}</span>
          {summary.played === 0 ? (
            <span className="text-slate-400">Ainda sem jogos</span>
          ) : (
            <span>
              {summary.played} jogos · <b className="text-emerald-400">{summary.wins}V</b>{' '}
              <b className="text-slate-300">{summary.draws}E</b> <b className="text-rose-400">{summary.losses}D</b> ·
              golos {summary.scored}-{summary.conceded}
            </span>
          )}
          {summary.attendance !== null && <span> · assiduidade {summary.attendance}%</span>}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('stats')}
          className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
        >
          Ver estatísticas ➔
        </button>
      </section>

      {/* 5. Next 7 days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Next 4 Scheduled Events Agenda */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-base font-bold text-white font-sans uppercase tracking-tight">Próximos 7 dias</h2>
            </div>
            <button
              onClick={() => onNavigate('calendario')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Ver Calendário Completo →
            </button>
          </div>

          <Card className="bg-slate-900/90 border-slate-800 p-3 sm:p-4 divide-y divide-slate-800/80 shadow-xl">
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
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shrink-0">
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
