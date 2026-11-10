import React from 'react';
import { TeamTrend, TrendLevel, teamTrends } from '../../lib/teamTrends';
import { Match } from '../../types';

const LEVEL: Record<TrendLevel, { label: string; badge: string; bar: string; edge: string }> = {
  critico: { label: 'Crítico', badge: 'ui-badge-danger', bar: 'bg-ui-danger', edge: 'border-l-ui-danger' },
  atencao: { label: 'Atenção', badge: 'ui-badge-warning', bar: 'bg-ui-warning', edge: 'border-l-ui-warning' },
  evolucao: { label: 'Em evolução', badge: 'ui-badge-success', bar: 'bg-ui-success', edge: 'border-l-ui-success' }
};

/** One value per game, oldest first: the recent games in the trend's colour, the ones before in grey. */
const TrendBars: React.FC<{ trend: TeamTrend }> = ({ trend }) => {
  const max = Math.max(1, ...trend.series);
  const firstRecent = trend.series.length - trend.recentGames;
  return (
    <div aria-hidden className="mt-2">
      <div className="flex h-12 items-end gap-1">
        {trend.series.map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${i >= firstRecent ? LEVEL[trend.level].bar : 'bg-ui-surface-3'}`}
            style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: v ? 1 : 0.35 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ui-muted">
        <span>há {trend.series.length} jogos</span>
        <span>último jogo</span>
      </div>
    </div>
  );
};

/** A trend: what changed, the games it rests on, and what to do about it. */
const TrendCard: React.FC<{ trend: TeamTrend; onPlan?: () => void }> = ({ trend, onPlan }) => {
  const look = LEVEL[trend.level];
  const games = trend.recentGames + trend.beforeGames;
  return (
    <article className={`ui-card border-l-4 p-3 ${look.edge}`} aria-label={trend.title}>
      <div className="flex items-center justify-between gap-2">
        <span className={`ui-badge ${look.badge}`}>{look.label}</span>
        <span className="text-[11px] text-ui-muted">
          base: {games} jogos ({trend.recentGames} + {trend.beforeGames})
        </span>
      </div>
      <h3 className="mt-2 text-sm font-extrabold text-ui-text">{trend.title}</h3>
      <p className="mt-0.5 text-xs text-ui-muted">{trend.detail}</p>
      <TrendBars trend={trend} />
      <div className="mt-2 rounded-lg border border-ui-brand/30 bg-ui-brand/10 p-2.5 text-xs leading-relaxed text-ui-text">
        💡 <b>O que fazer:</b> {trend.recommendation}
        {onPlan && trend.level !== 'evolucao' && (
          <button type="button" onClick={onPlan} className="ml-1 font-extrabold text-ui-brand underline">
            Planear no treino
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-ui-muted">
        {games} jogos ainda não fazem uma tendência firme: confirmar nos próximos jogos.
      </p>
    </article>
  );
};

/** Análise → Tendências: every real change of the last games, the most serious first. */
export const TrendsSection: React.FC<{ matches: Match[] | undefined; onPlan?: () => void }> = ({ matches, onPlan }) => {
  const trends = teamTrends(matches);
  const finished = (matches || []).filter((m) => m && m.finished).length;
  return (
    <section aria-label="Tendências da equipa" className="space-y-2">
      <div className="flex items-end justify-between gap-2 px-1">
        <div>
          <div className="ui-kicker">Tendências da equipa</div>
          <p className="text-xs text-ui-muted">
            Os últimos jogos comparados com os anteriores: o que mudou e o que fazer.
          </p>
        </div>
      </div>
      {trends.length === 0 ? (
        <p className="ui-inset p-3 text-xs text-ui-muted">
          {finished < 6
            ? `As tendências aparecem com pelo menos 6 jogos terminados (há ${finished}).`
            : 'Sem mudanças claras entre os últimos jogos e os anteriores. 👍'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {trends.map((t) => (
            <TrendCard key={t.id} trend={t} onPlan={onPlan} />
          ))}
        </div>
      )}
    </section>
  );
};
