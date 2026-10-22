import React, { useState } from 'react';

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

interface BarChartProps {
  title: string;
  categories: string[];
  /** Longer label for the tooltip (e.g. the full opponent name and date). */
  details?: string[];
  series: BarSeries[];
  unit?: string;
  height?: number;
}

/**
 * Grouped bar chart in plain SVG: thin bars with 4px rounded ends on a recessive grid, a legend for 2+ series,
 * a tooltip on hover/tap (bigger hit area than the bar) and a table view for screen readers.
 */
export const BarChart: React.FC<BarChartProps> = ({ title, categories, details, series, unit = '', height = 170 }) => {
  const [active, setActive] = useState<number | null>(null);
  const width = Math.max(320, categories.length * (series.length * 14 + 18));
  const pad = { top: 12, right: 8, bottom: 26, left: 26 };
  const plotH = height - pad.top - pad.bottom;
  const plotW = width - pad.left - pad.right;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5 / 5) * 5;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const groupW = plotW / Math.max(1, categories.length);
  const barW = Math.min(14, (groupW - 8) / series.length - 2);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</span>
        {series.length > 1 && (
          <span className="flex items-center gap-3 text-[11px] text-slate-300">
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ minWidth: width, maxWidth: width * 1.6 }}
          role="img"
          aria-label={title}
          className="block"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
              <text x={pad.left - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
                {t}
              </text>
            </g>
          ))}
          {categories.map((c, i) => {
            const gx = pad.left + i * groupW;
            const inner = series.length * (barW + 2) - 2;
            return (
              <g
                key={`${c}-${i}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={gx}
                  y={pad.top}
                  width={groupW}
                  height={plotH}
                  fill={active === i ? '#1e293b' : 'transparent'}
                />
                {series.map((s, si) => {
                  const v = s.values[i] || 0;
                  const h = Math.max(0, y(0) - y(v));
                  const x = gx + (groupW - inner) / 2 + si * (barW + 2);
                  const r = Math.min(4, barW / 2, h);
                  return h > 0 ? (
                    <path
                      key={s.name}
                      d={`M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barW - r} Q${x + barW},${y(v)} ${x + barW},${y(v) + r} V${y(0)} Z`}
                      fill={s.color}
                    />
                  ) : null;
                })}
                <text
                  x={gx + groupW / 2}
                  y={height - 9}
                  textAnchor="middle"
                  fontSize={9}
                  fill={active === i ? '#e2e8f0' : '#94a3b8'}
                >
                  {c}
                </text>
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="#475569" strokeWidth={1} />
        </svg>

        {active !== null && (
          <div
            role="status"
            className="absolute top-1 pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-100 shadow-lg whitespace-nowrap"
            style={{ left: Math.min(Math.max(0, pad.left + active * groupW - 20), width - 150) }}
          >
            <div className="font-bold">{details?.[active] || categories[active]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: s.color }} />
                {s.name}: {s.values[active] || 0}
                {unit}
              </div>
            ))}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={`${c}-${i}`}>
              <th scope="row">{details?.[i] || c}</th>
              {series.map((s) => (
                <td key={s.name}>{s.values[i] || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};
