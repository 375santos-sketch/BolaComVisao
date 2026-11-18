import React, { Suspense, lazy, useState } from 'react';
import { AthleteAssignmentView, AthleteStep, AthleteView, stepsDone } from '../lib/athleteView';
import { CHALLENGE_TYPES } from '../lib/challenges';

// The video player of the Visão de Jogo sessions, loaded only when a video step is opened
const ConductSession = lazy(() =>
  import('../components/visaoDeJogo/ConductSession').then((m) => ({ default: m.ConductSession }))
);

const LETTERS = 'ABCDEF';
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * MC2a — «O Meu Percurso» for the athlete: the missions and challenges the coach gave, step by step, with what the
 * coach ticked done. The athlete does each step (question, reflection, practical, video) here; NOTHING is saved in
 * MC2a. Big buttons and short sentences (a child under 13 uses it on the guardian's phone, «Modo atleta»).
 */
export const AthleteMode: React.FC<{ view: AthleteView; onExit?: () => void; exitLabel?: string }> = ({
  view,
  onExit,
  exitLabel = 'Sair do Modo atleta'
}) => {
  const [open, setOpen] = useState<{ step: AthleteStep; title: string } | null>(null);

  if (open) return <StepPlayer step={open.step} title={open.title} onClose={() => setOpen(null)} />;

  return (
    <section className="space-y-3" aria-label="O Meu Percurso">
      <div className="ui-card p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ui-brand">O Meu Percurso</p>
        <p className="text-2xl font-black text-ui-text">{view.athleteName}</p>
        <p className="text-xs text-ui-muted">
          {[view.clubName, view.teamName, view.season].filter(Boolean).join(' · ')}
        </p>
      </div>
      {view.assignments.length === 0 && (
        <p className="ui-card p-4 text-base text-ui-muted">
          Ainda sem missões. O teu treinador vai dar-te a primeira! ⚽
        </p>
      )}
      {view.assignments.map((a) => (
        <AssignmentCard key={a.id} a={a} onOpen={(step) => setOpen({ step, title: a.title })} />
      ))}
      <p className="text-[11px] text-ui-muted">
        O que fazes aqui não fica guardado. O treinador marca os passos que fizeste no treino.
      </p>
      {onExit && (
        <button type="button" onClick={onExit} className="ui-btn ui-btn-soft w-full text-sm">
          🔒 {exitLabel}
        </button>
      )}
    </section>
  );
};

const AssignmentCard: React.FC<{ a: AthleteAssignmentView; onOpen: (s: AthleteStep) => void }> = ({ a, onOpen }) => {
  const done = stepsDone(a);
  return (
    <article className="ui-card space-y-2 p-4" aria-label={`Missão ${a.title}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <b className="block text-lg text-ui-text">
            {a.priority ? '⭐ ' : ''}
            {a.kind === 'missao' ? '🎯 ' : ''}
            {a.title}
          </b>
          {a.objective && <span className="block text-sm text-ui-muted">{a.objective}</span>}
          {a.dueDate && <span className="text-xs text-ui-muted">Até {ddmm(a.dueDate)}</span>}
        </span>
        <span className="shrink-0 rounded-full bg-ui-brand/15 px-3 py-1 text-sm font-black text-ui-brand">
          {done}/{a.steps.length}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ui-surface-2">
        <div
          className="h-full bg-ui-brand"
          style={{ width: `${a.steps.length ? (done / a.steps.length) * 100 : 0}%` }}
        />
      </div>
      <ol className="space-y-1.5">
        {a.steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={s.missing}
              onClick={() => onOpen(s)}
              className="flex w-full items-center gap-3 rounded-ui border border-ui-line p-3 text-left disabled:opacity-50"
              aria-label={`Passo ${i + 1}: ${s.title}`}
            >
              <span className="text-2xl">{s.done ? '✅' : CHALLENGE_TYPES[s.type].icon}</span>
              <span className="min-w-0">
                <b className="block text-base text-ui-text">{s.title}</b>
                <span className="text-xs text-ui-muted">
                  {s.done ? `Feito a ${ddmm(s.done)}` : CHALLENGE_TYPES[s.type].label}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </article>
  );
};

/** One step, done on the phone: nothing is saved (MC2a). */
const StepPlayer: React.FC<{ step: AthleteStep; title: string; onClose: () => void }> = ({ step, title, onClose }) => {
  const [chosen, setChosen] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [feeling, setFeeling] = useState<Record<number, string>>({});

  if (step.type === 'video' && step.items?.length)
    return (
      <Suspense fallback={<p className="text-sm text-ui-muted">A abrir…</p>}>
        <ConductSession
          session={{
            id: 'passo',
            format: 'sessao',
            title: step.title,
            competencies: [],
            status: 'publicado',
            items: step.items,
            createdAt: '',
            updatedAt: ''
          }}
          home
          onClose={onClose}
        />
      </Suspense>
    );

  return (
    <section className="space-y-3" aria-label={`Passo ${step.title}`}>
      <p className="text-xs text-ui-muted">{title}</p>
      <p className="text-2xl font-black text-ui-text">{step.title}</p>
      {step.instructions && <p className="text-base text-ui-text">{step.instructions}</p>}

      {step.type === 'pergunta' && step.prompt && (
        <div className="space-y-2" role="group" aria-label="Pergunta">
          {step.prompt.image && <img src={step.prompt.image} alt="" className="w-full rounded-ui object-contain" />}
          <p className="text-xl font-bold text-ui-text">{step.prompt.question}</p>
          {(step.prompt.options || []).map((o, i) => {
            const picked = chosen.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => !revealed && setChosen((c) => (picked ? c.filter((x) => x !== o.id) : [...c, o.id]))}
                className={`block w-full rounded-ui border-2 p-3 text-left text-base ${
                  revealed && o.correct
                    ? 'border-ui-success bg-ui-success/10'
                    : picked
                      ? 'border-ui-brand bg-ui-brand/10'
                      : 'border-ui-line'
                }`}
              >
                <b>{LETTERS[i]}</b> · {o.text}
                {revealed && o.explanation && (
                  <span className={`block text-sm ${o.correct ? 'text-ui-success' : 'text-ui-muted'}`}>
                    {o.correct ? '✓ ' : ''}
                    {o.explanation}
                  </span>
                )}
              </button>
            );
          })}
          {step.prompt.kind === 'aberta' && revealed && step.prompt.explanation && (
            <p className="rounded-ui bg-ui-surface-2 p-3 text-base">{step.prompt.explanation}</p>
          )}
          {!revealed && (
            <button type="button" onClick={() => setRevealed(true)} className="ui-btn ui-btn-primary w-full text-base">
              {step.prompt.kind === 'aberta' ? 'Ver a resposta' : 'Responder'}
            </button>
          )}
        </div>
      )}

      {step.type === 'reflexao' && (
        <ol className="space-y-3" aria-label="Perguntas para pensar">
          {(step.reflection?.prompts || []).map((q, i) => (
            <li key={i} className="ui-card space-y-2 p-3">
              <p className="text-lg text-ui-text">{q}</p>
              {step.reflection?.emojiScale && (
                <div className="flex gap-2" role="group" aria-label={`Como te sentes: ${q}`}>
                  {['😟', '🙂', '😃'].map((e) => (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={feeling[i] === e}
                      onClick={() => setFeeling({ ...feeling, [i]: e })}
                      className={`flex-1 rounded-ui border-2 py-2 text-3xl ${feeling[i] === e ? 'border-ui-brand' : 'border-ui-line'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {step.type === 'pratico' && (
        <div className="ui-card space-y-1 p-3">
          {step.exercise ? (
            <>
              <p className="text-lg font-bold text-ui-text">⚽ {step.exercise.name}</p>
              {step.exercise.objective && <p className="text-sm text-ui-muted">🎯 {step.exercise.objective}</p>}
            </>
          ) : (
            <p className="text-sm text-ui-muted">Faz-se no treino, com o treinador.</p>
          )}
          {step.completionCriteria && <p className="text-base text-ui-text">✅ {step.completionCriteria}</p>}
        </div>
      )}

      <p className="text-[11px] text-ui-muted">Isto não fica guardado: é para pensares e conversares no treino.</p>
      <button type="button" onClick={onClose} className="ui-btn ui-btn-primary w-full text-base">
        Voltar ao percurso
      </button>
    </section>
  );
};
