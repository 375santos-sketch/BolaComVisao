import React from 'react';
import { Exercise, Player, Training } from '../../../types';
import { THEME_LABELS, ThemeKey } from '../../../lib/seasonPlan';
import {
  PeriodSummary,
  WeekLoad,
  datePT,
  dayLabel,
  trainingMinutes,
  trainingStatus
} from '../../../lib/planningSummary';
import { localDateISO } from '../../../lib/trainingQuick';
import { trainingImage } from '../../../lib/trainingImage';
import { EmptyState } from '../../ui/EmptyState';
import { SessionPhasesBar } from './SessionPhasesBar';
import { THEME_COLORS } from './themeColors';

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const cleanType = (type?: string) => (type || '').replace(/^[^\p{L}]+/u, '').trim();

/** A small pitch: the exercise's own drawing when there is one, else just the lines of a pitch (no made-up players). */
export const MiniPitch: React.FC<{ image?: string; className?: string }> = ({ image, className = 'h-16 w-24' }) =>
  image ? (
    <img src={image} alt="" className={`shrink-0 rounded-ui-sm border border-ui-line object-cover ${className}`} />
  ) : (
    <span aria-hidden className={`mini-pitch shrink-0 ${className}`} />
  );

/**
 * Treinos → Sessões: the last trainings (done or still to close), newest first, each with its drawing, date,
 * length and attendance: the sessions before are one tap away.
 */
