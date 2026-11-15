import React, { useState } from 'react';
import { EvaluationArea, GoalStatus, Player, PlayerEvaluation, PlayerGoal } from '../../../types';
import {
  EVALUATION_AREAS,
  averageOf,
  evaluationsOf,
  formatScore,
  goalsOf,
  isOverdue,
  reformulatedGoal,
  statusOf,
  toggledGoal,
  withGoal,
  withGoalNote,
  withoutEvaluation,
  withoutGoal
} from '../../../lib/playerEvolution';
import { DateTimePT } from '../../ui/DateTimePT';
import { CompetencyCard } from './CompetencyCard';
import { VjCompetencyStat } from '../../../lib/vjCompetencies';
import { localDateISO } from '../../../lib/trainingQuick';
import { uid } from '../../../lib/utils';

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Radar of the five areas: the last evaluation over the one before it (the athlete against himself, never others). */
const Radar: React.FC<{ last: PlayerEvaluation; before?: PlayerEvaluation }> = ({ last, before }) => {
  const R = 78;
  const at = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / EVALUATION_AREAS.length;
    return [110 + ((R * v) / 5) * Math.cos(a), 100 + ((R * v) / 5) * Math.sin(a)];
  };
  const shape = (e: PlayerEvaluation) =>
    EVALUATION_AREAS.map((a, i) =>
      at(i, e.scores[a.key])
        .map((n) => n.toFixed(1))
        .join(',')
    ).join(' ');
  const ring = (v: number) =>
    EVALUATION_AREAS.map((_, i) =>
      at(i, v)
        .map((n) => n.toFixed(1))
        .join(',')
    ).join(' ');
  const summary = EVALUATION_AREAS.map((a) => `${a.short} ${last.scores[a.key]}`).join(', ');
  return (
    <figure className="m-0">
      <svg viewBox="-55 -12 330 220" className="w-full" role="img" aria-label={`Competências: ${summary}`}>
        {[1, 2, 3, 4, 5].map((v) => (
          <polygon key={v} points={ring(v)} fill="none" stroke="var(--color-ui-line)" />
        ))}
        {EVALUATION_AREAS.map((a, i) => {
          const [x, y] = at(i, 5);
          const [tx, ty] = at(i, 6.1);
          const cos = Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / EVALUATION_AREAS.length);
          return (
            <g key={a.key}>
              <line x1="110" y1="100" x2={x} y2={y} stroke="var(--color-ui-line)" />
              <text
                x={tx}
                y={ty + 4}
                textAnchor={Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end'}
                fontSize="10"
                fontWeight="700"
                fill="var(--color-ui-muted)"
              >
                {a.short}
              </text>
            </g>
          );
        })}
        {before && (
          <polygon
            points={shape(before)}
            fill="rgb(139 155 180 / 0.15)"
            stroke="var(--color-ui-muted)"
            strokeDasharray="3 3"
          />
        )}
        <polygon points={shape(last)} fill="rgb(34 195 238 / 0.22)" stroke="var(--color-ui-brand)" strokeWidth="2" />
      </svg>
      <figcaption className="flex justify-center gap-4 text-[11px] text-ui-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-ui-brand" />
          {ddmm(last.date)}
        </span>
        {before && (
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-ui-muted" />
            {ddmm(before.date)}
          </span>
        )}
      </figcaption>
    </figure>
  );
};

/**
 * Ficha do atleta → Evolução: the periodic evaluations (radar of the last one over the one before), the coach's
 * notes on each, and the athlete's individual goals. Only for the coaches.
 */
