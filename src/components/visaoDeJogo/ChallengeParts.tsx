import React, { useState } from 'react';
import { ChallengeRights, Exercise, VjOption, VjPause, VjSession } from '../../types';
import { Sheet } from '../ui/Sheet';
import {
  AGE_GROUPS,
  DIFFICULTIES,
  MAX_IMAGE_CHARS,
  MAX_REFLECTION_PROMPTS,
  RIGHTS_KINDS,
  challengeTypeOf,
  emptyPrompt,
  rightsProblems
} from '../../lib/challenges';
import { compressImageFile } from '../../lib/imageCompress';
import { uid } from '../../lib/utils';

/**
 * MC1a — the parts of the challenge editor that depend on its type (question, practical exercise, reflection), the
 * common fields (age groups, difficulty, rights) and «Mostrar no treino» (nothing is saved: no answers are kept).
 */

const LETTERS = 'ABCDEF';
const emptyOption = (): VjOption => ({ id: uid(), text: '', correct: false });

type Set = (patch: Partial<VjSession>) => void;

/** «Pergunta»: the question, its answers (one or more right, each with an explanation) and an optional image. */
export const QuestionFields: React.FC<{ draft: VjSession; readOnly: boolean; set: Set }> = ({
  draft,
  readOnly,
  set
}) => {
  const p: VjPause & { image?: string } = draft.prompt || emptyPrompt();
  const [imageError, setImageError] = useState('');
  const put = (patch: Partial<VjPause & { image?: string }>) => set({ prompt: { ...p, ...patch } });
  const setOption = (id: string, patch: Partial<VjOption>) =>
    put({ options: (p.options || []).map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  return (
    <fieldset className="space-y-2 rounded-ui border border-ui-line p-2" aria-label="Pergunta do desafio">
      <label className="block text-xs text-ui-muted">
        Pergunta
        <input
          value={p.question}
          readOnly={readOnly}
          onChange={(e) => put({ question: e.target.value })}
          maxLength={200}
          placeholder="Ex.: Para onde deve o médio orientar a receção?"
          className="ui-input mt-1 w-full text-sm"
        />
      </label>
      <label className="block text-xs text-ui-muted">
        Tipo de resposta
        <select
          value={p.kind}
          disabled={readOnly}
          onChange={(e) =>
            put(
              e.target.value === 'aberta'
                ? { kind: 'aberta', options: undefined }
                : { kind: 'escolha', options: p.options?.length ? p.options : [emptyOption(), emptyOption()] }
            )
          }
          className="ui-input mt-1 w-full text-xs"
        >
          <option value="escolha">Escolha (uma ou mais certas)</option>
          <option value="aberta">Resposta aberta (conversada)</option>
        </select>
      </label>
      {p.kind === 'escolha' ? (
        <div className="space-y-1.5">
          {(p.options || []).map((o, i) => (
            <div key={o.id} className="space-y-1 rounded-ui bg-ui-surface-2 p-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  value={o.text}
                  readOnly={readOnly}
                  onChange={(e) => setOption(o.id, { text: e.target.value })}
                  maxLength={120}
                  aria-label={`Resposta ${LETTERS[i]}`}
                  placeholder={`Resposta ${LETTERS[i]}`}
                  className="ui-input min-w-0 flex-1 text-xs"
                />
                <label className="flex items-center gap-1 text-[11px] text-ui-muted">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={o.correct}
                    onChange={(e) => setOption(o.id, { correct: e.target.checked })}
                    aria-label={`Resposta ${LETTERS[i]} certa`}
                  />
                  certa
                </label>
              </div>
              <input
                value={o.explanation || ''}
                readOnly={readOnly}
                onChange={(e) => setOption(o.id, { explanation: e.target.value })}
                maxLength={200}
                aria-label={`Explicação da resposta ${LETTERS[i]}`}
                placeholder="Explicação (porquê)"
                className="ui-input w-full text-[11px]"
              />
            </div>
          ))}
          {!readOnly && (p.options || []).length < LETTERS.length && (
            <button
              type="button"
              onClick={() => put({ options: [...(p.options || []), emptyOption()] })}
              className="ui-btn ui-btn-soft w-full text-[11px]"
            >
              + Resposta
            </button>
          )}
        </div>
      ) : (
        <label className="block text-xs text-ui-muted">
          O que quero ouvir
          <input
            value={p.explanation || ''}
            readOnly={readOnly}
            onChange={(e) => put({ explanation: e.target.value })}
            maxLength={200}
            className="ui-input mt-1 w-full text-xs"
          />
        </label>
      )}
      <div className="space-y-1">
        <span className="text-xs text-ui-muted">Imagem ou esquema (opcional)</span>
        {p.image ? (
          <div className="relative">
            <img src={p.image} alt="Imagem da pergunta" className="max-h-48 w-full rounded-ui object-contain" />
            {!readOnly && (
              <button
                type="button"
                onClick={() => put({ image: undefined })}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                aria-label="Tirar a imagem"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          !readOnly && (
            <input
              type="file"
              accept="image/*"
              aria-label="Imagem da pergunta"
              className="block w-full text-[11px] text-ui-muted"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageError('');
                try {
                  const image = await compressImageFile(file, 1000, 150_000);
                  if (image.length > MAX_IMAGE_CHARS) throw new Error('A imagem continua grande demais.');
                  put({ image });
                } catch (err) {
                  setImageError((err as Error).message || 'Não foi possível usar esta imagem.');
                }
              }}
            />
          )
        )}
        {imageError && <p className="text-[11px] text-ui-danger">{imageError}</p>}
      </div>
    </fieldset>
  );
};

/** «Prático»: an exercise of the team's library (shown, never copied), the instructions and when it is done. */
export const PracticeFields: React.FC<{ draft: VjSession; readOnly: boolean; set: Set; exercises: Exercise[] }> = ({
  draft,
  readOnly,
  set,
  exercises
}) => {
  const exercise = exercises.find((x) => x.id === draft.exerciseId);
  return (
    <fieldset className="space-y-2 rounded-ui border border-ui-line p-2" aria-label="Exercício prático">
      <label className="block text-xs text-ui-muted">
        Exercício da biblioteca da equipa
        <select
          value={draft.exerciseId || ''}
          disabled={readOnly}
          onChange={(e) => set({ exerciseId: e.target.value || undefined })}
          className="ui-input mt-1 w-full text-xs"
        >
          <option value="">Escolher exercício…</option>
          {exercises.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {exercises.length === 0 && (
        <p className="text-[11px] text-ui-muted">
          A biblioteca de exercícios da equipa está vazia: junte exercícios em Treinos → Biblioteca.
        </p>
      )}
      {draft.exerciseId && !exercise && (
        <p className="text-[11px] text-ui-warning">O exercício já não está na biblioteca da equipa.</p>
      )}
      {exercise && <ExerciseSummary exercise={exercise} />}
      <TextField
        label="Instruções para os atletas"
        value={draft.instructions}
        readOnly={readOnly}
        max={600}
        onChange={(v) => set({ instructions: v })}
      />
      <TextField
        label="Critério de conclusão"
        placeholder="Ex.: 5 receções orientadas seguidas"
        value={draft.completionCriteria}
        readOnly={readOnly}
        max={200}
        onChange={(v) => set({ completionCriteria: v })}
      />
    </fieldset>
  );
};

/** The exercise as it is in the library (read only: never copied into the challenge). */
export const ExerciseSummary: React.FC<{ exercise: Exercise }> = ({ exercise }) => (
  <div className="flex gap-2 rounded-ui bg-ui-surface-2 p-2 text-[11px]" aria-label="Exercício da biblioteca">
    {exercise.image && <img src={exercise.image} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />}
    <span className="min-w-0">
      <b className="block text-xs text-ui-text">{exercise.name}</b>
      {exercise.objective && <span className="block text-ui-muted">🎯 {exercise.objective}</span>}
      <span className="text-ui-muted">
        {exercise.durationMinutes}' {exercise.materialText ? `· ${exercise.materialText}` : ''}
      </span>
    </span>
  </div>
);

/** «Reflexão»: up to 5 short questions (only the content: the answers are never kept). */
export const ReflectionFields: React.FC<{ draft: VjSession; readOnly: boolean; set: Set }> = ({
  draft,
  readOnly,
  set
}) => {
  const prompts = draft.reflection?.prompts?.length ? draft.reflection.prompts : [''];
  const put = (next: string[], emojiScale = draft.reflection?.emojiScale) =>
    set({ reflection: { prompts: next, ...(emojiScale ? { emojiScale: true } : {}) } });
  return (
    <fieldset className="space-y-1.5 rounded-ui border border-ui-line p-2" aria-label="Perguntas de reflexão">
      {prompts.map((q, i) => (
        <input
          key={i}
          value={q}
          readOnly={readOnly}
          onChange={(e) => put(prompts.map((x, j) => (j === i ? e.target.value : x)))}
          maxLength={160}
          aria-label={`Pergunta de reflexão ${i + 1}`}
          placeholder={i === 0 ? 'Ex.: Que decisão gostavas de ter tomado de outra forma?' : 'Outra pergunta'}
          className="ui-input w-full text-xs"
        />
      ))}
      {!readOnly && prompts.length < MAX_REFLECTION_PROMPTS && (
        <button type="button" onClick={() => put([...prompts, ''])} className="ui-btn ui-btn-soft w-full text-[11px]">
          + Pergunta
        </button>
      )}
      <label className="flex items-center gap-2 text-[11px] text-ui-muted">
        <input
          type="checkbox"
          disabled={readOnly}
          checked={!!draft.reflection?.emojiScale}
          onChange={(e) => put(prompts, e.target.checked)}
        />
        Mostrar uma escala de emojis (😟 🙂 😃)
      </label>
      <p className="text-[11px] text-ui-muted">
        Só o conteúdo: nesta fase não há respostas guardadas. Serve para conversar no treino.
      </p>
    </fieldset>
  );
};

/** Age groups and difficulty (both optional). */
export const CommonFields: React.FC<{ draft: VjSession; readOnly: boolean; set: Set }> = ({ draft, readOnly, set }) => {
  const groups = draft.ageGroups || [];
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-ui-muted">Escalões recomendados (nenhum = todos)</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Escalões recomendados">
        {AGE_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            disabled={readOnly}
            aria-pressed={groups.includes(g)}
            onClick={() => set({ ageGroups: groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g] })}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              groups.includes(g) ? 'border-ui-brand bg-ui-brand/10 text-ui-text' : 'border-ui-line text-ui-muted'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <label className="block text-xs text-ui-muted">
        Dificuldade
        <select
          value={draft.difficulty || ''}
          disabled={readOnly}
          onChange={(e) => set({ difficulty: (Number(e.target.value) || undefined) as VjSession['difficulty'] })}
          className="ui-input mt-1 w-full text-xs"
        >
          <option value="">Sem indicação</option>
          {([1, 2, 3] as const).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTIES[d]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

/** The rights of the content: needed to publish (who confirmed and when is recorded). */
export const RightsPanel: React.FC<{ draft: VjSession; readOnly: boolean; set: Set; userName?: string }> = ({
  draft,
  readOnly,
  set,
  userName
}) => {
  const r = draft.rights;
  const put = (patch: Partial<ChallengeRights>) =>
    set({
      rights: {
        kind: r?.kind || 'proprio',
        ...r,
        ...patch,
        ...(userName ? { confirmedBy: userName } : {}),
        confirmedAt: new Date().toISOString()
      }
    });
  const problems = r ? rightsProblems(draft) : [];
  return (
    <fieldset className="space-y-1.5 rounded-ui border border-ui-line p-2" aria-label="Direitos do conteúdo">
      <legend className="px-1 text-xs font-bold text-ui-text">Direitos do conteúdo (para publicar)</legend>
      {(Object.keys(RIGHTS_KINDS) as ChallengeRights['kind'][]).map((k) => (
        <label key={k} className="flex items-start gap-2 text-xs text-ui-text">
          <input
            type="radio"
            name="direitos"
            disabled={readOnly}
            checked={r?.kind === k}
            onChange={() => put({ kind: k })}
            className="mt-0.5"
          />
          {RIGHTS_KINDS[k]}
        </label>
      ))}
      {r && r.kind !== 'proprio' && (
        <TextField
          label="Fonte"
          placeholder={r.kind === 'externo' ? 'Ex.: link do vídeo' : 'Ex.: livro, autor'}
          value={r.source}
          readOnly={readOnly}
          max={300}
          onChange={(v) => put({ source: v })}
        />
      )}
      {r?.kind === 'licenciado' && (
        <TextField
          label="Licença ou autorização"
          value={r.licence}
          readOnly={readOnly}
          max={300}
          onChange={(v) => put({ licence: v })}
        />
      )}
      {r?.kind === 'externo' && (
        <label className="flex items-start gap-2 text-xs text-ui-text">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={!!r.noIdentifiableChildren}
            onChange={(e) => put({ noIdentifiableChildren: e.target.checked })}
            className="mt-0.5"
          />
          Confirmo que o vídeo ou a imagem não mostra crianças identificáveis
        </label>
      )}
      {r?.confirmedBy && (
        <p className="text-[11px] text-ui-muted">
          Indicado por {r.confirmedBy}
          {r.confirmedAt ? ` a ${new Date(r.confirmedAt).toLocaleDateString('pt-PT')}` : ''}
        </p>
      )}
      {problems.map((p) => (
        <p key={p} className="text-[11px] text-ui-warning">
          {p}
        </p>
      ))}
    </fieldset>
  );
};

const TextField: React.FC<{
  label: string;
  value?: string;
  readOnly: boolean;
  max: number;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ label, value, readOnly, max, placeholder, onChange }) => (
  <label className="block text-xs text-ui-muted">
    {label}
    <input
      value={value || ''}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      maxLength={max}
      placeholder={placeholder}
      className="ui-input mt-1 w-full text-xs"
    />
  </label>
);

/**
 * «Mostrar no treino»: the question (and its explanations), the practical exercise or the reflection on the screen,
 * for the coach to show the team. Nothing is saved: no answers, no runs.
 */
export const ShowInTraining: React.FC<{ session: VjSession; exercises: Exercise[]; onClose: () => void }> = ({
  session,
  exercises,
  onClose
}) => {
  const [revealed, setRevealed] = useState(false);
  const type = challengeTypeOf(session);
  const exercise = exercises.find((x) => x.id === session.exerciseId);
  return (
    <Sheet title="Mostrar no treino" onClose={onClose} size="lg">
      <div className="space-y-3">
        <p className="text-base font-extrabold text-ui-text">{session.title}</p>
        {session.instructions && <p className="text-sm text-ui-text">{session.instructions}</p>}
        {type === 'pergunta' && session.prompt && (
          <section aria-label="Pergunta" className="space-y-2">
            {session.prompt.image && (
              <img src={session.prompt.image} alt="" className="max-h-72 w-full rounded-ui object-contain" />
            )}
            <p className="text-lg font-bold text-ui-text">{session.prompt.question}</p>
            {(session.prompt.options || []).map((o, i) => (
              <div
                key={o.id}
                className={`rounded-ui border p-2 text-sm ${
                  revealed && o.correct ? 'border-ui-success bg-ui-success/10' : 'border-ui-line'
                }`}
              >
                <b>{LETTERS[i]}</b> · {o.text}
                {revealed && o.explanation && (
                  <span className={`block text-xs ${o.correct ? 'text-ui-success' : 'text-ui-muted'}`}>
                    {o.correct ? '✓ ' : ''}
                    {o.explanation}
                  </span>
                )}
              </div>
            ))}
            {session.prompt.kind === 'aberta' && revealed && session.prompt.explanation && (
              <p className="rounded-ui bg-ui-surface-2 p-2 text-sm text-ui-text">{session.prompt.explanation}</p>
            )}
            {!revealed && (
              <button type="button" onClick={() => setRevealed(true)} className="ui-btn ui-btn-soft w-full text-sm">
                Mostrar explicação
              </button>
            )}
          </section>
        )}
        {type === 'pratico' &&
          (exercise ? (
            <ExerciseSummary exercise={exercise} />
          ) : (
            <p className="text-xs text-ui-warning">O exercício já não está na biblioteca da equipa.</p>
          ))}
        {type === 'pratico' && session.completionCriteria && (
          <p className="text-sm text-ui-text">✅ {session.completionCriteria}</p>
        )}
        {type === 'reflexao' && (
          <ol className="list-decimal space-y-2 pl-5 text-base text-ui-text" aria-label="Perguntas de reflexão">
            {(session.reflection?.prompts || []).map((q, i) => (
              <li key={i}>
                {q}
                {session.reflection?.emojiScale && <span className="block text-2xl">😟 🙂 😃</span>}
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-ui-muted">Nada fica guardado: é só para mostrar e conversar no treino.</p>
        <button type="button" onClick={onClose} className="ui-btn ui-btn-primary w-full text-sm">
          Terminar
        </button>
      </div>
    </Sheet>
  );
};
