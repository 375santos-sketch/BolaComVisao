import React from 'react';
import { AppState } from '../../types';
import { TabType } from '../Navbar';
import { Icon, IconName } from '../ui/Icon';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';
import { SunModeButton } from '../ui/SunModeButton';
import { isAppAdmin } from '../../services/cloudAuthService';
import { defaultSeason } from '../../lib/utils';
import { FormLetter, HomeTask, TaskAction } from '../../lib/homeTasks';
import { UnifiedEvent } from './DashboardNextEvent';

/**
 * Início (design · etapa 1, docs/design/PROPOSTA_DASHBOARD.md): the blocks answer, in order, "what do I have
 * today?", "what do I have to do?" and "what comes next?", then the team in four figures and the shortcuts.
 */

/** "Bom dia" until noon, "Boa tarde" until 8 pm, then "Boa noite". */
const greeting = (h = new Date().getHours()) => (h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite');

const MONTH_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];
const MONTH = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** A block's title, with an optional count and a link to where the detail lives. */
export const BlockHead: React.FC<{
  title: string;
  count?: number;
  action?: { label: string; onClick: () => void };
}> = ({ title, count, action }) => (
  <div className="mb-2 flex min-h-8 items-center gap-2">
    <h2 className="text-ui-lead font-bold text-ui-text">{title}</h2>
    {count !== undefined && count > 0 && <span className="ui-badge ui-badge-warning">{count}</span>}
    {action && (
      <button type="button" onClick={action.onClick} className="ml-auto text-ui-body font-bold text-ui-brand">
        {action.label}
      </button>
    )}
  </div>
);

