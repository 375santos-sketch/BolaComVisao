import React from 'react';

/** One game on the chart: when, and the goals each side scored. */
export interface GoalLineGame {
  id: string;
  date: string;
  scored: number;
  conceded: number;
}

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Goals scored (cyan) and conceded (grey) in the last games, oldest first, with the result of each under it. The
 * positions across are percentages, so the chart fills any width with the text at its normal size.
 */
export const GoalsLineChart: React.FC<{ games: GoalLineGame[] }> = ({ games }) => {
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
  // Many games: the result letters and dates only every few games, so they do not run into each other
  const every = Math.ceil(games.length / 10);
  const labelled = (i: number) => i % every === 0 || i === games.length - 1;
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
            {labelled(i) && (
              <text x={x(i)} y="81" fontSize="10" fontWeight="800" textAnchor="middle" fill={color}>
                {r}
              </text>
            )}
            {labelled(i) && (
              <text x={x(i)} y="93" fontSize="9" textAnchor="middle" fill="var(--color-ui-muted)">
                {ddmm(g.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
