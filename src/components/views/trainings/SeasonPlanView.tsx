import React, { useRef, useState } from 'react';
import { AppState } from '../../../types';
import {
  MonthThemes,
  SeasonWeek,
  THEME_LABELS,
  ThemeKey,
  objectivesFromText,
  seasonWeeks,
  themesByMonth,
  withMonthObjectives
} from '../../../lib/seasonPlan';
import { THEME_COLORS } from './themeColors';
import { seasonTotals, weeklyLoad } from '../../../lib/planningSummary';
import { localDateISO } from '../../../lib/trainingQuick';
import { StatTile } from '../../ui/StatTile';
import { SectionHeader } from '../../ui/SectionHeader';
import { EmptyState } from '../../ui/EmptyState';
import { MinutesRule, ThemeBar, WeeklyLoadChart } from './PlanningCards';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T12:00:00`).getDay()];
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1] || ym} ${ym.slice(2, 4)}`;
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];
const longMonth = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1] || ym} ${ym.slice(0, 4)}`;

/** The start of a month in the weeks list: its name and the staff's objectives for it, which can be edited here. */
const MonthHeader: React.FC<{
  month: string;
  objectives: string[];
  onSave: (objectives: string[]) => void;
}> = ({ month, objectives, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  return (
    <li className="lg:col-span-2" aria-label={`Mês de ${longMonth(month)}`}>
      <div className="flex items-center justify-between gap-2 px-1 pt-2">
        <h3 className="text-sm font-extrabold text-ui-text">{longMonth(month)}</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setText(objectives.join('\n'));
              setEditing(true);
            }}
            className="text-xs font-bold text-ui-brand"
          >
            {objectives.length ? 'Editar objetivos' : '+ Objetivos do mês'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="ui-card mt-1 space-y-2 p-3">
          <label className="block text-[11px] text-ui-muted">
            Objetivos de {longMonth(month)} (um por linha, até 5)
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={'ex.: Saída de bola a 3\nPressão logo após a perda'}
              className="ui-input mt-1 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(objectivesFromText(text));
                setEditing(false);
              }}
              className="ui-btn ui-btn-primary flex-1 py-2 text-sm"
            >
              Guardar objetivos
            </button>
            <button type="button" onClick={() => setEditing(false)} className="ui-btn ui-btn-secondary px-3 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        objectives.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`Objetivos de ${longMonth(month)}`}>
            {objectives.map((o) => (
              <li key={o} className="ui-badge ui-badge-brand">
                🎯 {o}
              </li>
            ))}
          </ul>
        )
      )}
    </li>
  );
};

/**
 * The month we are in: the staff's objectives next to what was really trained (minutes per theme of realized
 * trainings) and what is still scheduled. No status per objective: only what is already saved.
 */
const CurrentMonth: React.FC<{
  month: string;
  objectives: string[];
  summary: ReturnType<typeof seasonTotals>['month'];
  onEditObjectives?: () => void;
}> = ({ month, objectives, summary, onEditObjectives }) => (
  <section aria-label="Mês atual" className="ui-card p-4">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-ui-lead font-extrabold text-ui-text">{longMonth(month)}</h2>
      <span className="text-ui-caption text-ui-muted">
        {summary.realized.count} realizados · {summary.scheduled.count} agendados
        {summary.unclosed.count ? ` · ${summary.unclosed.count} por fechar` : ''}
      </span>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="ui-inset p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">Objetivos do mês</p>
          {onEditObjectives && (
            <button type="button" onClick={onEditObjectives} className="text-ui-caption font-bold text-ui-brand">
              {objectives.length ? 'Editar' : '+ Objetivos'}
            </button>
          )}
        </div>
        {objectives.length ? (
          <ol className="mt-2 space-y-1.5">
            {objectives.map((o, i) => (
              <li key={o} className="flex gap-2 text-ui-body text-ui-text">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-[11px] font-bold text-ui-brand">
                  {i + 1}
                </span>
                {o}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-ui-caption text-ui-muted">Sem objetivos escritos para este mês.</p>
        )}
      </div>
      <div className="ui-inset space-y-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">Trabalhado no mês</p>
          <span className="ui-figure text-ui-lead text-ui-success">{summary.realized.minutes} min</span>
        </div>
        <ThemeBar summary={summary} empty="Ainda sem minutos realizados este mês." />
        <p className="border-t border-ui-line pt-2 text-ui-caption text-ui-muted">
          Ainda agendado este mês:{' '}
          <strong className="text-ui-text">
            {summary.scheduled.count} {summary.scheduled.count === 1 ? 'treino' : 'treinos'} ·{' '}
            {summary.scheduled.minutes} min
          </strong>
        </p>
      </div>
    </div>
  </section>
);

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
  const today = localDateISO();
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
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        item.t.done ? 'bg-ui-success' : item.date < today ? 'bg-ui-warning' : 'border border-ui-success'
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-ui-text">
                      {item.t.number ? `Treino ${item.t.number}` : 'Treino'}
                      {item.t.objective ? ` · ${item.t.objective}` : ''}
                    </span>
                    <span className="shrink-0 text-ui-muted">
                      {item.t.done
                        ? `feito${item.t.minutes ? ` · ${item.t.minutes} min` : ''}`
                        : item.date < today
                          ? 'por fechar'
                          : `agendado${item.t.minutes ? ` · ${item.t.minutes} min` : ''}`}
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
export const SeasonPlanView: React.FC<{
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  onOpenTraining: (id: string) => void;
}> = ({ state, onUpdateState, onShowToast, onOpenTraining }) => {
  const weeks = seasonWeeks(state);
  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const saveObjectives = (month: string, objectives: string[]) => {
    onUpdateState({
      teams: (state.teams || []).map((t) =>
        t.id === state.activeTeamId
          ? { ...t, monthObjectives: withMonthObjectives(t.monthObjectives, month, objectives) }
          : t
      )
    });
    onShowToast(objectives.length ? `Objetivos de ${longMonth(month)} guardados ✓` : 'Objetivos apagados');
  };
  const months = themesByMonth(state);
  const list = useRef<HTMLOListElement>(null);
  const today = localDateISO();
  const totals = seasonTotals(state, today);
  const load = weeklyLoad(state, today);
  const thisMonth = today.slice(0, 7);
  const monthObjectives = team?.monthObjectives?.[thisMonth] || [];
  const jumpToMonth = () =>
    list.current
      ?.querySelector(`[aria-label="Mês de ${longMonth(thisMonth)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (weeks.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="A época ainda está vazia"
        text="A época aparece aqui semana a semana quando houver treinos ou jogos marcados."
      />
    );
  }
  const s = totals.season;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile
          label="Treinos realizados"
          value={s.realized.count}
          hint={`${s.scheduled.count} agendados`}
          icon="whistle"
          tone="success"
        />
        <StatTile
          label="Minutos realizados"
          value={s.realized.minutes}
          hint={`${s.scheduled.minutes} min ainda agendados`}
          icon="zap"
        />
        <StatTile
          label="Por fechar"
          value={s.unclosed.count}
          hint={s.unclosed.count ? 'não contam como feitos' : 'tudo fechado'}
          icon="clipboard"
          tone={s.unclosed.count ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Objetivos do mês"
          value={monthObjectives.length}
          hint={longMonth(thisMonth)}
          icon="trophy"
          tone="neutral"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CurrentMonth
          month={thisMonth}
          objectives={monthObjectives}
          summary={totals.month}
          onEditObjectives={team ? jumpToMonth : undefined}
        />
        <WeeklyLoadChart weeks={load} />
      </div>
      <MinutesRule />
      {months.length > 0 && <ThemesChart months={months} />}
      <SectionHeader
        title="Semana a semana"
        subtitle="Treinos e jogos da época; os objetivos editam-se no início de cada mês."
      />
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
        {weeks.map((w, i) => {
          const month = w.start.slice(0, 7);
          const first = i === 0 || weeks[i - 1].start.slice(0, 7) !== month;
          return (
            <React.Fragment key={w.start}>
              {first && team && (
                <MonthHeader
                  month={month}
                  objectives={team.monthObjectives?.[month] || []}
                  onSave={(o) => saveObjectives(month, o)}
                />
              )}
              <Week week={w} index={i} onOpenTraining={onOpenTraining} />
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};