const RoundButton: React.FC<{
  label: string;
  icon: IconName;
  onClick: () => void;
  badge?: React.ReactNode;
}> = ({ label, icon, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="relative flex h-10 w-10 items-center justify-center rounded-ui text-ui-muted transition-colors hover:bg-ui-surface-2 hover:text-ui-text"
  >
    <Icon name={icon} className="h-5 w-5" />
    {badge}
  </button>
);

/** One line of greeting (no hero): who, which team and which day. The bell and the settings stay at hand. */
export const HomeGreeting: React.FC<{
  state: AppState;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onOpenAdminUsers?: () => void;
  pendingUsersCount?: number;
}> = ({ state, onOpenSettings, onOpenNotifications, onOpenSync, onOpenAdminUsers, pendingUsersCount = 0 }) => {
  const now = new Date();
  const unread = (state.notifications || []).filter((n) => !n.read).length;
  const count = (n: number, tone: string) => (
    <span
      className={`absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${tone}`}
    >
      {n > 9 ? '9+' : n}
    </span>
  );
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-ui-title font-bold tracking-tight text-ui-text sm:text-ui-headline">
          {greeting(now.getHours())}, <span>{state.currentUser?.name || 'Mister'}</span>
        </h1>
        <p className="mt-0.5 truncate text-ui-body text-ui-muted">
          {WEEKDAY[now.getDay()]}, {now.getDate()} de {MONTH_LONG[now.getMonth()]} ·{' '}
          {[state.myClubName, state.category, `Época ${state.season || defaultSeason()}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <SyncStatusBadge onClick={onOpenSync} fallbackSyncInfo={state.syncInfo} />
        {isAppAdmin(state.currentUser) && onOpenAdminUsers && (
          <RoundButton
            label="Gestão de utilizadores"
            icon="users"
            onClick={onOpenAdminUsers}
            badge={pendingUsersCount > 0 ? count(pendingUsersCount, 'bg-ui-warning text-ui-brand-ink') : null}
          />
        )}
        <SunModeButton className="!flex h-10 w-10 !p-0 items-center justify-center rounded-ui !border-0 !bg-transparent text-ui-muted hover:!bg-ui-surface-2" />
        {onOpenNotifications && (
          <RoundButton
            label="Notificações"
            icon="bell"
            onClick={onOpenNotifications}
            badge={unread > 0 ? count(unread, 'bg-ui-danger text-white') : null}
          />
        )}
        <RoundButton label="Definições" icon="settings" onClick={onOpenSettings} />
      </div>
    </header>
  );
};

const TONE: Record<HomeTask['tone'], string> = {
  warning: 'bg-ui-warning-soft text-ui-warning',
  danger: 'bg-ui-danger-soft text-ui-danger',
  brand: 'bg-ui-brand-soft text-ui-brand',
  neutral: 'bg-ui-surface-3 text-ui-muted'
};

/** Everything waiting for the coach, most urgent first. Each row opens where it is solved. */
export const TasksBlock: React.FC<{ tasks: HomeTask[]; onRun: (action: TaskAction) => void }> = ({ tasks, onRun }) => (
  <section aria-label="Tarefas">
    <BlockHead title="Tarefas" count={tasks.length} />
    {tasks.length === 0 ? (
      <p className="flex items-center gap-2 px-1 py-2 text-ui-body text-ui-muted">
        <Icon name="check" className="h-[18px] w-[18px] text-ui-success" /> Está tudo em dia.
      </p>
    ) : (
      <ul className="ui-card divide-y divide-ui-line overflow-hidden">
        {tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onRun(t.action)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ui-surface-2"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm ${TONE[t.tone]}`}>
                <Icon name={t.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-ui-body font-bold text-ui-text">{t.title}</span>
                {t.detail && (
                  <span className="block text-ui-caption text-ui-muted">
                    <span className="sr-only">: </span>
                    {t.detail}
                  </span>
                )}
              </span>
              <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-ui-subtle" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const eventLabel = (e: UnifiedEvent) =>
  e.kind === 'jogo' ? `vs ${e.opponent || 'Adversário'}` : e.kind === 'treino' ? e.title : e.title;

const eventDetail = (e: UnifiedEvent) =>
  [
    e.isTomorrow ? 'Amanhã' : '',
    e.time,
    e.kind === 'jogo' ? e.tournamentName : e.kind === 'treino' ? e.venue : e.venue,
    e.kind === 'jogo' ? (e.location === 'fora' ? 'Fora' : e.location ? 'Em casa' : '') : ''
  ]
    .filter(Boolean)
    .join(' · ');

/** The next two things on the calendar (today's are in "Hoje"), with the day in big. */
export const NextUpBlock: React.FC<{
  events: UnifiedEvent[];
  onNavigate: (tab: TabType, targetId?: string) => void;
}> = ({ events, onNavigate }) => (
  <section aria-label="A seguir">
    <BlockHead title="A seguir" action={{ label: 'Agenda', onClick: () => onNavigate('calendario') }} />
    {events.length === 0 ? (
      <p className="px-1 py-2 text-ui-body text-ui-muted">Nada marcado. Marca o próximo treino ou jogo na Agenda.</p>
    ) : (
      <ul className="ui-card divide-y divide-ui-line overflow-hidden">
        {events.map((e) => {
          const d = new Date(`${e.date.slice(0, 10)}T12:00:00`);
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() =>
                  onNavigate(
                    e.kind === 'jogo' ? 'convocatoria' : e.kind === 'treino' ? 'treinos' : 'calendario',
                    e.kind === 'club_event' ? undefined : e.id
                  )
                }
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ui-surface-2"
              >
                <span className="flex w-10 shrink-0 flex-col items-center leading-none">
                  <span className="text-ui-title font-bold text-ui-text tabular-nums">{d.getDate()}</span>
                  <span className="mt-1 text-ui-caption text-ui-muted">
                    {e.daysUntil <= 6 ? WEEKDAY_SHORT[d.getDay()] : MONTH[d.getMonth()]}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-ui-body font-bold text-ui-text">{eventLabel(e)}</span>
                    {e.kind !== 'jogo' && (
                      <span className={`ui-badge ${e.kind === 'treino' ? 'ui-badge-success' : ''}`}>
                        {e.kind === 'treino' ? 'Treino' : 'Evento'}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-ui-caption text-ui-muted">{eventDetail(e)}</span>
                </span>
                <Icon name="chevronRight" className="h-[18px] w-[18px] shrink-0 text-ui-subtle" />
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

const FORM_TONE: Record<FormLetter, string> = {
  V: 'bg-ui-success-soft text-ui-success',
  E: 'bg-ui-warning-soft text-ui-warning',
  D: 'bg-ui-danger-soft text-ui-danger'
};

/** The team in four figures, each one leading to a decision; a figure that needs attention gets colour and an icon. */
export const TeamStrip: React.FC<{
  pulse: {
    form: FormLetter[];
    available: number;
    squad: number;
    attendance: number | null;
    shortOfMinutes: number;
  };
  onNavigate: (tab: TabType, targetId?: string) => void;
}> = ({ pulse, onNavigate }) => {
  const cell =
    'flex min-h-[76px] flex-col justify-between gap-1.5 p-3.5 text-left transition-colors hover:bg-ui-surface-2';
  const label = 'text-ui-caption text-ui-muted';
  const figure = 'text-ui-title font-bold text-ui-text tabular-nums';
  const lowAttendance = pulse.attendance !== null && pulse.attendance < 75;
  return (
    <section aria-label="A equipa">
      <BlockHead title="A equipa" action={{ label: 'Estatísticas', onClick: () => onNavigate('stats') }} />
      <div className="ui-card grid grid-cols-2 divide-ui-line overflow-hidden [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r [&>*]:border-ui-line">
        <button type="button" className={cell} onClick={() => onNavigate('jogos')}>
          <span className={label}>Últimos jogos</span>
          {pulse.form.length ? (
            <span className="flex gap-1" aria-label={`Últimos resultados: ${pulse.form.join(' ')}`}>
              {pulse.form.map((r, i) => (
                <span
                  key={i}
                  className={`flex h-6 w-6 items-center justify-center rounded-ui-sm text-ui-caption font-bold ${FORM_TONE[r]}`}
                >
                  {r}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-ui-body text-ui-muted">Sem jogos</span>
          )}
        </button>
        <button type="button" className={cell} onClick={() => onNavigate('plantel')}>
          <span className={label}>Disponíveis</span>
          <span>
            <span className={figure}>{pulse.available}</span>
            <span className="text-ui-body text-ui-muted"> /{pulse.squad}</span>
          </span>
        </button>
        <button type="button" className={cell} onClick={() => onNavigate('treinos')}>
          <span className={label}>Presença nos treinos</span>
          <span className={`${figure} ${lowAttendance ? '!text-ui-warning' : ''} flex items-center gap-1.5`}>
            {lowAttendance && <Icon name="alert" className="h-4 w-4" />}
            {pulse.attendance === null ? '—' : `${pulse.attendance}%`}
          </span>
        </button>
        <button type="button" className={cell} onClick={() => onNavigate('stats')}>
          <span className={label}>Com poucos minutos</span>
          <span
            className={`${figure} ${pulse.shortOfMinutes ? '!text-ui-warning' : '!text-ui-muted'} flex items-center gap-1.5`}
          >
            {pulse.shortOfMinutes > 0 && <Icon name="alert" className="h-4 w-4" />}
            {pulse.shortOfMinutes}
          </span>
        </button>
      </div>
    </section>
  );
};

/** Four frequent actions. */
export const Shortcuts: React.FC<{
  items: { icon: IconName; label: string; tab: TabType; targetId?: string }[];
  onNavigate: (tab: TabType, targetId?: string) => void;
}> = ({ items, onNavigate }) => (
  <nav aria-label="Atalhos">
    <BlockHead title="Atalhos" />
    <div className="grid grid-cols-4 gap-2">
      {items.map((sc) => (
        <button
          key={sc.label}
          type="button"
          onClick={() => onNavigate(sc.tab, sc.targetId)}
          className="ui-card flex min-h-[76px] flex-col items-center justify-center gap-1.5 px-1 py-3 text-center text-ui-caption font-bold text-ui-text transition-colors hover:bg-ui-surface-2"
        >
          <Icon name={sc.icon} className="h-5 w-5 text-ui-muted" />
          <span className="leading-tight">{sc.label}</span>
        </button>
      ))}
    </div>
  </nav>
);
