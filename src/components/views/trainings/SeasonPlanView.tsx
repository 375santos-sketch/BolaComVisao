import React, { useEffect, useRef } from 'react';
import { AppState } from '../../../types';
import { MonthThemes, SeasonWeek, THEME_LABELS, ThemeKey, seasonWeeks, themesByMonth } from '../../../lib/seasonPlan';

/** One colour per theme, from the app's palette. */
const THEME_COLORS: Record<ThemeKey, string> = {
  aquecimento: '#f5b301',
  tecnica: '#22c3ee',
  tatica: '#4ea1ff',
  fisico: '#ef4444',
  jogo: '#22c55e',
  bolas_paradas: '#a78bfa',
  calma: '#8b9bb4',
  outros: '#2f4466'
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T12:00:00`).getDay()];
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] || ym} ${ym.slice(2, 4)}`;

/** Minutes of training per theme in each month: one bar per month, split by theme. */
const ThemesChart: React.FC<{ months: MonthThemes[] }> = ({ months }) => {
  const used = (Object.keys(THEME_LABELS) as ThemeKey[]).filter((k) => months.some((m) => m.minutes[k]));
  return (
    <section aria-label="Temas treinados por mês" className="ui-card space-y-2 p-3">
      <div>
        <div className="ui-kicker">Temas treinados por mês</div>
        <p className="text-xs text-ui-muted">Minutos dos exercícios dos planos de treino já feitos.</p>
      </div>
      <ul className="space-y-1.5">
        {months.map((m) => (
          <li key={m.month} className="flex items-center gap-2 text-xs">
            <span className="w-12 shrink-0 text-ui-muted">{monthName(m.month)}</span>
            <span className="flex h-3.5 flex-1 overflow-hidden rounded-full bg-ui-surface-3">
              {used.map((k) =>
                m.minutes[k] ? (
                  <span
                    key={k}
                    title={`${THEME_LABELS[k]}: ${m.minutes[k]} min`}
                    style={{ width: `${((m.minutes[k] || 0) / m.total) * 100}%`, background: THEME_COLORS[k] }}
                  />
                ) : null
              )}
            </span>
            <span className="w-14 shrink-0 text-right font-bold text-ui-text">{m.total} min</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ui-muted" aria-label="Legenda">
        {used.map((k) => (
          <li key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: THEME_COLORS[k] }} />
            {THEME_LABELS[k]}
          </li>
        ))}
      </ul>
    </section>
  );
};

const RESULT_BADGE = { V: 'ui-badge-success', E: 'ui-badge-warning', D: 'ui-badge-danger' } as const;

const Week: React.FC<{ week: SeasonWeek; index: number; onOpenTraining: (id: string) => void }> = ({
  week,
  index,
  onOpenTraining
}) => {
  const empty = week.trainings.length === 0 && week.games.length === 0;
  return (
    <li
      data-current={week.current || undefined}
      aria-label={`Semana ${index + 1}`}
      className={`ui-card p-3 ${week.current ? 'border-ui-brand' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-ui-text">
          Semana {index + 1} · {ddmm(week.start)} a {ddmm(week.end)}
        </span>
        {week.current ? (
          <span className="ui-badge ui-badge-brand">Esta semana</span>
        ) : (
          <span className="text-[11px] text-ui-muted">
            {week.trainings.length} {week.trainings.length === 1 ? 'treino' : 'treinos'} · {week.games.length}{' '}
            {week.games.length === 1 ? 'jogo' : 'jogos'}
          </span>
        )}
      </div>
      {empty ? (
        <p className="mt-1 text-xs text-ui-muted">Sem treinos nem jogos.</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {[
            ...week.trainings.map((t) => ({ kind: 'treino' as const, date: t.date, time: t.time, t })),
            ...week.games.map((g) => ({ kind: 'jogo' as const, date: g.date, time: g.time, g }))
          ]
            .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
            .map((item) =>
              item.kind === 'treino' ? (
                <li key={`t${item.t.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpenTraining(item.t.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-ui-surface-2"
                  >
                    <span className="w-14 shrink-0 text-ui-muted">
                      {weekday(item.date)} {ddmm(item.date)}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-ui-success" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ui-text">
                      {item.t.number ? `Treino ${item.t.number}` : 'Treino'}
                      {item.t.objective ? ` · ${item.t.objective}` : ''}
                    </span>
                    <span className="shrink-0 text-ui-muted">
                      {item.t.done ? 'feito' : item.t.minutes ? `${item.t.minutes} min` : 'por fazer'}
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`g${item.g.id}`} className="flex items-center gap-2 px-1.5 py-1 text-xs">
                  <span className="w-14 shrink-0 text-ui-muted">
                    {weekday(item.date)} {ddmm(item.date)}
                  </span>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-ui-brand" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-bold text-ui-text">
                    {item.g.home ? 'vs' : '@'} {item.g.opponent}
                    {item.g.time ? <span className="font-normal text-ui-muted"> · {item.g.time}</span> : null}
                  </span>
                  {item.g.result ? (
                    <span className={`ui-badge ${RESULT_BADGE[item.g.result]}`}>
                      {item.g.result} {item.g.score}
                    </span>
                  ) : (
                    <span className="text-ui-muted">por jogar</span>
                  )}
                </li>
              )
            )}
        </ul>
      )}
    </li>
  );
};

/** Treinos → Época: the months by theme, then every week of the season with its trainings and games. */
export const SeasonPlanView: React.FC<{ state: AppState; onOpenTraining: (id: string) => void }> = ({
  state,
  onOpenTraining
}) => {
  const weeks = seasonWeeks(state);
  const months = themesByMonth(state);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    list.current?.querySelector('[data-current]')?.scrollIntoView({ block: 'nearest' });
  }, []);

  if (weeks.length === 0) {
    return (
      <p className="ui-inset p-3 text-sm text-ui-muted">
        A época aparece aqui semana a semana quando houver treinos ou jogos marcados.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {months.length > 0 && <ThemesChart months={months} />}
      <div className="flex items-center gap-3 px-1 text-[11px] text-ui-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-ui-success" /> Treino
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-ui-brand" /> Jogo
        </span>
        <span className="ml-auto">{weeks.length} semanas</span>
      </div>
      <ol ref={list} aria-label="Semanas da época" className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {weeks.map((w, i) => (
          <Week key={w.start} week={w} index={i} onOpenTraining={onOpenTraining} />
        ))}
      </ol>
    </div>
  );
};
