import React from 'react';
import { UnifiedEvent } from './DashboardNextEvent';
import { TabType } from '../Navbar';
import { Match, ScheduledMatch } from '../../types';
import { Icon, IconName } from '../ui/Icon';

interface TodayFocusCardProps {
  unifiedEvents?: UnifiedEvent[];
  activeMatch?: Match | null;
  scheduledMatches?: ScheduledMatch[];
  /** The game whose call-up is still open (from "Tarefas"). */
  callupOpenFor?: string;
  onNavigate: (tab: TabType, targetId?: string) => void;
}

interface Action {
  label: string;
  icon?: IconName;
  primary?: boolean;
  onClick: () => void;
}

/** The kind of day: one word in colour above the hour (the colour always means the same thing). */
const KICKER = {
  live: 'text-ui-danger',
  match: 'text-ui-brand',
  training: 'text-ui-success',
  event: 'text-ui-warning'
};

/**
 * "Hoje" (design · etapa 1): what there is today, big and first. The hour, what it is and where, and one main
 * action (at most one green button per screen) with a secondary one.
 */
const Focus: React.FC<{
  id: string;
  tone: keyof typeof KICKER;
  kicker: string;
  time?: string;
  title: string;
  chips: { label: string; warn?: boolean }[];
  actions: Action[];
}> = ({ id, tone, kicker, time, title, chips, actions }) => (
  <div id={id} className="ui-card p-4 sm:p-5">
    <div className={`text-ui-caption font-bold ${KICKER[tone]}`}>{kicker}</div>
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {time && (
        <span className="text-[34px] font-bold leading-none tracking-tight text-ui-text tabular-nums sm:text-[40px]">
          {time}
        </span>
      )}
      <span className="text-ui-title font-bold text-ui-text">{title}</span>
    </div>
    {chips.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c.label} className={`ui-badge ${c.warn ? 'ui-badge-warning' : ''} font-semibold`}>
            {c.warn && <Icon name="alert" className="h-3.5 w-3.5" />}
            {c.label}
          </span>
        ))}
      </div>
    )}
    <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`ui-btn ${a.primary ? 'ui-btn-primary' : 'ui-btn-secondary'} min-h-11 px-4 text-ui-body`}
        >
          {a.icon && <Icon name={a.icon} className="h-[18px] w-[18px]" />}
          {a.label}
        </button>
      ))}
    </div>
  </div>
);

const kickerToday = (what: string) => `Hoje · ${what}`;

export const TodayFocusCard: React.FC<TodayFocusCardProps> = ({
  unifiedEvents = [],
  activeMatch,
  scheduledMatches = [],
  callupOpenFor,
  onNavigate
}) => {
  const today = (Array.isArray(unifiedEvents) ? unifiedEvents : []).filter((e) => e && e.isToday);
  const cards: React.ReactNode[] = [];

  if (activeMatch) {
    cards.push(
      <Focus
        key="live"
        id="today-focus-live-active-card"
        tone="live"
        kicker="Jogo em curso"
        title={`vs ${activeMatch.opponent || 'Adversário'}`}
        time={activeMatch.originalSchedule?.time}
        chips={[{ label: activeMatch.location === 'fora' ? 'Fora' : 'Em casa' }]}
        actions={[{ label: 'Entrar no Modo Jogo', icon: 'play', primary: true, onClick: () => onNavigate('jogo') }]}
      />
    );
  }

  // Two things today: both, the earliest first (the list is already in time order). Only the first gets the green.
  today.forEach((e) => {
    const primary = cards.length === 0;
    if (e.kind === 'jogo') {
      if (activeMatch) return; // the game being played is the card above
      const called = scheduledMatches.find((m) => m.id === e.id)?.callup?.length || 0;
      const where = e.venue || (e.location === 'fora' ? 'Fora' : 'Em casa');
      cards.push(
        <Focus
          key={e.id}
          id="today-focus-match-card"
          tone="match"
          kicker={kickerToday('Jogo')}
          time={e.time}
          title={`vs ${e.opponent || 'Adversário'}`}
          chips={[
            { label: where },
            ...(e.tournamentName
              ? [{ label: e.tournamentName.charAt(0).toUpperCase() + e.tournamentName.slice(1) }]
              : []),
            { label: `${called} convocados` },
            ...(callupOpenFor === e.id ? [{ label: 'Convocatória por fechar', warn: true }] : [])
          ]}
          actions={[
            { label: 'Iniciar Modo Jogo', icon: 'play', primary, onClick: () => onNavigate('jogo', e.id) },
            { label: 'Ver Convocatória', icon: 'clipboard', onClick: () => onNavigate('convocatoria', e.id) }
          ]}
        />
      );
    } else if (e.kind === 'treino') {
      cards.push(
        <Focus
          key={e.id}
          id="today-focus-training-card"
          tone="training"
          kicker={kickerToday('Treino')}
          time={e.time}
          title={e.title}
          chips={[e.venue, e.durationMinutes ? `${e.durationMinutes} min` : '']
            .filter((c): c is string => Boolean(c))
            .map((label) => ({ label }))}
          actions={[
            { label: 'Abrir plano de treino', icon: 'clipboard', primary, onClick: () => onNavigate('treinos', e.id) },
            { label: 'Presenças', icon: 'check', onClick: () => onNavigate('treinos', 'hoje') }
          ]}
        />
      );
    } else {
      cards.push(
        <Focus
          key={e.id}
          id="today-focus-event-card"
          tone="event"
          kicker={kickerToday('Evento')}
          time={e.time}
          title={e.title}
          chips={[e.venue, e.attendees].filter((c): c is string => Boolean(c)).map((label) => ({ label }))}
          actions={[{ label: 'Ver na Agenda', icon: 'calendar', primary, onClick: () => onNavigate('calendario') }]}
        />
      );
    }
  });

  if (cards.length === 0) {
    // Nothing today: one quiet line (what comes next is on top of "A seguir")
    return (
      <div id="today-focus-empty-card" className="ui-card flex items-center gap-3 px-4 py-3.5">
        <Icon name="calendar" className="h-5 w-5 shrink-0 text-ui-muted" />
        <span className="flex-1 text-ui-body text-ui-muted">Hoje não há nada marcado.</span>
        <button type="button" onClick={() => onNavigate('calendario')} className="text-ui-body font-bold text-ui-brand">
          Agenda
        </button>
      </div>
    );
  }
  return <div className="flex flex-col gap-3">{cards}</div>;
};
