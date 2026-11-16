import React, { useState } from 'react';
import { CompetencyLevel, Player } from '../../../types';
import {
  COMPETENCIES,
  LEVELS,
  competencyArea,
  competencyEvaluationsOf,
  competencyLabel,
  currentLevels,
  customCompetencyId,
  levelLabel,
  withCompetencyEvaluation,
  withoutCompetencyEvaluation
} from '../../../lib/competencies';
import { EVALUATION_AREAS } from '../../../lib/playerEvolution';
import { localDateISO } from '../../../lib/trainingQuick';
import { uid } from '../../../lib/utils';
import { VjCompetencyStat, vjStatLine } from '../../../lib/vjCompetencies';

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const AREAS = [
  ...EVALUATION_AREAS.map((a) => ({ key: a.key as string, label: a.label })),
  { key: 'outras', label: 'Outras' }
];
const LEVEL_CLS: Record<CompetencyLevel, string> = {
  1: 'bg-ui-surface-2 text-ui-muted',
  2: 'bg-ui-warning/15 text-ui-warning',
  3: 'bg-ui-brand/15 text-ui-brand',
  4: 'bg-ui-success/15 text-ui-success'
};

/** VJ5: «🎬 Visão de Jogo · esteve em 3 sessões · o grupo acertou 5 de 7 perguntas», with a bar. */
const VjLine: React.FC<{ stat: VjCompetencyStat }> = ({ stat }) => (
  <div className="mt-1 text-[11px] text-ui-muted" aria-label="Visão de Jogo">
    🎬 <b className="text-ui-text">Visão de Jogo</b> · {vjStatLine(stat)} · última {ddmm(stat.lastDate)} «
    {stat.lastTitle}»
    {stat.asked > 0 && (
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ui-surface-2">
        <span
          className="block h-full bg-ui-brand"
          style={{ width: `${Math.round((stat.right / stat.asked) * 100)}%` }}
        />
      </span>
    )}
  </div>
);

/**
 * D1 — Avaliação por competência: the latest level of each competency (and the change against the athlete's own
 * evaluation before), the evaluations made (who and when), and the form: only the competencies chosen, four levels
 * described in plain words, no overall score.
 */