export const PlayerEvolutionSection: React.FC<{
  player: Player;
  onSavePlayer?: (player: Player) => void;
  onShowToast: (msg: string) => void;
  /** Only the evaluations or only the goals (the athlete's sheet shows them in two sections); both by default. */
  part?: 'avaliacoes' | 'objetivos';
  /** Opens with the new evaluation form (the "Avaliar" button of the sheet). */
  startEvaluating?: boolean;
  /** D1: who is evaluating (recorded in each evaluation). */
  evaluator?: { uid?: string; name?: string };
  /** VJ5: the Visão de Jogo sessions this athlete was in, by competency. */
  vjStats?: Record<string, VjCompetencyStat>;
}> = ({ player, onSavePlayer, onShowToast, part, startEvaluating = false, evaluator, vjStats }) => {
  const evaluations = evaluationsOf(player);
  const goals = goalsOf(player);
  const [last, before] = evaluations;
  const save = (next: Player, msg: string) => {
    if (!onSavePlayer) return;
    onSavePlayer(next);
    onShowToast(msg);
  };

  return (
    <div className="space-y-3">
      {part !== 'objetivos' && (
        <CompetencyCard
          player={player}
          evaluator={evaluator}
          startEvaluating={startEvaluating}
          onSave={onSavePlayer ? save : undefined}
          vjStats={vjStats}
        />
      )}
      {part !== 'objetivos' && last && (
        <details aria-label="Avaliações antigas" className="ui-card p-3">
          <summary className="cursor-pointer text-xs text-ui-muted">
            <b>Avaliações antigas (escala 1–5)</b> · {evaluations.length} · ficam como estavam, não são convertidas em
            níveis
          </summary>
          <div className="mt-2 space-y-2">
            <Radar last={last} before={before} />
            <ul aria-label="Lista de avaliações" className="divide-y divide-ui-line">
              {evaluations.map((e, i) => {
                const prev = evaluations[i + 1];
                const diff = prev ? averageOf(e) - averageOf(prev) : null;
                return (
                  <li key={e.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm text-ui-text">
                        {ddmm(e.date)} · média {formatScore(averageOf(e))}
                      </b>
                      <span className="flex items-center gap-1.5">
                        {diff === null ? (
                          <span className="ui-badge">1.ª</span>
                        ) : (
                          <span
                            className={`ui-badge ${diff > 0 ? 'ui-badge-success' : diff < 0 ? 'ui-badge-warning' : ''}`}
                          >
                            {diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : '= '}
                            {formatScore(Math.abs(diff))}
                          </span>
                        )}
                        {onSavePlayer && (
                          <button
                            type="button"
                            aria-label={`Apagar a avaliação de ${ddmm(e.date)}`}
                            onClick={() => {
                              if (window.confirm(`Apagar a avaliação de ${ddmm(e.date)}?`))
                                save(withoutEvaluation(player, e.id), 'Avaliação apagada');
                            }}
                            className="px-1 text-xs text-ui-muted hover:text-ui-danger"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] text-ui-muted">
                      {EVALUATION_AREAS.map((a) => `${a.short} ${e.scores[a.key]}`).join(' · ')}
                    </div>
                    {e.note && <p className="mt-1 rounded-lg bg-ui-surface-2 p-2 text-xs text-ui-text">📝 {e.note}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      )}

      {part !== 'avaliacoes' && <GoalsCard player={player} goals={goals} onSave={onSavePlayer ? save : undefined} />}

      {part !== 'avaliacoes' && (
        <p className="text-[11px] text-ui-muted">
          🔒 Avaliações e objetivos são só para os treinadores: nunca aparecem nos PDFs para os pais, nas partilhas nem
          em comparações entre colegas.
        </p>
      )}
    </div>
  );
};

const STATUS_LABEL: Record<GoalStatus, { label: string; cls: string }> = {
  em_curso: { label: 'Em curso', cls: 'bg-ui-brand/15 text-ui-brand' },
  alcancado: { label: 'Alcançado', cls: 'bg-ui-success/15 text-ui-success' },
  reformulado: { label: 'Reformulado', cls: 'bg-ui-surface-2 text-ui-muted' }
};

type GoalFilter = 'em_curso' | 'alcancado' | 'todos';

/**
 * D2 — Objetivos individuais with a state (em curso, alcançado, reformulado), an optional deadline (shown when it
 * has passed), the latest progress note, and reformulation that keeps the old goal linked to the new one.
 */
const GoalsCard: React.FC<{
  player: Player;
  goals: PlayerGoal[];
  onSave?: (next: Player, msg: string) => void;
}> = ({ player, goals, onSave }) => {
  const today = localDateISO();
  const [filter, setFilter] = useState<GoalFilter>('em_curso');
  const [text, setText] = useState('');
  const [area, setArea] = useState<EvaluationArea | ''>('');
  const [due, setDue] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [reformFor, setReformFor] = useState<PlayerGoal | null>(null);
  const [reform, setReform] = useState({ text: '', area: '' as EvaluationArea | '', due: '' });
  const count = (st: GoalStatus) => goals.filter((g) => statusOf(g) === st).length;
  const shown = goals.filter((g) => filter === 'todos' || statusOf(g) === filter);
  const byId = new Map(goals.map((g) => [g.id, g]));
  const areaLabel = (a?: EvaluationArea) => EVALUATION_AREAS.find((x) => x.key === a)?.label;

  const meta = (g: PlayerGoal) => {
    const st = statusOf(g);
    return [
      areaLabel(g.area),
      `desde ${ddmm(g.createdAt)}`,
      st === 'alcancado' && g.doneAt ? `alcançado a ${ddmm(g.doneAt)}` : null,
      st === 'reformulado' && g.reformulatedAt ? `reformulado a ${ddmm(g.reformulatedAt)}` : null,
      st === 'em_curso' && g.dueDate ? `prazo ${ddmm(g.dueDate)}` : null
    ]
      .filter(Boolean)
      .join(' · ');
  };

  return (
    <section aria-label="Objetivos individuais" className="ui-card space-y-2 p-3">
      <span className="ui-kicker">Objetivos individuais</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mostrar">
        {(
          [
            ['em_curso', `Em curso · ${count('em_curso')}`],
            ['alcancado', `Alcançados · ${count('alcancado')}`],
            ['todos', 'Todos']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
              filter === key ? 'border-ui-brand bg-ui-brand/10 text-ui-text' : 'border-ui-line text-ui-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-xs text-ui-muted">
          {goals.length === 0 ? 'Ainda sem objetivos para este atleta.' : 'Nenhum objetivo neste filtro.'}
        </p>
      )}
      <ul className="divide-y divide-ui-line">
        {shown.map((g) => {
          const st = statusOf(g);
          const next = g.replacedBy ? byId.get(g.replacedBy) : undefined;
          return (
            <li key={g.id} className="space-y-1.5 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className={`block text-sm ${st === 'reformulado' ? 'text-ui-muted' : 'text-ui-text'}`}>{g.text}</b>
                  <span className="text-[11px] text-ui-muted">
                    {meta(g)}
                    {isOverdue(g, today) && <b className="text-ui-warning"> · passou o prazo</b>}
                  </span>
                  {next && <span className="block text-[11px] text-ui-muted">↳ passou a «{next.text}»</span>}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_LABEL[st].cls}`}>
                  {STATUS_LABEL[st].label}
                </span>
              </div>
              {g.note && (
                <p className="rounded-ui border border-ui-line px-2 py-1.5 text-xs text-ui-text">
                  📝 {g.noteAt ? `${ddmm(g.noteAt)}: ` : ''}
                  {g.note}
                </p>
              )}
              {onSave && st !== 'reformulado' && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSave(
                        toggledGoal(player, g.id, today),
                        st === 'alcancado' ? 'Objetivo reaberto' : 'Objetivo alcançado 🎯'
                      )
                    }
                    className={`ui-btn px-2.5 py-1 text-[11px] ${st === 'alcancado' ? 'ui-btn-soft' : 'ui-btn-secondary text-ui-success'}`}
                  >
                    {st === 'alcancado' ? '↺ Reabrir' : '✓ Alcançado'}
                  </button>
                  {st === 'em_curso' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setReformFor(g);
                          setReform({ text: g.text, area: g.area || '', due: '' });
                        }}
                        className="ui-btn ui-btn-soft px-2.5 py-1 text-[11px]"
                      >
                        ↻ Reformular
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteFor(noteFor === g.id ? null : g.id);
                          setNoteText(g.note || '');
                        }}
                        className="ui-btn ui-btn-soft px-2.5 py-1 text-[11px]"
                      >
                        📝 Nota
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={`Apagar o objetivo ${g.text}`}
                    onClick={() => onSave(withoutGoal(player, g.id), 'Objetivo apagado')}
                    className="ml-auto px-1 text-xs text-ui-muted hover:text-ui-danger"
                  >
                    ✕
                  </button>
                </div>
              )}
              {onSave && noteFor === g.id && (
                <form
                  className="flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSave(withGoalNote(player, g.id, noteText, today), 'Nota guardada 📝');
                    setNoteFor(null);
                  }}
                >
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    maxLength={200}
                    aria-label={`Nota de progresso: ${g.text}`}
                    placeholder="Ex.: já abre o corpo no rondo; falta sob pressão"
                    className="ui-input min-w-0 flex-1 text-xs"
                  />
                  <button type="submit" className="ui-btn ui-btn-secondary px-3 text-xs">
                    Guardar
                  </button>
                </form>
              )}
              {onSave && reformFor?.id === g.id && (
                <form
                  aria-label="Reformular objetivo"
                  className="space-y-1.5 rounded-ui border border-ui-line p-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!reform.text.trim()) return;
                    onSave(
                      reformulatedGoal(
                        player,
                        g.id,
                        {
                          id: uid(),
                          text: reform.text,
                          createdAt: today,
                          ...(reform.area ? { area: reform.area } : {}),
                          ...(reform.due ? { dueDate: reform.due } : {})
                        },
                        today
                      ),
                      'Objetivo reformulado ↻'
                    );
                    setReformFor(null);
                  }}
                >
                  <p className="text-[11px] text-ui-muted">Antes: «{g.text}»</p>
                  <input
                    value={reform.text}
                    onChange={(e) => setReform({ ...reform, text: e.target.value })}
                    maxLength={140}
                    aria-label="Novo texto do objetivo"
                    className="ui-input w-full text-xs"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <AreaSelect value={reform.area} onChange={(a) => setReform({ ...reform, area: a })} />
                    <DateTimePT
                      type="date"
                      value={reform.due}
                      onChange={(v) => setReform({ ...reform, due: v })}
                      label="Prazo do novo objetivo"
                      inputClassName="ui-input w-full text-xs"
                    />
                  </div>
                  <button type="submit" className="ui-btn ui-btn-primary w-full text-xs">
                    Guardar o novo objetivo
                  </button>
                  <p className="text-[11px] text-ui-muted">
                    O antigo fica «Reformulado», ligado ao novo: o histórico não se perde.
                  </p>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {onSave && (
        <form
          className="grid grid-cols-2 gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSave(
              withGoal(player, {
                id: uid(),
                text,
                createdAt: today,
                ...(area ? { area } : {}),
                ...(due ? { dueDate: due } : {})
              }),
              'Objetivo adicionado 🎯'
            );
            setText('');
            setArea('');
            setDue('');
            setFilter('em_curso');
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={140}
            aria-label="Novo objetivo"
            placeholder="Novo objetivo (ex.: receber orientado para a frente)"
            className="ui-input col-span-2 min-w-0 text-xs"
          />
          <AreaSelect value={area} onChange={setArea} />
          <DateTimePT
            type="date"
            value={due}
            onChange={setDue}
            label="Prazo (opcional)"
            inputClassName="ui-input w-full text-xs"
          />
          <button type="submit" className="ui-btn ui-btn-primary col-span-2 text-xs">
            Adicionar
          </button>
        </form>
      )}
    </section>
  );
};

const AreaSelect: React.FC<{ value: EvaluationArea | ''; onChange: (a: EvaluationArea | '') => void }> = ({
  value,
  onChange
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as EvaluationArea | '')}
    aria-label="Área do objetivo"
    className="ui-input w-full text-xs"
  >
    <option value="">Área</option>
    {EVALUATION_AREAS.map((a) => (
      <option key={a.key} value={a.key}>
        {a.short}
      </option>
    ))}
  </select>
);
