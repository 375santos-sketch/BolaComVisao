import React from 'react';
import { AppState, ScheduledMatch, Training, UserAccount, ClubEvent } from '../../types';
import { TabType } from '../Navbar';
import { getAllBirthdays } from '../../lib/birthdayUtils';
import { generateSmartAlerts, generateSmartRecommendations } from '../../lib/intelligenceEngine';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { DashboardBirthdays } from '../dashboard/DashboardBirthdays';
import { UnifiedEvent } from '../dashboard/DashboardNextEvent';
import { TodayFocusCard } from '../dashboard/TodayFocusCard';
import { CoachExecutiveHub } from '../dashboard/CoachExecutiveHub';
import { DashboardStatsGrid } from '../dashboard/DashboardStatsGrid';
import { DashboardSmartInsights } from '../dashboard/DashboardSmartInsights';
import { DashboardScoutingHub } from '../dashboard/DashboardScoutingHub';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

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
  onUpdateState,
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

  const nextMatch =
    scheduledMatches.length > 0 ? scheduledMatches.find((m) => m.date >= todayStr) || scheduledMatches[0] : null;

  // Intelligence & Alerts
  const smartAlerts = generateSmartAlerts(state);
  const smartRecommendations = generateSmartRecommendations(state);

  // Birthdays
  const birthdaysList = getAllBirthdays(state.roster || [], state.staffMembers || []);
  const todayBirthdays = birthdaysList.filter((b) => b.isToday);
  const upcomingBirthdays = birthdaysList.filter((b) => !b.isToday).slice(0, 2);

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

      {/* 3. VISÃO DO TREINADOR: Executive Hub with 5 Key Metrics, Strong Point & Attention */}
      <CoachExecutiveHub state={state} onNavigate={onNavigate} />

      {/* 4. Birthday Celebrations (if any today/upcoming) */}
      {(todayBirthdays.length > 0 || upcomingBirthdays.length > 0) && (
        <DashboardBirthdays
          todayBirthdays={todayBirthdays}
          upcomingBirthdays={upcomingBirthdays}
          myClubName={state.myClubName || 'BolaComVisão Clube'}
        />
      )}

      {/* 5. Global Performance Statistics Grid */}
      <DashboardStatsGrid state={state} onNavigate={onNavigate} />

      {/* 5. Smart AI Alerts & Strategic Recommendations */}
      <DashboardSmartInsights
        smartAlerts={smartAlerts}
        smartRecommendations={smartRecommendations}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />

      {/* 5.1 Quick Access Hub (Biblioteca de Exercícios & Módulos Rápidos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate('biblioteca')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/40 hover:border-cyan-400/80 shadow-lg hover:shadow-[0_0_20px_rgba(0,210,255,0.2)] transition-all cursor-pointer group flex items-center justify-between gap-3"
          id="home-quick-biblioteca-btn"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              📚
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white font-['Chakra_Petch'] uppercase text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>Biblioteca</span>
                <Badge variant="cyan" size="xs">
                  {state.exerciseLibrary && state.exerciseLibrary.length > 0 ? state.exerciseLibrary.length : 10}{' '}
                  Modelos
                </Badge>
              </div>
              <div className="text-[11px] text-cyan-200/70 truncate">Dinâmicas, Rondos e Tática</div>
            </div>
          </div>
          <span className="text-cyan-400 font-bold text-xs group-hover:translate-x-1 transition-transform shrink-0">
            ➔
          </span>
        </div>

        <div
          onClick={() => onNavigate('treinos')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/30 hover:border-amber-400/70 shadow-lg transition-all cursor-pointer group flex items-center justify-between gap-3"
          id="home-quick-treinos-btn"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white font-['Chakra_Petch'] uppercase text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>Treinos</span>
                <Badge variant="amber" size="xs">
                  {(state.trainings || []).length} Sessões
                </Badge>
              </div>
              <div className="text-[11px] text-amber-200/70 truncate">Planos e Assiduidade</div>
            </div>
          </div>
          <span className="text-amber-400 font-bold text-xs group-hover:translate-x-1 transition-transform shrink-0">
            ➔
          </span>
        </div>

        <div
          onClick={() => onNavigate('convocatoria')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-purple-950/20 border border-purple-500/30 hover:border-purple-400/70 shadow-lg transition-all cursor-pointer group flex items-center justify-between gap-3"
          id="home-quick-convocatoria-btn"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white font-['Chakra_Petch'] uppercase text-xs sm:text-sm truncate flex items-center gap-1.5">
                <span>Convocatórias</span>
                <Badge variant="purple" size="xs">
                  Oficial
                </Badge>
              </div>
              <div className="text-[11px] text-purple-200/70 truncate">Logística e Lista de Jogo</div>
            </div>
          </div>
          <span className="text-purple-400 font-bold text-xs group-hover:translate-x-1 transition-transform shrink-0">
            ➔
          </span>
        </div>
      </div>

      {/* 6. Upcoming Calendar List & Opponent Scouting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Next 4 Scheduled Events Agenda */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <h2 className="text-base font-bold text-white font-sans uppercase tracking-tight">
                Agenda de Compromissos
              </h2>
            </div>
            <button
              onClick={() => onNavigate('calendario')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Ver Calendário Completo →
            </button>
          </div>

          <Card className="bg-slate-900/90 border-slate-800 p-3 sm:p-4 divide-y divide-slate-800/80 shadow-xl">
            {unifiedEvents.length > 0 ? (
              unifiedEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  onClick={() =>
                    onNavigate(evt.kind === 'jogo' ? 'convocatoria' : evt.kind === 'treino' ? 'treinos' : 'calendario')
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
              <div className="py-6 text-center text-xs font-mono text-slate-500">Nenhum compromisso agendado.</div>
            )}
          </Card>
        </div>

        {/* Scouting & Tactical Opponent Hub */}
        <DashboardScoutingHub
          state={state}
          nextMatch={nextMatch}
          onNavigate={onNavigate}
          onUpdateState={onUpdateState}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
};