export const CompetencyCard: React.FC<{
  player: Player;
  evaluator?: { uid?: string; name?: string };
  startEvaluating?: boolean;
  onSave?: (next: Player, msg: string) => void;
  /** VJ5: the group's answers in the Visão de Jogo sessions this athlete was in, by competency. */
  vjStats?: Record<string, VjCompetencyStat>;
}> = ({ player, evaluator, startEvaluating = false, onSave, vjStats = {} }) => {
  const vjOnly = Object.keys(vjStats).filter((id) => !currentLevels(player).some((c) => c.id === id));
  const [evaluating, setEvaluating] = useState(startEvaluating && !!onSave);
  const now = currentLevels(player);
  const evaluations = competencyEvaluationsOf(player);
  const last = evaluations[0];

  return (
    <section aria-label="Avaliações" className="ui-card space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="ui-kicker">
          Competências
          {last ? ` · última ${ddmm(last.date)}${last.evaluatorName ? ` (${last.evaluatorName})` : ''}` : ''}
        </span>
        {!evaluating && onSave && (
          <button
            type="button"
            onClick={() => setEvaluating(true)}
            className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
          >
            + Nova avaliação
          </button>
        )}
      </div>

      {evaluating && onSave && (
        <CompetencyForm
          evaluatorName={evaluator?.name}
          suggested={now.map((c) => c.id)}
          onCancel={() => setEvaluating(false)}
          onSubmit={(levels, note) => {
            onSave(
              withCompetencyEvaluation(player, {
                id: uid(),
                date: localDateISO(),
                levels,
                note,
                ...(evaluator?.uid ? { evaluatorUid: evaluator.uid } : {}),
                ...(evaluator?.name ? { evaluatorName: evaluator.name } : {})
              }),
              'Avaliação guardada ✓'
            );
            setEvaluating(false);
          }}
        />
      )}

      {now.length === 0 && !evaluating && (
        <p className="text-xs text-ui-muted">
          Ainda sem avaliações por competência. Escolha 2 ou 3 competências de cada vez, a cada 4–6 semanas.
        </p>
      )}
      {AREAS.map((area) => {
        const rows = now.filter((c) => competencyArea(c.id) === area.key);
        if (!rows.length) return null;
        return (
          <div key={area.key}>
            <div className="mt-1 text-xs font-bold text-ui-brand">{area.label}</div>
            <ul className="divide-y divide-ui-line">
              {rows.map((c) => (
                <li key={c.id} className="py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ui-text">{competencyLabel(c.id)}</span>
                    <span className="flex items-center gap-1.5">
                      {c.previous && c.previous.level !== c.level ? (
                        <span
                          className={`text-[10px] font-bold ${c.level > c.previous.level ? 'text-ui-success' : 'text-ui-warning'}`}
                        >
                          {c.level > c.previous.level ? '▲' : '▼'} era {levelLabel(c.previous.level)} (
                          {ddmm(c.previous.date)})
                        </span>
                      ) : (
                        <span className="text-[10px] text-ui-muted">{ddmm(c.date)}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_CLS[c.level]}`}>
                        {levelLabel(c.level)}
                      </span>
                    </span>
                  </div>
                  {vjStats[c.id] && <VjLine stat={vjStats[c.id]} />}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {vjOnly.length > 0 && (
        <div aria-label="Só na Visão de Jogo">
          <div className="mt-1 text-xs font-bold text-ui-brand">Só na Visão de Jogo (ainda sem avaliação)</div>
          <ul className="divide-y divide-ui-line">
            {vjOnly.map((id) => (
              <li key={id} className="py-1.5 text-xs">
                <span className="text-ui-text">{competencyLabel(id)}</span>
                <VjLine stat={vjStats[id]} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluations.length > 0 && (
        <ul aria-label="Avaliações por competência" className="space-y-1 border-t border-ui-line pt-2">
          {evaluations.map((e) => (
            <li key={e.id} className="text-[11px] text-ui-muted">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {ddmm(e.date)}
                  {e.evaluatorName ? ` · ${e.evaluatorName}` : ''} · {Object.keys(e.levels).length} competência
                  {Object.keys(e.levels).length === 1 ? '' : 's'}
                </span>
                {onSave && (
                  <button
                    type="button"
                    aria-label={`Apagar a avaliação de ${ddmm(e.date)}`}
                    onClick={() => {
                      if (window.confirm(`Apagar a avaliação de ${ddmm(e.date)}?`))
                        onSave(withoutCompetencyEvaluation(player, e.id), 'Avaliação apagada');
                    }}
                    className="px-1 text-xs hover:text-ui-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
              {e.note && <p className="mt-0.5 rounded-lg bg-ui-surface-2 p-1.5 text-ui-text">📝 {e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const CompetencyForm: React.FC<{
  evaluatorName?: string;
  /** Competencies already evaluated before: offered first. */
  suggested: string[];
  onCancel: () => void;
  onSubmit: (levels: Record<string, CompetencyLevel>, note: string) => void;
}> = ({ evaluatorName, suggested, onCancel, onSubmit }) => {
  const [chosen, setChosen] = useState<string[]>(suggested.slice(0, 3));
  const [levels, setLevels] = useState<Record<string, CompetencyLevel>>({});
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState('');
  const available = COMPETENCIES.filter((c) => !chosen.includes(c.id));
  const ready = chosen.some((id) => levels[id]);

  return (
    <form
      aria-label="Nova avaliação por competência"
      className="space-y-2 rounded-ui border border-ui-line p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const picked = Object.fromEntries(chosen.filter((id) => levels[id]).map((id) => [id, levels[id]]));
        if (Object.keys(picked).length) onSubmit(picked, note);
      }}
    >
      <p className="text-[11px] text-ui-muted">
        {localDateISO().split('-').reverse().join('/')}
        {evaluatorName ? (
          <>
            {' '}
            · Avaliado por: <b className="text-ui-text">{evaluatorName}</b>
          </>
        ) : null}
      </p>
      {chosen.map((id) => (
        <div key={id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ui-text">{competencyLabel(id)}</span>
            <button
              type="button"
              aria-label={`Tirar ${competencyLabel(id)}`}
              onClick={() => setChosen(chosen.filter((x) => x !== id))}
              className="px-1 text-xs text-ui-muted"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label={`Nível em ${competencyLabel(id)}`}>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                aria-pressed={levels[id] === l.value}
                onClick={() => setLevels({ ...levels, [id]: l.value })}
                className={`rounded-lg border px-1 py-1.5 text-[10px] ${
                  levels[id] === l.value
                    ? 'border-ui-brand bg-ui-brand font-bold text-ui-brand-ink'
                    : 'border-ui-line text-ui-muted'
                }`}
              >
                {l.short}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="text-[11px] text-ui-muted">Acrescentar competências:</div>
      <div className="flex flex-wrap gap-1">
        {available.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChosen([...chosen, c.id])}
            className="rounded-full border border-dashed border-ui-line px-2 py-0.5 text-[10px] text-ui-muted"
          >
            + {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={60}
          aria-label="Outra competência"
          placeholder="+ Outra competência…"
          className="ui-input min-w-0 flex-1 text-xs"
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => {
            const id = customCompetencyId(custom);
            if (!chosen.includes(id)) setChosen([...chosen, id]);
            setCustom('');
          }}
          className="ui-btn ui-btn-soft px-2 text-xs disabled:opacity-40"
        >
          Juntar
        </button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        aria-label="Observação"
        placeholder="Observação (opcional)"
        className="ui-input w-full text-xs"
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-soft flex-1 text-xs">
          Cancelar
        </button>
        <button type="submit" disabled={!ready} className="ui-btn ui-btn-primary flex-[2] text-xs disabled:opacity-40">
          Guardar avaliação
        </button>
      </div>
      <p className="text-[10px] leading-snug text-ui-muted">{LEVELS.map((l) => `${l.short}: ${l.hint}`).join(' · ')}</p>
    </form>
  );
};
