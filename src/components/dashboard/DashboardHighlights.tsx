import React from 'react';
import { AppState, Match, ScheduledMatch, Training } from '../../types';
import { TabType } from '../Navbar';
import { Icon, IconName } from '../ui/Icon';
import {
  nextGame,
  nextTraining,
  timePT,
  trainingMinutes,
  trainingStatus,
  weekSummary
} from '../../lib/planningSummary';
import { localDateISO } from '../../lib/trainingQuick';
import { isSeasonMatching, seasonFromDate } from '../../lib/utils';

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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
const at = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);

/** The day of an event as a small calendar sheet: "Qua / 12 / Nov". */
const DayBlock: React.FC<{ iso: string }> = ({ iso }) => {
  const d = at(iso);
  return (
    <div className="dash-day" aria-hidden>
      <small>{WEEKDAY[d.getDay()]}</small>
      <b>{d.getDate()}</b>
      <small>{MONTH[d.getMonth()]}</small>
    </div>
  );
};

const CardHead: React.FC<{ icon: IconName; title: string; action?: { label: string; onClick: () => void } }> = ({
  icon,
  title,
  action
}) => (
  <div className="mb-3 flex items-center gap-2">
    <Icon name={icon} className="h-[18px] w-[18px] text-ui-brand" />
    <h2 className="text-ui-body font-extrabold text-ui-text">{title}</h2>
    {action && (
      <button type="button" onClick={action.onClick} className="ml-auto text-ui-caption font-bold text-ui-brand">
        {action.label} →
      </button>
    )}
  </div>
);

/** What the next training is about: the plan's objective, else its type. */
const trainingTheme = (t: Training) => t.sessionPlan?.objective?.trim() || t.type?.trim() || '';

/**
 * Dashboard (Início): the first row the coach sees under the welcome. The next training, the next game and this
 * week's minutes (done against still to do), all read from what is already saved.
 */
export const DashboardHighlights: React.FC<{
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
  /** The next game's call-up is still open (from the "Para fazer" notices). */
  callupOpenFor?: string;
}> = ({ state, onNavigate, callupOpenFor }) => {
  const today = localDateISO();
  const training = nextTraining(state.trainings || [], today);
  const game: ScheduledMatch | undefined = nextGame(state.schedule || [], today);
  const week = weekSummary(state, today);
  const done = week.realized.minutes;
  const toDo = week.scheduled.minutes + week.unclosed.minutes;
  const total = done + toDo;
  const share = total ? Math.round((done / total) * 100) : 0;
  const sessions = week.realized.count + week.scheduled.count + week.unclosed.count;

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
      <section aria-label="Próximo treino" className="dash-card">
        <CardHead
          icon="whistle"
          title="Próximo treino"
          action={{ label: 'Agenda', onClick: () => onNavigate('calendario') }}
        />
        {training ? (
          <>
            <div className="flex gap-3">
              <DayBlock iso={training.date} />
              <div className="min-w-0">
                <div className="dash-big">{timePT(training.time) || '—'}</div>
                {training.location && <p className="dash-line">📍 {training.location}</p>}
                {trainingTheme(training) && <p className="dash-line">🎯 {trainingTheme(training)}</p>}
                {trainingMinutes(training) > 0 && <p className="dash-line">⏱ {trainingMinutes(training)} min</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('treinos', training.id)}
              className="ui-btn ui-btn-primary mt-3 w-full py-2.5 text-ui-body font-extrabold"
            >
              Ver plano do treino →
            </button>
          </>
        ) : (
          <p className="dash-line">Sem treinos marcados. Marca o próximo na Agenda.</p>
        )}
      </section>

      <section aria-label="Próximo jogo" className="dash-card">
        <CardHead icon="trophy" title="Próximo jogo" action={{ label: 'Jogos', onClick: () => onNavigate('jogos') }} />
        {game ? (
          <>
            <div className="flex gap-3">
              <DayBlock iso={game.date} />
              <div className="min-w-0">
                <div className="dash-big">{timePT(game.time) || '—'}</div>
                <p className="dash-line">
                  vs <b className="text-ui-text">{game.opponent || 'Adversário'}</b> ·{' '}
                  {game.location === 'fora' ? 'fora' : 'em casa'}
                </p>
                {(game.phase || game.tournamentName) && (
                  <p className="dash-line">{[game.tournamentName, game.phase].filter(Boolean).join(' · ')}</p>
                )}
                {callupOpenFor === game.id && <p className="dash-line text-ui-warning">⚠ Convocatória por fechar</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('convocatoria', game.id)}
              className="ui-btn ui-btn-secondary mt-3 w-full py-2.5 text-ui-body font-extrabold"
            >
              {callupOpenFor === game.id ? 'Fazer convocatória →' : 'Ver convocatória →'}
            </button>
          </>
        ) : (
          <p className="dash-line">Sem jogos marcados.</p>
        )}
      </section>

      <section aria-label="Resumo da semana" className="dash-card">
        <CardHead icon="chart" title="Resumo da semana" />
        {sessions ? (
          <div className="flex items-center gap-4">
            <div
              className="dash-ring"
              style={{ '--share': `${share}%` } as React.CSSProperties}
              role="img"
              aria-label={`${share}% dos minutos de treino desta semana já feitos`}
            >
              <div>
                <b>{share}%</b>
                <small>já feitos</small>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-ui-caption text-ui-text">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ui-success" aria-hidden /> Realizados
                <b className="ml-auto">{done} min</b>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ui-brand" aria-hidden /> Por fazer
                <b className="ml-auto">{toDo} min</b>
              </li>
              <li className="text-ui-muted">
                {week.realized.count} de {sessions} {sessions === 1 ? 'treino' : 'treinos'} feitos
              </li>
            </ul>
          </div>
        ) : (
          <p className="dash-line">Ainda não há treinos esta semana.</p>
        )}
      </section>
    </div>
  );
};

