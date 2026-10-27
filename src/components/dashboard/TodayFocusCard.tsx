import React from 'react';
import { UnifiedEvent } from './DashboardNextEvent';
import { TabType } from '../Navbar';
import { Match, ScheduledMatch } from '../../types';
import { Icon, IconName } from '../ui/Icon';

interface TodayFocusCardProps {
  unifiedEvents?: UnifiedEvent[];
  activeMatch?: Match | null;
  scheduledMatches?: ScheduledMatch[];
  onNavigate: (tab: TabType, targetId?: string) => void;
}

const TONES = {
  live: 'from-rose-950/90 border-rose-500/70 text-rose-300',
  match: 'from-cyan-950/90 border-cyan-500/50 text-cyan-300',
  training: 'from-emerald-950/90 border-emerald-500/50 text-emerald-300',
  event: 'from-violet-950/90 border-violet-500/50 text-violet-300',
  none: 'from-slate-900 border-slate-700 text-slate-400'
};

interface Action {
  label: string;
  icon?: IconName;
  primary?: boolean;
  onClick: () => void;
}

/** One card for today: what it is, when and where, and the one or two things to do now. */
const Focus: React.FC<{
  id: string;
  tone: keyof typeof TONES;
  kicker: string;
  title: string;
  details: string[];
  actions: Action[];
}> = ({ id, tone, kicker, title, details, actions }) => (
  <div id={id} className={`rounded-2xl border bg-gradient-to-br to-slate-900 p-4 ${TONES[tone]}`}>
    <div className="text-[11px] font-bold uppercase tracking-wide">{kicker}</div>
    <div className="mt-0.5 text-2xl font-bold text-white font-['Chakra_Petch'] leading-tight">{title}</div>
    {details.length > 0 && <div className="mt-0.5 text-sm text-slate-400">{details.join(' · ')}</div>}
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`ui-btn ${a.primary ? 'ui-btn-primary' : 'ui-btn-secondary'} px-4 py-2.5 text-sm flex items-center gap-1.5`}
        >
          {a.icon && <Icon name={a.icon} className="w-4 h-4" />}
          {a.label}
        </button>
      ))}
    </div>
  </div>
);

export const TodayFocusCard: React.FC<TodayFocusCardProps> = ({
  unifiedEvents = [],
  activeMatch,
  scheduledMatches = [],
  onNavigate
}) => {
  const safeEvents = Array.isArray(unifiedEvents) ? unifiedEvents : [];
  const now = new Date();
  const weekday = now.toLocaleDateString('pt-PT', { weekday: 'long' }).replace('-feira', '');
  const kicker = `Hoje · ${weekday}, ${now.getDate()} ${now.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')}`;

  const todayEvents = safeEvents.filter((e) => e && e.isToday);
  const todayMatch = todayEvents.find((e) => e && e.kind === 'jogo');
  const todayTraining = todayEvents.find((e) => e && e.kind === 'treino');
  const todayClubEvent = todayEvents.find((e) => e && e.kind === 'club_event');
  const nextUpcoming = safeEvents.find((e) => e && !e.isToday);

  if (activeMatch) {
    return (
      <Focus
        id="today-focus-live-active-card"
        tone="live"
        kicker="● Jogo em curso"
        title={`vs ${activeMatch.opponent || 'Adversário'}`}
        details={[activeMatch.originalSchedule?.time || '', activeMatch.location === 'fora' ? 'Fora' : 'Casa'].filter(
          Boolean
        )}
        actions={[{ label: 'Entrar no Modo Jogo', icon: 'ball', primary: true, onClick: () => onNavigate('jogo') }]}
      />
    );
  }

  if (todayMatch) {
    const called = scheduledMatches.find((m) => m.id === todayMatch.id)?.callup?.length || 0;
    return (
      <Focus
        id="today-focus-match-card"
        tone="match"
        kicker={kicker}
        title={`Jogo às ${todayMatch.time} · vs ${todayMatch.opponent}`}
        details={[todayMatch.venue || (todayMatch.location === 'fora' ? 'Fora' : 'Casa'), `${called} convocados`]}
        actions={[
          {
            label: 'Iniciar Modo Jogo',
            icon: 'ball',
            primary: true,
            onClick: () => onNavigate('jogo', todayMatch.id)
          },
          { label: 'Ver Convocatória', icon: 'clipboard', onClick: () => onNavigate('convocatoria') }
        ]}
      />
    );
  }

  if (todayTraining) {
    return (
      <Focus
        id="today-focus-training-card"
        tone="training"
        kicker={kicker}
        title={`Treino às ${todayTraining.time}`}
        details={[todayTraining.venue || 'Campo de Treinos', todayTraining.theme || todayTraining.title || ''].filter(
          Boolean
        )}
        actions={[
          { label: 'Abrir Plano de Treino', icon: 'clipboard', primary: true, onClick: () => onNavigate('treinos') },
          { label: 'Presenças', icon: 'users', onClick: () => onNavigate('treinos', 'hoje') }
        ]}
      />
    );
  }

  if (todayClubEvent) {
    return (
      <Focus
        id="today-focus-event-card"
        tone="event"
        kicker={kicker}
        title={`${todayClubEvent.title} às ${todayClubEvent.time}`}
        details={[todayClubEvent.venue || 'Sede do Clube', todayClubEvent.attendees || ''].filter(Boolean)}
        actions={[{ label: 'Ver Detalhes', icon: 'calendar', primary: true, onClick: () => onNavigate('calendario') }]}
      />
    );
  }

  const next = nextUpcoming
    ? `Próximo: ${nextUpcoming.kind === 'jogo' ? `jogo vs ${nextUpcoming.opponent}` : nextUpcoming.title} ${
        nextUpcoming.isTomorrow ? 'amanhã' : `a ${nextUpcoming.date.slice(8, 10)}/${nextUpcoming.date.slice(5, 7)}`
      } às ${nextUpcoming.time}`
    : '';
  return (
    <Focus
      id="today-focus-empty-card"
      tone="none"
      kicker={kicker}
      title="Hoje não há nada marcado"
      details={next ? [next] : []}
      actions={[{ label: 'Agenda', icon: 'calendar', onClick: () => onNavigate('calendario') }]}
    />
  );
};
