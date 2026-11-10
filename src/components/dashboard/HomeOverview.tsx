import React from 'react';
import { weeklyFocus } from '../../lib/teamTrends';
import { FormGame, SeasonSummary } from '../../lib/homeSummary';
import { PLAYING_TIME_TARGET } from '../../lib/playingTime';
import { Match } from '../../types';

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Goals scored (cyan) and conceded (grey) in the last games, oldest first, with the result of each under it. The
 * positions across are percentages, so the chart fills any width with the text at its normal size.
 */
const FormChart: React.FC<{ games: FormGame[] }> = ({ games }) => {
  const top = 10;
  const bottom = 66;
  const max = Math.max(1, ...games.flatMap((g) => [g.scored, g.conceded]));
  const x = (i: number) => `${games.length === 1 ? 50 : 5 + (i / (games.length - 1)) * 91}%`;
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const segments = (key: 'scored' | 'conceded', color: string, width: number) =>
    games
      .slice(1)
      .map((g, i) => (
        <line
          key={`${key}${g.id}`}
          x1={x(i)}
          y1={y(games[i][key])}
          x2={x(i + 1)}
          y2={y(g[key])}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
        />
      ));
  return (
    <svg width="100%" height="96" role="img" aria-label="Golos marcados e sofridos nos últimos jogos">
      {[0, max].map((v) => (
        <g key={v}>
          <line x1="2.5%" x2="99%" y1={y(v)} y2={y(v)} stroke="var(--color-ui-line)" strokeWidth="1" />
          <text x="0" y={y(v) + 3} fontSize="10" fill="var(--color-ui-muted)">
            {v}
          </text>
        </g>
      ))}
      {segments('conceded', 'var(--color-ui-muted)', 2)}
      {segments('scored', 'var(--color-ui-brand)', 2.5)}
      {games.map((g, i) => {
        const r = g.scored > g.conceded ? 'V' : g.scored === g.conceded ? 'E' : 'D';
        const color =
          r === 'V' ? 'var(--color-ui-success)' : r === 'E' ? 'var(--color-ui-warning)' : 'var(--color-ui-danger)';
        return (
          <g key={g.id}>
            <circle cx={x(i)} cy={y(g.conceded)} r="3" fill="var(--color-ui-muted)" />
            <circle cx={x(i)} cy={y(g.scored)} r="3.5" fill="var(--color-ui-brand)" />
            <text x={x(i)} y="81" fontSize="10" fontWeight="800" textAnchor="middle" fill={color}>
              {r}
            </text>
            <text x={x(i)} y="93" fontSize="9" textAnchor="middle" fill="var(--color-ui-muted)">
              {ddmm(g.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Início: the season in four figures (goals for and against, wins-draws-losses, attendance) and the focus of the
 * week, taken from the team's trends. Each opens where the detail lives.
 */
export const HomeOverview: React.FC<{
  season: string;
  summary: SeasonSummary;
  matches: Match[] | undefined;
  form: FormGame[];
  minutes: { behind: { playerId: string; name: string; share: number }[]; total: number };
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
            <FormChart games={form} />
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
                ? `atletas abaixo de ${Math.round(PLAYING_TIME_TARGET * 100)}% dos minutos da época`
                : `todos os atletas com pelo menos ${Math.round(PLAYING_TIME_TARGET * 100)}% dos minutos`}
            </span>
            {minutes.behind.length > 0 && (
              <span className="mt-1.5 block truncate text-xs text-ui-text">
                {minutes.behind
                  .slice(0, 4)
                  .map((r) => `${r.name.split(' ')[0]} ${Math.round(r.share * 100)}%`)
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
