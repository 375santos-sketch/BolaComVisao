import React, { useState } from 'react';
import { Assignment, Mission, Player, VjSession } from '../../types';
import { Sheet } from '../ui/Sheet';
import { DateTimePT } from '../ui/DateTimePT';
import { COMPETENCIES, competencyLabel } from '../../lib/competencies';
import { CHALLENGE_TYPES, DIFFICULTIES, challengeTypeOf } from '../../lib/challenges';
import {
  MAX_STEPS,
  MISSION_STATUS,
  athletesOf,
  cleanAssignment,
  cleanMission,
  doneSteps,
  goalsInProgress,
  isAssignmentOverdue,
  missionProblems,
  newAssignment,
  newMission,
  readyToReassess,
  sortAssignments,
  stepCount,
  stepsOf,
  withItem,
  withStepDone
} from '../../lib/missions';
import { localDateISO } from '../../lib/trainingQuick';
import { uid } from '../../lib/utils';

/**
 * MC1b — «Missões» and «Atribuições» of the team's Visão de Jogo (only for the coaching staff): missions of 2–6
 * published challenges, given to the team or to some athletes with a deadline, and the coach's ticks of what each
 * athlete did. Nothing here reaches the athletes or the families.
 */

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const now = () => new Date().toISOString();

interface TeamData {
  challenges: VjSession[];
  missions: Mission[];
  assignments: Assignment[];
  roster: Player[];
  readOnly: boolean;
  userName?: string;
  onSave: (patch: { missions?: Mission[]; assignments?: Assignment[] }, msg?: string) => void;
}

/** «Missões»: the team's missions, a new one, and «Atribuir». */
export const MissionsTab: React.FC<TeamData> = (props) => {
  const { challenges, missions, readOnly, onSave } = props;
  const [editing, setEditing] = useState<Mission | null>(null);
  const [assigning, setAssigning] = useState<Assignment['target'] | null>(null);
  const shown = [...missions]
    .filter((m) => m.status !== 'arquivado')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (editing)
    return (
      <MissionEditor
        mission={editing}
        challenges={challenges}
        readOnly={readOnly}
        onBack={() => setEditing(null)}
        onSave={(m, msg) => {
          onSave({ missions: withItem(missions, cleanMission(m, now())) }, msg);
          setEditing(null);
        }}
      />
    );
  if (assigning) return <AssignSheet {...props} target={assigning} onClose={() => setAssigning(null)} />;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-ui-muted">
        Uma missão junta 2 a 6 desafios publicados da equipa, por ordem. Concluir uma missão nunca muda a avaliação: só
        sugere reavaliar a competência.
      </p>
      {shown.length === 0 && <p className="text-xs text-ui-muted">Ainda sem missões.</p>}
      <ul className="space-y-2" aria-label="Missões">
        {shown.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setEditing(m)}
              className="ui-card w-full p-3 text-left"
              aria-label={`Abrir a missão ${m.title}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className="block text-sm text-ui-text">🎯 {m.title}</b>
                  <span className="text-[11px] text-ui-muted">
                    {m.steps.length} {m.steps.length === 1 ? 'desafio' : 'desafios'}
                    {m.competencyId ? ` · 🧩 ${competencyLabel(m.competencyId)}` : ''}
                    {m.difficulty ? ` · ${DIFFICULTIES[m.difficulty]}` : ''}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${MISSION_STATUS[m.status].cls}`}
                >
                  {MISSION_STATUS[m.status].label}
                </span>
              </span>
            </button>
            {m.status === 'publicado' && !readOnly && (
              <button
                type="button"
                onClick={() => setAssigning({ kind: 'missao', id: m.id })}
                className="ui-btn ui-btn-primary mt-1 w-full text-xs"
                aria-label={`Atribuir a missão ${m.title}`}
              >
                Atribuir
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <button
          type="button"
          onClick={() => setEditing(newMission({ id: uid(), authorName: props.userName, now: now() }))}
          className="ui-btn ui-btn-primary w-full text-sm"
        >
          + Nova missão
        </button>
      )}
    </div>
  );
};

