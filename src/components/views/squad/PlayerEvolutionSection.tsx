import React, { useState } from 'react';
import { EvaluationArea, Player, PlayerEvaluation } from '../../../types';
import {
  EVALUATION_AREAS,
  averageOf,
  evaluationsOf,
  formatScore,
  goalsOf,
  toggledGoal,
  withEvaluation,
  withGoal,
  withoutEvaluation,
  withoutGoal
} from '../../../lib/playerEvolution';
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

/** Quick evaluation: one tap per area, the previous value in brackets, an optional note. */
const EvaluationForm: React.FC<{
  previous?: PlayerEvaluation;
  onSave: (scores: Record<EvaluationArea, number>, note: string) => void;
  onCancel: () => void;
}> = ({ previous, onSave, onCancel }) => {
  const [scores, setScores] = useState<Partial<Record<EvaluationArea, number>>>(() => ({ ...previous?.scores }));
  const [note, setNote] = useState('');
  const complete = EVALUATION_AREAS.every((a) => scores[a.key]);
  return (
    <section aria-label="Nova avaliação" className="ui-card-raised space-y-2 p-3">
      <div className="text-sm font-extrabold text-ui-text">Nova avaliação · hoje</div>
      {previous && <div className="text-[11px] text-ui-muted">Entre parênteses: a de {ddmm(previous.date)}</div>}
      {EVALUATION_AREAS.map((a) => (
        <fieldset key={a.key} className="space-y-1">
          <legend className="flex w-full justify-between text-xs font-bold text-ui-text">
            <span>{a.label}</span>
            {previous && <span className="text-ui-muted">({previous.scores[a.key]})</span>}
          </legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                aria-label={`${a.label} ${v}`}
                aria-pressed={scores[a.key] === v}
                onClick={() => setScores({ ...scores, [a.key]: v })}
                className={`h-9 flex-1 rounded-lg text-sm font-extrabold ${
                  scores[a.key] === v ? 'bg-ui-brand text-ui-brand-ink' : 'bg-ui-surface-3 text-ui-muted'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        aria-label="Observação do treinador"
        placeholder="Observação do treinador (opcional)"
        className="ui-input text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!complete}
          onClick={() => onSave(scores as Record<EvaluationArea, number>, note)}
          className="ui-btn ui-btn-primary flex-1 py-2.5 text-xs"
        >
          Guardar avaliação
        </button>
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-secondary py-2.5 text-xs">
          Cancelar
        </button>
      </div>
    </section>
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
}> = ({ player, onSavePlayer, onShowToast, part, startEvaluating = false }) => {
  const [evaluating, setEvaluating] = useState(startEvaluating && !!onSavePlayer);
  const [goalText, setGoalText] = useState('');
  const [goalArea, setGoalArea] = useState<EvaluationArea | ''>('');
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
        <section aria-label="Avaliações" className="ui-card space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-kicker">Competências</span>
            {!evaluating && onSavePlayer && (
              <button
                type="button"
                onClick={() => setEvaluating(true)}
                className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
              >
                + Nova avaliação
              </button>
            )}
          </div>
          {evaluating && (
            <EvaluationForm
              previous={last}
              onCancel={() => setEvaluating(false)}
              onSave={(scores, note) => {
                save(withEvaluation(player, { id: uid(), date: localDateISO(), scores, note }), 'Avaliação guardada ✓');
                setEvaluating(false);
              }}
            />
          )}
          {last ? (
            <>
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
                              className="px-1 text-xs text-ui-muted hover:text-rose-300"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="text-[11px] text-ui-muted">
                        {EVALUATION_AREAS.map((a) => `${a.short} ${e.scores[a.key]}`).join(' · ')}
                      </div>
                      {e.note && (
                        <p className="mt-1 rounded-lg bg-ui-surface-2 p-2 text-xs text-ui-text">📝 {e.note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            !evaluating && (
              <p className="text-xs text-ui-muted">
                Ainda sem avaliações. Uma a cada 4–6 semanas chega para ver a evolução no radar.
              </p>
            )
          )}
        </section>
      )}

      {part !== 'avaliacoes' && (
        <section aria-label="Objetivos individuais" className="ui-card space-y-2 p-3">
          <span className="ui-kicker">Objetivos individuais</span>
          {goals.length === 0 && <p className="text-xs text-ui-muted">Ainda sem objetivos para este atleta.</p>}
          <ul className="divide-y divide-ui-line">
            {goals.map((g) => {
              const area = EVALUATION_AREAS.find((a) => a.key === g.area);
              return (
                <li key={g.id} className={`flex items-start gap-2 py-2 ${g.doneAt ? 'opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(g.doneAt)}
                    disabled={!onSavePlayer}
                    aria-label={`Cumprido: ${g.text}`}
                    onChange={() =>
                      save(
                        toggledGoal(player, g.id, localDateISO()),
                        g.doneAt ? 'Objetivo reaberto' : 'Objetivo cumprido 🎯'
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <b className="block text-sm text-ui-text">{g.text}</b>
                    <span className="text-[11px] text-ui-muted">
                      {[area?.label, g.doneAt ? `cumprido a ${ddmm(g.doneAt)}` : `desde ${ddmm(g.createdAt)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {onSavePlayer && (
                    <button
                      type="button"
                      aria-label={`Apagar o objetivo ${g.text}`}
                      onClick={() => save(withoutGoal(player, g.id), 'Objetivo apagado')}
                      className="px-1 text-xs text-ui-muted hover:text-rose-300"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {onSavePlayer && (
            <form
              className="flex flex-wrap gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalText.trim()) return;
                save(
                  withGoal(player, {
                    id: uid(),
                    text: goalText,
                    createdAt: localDateISO(),
                    ...(goalArea ? { area: goalArea } : {})
                  }),
                  'Objetivo adicionado 🎯'
                );
                setGoalText('');
                setGoalArea('');
              }}
            >
              <input
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                maxLength={140}
                aria-label="Novo objetivo"
                placeholder="Novo objetivo (ex.: receber orientado para a frente)"
                className="ui-input min-w-0 flex-1 text-xs"
              />
              <select
                value={goalArea}
                onChange={(e) => setGoalArea(e.target.value as EvaluationArea | '')}
                aria-label="Área do objetivo"
                className="ui-input w-auto text-xs"
              >
                <option value="">Área</option>
                {EVALUATION_AREAS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.short}
                  </option>
                ))}
              </select>
              <button type="submit" className="ui-btn ui-btn-secondary px-3 text-xs">
                Adicionar
              </button>
            </form>
          )}
        </section>
      )}

      {part !== 'avaliacoes' && (
        <p className="text-[11px] text-ui-muted">
          🔒 Avaliações e objetivos são só para os treinadores: nunca aparecem nos PDFs para os pais, nas partilhas nem
          em comparações entre colegas.
        </p>
      )}
    </div>
  );
};
