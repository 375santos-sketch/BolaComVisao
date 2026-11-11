import React from 'react';
import { weeklyFocus } from '../../lib/teamTrends';
import { FormGame, SeasonSummary } from '../../lib/homeSummary';
import { GoalsLineChart } from '../trends/GoalsLineChart';
import { PLAYING_TIME_TARGET } from '../../lib/playingTime';
import { Match } from '../../types';

/**
 * Início: the season in four figures (goals for and against, wins-draws-losses, attendance) and the focus of the
 * week, taken from the team's trends. Each opens where the detail lives.
 */
export const HomeOverview: React.FC<{
  season: string;
  summary: SeasonSummary;
  matches: Match[] | undefined;
  form: FormGame[];
  minutes: { behind: { playerId: string; name: string; callupShare: number }[]; total: number };
  onOpenStats: () => void;
  onOpenAnalysis: () => void;
}> = ({ season, summary, matches, form, minutes, onOpenStats, onOpenAnalysis }) => {
  const focus = weeklyFocus(matches);
  const tiles: Array<[string, string, string]> = [
    ['Marcados', String(summary.scored), `em ${summary.played} jogos`],
    ['Sofridos', String(summary.conceded), `em ${summary.played} jogos`],
    ['V-E-D', `${summary.wins}-${summary.draws}-${summary.losses}`, `em ${summary.played} jogos`],
    ['Presenças', summary.attendance === null ? '—' : `${summary.attendance}%`, 'nos treinos']
  ];
  return (
    <>
      <section aria-label="Resumo da época" className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="ui-kicker">Época {season}</span>
          <button type="button" onClick={onOpenStats} className="text-xs font-bold text-ui-brand">
            Ver estatísticas ›
          </button>
        </div>
        {summary.played === 0 ? (
          <p className="ui-card p-3 text-sm text-ui-muted">Ainda sem jogos terminados nesta época.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {tiles.map(([label, value, hint]) => (
              <button
                key={label}
                type="button"
                onClick={onOpenStats}
                className="ui-card px-1.5 py-2.5 text-center hover:border-ui-line-strong"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide text-ui-muted">{label}</span>
                <span className="ui-figure mt-1 block text-xl sm:text-2xl">{value}</span>
                <span className="mt-0.5 block truncate text-[10px] text-ui-muted">{hint}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {form.length >= 2 && (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={onOpenStats}
            aria-label="Últimos jogos"
            className="ui-card p-3 text-left hover:border-ui-line-strong lg:col-span-2"
          >
            <span className="flex items-center justify-between">
              <span className="ui-kicker">Últimos {form.length} jogos</span>
              <span className="flex gap-3 text-[11px] text-ui-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-ui-brand" /> Marcados
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-ui-muted" /> Sofridos
                </span>
              </span>
            </span>
            <GoalsLineChart games={form} />
          </button>
          <button
            type="button"
            onClick={onOpenStats}
            aria-label="Minutos de utilização"
            className={`ui-card border-l-4 p-3 text-left hover:border-ui-line-strong lg:flex lg:flex-col lg:justify-center ${
              minutes.behind.length ? 'border-l-ui-warning' : 'border-l-ui-success'
            }`}
          >
            <span className="ui-kicker">Minutos de utilização</span>
            <span className="ui-figure mt-1 block text-2xl">
              {minutes.behind.length}
              <span className="text-sm font-bold text-ui-muted"> de {minutes.total}</span>
            </span>
            <span className="block text-xs text-ui-muted">
              {minutes.behind.length
                ? `atletas abaixo de ${Math.round(PLAYING_TIME_TARGET * 100)}% dos minutos dos jogos em que foram convocados`
                : `todos os convocados com pelo menos ${Math.round(PLAYING_TIME_TARGET * 100)}% dos minutos dos seus jogos`}
            </span>
            {minutes.behind.length > 0 && (
              <span className="mt-1.5 block truncate text-xs text-ui-text">
                {minutes.behind
                  .slice(0, 4)
                  .map((r) => `${r.name.split(' ')[0]} ${Math.round(r.callupShare * 100)}%`)
                  .join(' · ')}
                {minutes.behind.length > 4 ? ' …' : ''}
              </span>
            )}
            <span className="mt-1.5 block text-xs font-bold text-ui-brand">Ver minutos ›</span>
          </button>
        </div>
      )}

      {focus && (
        <button
          type="button"
          onClick={onOpenAnalysis}
          aria-label="Foco da semana"
          className={`ui-card border-l-4 p-3 text-left ${
            focus.level === 'critico' ? 'border-l-ui-danger' : 'border-l-ui-warning'
          }`}
        >
          <span className="ui-kicker">⚠️ Foco da semana</span>
          <span className="mt-1 block text-[15px] font-extrabold text-ui-text">{focus.recommendation}</span>
          <span className="mt-1 block text-xs text-ui-muted">
            {focus.title}: {focus.detail.charAt(0).toLowerCase() + focus.detail.slice(1)}. Base:{' '}
            {focus.recentGames + focus.beforeGames} jogos.
          </span>
          <span className="mt-1.5 block text-xs font-bold text-ui-brand">Ver as tendências ›</span>
        </button>
      )}
    </>
  );
};
