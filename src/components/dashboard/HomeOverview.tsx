import React from 'react';
import { weeklyFocus } from '../../lib/teamTrends';
import { SeasonSummary } from '../../lib/homeSummary';
import { Match } from '../../types';

/**
 * Início: the season in four figures (goals for and against, wins-draws-losses, attendance) and the focus of the
 * week, taken from the team's trends. Each opens where the detail lives.
 */
export const HomeOverview: React.FC<{
  season: string;
  summary: SeasonSummary;
  matches: Match[] | undefined;
  onOpenStats: () => void;
  onOpenAnalysis: () => void;
}> = ({ season, summary, matches, onOpenStats, onOpenAnalysis }) => {
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
