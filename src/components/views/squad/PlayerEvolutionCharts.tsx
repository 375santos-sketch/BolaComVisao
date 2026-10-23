import React, { useState } from 'react';
import { PLAYING_TIME_TARGET } from '../../../lib/playingTime';
import { PlayerSeason } from '../../../lib/playerSeason';
import { homeFirstScore } from '../../../lib/utils';

// Dark-surface step of the validated palette (one series) and neutral tokens for track, grid and text
const BAR = '#3987e5';
const TRACK = '#1e3448';
const GRID = '#2b4257';
const MUTED = '#8aa4ba';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] || ym;

type Game = PlayerSeason['evolution']['games'][number];

const describe = (g: Game) =>
  `${ddmm(g.date)} ${g.home ? 'vs' : '@'} ${g.opponent} ${homeFirstScore(g.scored, g.conceded, g.home)} · ` +
  (!g.calledUp
    ? 'não convocado'
    : `${g.minutes}' de ${g.totalMinutes}'${g.started ? ' · titular' : ''}${g.goals ? ` · ${g.goals} golo(s)` : ''}${
        g.assists ? ` · ${g.assists} assist.` : ''
      }`);

/**
 * The athlete's season game by game: minutes played (bar) over the minutes of the game (track), the 50% target as a
 * dashed line, goals/assists above the bar; then training attendance per month. Tap a bar for the details.
 */
export const PlayerEvolutionCharts: React.FC<{ data: PlayerSeason }> = ({ data }) => {
  const games = data.evolution.games;
  const months = data.evolution.trainingMonths;
  const [selected, setSelected] = useState<number | null>(null);
  if (games.length === 0 && months.length === 0) return null;

  // Minutes chart geometry (viewBox units; the SVG scales to the card width)
  const W = 320;
  const H = 132;
  const top = 16;
  const bottom = 18;
  const left = 22;
  const plotH = H - top - bottom;
  const maxMinutes = Math.max(1, ...games.map((g) => g.totalMinutes || 0));
  const slot = (W - left) / Math.max(games.length, 1);
  const barW = Math.max(3, Math.min(18, slot - 2));
  const y = (v: number) => top + plotH - (v / maxMinutes) * plotH;
  const labelEvery = Math.ceil(games.length / 8);
  const current = selected !== null ? games[selected] : null;

  return (
    <div className="space-y-3" aria-label="Evolução do atleta">
      {games.length > 0 && (
        <figure className="m-0">
          <figcaption className="text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1">
            Minutos jogo a jogo
          </figcaption>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Minutos jogados em cada jogo">
            {[0, maxMinutes].map((v) => (
              <g key={v}>
                <line x1={left} x2={W} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={0.5} />
                <text x={left - 3} y={y(v) + 3} fontSize={7} fill={MUTED} textAnchor="end">
                  {v}'
                </text>
              </g>
            ))}
            <line
              x1={left}
              x2={W}
              y1={y(maxMinutes * PLAYING_TIME_TARGET)}
              y2={y(maxMinutes * PLAYING_TIME_TARGET)}
              stroke={MUTED}
              strokeWidth={0.75}
              strokeDasharray="3 2"
            />
            <text
              x={left - 3}
              y={y(maxMinutes * PLAYING_TIME_TARGET) + 2.5}
              fontSize={6.5}
              fill={MUTED}
              textAnchor="end"
            >
              {Math.round(PLAYING_TIME_TARGET * 100)}%
            </text>
            {games.map((g, i) => {
              const x = left + i * slot + (slot - barW) / 2;
              const extras = [
                g.goals ? `⚽${g.goals > 1 ? g.goals : ''}` : '',
                g.assists ? `A${g.assists > 1 ? g.assists : ''}` : ''
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <g
                  key={g.matchId}
                  role="button"
                  tabIndex={0}
                  aria-label={describe(g)}
                  onClick={() => setSelected(i === selected ? null : i)}
                  onMouseEnter={() => setSelected(i)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(i)}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {/* hit target taller and wider than the mark */}
                  <rect x={left + i * slot} y={top} width={slot} height={plotH} fill="transparent" />
                  {g.calledUp ? (
                    <>
                      <rect
                        x={x}
                        y={y(g.totalMinutes)}
                        width={barW}
                        height={plotH - (y(g.totalMinutes) - top)}
                        rx={2}
                        fill={TRACK}
                      />
                      {g.minutes > 0 && (
                        <rect
                          x={x}
                          y={y(g.minutes)}
                          width={barW}
                          height={top + plotH - y(g.minutes)}
                          rx={2}
                          fill={BAR}
                          opacity={selected === null || selected === i ? 1 : 0.55}
                        />
                      )}
                    </>
                  ) : (
                    <text x={x + barW / 2} y={top + plotH - 3} fontSize={7} fill={MUTED} textAnchor="middle">
                      –
                    </text>
                  )}
                  {extras && (
                    <text
                      x={x + barW / 2}
                      y={(g.calledUp ? y(g.minutes) : top + plotH - 10) - 3}
                      fontSize={6.5}
                      fill="#e2e8f0"
                      textAnchor="middle"
                    >
                      {extras}
                    </text>
                  )}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={H - 6} fontSize={6.5} fill={MUTED} textAnchor="middle">
                      {ddmm(g.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="text-[11px] font-mono text-slate-300 min-h-[1.25rem]" aria-live="polite">
            {current
              ? describe(current)
              : 'Toque numa barra para ver o jogo. Fundo = minutos do jogo; – = não convocado.'}
          </p>
        </figure>
      )}

      {months.length > 0 && (
        <figure className="m-0">
          <figcaption className="text-[11px] font-mono uppercase text-cyan-300 font-bold mb-1">
            Treinos por mês
          </figcaption>
          <ul aria-label="Presença nos treinos por mês" className="grid gap-1">
            {months.map((m) => {
              const pct = m.held ? Math.round((m.present / m.held) * 100) : 0;
              return (
                <li key={m.month} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="w-8 text-slate-400">{monthLabel(m.month)}</span>
                  <span className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: TRACK }}>
                    <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: BAR }} />
                  </span>
                  <span className="w-20 text-right text-slate-300">
                    {m.present}/{m.held} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </figure>
      )}
    </div>
  );
};
