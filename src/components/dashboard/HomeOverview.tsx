import React from 'react';
import { weeklyFocus } from '../../lib/teamTrends';
import { FormGame, SeasonSummary } from '../../lib/homeSummary';
import { GoalsLineChart } from '../trends/GoalsLineChart';
import { PLAYING_TIME_TARGET } from '../../lib/playingTime';
import { Match } from '../../types';
import { StatTile } from '../ui/StatTile';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';

/**
 * Início, the blocks of the season (the Dashboard places them in its grid): the season in four figures, the last
 * games, the minutes and the focus of the week. Each opens where the detail lives.
 */

const TARGET = Math.round(PLAYING_TIME_TARGET * 100);

/** The season in four figures: goals for and against, wins-draws-losses, training attendance. */
export const SeasonTiles: React.FC<{ season: string; summary: SeasonSummary; onOpenStats: () => void }> = ({
  season,
  summary,
  onOpenStats
}) => {
  const games = `em ${summary.played} ${summary.played === 1 ? 'jogo' : 'jogos'}`;
  const attendance = summary.attendance;
  return (
    <section aria-label="Resumo da época" className="space-y-2">
      <SectionHeader title={`Época ${season}`} action={{ label: 'Ver estatísticas', onClick: onOpenStats }} />
      {summary.played === 0 ? (
        <EmptyState
          compact
          icon="trophy"
          title="Ainda sem jogos terminados nesta época"
          text="Os números da época aparecem aqui depois do primeiro jogo."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <StatTile
            label="Marcados"
            value={summary.scored}
            hint={games}
            icon="ball"
            tone="success"
            onClick={onOpenStats}
          />
          <StatTile
            label="Sofridos"
            value={summary.conceded}
            hint={games}
            icon="ball"
            tone={summary.conceded > summary.scored ? 'danger' : 'neutral'}
            onClick={onOpenStats}
          />
          <StatTile
            label="V-E-D"
            value={`${summary.wins}-${summary.draws}-${summary.losses}`}
            hint={games}
            icon="trophy"
            tone="brand"
            onClick={onOpenStats}
          />
          <StatTile
            label="Presenças"
            value={attendance === null ? '—' : `${attendance}%`}
            hint="nos treinos"
            icon="users"
            tone={attendance === null ? 'neutral' : attendance < 75 ? 'warning' : 'success'}
            onClick={onOpenStats}
          />
        </div>
      )}
    </section>
  );
};

/** Goals scored and conceded in the last games, with the result of each. */
export const FormCard: React.FC<{ form: FormGame[]; onOpenStats: () => void }> = ({ form, onOpenStats }) => (
  <button
    type="button"
    onClick={onOpenStats}
    aria-label="Últimos jogos"
    className="ui-card h-full w-full p-4 text-left transition-colors hover:border-ui-line-strong"
  >
    <span className="flex flex-wrap items-center justify-between gap-2">
      <span className="ui-kicker">Últimos {form.length} jogos</span>
      <span className="flex gap-3 text-ui-caption text-ui-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ui-brand" /> Marcados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ui-muted" /> Sofridos
        </span>
      </span>
    </span>
    <span className="mt-2 block">
      <GoalsLineChart games={form} />
    </span>
  </button>
);

/** Athletes below the minutes target in the games they were called up for. */
export const MinutesCard: React.FC<{
  minutes: { behind: { playerId: string; name: string; callupShare: number }[]; total: number };
  onOpenStats: () => void;
}> = ({ minutes, onOpenStats }) => {
  const short = minutes.behind.length;
  return (
    <button
      type="button"
      onClick={onOpenStats}
      aria-label="Minutos de utilização"
      className="ui-card flex h-full w-full flex-col p-4 text-left transition-colors hover:border-ui-line-strong"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="ui-kicker">Minutos de utilização</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-ui-sm ${
            short ? 'bg-ui-warning-soft text-ui-warning' : 'bg-ui-success-soft text-ui-success'
          }`}
          aria-hidden
        >
          <Icon name="whistle" className="h-4 w-4" />
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <span className={`ui-figure text-ui-display ${short ? 'text-ui-warning' : 'text-ui-success'}`}>{short}</span>
        <span className="text-ui-body font-bold text-ui-muted">de {minutes.total}</span>
      </span>
      <span className="text-ui-caption text-ui-muted">
        {short
          ? `atletas abaixo de ${TARGET}% dos minutos dos jogos em que foram convocados`
          : `todos os convocados com pelo menos ${TARGET}% dos minutos dos seus jogos`}
      </span>
      {short > 0 && (
        <span className="mt-3 flex flex-wrap gap-1.5">
          {minutes.behind.slice(0, 4).map((r) => (
            <span key={r.playerId} className="ui-badge ui-badge-warning">
              {r.name.split(' ')[0]} {Math.round(r.callupShare * 100)}%
            </span>
          ))}
          {short > 4 && <span className="ui-badge">+{short - 4}</span>}
        </span>
      )}
      <span className="mt-auto pt-3 text-ui-caption font-bold text-ui-brand">Ver minutos ›</span>
    </button>
  );
};

/** The trend to work on this week, when there is one. */
export const WeeklyFocusCard: React.FC<{ matches: Match[] | undefined; onOpenAnalysis: () => void }> = ({
  matches,
  onOpenAnalysis
}) => {
  const focus = weeklyFocus(matches);
  if (!focus) return null;
  const critical = focus.level === 'critico';
  return (
    <button
      type="button"
      onClick={onOpenAnalysis}
      aria-label="Foco da semana"
      className="ui-card flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-ui-line-strong"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-ui ${
          critical ? 'bg-ui-danger-soft text-ui-danger' : 'bg-ui-warning-soft text-ui-warning'
        }`}
        aria-hidden
      >
        <Icon name="zap" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ui-kicker">Foco da semana</span>
        <span className="mt-0.5 block text-ui-lead font-extrabold text-ui-text">{focus.recommendation}</span>
        <span className="mt-1 block text-ui-caption text-ui-muted">
          {focus.title}: {focus.detail.charAt(0).toLowerCase() + focus.detail.slice(1)}. Base:{' '}
          {focus.recentGames + focus.beforeGames} jogos.
        </span>
        <span className="mt-1.5 block text-ui-caption font-bold text-ui-brand">Ver as tendências ›</span>
      </span>
    </button>
  );
};