export const RecentSessionsCard: React.FC<{
  trainings: Training[];
  library?: Exercise[];
  roster: Player[];
  onOpen: (t: Training) => void;
  onSeeAll: () => void;
}> = ({ trainings, library = [], roster, onOpen, onSeeAll }) => {
  const today = localDateISO();
  const active = roster.filter((p) => p && p.active !== false).length;
  const recent = trainings
    .filter((t) => t?.date && t.date.slice(0, 10) <= today && trainingStatus(t, today) !== 'agendado')
    .sort((a, b) => `${b.date.slice(0, 10)}${b.time || ''}`.localeCompare(`${a.date.slice(0, 10)}${a.time || ''}`))
    .slice(0, 5);
  return (
    <section aria-label="Últimas sessões" className="ui-card h-full p-3 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="ui-kicker">Últimas sessões</h2>
        <button type="button" onClick={onSeeAll} className="text-ui-caption font-bold text-ui-brand">
          Ver todas →
        </button>
      </div>
      {recent.length ? (
        <ul className="divide-y divide-ui-line">
          {recent.map((t) => {
            const done = trainingStatus(t, today) === 'realizado';
            const theme = t.sessionPlan?.objective?.trim() || cleanType(t.type);
            const present = done && active ? Math.max(0, active - (t.absences || []).length) : null;
            const minutes = trainingMinutes(t);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpen(t)}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <MiniPitch image={trainingImage(t, library)} className="h-11 w-16" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ui-body font-bold text-ui-text">
                      {t.trainingNumber ? `Treino ${t.trainingNumber}` : 'Treino'}
                      {theme ? ` · ${theme}` : ''}
                    </span>
                    <span className="block truncate text-ui-caption text-ui-muted">
                      {datePT(t.date)}
                      {minutes ? ` · ${minutes} min` : ''}
                      {present !== null ? ` · ${present} presentes` : ''}
                    </span>
                  </span>
                  <span className={`ui-badge shrink-0 ${done ? 'ui-badge-success' : 'ui-badge-warning'}`}>
                    {done ? 'Feito' : 'Por fechar'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-ui-caption text-ui-muted">Ainda sem treinos feitos nesta época.</p>
      )}
    </section>
  );
};

/**
 * Treinos → Sessões: the next training first. Date, time, place, objective and the parts of the session, with the
 * plan one tap away; with nothing scheduled, a way to create one.
 */
export const NextTrainingCard: React.FC<{
  training: Training | undefined;
  onOpenPlan: (t: Training) => void;
  onAttendance: (t: Training) => void;
  onShare: () => void;
  onPdf: (t: Training) => void;
  onCreate: () => void;
  /** The exercises of the library (their drawings). */
  library?: Exercise[];
}> = ({ training, onOpenPlan, onAttendance, onShare, onPdf, onCreate, library = [] }) => {
  if (!training) {
    return (
      <section aria-label="Próximo treino" className="ui-card p-3">
        <EmptyState
          icon="whistle"
          title="Sem treino agendado"
          text="Marca o próximo treino para o veres aqui com o plano, o local e as partes da sessão."
          action={{ label: '+ Criar treino', onClick: onCreate }}
          compact
        />
      </section>
    );
  }
  const minutes = trainingMinutes(training);
  const objective = training.sessionPlan?.objective?.trim();
  const blocks = training.sessionPlan?.blocks || [];
  return (
    <section
      aria-label="Próximo treino"
      className="ui-card relative overflow-hidden p-4 sm:p-5 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-ui-success"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-kicker text-ui-success">Próximo treino</p>
          <h2 className="mt-1 text-ui-title font-extrabold text-ui-text">
            {dayLabel(training.date)}
            {training.time ? ` · ${training.time}` : ''}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ui-caption text-ui-muted">
            {training.trainingNumber ? <span>Treino {training.trainingNumber}</span> : null}
            <span>{training.location || 'Local por definir'}</span>
            {minutes ? <span>{minutes} min</span> : null}
            {cleanType(training.type) ? <span>{cleanType(training.type)}</span> : null}
          </p>
        </div>
        <MiniPitch image={trainingImage(training, library)} className="h-16 w-24 sm:h-20 sm:w-32" />
      </div>

      <div className="ui-inset mt-3 p-3">
        <p className="text-ui-caption font-bold uppercase tracking-[0.08em] text-ui-muted">Objetivo</p>
        <p className={`mt-0.5 text-ui-body ${objective ? 'font-bold text-ui-text' : 'text-ui-muted'}`}>
          {objective || 'Sem objetivo escrito no plano.'}
        </p>
        {blocks.length > 0 ? (
          <div className="mt-3">
            <SessionPhasesBar blocks={blocks} lengthMinutes={minutes} />
          </div>
        ) : (
          <p className="mt-2 text-ui-caption text-ui-muted">Ainda sem exercícios no plano.</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => onOpenPlan(training)}
          className="ui-btn ui-btn-primary col-span-2 py-2.5 sm:col-span-1"
        >
          Abrir plano
        </button>
        <button type="button" onClick={() => onAttendance(training)} className="ui-btn ui-btn-secondary py-2.5">
          Presenças
        </button>
        <button type="button" onClick={onShare} className="ui-btn ui-btn-secondary py-2.5">
          Adjunto
        </button>
        <button
          type="button"
          onClick={() => onPdf(training)}
          className="ui-btn ui-btn-secondary col-span-2 py-2.5 sm:col-span-1"
          aria-label="PDF do plano do próximo treino"
        >
          PDF
        </button>
      </div>
    </section>
  );
};

const themeEntries = (s: PeriodSummary) =>
  (Object.keys(THEME_LABELS) as ThemeKey[])
    .filter((k) => s.themes[k])
    .map((k) => [k, s.themes[k] || 0] as const)
    .sort((a, b) => b[1] - a[1]);

/** Minutes per theme as one bar and a legend (realized trainings only). */
export const ThemeBar: React.FC<{ summary: PeriodSummary; empty: string }> = ({ summary, empty }) => {
  const entries = themeEntries(summary);
  if (entries.length === 0) return <p className="text-ui-caption text-ui-muted">{empty}</p>;
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ui-surface-3">
        {entries.map(([k, m]) => (
          <span
            key={k}
            style={{ width: `${(m / summary.themedMinutes) * 100}%`, background: THEME_COLORS[k] }}
            title={`${THEME_LABELS[k]}: ${m} min`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-ui-caption text-ui-muted">
        {entries.map(([k, m]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: THEME_COLORS[k] }} aria-hidden />
            {THEME_LABELS[k]} <strong className="text-ui-text">{m}&apos;</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Treinos → Sessões: what was done this week and what is still planned, never mixed. */
export const WeekSummaryCard: React.FC<{ week: PeriodSummary & { start: string; end: string } }> = ({ week }) => (
  <section aria-label="Esta semana" className="ui-card space-y-3 p-4">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="ui-kicker">Esta semana</h2>
      <span className="text-ui-caption text-ui-muted">
        {ddmm(week.start)} a {ddmm(week.end)}
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="ui-inset p-2">
        <p className="ui-figure text-ui-title text-ui-success">{week.realized.minutes}&apos;</p>
        <p className="text-ui-caption text-ui-muted">
          realizados · {week.realized.count} {week.realized.count === 1 ? 'treino' : 'treinos'}
        </p>
      </div>
      <div className="ui-inset p-2">
        <p className="ui-figure text-ui-title text-ui-text">{week.scheduled.minutes}&apos;</p>
        <p className="text-ui-caption text-ui-muted">
          agendados · {week.scheduled.count} {week.scheduled.count === 1 ? 'treino' : 'treinos'}
        </p>
      </div>
      <div className="ui-inset p-2">
        <p className={`ui-figure text-ui-title ${week.unclosed.count ? 'text-ui-warning' : 'text-ui-muted'}`}>
          {week.unclosed.count}
        </p>
        <p className="text-ui-caption text-ui-muted">por fechar</p>
      </div>
    </div>
    <ThemeBar summary={week} empty="Ainda sem minutos realizados esta semana." />
  </section>
);

/**
 * Época: minutes per week. The filled bar is what was done (by theme, from the plans; grey when a realized training
 * has no plan); the dashed outline on top is what is still scheduled. Trainings "por fechar" are not drawn as done.
 */
export const WeeklyLoadChart: React.FC<{ weeks: WeekLoad[] }> = ({ weeks }) => {
  if (weeks.length === 0) return null;
  const max = Math.max(60, ...weeks.map((w) => w.summary.realized.minutes + w.summary.scheduled.minutes));
  const used = (Object.keys(THEME_LABELS) as ThemeKey[]).filter((k) => weeks.some((w) => w.summary.themes[k]));
  return (
    <section aria-label="Minutos por semana" className="ui-card space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="ui-kicker">Minutos por semana</h2>
        <span className="flex items-center gap-3 text-ui-caption text-ui-muted">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-ui-success" aria-hidden /> realizado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-ui-line-strong" aria-hidden /> agendado
          </span>
        </span>
      </div>
      <div className="flex h-40 items-end gap-1.5 sm:gap-3" role="list">
        {weeks.map((w) => {
          const s = w.summary;
          const untagged = Math.max(0, s.realized.minutes - s.themedMinutes);
          const scale = (m: number) => `${(m / max) * 100}%`;
          return (
            <div
              key={w.start}
              role="listitem"
              aria-label={`Semana de ${ddmm(w.start)}: ${s.realized.minutes} min realizados, ${s.scheduled.minutes} min agendados`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] font-bold text-ui-muted">
                {s.realized.minutes || s.scheduled.minutes ? `${s.realized.minutes + s.scheduled.minutes}` : ''}
              </span>
              <div className="flex w-full max-w-10 flex-1 flex-col justify-end">
                {s.scheduled.minutes > 0 && (
                  <div
                    className="w-full rounded-t-sm border border-dashed border-ui-line-strong"
                    style={{ height: scale(s.scheduled.minutes) }}
                  />
                )}
                {untagged > 0 && <div className="w-full bg-ui-surface-3" style={{ height: scale(untagged) }} />}
                {used
                  .filter((k) => s.themes[k])
                  .reverse()
                  .map((k) => (
                    <div
                      key={k}
                      className="w-full"
                      style={{ height: scale(s.themes[k] || 0), background: THEME_COLORS[k] }}
                    />
                  ))}
              </div>
              <span
                className={`text-[10px] ${w.current ? 'rounded bg-ui-brand-soft px-1 font-bold text-ui-brand' : 'text-ui-muted'}`}
              >
                {ddmm(w.start)}
              </span>
            </div>
          );
        })}
      </div>
      {used.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-ui-caption text-ui-muted" aria-label="Legenda">
          {used.map((k) => (
            <li key={k} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: THEME_COLORS[k] }} aria-hidden />
              {THEME_LABELS[k]}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-ui-surface-3" aria-hidden />
            Sem plano
          </li>
        </ul>
      )}
    </section>
  );
};

/** How the minutes are counted, in plain words (Época and Treinos). */
export const MinutesRule: React.FC = () => (
  <details className="ui-inset p-3 text-ui-caption text-ui-muted">
    <summary className="cursor-pointer font-bold text-ui-text">Como contamos os minutos</summary>
    <ul className="mt-2 list-disc space-y-1 pl-4">
      <li>
        <strong className="text-ui-text">Realizado</strong>: treino marcado como concluído, num dia até hoje (hoje
        incluído). Só estes contam como trabalho feito.
      </li>
      <li>
        <strong className="text-ui-text">Agendado</strong>: treino de hoje ou de mais tarde ainda por concluir. Um
        treino com data futura nunca conta como feito, mesmo que tenha sido marcado como concluído.
      </li>
      <li>
        <strong className="text-ui-text">Por fechar</strong>: treino que ficou como agendado num dia que já passou. Não
        conta como feito. A app não tem um estado “cancelado”, por isso não consegue distinguir um treino cancelado de
        um que só não foi fechado: os dois ficam aqui. Não apagues treinos cancelados; deixa-os por fechar.
      </li>
      <li>
        Minutos realizados = a duração de cada treino. Minutos por tema = os minutos dos exercícios do plano, só dos
        treinos realizados. Por isso os dois podem ser diferentes: um treino sem plano soma à duração e aparece como
        “sem plano” nos temas.
      </li>
    </ul>
  </details>
);