const MissionEditor: React.FC<{
  mission: Mission;
  challenges: VjSession[];
  readOnly: boolean;
  onBack: () => void;
  onSave: (m: Mission, msg: string) => void;
}> = ({ mission, challenges, readOnly, onBack, onSave }) => {
  const [draft, setDraft] = useState<Mission>(mission);
  const [problems, setProblems] = useState<string[]>([]);
  const set = (patch: Partial<Mission>) => setDraft({ ...draft, ...patch });
  const published = challenges.filter((c) => c.status === 'publicado');
  const available = published.filter((c) => !draft.steps.some((s) => s.challengeId === c.id));
  const isNew = !mission.title;

  return (
    <Sheet title={isNew ? 'Nova missão' : 'Editar missão'} onClose={onBack} size="lg">
      <div className="space-y-3">
        <label className="block text-xs text-ui-muted">
          Título
          <input
            value={draft.title}
            readOnly={readOnly}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={120}
            placeholder="Ex.: Melhorar a receção orientada"
            className="ui-input mt-1 w-full text-sm"
          />
        </label>
        <label className="block text-xs text-ui-muted">
          Objetivo
          <input
            value={draft.objective || ''}
            readOnly={readOnly}
            onChange={(e) => set({ objective: e.target.value })}
            maxLength={300}
            className="ui-input mt-1 w-full text-sm"
          />
        </label>
        <label className="block text-xs text-ui-muted">
          Competência
          <select
            value={draft.competencyId || ''}
            disabled={readOnly}
            onChange={(e) => set({ competencyId: e.target.value || undefined })}
            className="ui-input mt-1 w-full text-xs"
          >
            <option value="">Sem competência</option>
            {COMPETENCIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5">
          <span className="text-xs text-ui-muted">
            Desafios, por ordem ({draft.steps.length} de 2–{MAX_STEPS})
          </span>
          <ol className="space-y-1" aria-label="Passos da missão">
            {stepsOf(draft, challenges).map((s, i) => (
              <li
                key={s.challengeId}
                className="flex items-center justify-between gap-2 rounded-ui border border-ui-line p-2 text-xs"
              >
                <span className="min-w-0">
                  <b className="text-ui-text">{i + 1}.</b>{' '}
                  {s.challenge ? (
                    <>
                      {CHALLENGE_TYPES[challengeTypeOf(s.challenge)].icon} {s.challenge.title}
                    </>
                  ) : (
                    <span className="text-ui-warning">Este desafio já não está na biblioteca</span>
                  )}
                </span>
                {!readOnly && (
                  <span className="flex shrink-0 gap-1">
                    {i > 0 && (
                      <button
                        type="button"
                        aria-label={`Subir o passo ${i + 1}`}
                        onClick={() => {
                          const steps = [...draft.steps];
                          [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                          set({ steps });
                        }}
                        className="px-1 text-ui-muted"
                      >
                        ↑
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Tirar o passo ${i + 1}`}
                      onClick={() => set({ steps: draft.steps.filter((x) => x.challengeId !== s.challengeId) })}
                      className="px-1 text-ui-muted hover:text-ui-danger"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {!readOnly && draft.steps.length < MAX_STEPS && (
            <select
              aria-label="Juntar desafio à missão"
              value=""
              onChange={(e) => e.target.value && set({ steps: [...draft.steps, { challengeId: e.target.value }] })}
              className="ui-input w-full text-xs"
            >
              <option value="">+ Desafio publicado da equipa</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {CHALLENGE_TYPES[challengeTypeOf(c)].icon} {c.title}
                </option>
              ))}
            </select>
          )}
          {published.length === 0 && (
            <p className="text-[11px] text-ui-muted">Publique primeiro desafios na biblioteca da equipa.</p>
          )}
        </div>
        {problems.length > 0 && (
          <div role="alert" className="rounded-ui border border-ui-warning/50 bg-ui-warning/10 p-2 text-[11px]">
            <b>Ainda não pode publicar:</b>
            {problems.map((p) => (
              <span key={p} className="block">
                · {p}
              </span>
            ))}
          </div>
        )}
        {!readOnly && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSave(draft, 'Missão guardada ✓')}
              className="ui-btn ui-btn-soft text-xs"
            >
              Guardar
            </button>
            {draft.status !== 'publicado' ? (
              <button
                type="button"
                onClick={() => {
                  const p = missionProblems(cleanMission(draft, now()), challenges);
                  setProblems(p);
                  if (!p.length) onSave({ ...draft, status: 'publicado' }, 'Missão publicada ✓');
                }}
                className="ui-btn ui-btn-primary text-xs"
              >
                Publicar na equipa
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSave({ ...draft, status: 'arquivado' }, 'Missão arquivada')}
                className="ui-btn ui-btn-soft text-xs"
              >
                Arquivar
              </button>
            )}
          </div>
        )}
        <button type="button" onClick={onBack} className="ui-btn ui-btn-soft w-full text-xs">
          ← Missões
        </button>
      </div>
    </Sheet>
  );
};

/** «Atribuir»: to the whole team or to some athletes, with a deadline, priority and (one athlete) a goal. */
export const AssignSheet: React.FC<TeamData & { target: Assignment['target']; onClose: () => void }> = ({
  target,
  missions,
  challenges,
  assignments,
  roster,
  userName,
  onSave,
  onClose
}) => {
  const [whole, setWhole] = useState(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState(false);
  const [goalId, setGoalId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const active = roster.filter((p) => p.active !== false);
  const title =
    target.kind === 'missao'
      ? missions.find((m) => m.id === target.id)?.title
      : challenges.find((c) => c.id === target.id)?.title;
  const single = !whole && chosen.length === 1 ? active.find((p) => p.id === chosen[0]) : undefined;
  const goals = single ? goalsInProgress(single) : [];

  return (
    <Sheet title="Atribuir" onClose={onClose} size="lg">
      <form
        className="space-y-3"
        aria-label="Atribuir"
        onSubmit={(e) => {
          e.preventDefault();
          if (!whole && chosen.length === 0) return setError('Escolha pelo menos um atleta.');
          const a = newAssignment({
            id: uid(),
            target,
            to: whole ? 'equipa' : chosen,
            dueDate: due || undefined,
            priority,
            goal: single && goalId ? { athleteId: single.id, goalId } : undefined,
            note,
            createdBy: userName,
            now: now()
          });
          onSave({ assignments: withItem(assignments, a) }, 'Atribuído ✓');
          onClose();
        }}
      >
        <p className="text-sm font-bold text-ui-text">
          {target.kind === 'missao' ? '🎯 Missão' : 'Desafio'}: {title}
        </p>
        <div className="flex gap-1.5" role="group" aria-label="A quem">
          {(
            [
              [true, 'Toda a equipa'],
              [false, 'Atletas escolhidos']
            ] as const
          ).map(([v, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={whole === v}
              onClick={() => setWhole(v)}
              className={`rounded-full border px-3 py-1 text-xs ${whole === v ? 'border-ui-brand bg-ui-brand/10' : 'border-ui-line text-ui-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {!whole && (
          <fieldset className="ui-card max-h-56 overflow-y-auto p-2" aria-label="Atletas">
            {active.map((p) => (
              <label key={p.id} className="flex items-center gap-2 border-b border-ui-line py-1 text-xs text-ui-text">
                <input
                  type="checkbox"
                  checked={chosen.includes(p.id)}
                  onChange={(e) => {
                    setGoalId('');
                    setChosen((c) => (e.target.checked ? [...c, p.id] : c.filter((x) => x !== p.id)));
                  }}
                />
                {p.name}
              </label>
            ))}
          </fieldset>
        )}
        {single && goals.length > 0 && (
          <label className="block text-xs text-ui-muted">
            Objetivo de {single.name} (opcional)
            <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="ui-input mt-1 w-full text-xs">
              <option value="">Sem objetivo</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.text}
                </option>
              ))}
            </select>
          </label>
        )}
        <DateTimePT
          type="date"
          value={due}
          onChange={setDue}
          label="Prazo (opcional)"
          inputClassName="ui-input w-full text-xs"
        />
        <label className="flex items-center gap-2 text-xs text-ui-text">
          <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
          Prioridade (aparece primeiro)
        </label>
        <label className="block text-xs text-ui-muted">
          Nota para a equipa técnica (opcional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="ui-input mt-1 w-full text-xs"
          />
        </label>
        {error && <p className="text-xs text-ui-danger">{error}</p>}
        <button type="submit" className="ui-btn ui-btn-primary w-full text-sm">
          Atribuir
        </button>
        <p className="text-[11px] text-ui-muted">Só a equipa técnica vê as atribuições. As famílias não as veem.</p>
      </form>
    </Sheet>
  );
};

/** «Atribuições»: what was given, the deadlines, and the coach's ticks per athlete and step. */
export const AssignmentsTab: React.FC<TeamData> = ({ challenges, missions, assignments, roster, readOnly, onSave }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [today] = useState(localDateISO);
  const list = sortAssignments(assignments).filter((a) => a.status !== 'cancelada');
  const titleOf = (a: Assignment) =>
    a.target.kind === 'missao'
      ? `🎯 ${missions.find((m) => m.id === a.target.id)?.title || 'Missão apagada'}`
      : challenges.find((c) => c.id === a.target.id)?.title || 'Desafio apagado';
  const save = (a: Assignment, msg?: string) =>
    onSave({ assignments: withItem(assignments, cleanAssignment(a, now())) }, msg);

  return (
    <div className="space-y-2">
      {list.length === 0 && (
        <p className="text-xs text-ui-muted">
          Ainda sem atribuições. Atribua uma missão (em «Missões») ou um desafio publicado (na biblioteca).
        </p>
      )}
      <ul className="space-y-2" aria-label="Atribuições">
        {list.map((a) => {
          const athletes = athletesOf(a, roster);
          const total = stepCount(a, missions);
          const finished = athletes.filter((id) => doneSteps(a, id) >= total && total > 0).length;
          const ready = a.status === 'ativa' ? readyToReassess(a, missions, roster) : [];
          const mission = a.target.kind === 'missao' ? missions.find((m) => m.id === a.target.id) : undefined;
          const steps = mission ? stepsOf(mission, challenges) : [{ challengeId: a.target.id, challenge: null }];
          return (
            <li key={a.id} className="ui-card space-y-1.5 p-3">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpen(open === a.id ? null : a.id)}
                aria-expanded={open === a.id}
                aria-label={`Atribuição ${titleOf(a)}`}
              >
                <b className="block text-sm text-ui-text">
                  {a.priority ? '⭐ ' : ''}
                  {titleOf(a)}
                </b>
                <span className="text-[11px] text-ui-muted">
                  {a.to === 'equipa'
                    ? 'Toda a equipa'
                    : `${athletes.length} ${athletes.length === 1 ? 'atleta' : 'atletas'}`}
                  {a.dueDate ? ` · prazo ${ddmm(a.dueDate)}` : ''}
                  {isAssignmentOverdue(a, today) && <b className="text-ui-warning"> · passou o prazo</b>}
                  {` · ${finished} de ${athletes.length} concluíram`}
                  {a.status === 'concluida' ? ' · Concluída' : ''}
                </span>
              </button>
              {ready.length > 0 && mission?.competencyId && (
                <p className="rounded-ui bg-ui-brand/10 p-1.5 text-[11px] text-ui-text">
                  Reavaliar 🧩 {competencyLabel(mission.competencyId)}?{' '}
                  {ready.map((id) => roster.find((p) => p.id === id)?.name).join(', ')}{' '}
                  {ready.length === 1 ? 'fez' : 'fizeram'} todos os passos. Faça a avaliação na ficha de cada atleta:
                  concluir a missão não muda o nível.
                </p>
              )}
              {open === a.id && (
                <div className="space-y-1">
                  <table className="w-full text-[11px]" aria-label={`Progresso de ${titleOf(a)}`}>
                    <thead>
                      <tr className="text-ui-muted">
                        <th className="text-left font-normal">Atleta</th>
                        {steps.map((s, i) => (
                          <th key={i} className="font-normal" title={s.challenge?.title}>
                            {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {athletes.map((id) => (
                        <tr key={id} className="border-t border-ui-line">
                          <td className="py-1 text-ui-text">{roster.find((p) => p.id === id)?.name}</td>
                          {steps.map((_, i) => {
                            const day = a.progress?.[id]?.[String(i)];
                            const name = roster.find((p) => p.id === id)?.name;
                            return (
                              <td key={i} className="text-center">
                                <input
                                  type="checkbox"
                                  disabled={readOnly || a.status !== 'ativa'}
                                  checked={!!day}
                                  aria-label={`${name}: passo ${i + 1} feito`}
                                  title={day ? `feito a ${ddmm(day)}` : undefined}
                                  onChange={(e) => save(withStepDone(a, id, i, e.target.checked ? today : null, now()))}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {a.note && <p className="text-[11px] text-ui-muted">📝 {a.note}</p>}
                  {!readOnly && a.status === 'ativa' && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => save({ ...a, status: 'concluida' }, 'Atribuição concluída ✓')}
                        className="ui-btn ui-btn-soft text-xs"
                      >
                        Concluir
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Cancelar esta atribuição?'))
                            save({ ...a, status: 'cancelada' }, 'Atribuição cancelada');
                        }}
                        className="ui-btn ui-btn-soft text-xs text-ui-danger"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ui-muted">
        ✓ marcado pelo treinador, como nas presenças. Só a equipa técnica vê. Sem comparações entre atletas.
      </p>
    </div>
  );
};

/** On the athlete's sheet: what was given to this athlete (read only; ticked in Visão de Jogo → Atribuições). */
export const AthleteAssignments: React.FC<{
  athleteId: string;
  assignments: Assignment[];
  missions: Mission[];
  challenges: VjSession[];
  roster: Player[];
}> = ({ athleteId, assignments, missions, challenges, roster }) => {
  const [today] = useState(localDateISO);
  const mine = sortAssignments(assignments).filter(
    (a) => a.status !== 'cancelada' && athletesOf(a, roster).includes(athleteId)
  );
  if (!mine.length) return null;
  return (
    <section className="ui-card space-y-1 p-3" aria-label="Missões e desafios atribuídos">
      <span className="ui-kicker">Missões e desafios atribuídos</span>
      {mine.map((a) => {
        const total = stepCount(a, missions);
        const title =
          a.target.kind === 'missao'
            ? `🎯 ${missions.find((m) => m.id === a.target.id)?.title || 'Missão apagada'}`
            : challenges.find((c) => c.id === a.target.id)?.title || 'Desafio apagado';
        return (
          <p key={a.id} className="flex justify-between gap-2 border-b border-ui-line py-1 text-xs">
            <span className="min-w-0 text-ui-text">
              {title}
              {a.dueDate ? <span className="text-ui-muted"> · prazo {ddmm(a.dueDate)}</span> : null}
              {isAssignmentOverdue(a, today) ? <b className="text-ui-warning"> · passou o prazo</b> : null}
            </span>
            <span className="shrink-0 text-ui-muted">
              {doneSteps(a, athleteId)}/{total} {a.status === 'concluida' ? '· concluída' : ''}
            </span>
          </p>
        );
      })}
      <p className="text-[11px] text-ui-muted">Marque o que foi feito em Visão de Jogo → Atribuições.</p>
    </section>
  );
};
