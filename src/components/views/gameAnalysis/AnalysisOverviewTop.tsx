import React from 'react';
import { Match } from '../../../types';
import { analysisOverview } from '../../../lib/analysisOverview';

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/** A small trend line through the values (0 at the bottom). */
const Spark: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 120},${26 - (v / max) * 22}`).join(' ');
  return (
    <svg viewBox="0 0 120 28" className="mt-1.5 h-7 w-full" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

const Kpi: React.FC<{ label: string; value: string; hint: string; tone?: string; children?: React.ReactNode }> = ({
  label,
  value,
  hint,
  tone = 'text-ui-text',
  children
}) => (
  <div className="ui-card p-3">
    <div className="ui-kicker">{label}</div>
    <div className={`ui-figure mt-1 text-[28px] font-black leading-none ${tone}`}>{value}</div>
    <div className="mt-1 text-ui-caption text-ui-muted">{hint}</div>
    {children}
  </div>
);

/**
 * Análise → Visão geral, on top: four figures with their trend game by game, goals per game (ours and theirs) and
 * the results as a ring. Everything from the finished games of the filter.
 */
export const AnalysisOverviewTop: React.FC<{ matches: Match[] }> = ({ matches }) => {
  const o = analysisOverview(matches);
  const n = o.games.length;
  if (!n) return null;
  const maxGoals = Math.max(1, ...o.games.flatMap((g) => [g.ours, g.theirs]));
  const x = (i: number) => (n === 1 ? 260 : 20 + (i / (n - 1)) * 480);
  const y = (v: number) => 160 - (v / maxGoals) * 130;
  const line = (key: 'ours' | 'theirs') => o.games.map((g, i) => `${x(i)},${y(g[key])}`).join(' ');
  const share = Math.round((o.points / (n * 3)) * 100);
  const w = (o.wins / n) * 100;
  const d = (o.draws / n) * 100;
  return (
    <div className="space-y-3">
      <section aria-label="Números da época" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Golos marcados" value={`${o.scored}`} hint={`${fmt(o.scored / n)} por jogo`}>
          <Spark values={o.games.map((g) => g.ours)} color="var(--color-ui-success)" />
        </Kpi>
        <Kpi label="Golos sofridos" value={`${o.conceded}`} hint={`${fmt(o.conceded / n)} por jogo`}>
          <Spark values={o.games.map((g) => g.theirs)} color="var(--color-ui-danger)" />
        </Kpi>
        <Kpi
          label="V · E · D"
          value={`${o.wins}-${o.draws}-${o.losses}`}
          hint={`${o.points} pontos de ${n * 3}`}
          tone="text-ui-success"
        >
          <div className="mt-2 flex gap-1" aria-hidden>
            {o.games.map((g) => (
              <span
                key={g.id}
                title={`${g.opponent} ${g.ours}-${g.theirs}`}
                className={`h-3 flex-1 rounded-[3px] ${
                  g.result === 'V' ? 'bg-ui-success' : g.result === 'E' ? 'bg-ui-warning' : 'bg-ui-danger'
                }`}
              />
            ))}
          </div>
        </Kpi>
        <Kpi
          label="Eficácia"
          value={o.efficiency ? `${Math.round((o.efficiency.goals / o.efficiency.shots) * 100)}%` : '—'}
          hint={
            o.efficiency
              ? `${o.efficiency.goals} golos em ${o.efficiency.shots} remates`
              : 'Sem remates registados nestes jogos'
          }
          tone="text-ui-brand"
        />
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Golos por jogo" className="ui-card p-3">
          <div className="flex items-center justify-between">
            <h3 className="ui-kicker">Golos por jogo</h3>
            <span className="text-ui-caption">
              <span className="text-ui-success">● marcados</span> <span className="text-ui-danger">● sofridos</span>
            </span>
          </div>
          <svg
            viewBox="0 0 520 190"
            className="mt-2 h-48 w-full"
            role="img"
            aria-label="Golos marcados e sofridos em cada jogo"
          >
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1="0" x2="520" y1={30 + f * 130} y2={30 + f * 130} stroke="var(--color-ui-line)" />
            ))}
            <polyline
              fill="none"
              stroke="var(--color-ui-success)"
              strokeWidth="3"
              strokeLinejoin="round"
              points={line('ours')}
            />
            <polyline
              fill="none"
              stroke="var(--color-ui-danger)"
              strokeWidth="2.5"
              strokeDasharray="6 5"
              strokeLinejoin="round"
              points={line('theirs')}
            />
            {o.games.map((g, i) => (
              <circle key={g.id} cx={x(i)} cy={y(g.ours)} r="4" fill="var(--color-ui-success)" />
            ))}
            {o.games.length <= 8 &&
              o.games.map((g, i) => (
                <text key={g.id} x={x(i)} y="184" textAnchor="middle" fontSize="11" fill="var(--color-ui-muted)">
                  {g.opponent.slice(0, 10)}
                </text>
              ))}
          </svg>
        </section>
        <section aria-label="Resultados" className="ui-card flex items-center gap-4 p-3">
          <div
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--color-ui-success) 0 ${w}%, var(--color-ui-warning) ${w}% ${w + d}%, var(--color-ui-danger) ${w + d}% 100%)`
            }}
            role="img"
            aria-label={`${share}% dos pontos possíveis`}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-ui-surface">
              <b className="ui-figure text-[22px] text-ui-text">{share}%</b>
              <small className="text-[11px] text-ui-muted">dos pontos</small>
            </div>
          </div>
          <ul className="space-y-2 text-ui-body text-ui-text">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ui-success" aria-hidden /> {o.wins}{' '}
              {o.wins === 1 ? 'vitória' : 'vitórias'}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ui-warning" aria-hidden /> {o.draws}{' '}
              {o.draws === 1 ? 'empate' : 'empates'}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ui-danger" aria-hidden /> {o.losses}{' '}
              {o.losses === 1 ? 'derrota' : 'derrotas'}
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