/** The month's objectives written in Treinos → Época (no made-up progress: only what the staff wrote). */
export const MonthObjectivesCard: React.FC<{
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
}> = ({ state, onNavigate }) => {
  const month = localDateISO().slice(0, 7);
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const objectives = (team?.monthObjectives?.[month] || []).filter((o) => o.trim());
  return (
    <section aria-label="Objetivos do mês" className="dash-card">
      <CardHead
        icon="clipboard"
        title={`Objetivos de ${MONTH_LONG[Number(month.slice(5, 7)) - 1]}`}
        action={{ label: 'Época', onClick: () => onNavigate('epoca') }}
      />
      {objectives.length ? (
        <ol className="divide-y divide-ui-line">
          {objectives.slice(0, 4).map((o, i) => (
            <li key={i} className="flex items-center gap-3 py-2 text-ui-body text-ui-text">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-ui-sm bg-ui-brand-soft text-ui-caption font-bold text-ui-brand">
                {i + 1}
              </span>
              {o}
            </li>
          ))}
        </ol>
      ) : (
        <p className="dash-line">Ainda sem objetivos para este mês. Escreve-os em Treinos → Época.</p>
      )}
    </section>
  );
};

interface Activity {
  key: string;
  date: string;
  icon: IconName;
  tone: 'success' | 'brand';
  text: string;
  go: () => void;
}

const score = (m: Match) => {
  const ours = (m.goals || []).filter((g) => g.type === 'scored').length;
  return `${ours}-${(m.goals || []).length - ours}`;
};

/** What happened lately: trainings done and games recorded, newest first (from their dates). */
export const RecentActivityCard: React.FC<{
  state: AppState;
  onNavigate: (tab: TabType, targetId?: string) => void;
}> = ({ state, onNavigate }) => {
  const today = localDateISO();
  const inSeason = (d: string) => isSeasonMatching(seasonFromDate(d), state.season);
  const items: Activity[] = [
    ...(state.trainings || [])
      .filter(
        (t) => t?.date && t.date.slice(0, 10) <= today && trainingStatus(t, today) === 'realizado' && inSeason(t.date)
      )
      .map((t) => ({
        key: `t-${t.id}`,
        date: t.date.slice(0, 10),
        icon: 'whistle' as IconName,
        tone: 'success' as const,
        text: `Treino feito${trainingTheme(t) ? ` · ${trainingTheme(t)}` : ''}`,
        go: () => onNavigate('treinos', t.id)
      })),
    ...(state.matches || [])
      .filter((m) => m?.finished && m.date && inSeason(m.date))
      .map((m) => ({
        key: `m-${m.id}`,
        date: m.date.slice(0, 10),
        icon: 'ball' as IconName,
        tone: 'brand' as const,
        text: `Jogo registado · ${score(m)} vs ${m.opponent}`,
        go: () => onNavigate('jogos', m.id)
      }))
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const when = (iso: string) => {
    const d = at(iso);
    return iso === today ? 'Hoje' : `${WEEKDAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]}`;
  };
  return (
    <section aria-label="Últimas atividades" className="dash-card">
      <CardHead
        icon="zap"
        title="Últimas atividades"
        action={{ label: 'Agenda', onClick: () => onNavigate('calendario') }}
      />
      {items.length ? (
        <ul className="divide-y divide-ui-line">
          {items.map((a) => (
            <li key={a.key}>
              <button type="button" onClick={a.go} className="flex w-full items-center gap-3 py-2 text-left">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-ui-sm ${
                    a.tone === 'success' ? 'bg-ui-success-soft text-ui-success' : 'bg-ui-brand-soft text-ui-brand'
                  }`}
                >
                  <Icon name={a.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-ui-body text-ui-text">{a.text}</span>
                <span className="shrink-0 text-ui-caption text-ui-muted">{when(a.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-line">Ainda sem treinos feitos nem jogos registados nesta época.</p>
      )}
    </section>
  );
};

/** A line to start the day with (fixed text, the app's own). */
export const QuoteCard: React.FC = () => (
  <section aria-label="Frase do dia" className="dash-card dash-quote">
    <p className="text-[18px] font-semibold leading-snug text-ui-text">“O trabalho de hoje é o resultado de amanhã.”</p>
    <p className="mt-3 text-ui-body font-black text-ui-text">
      BolaCom<span className="text-ui-brand">Visão</span>
    </p>
  </section>
);
