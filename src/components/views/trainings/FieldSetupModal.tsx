import React, { useState } from 'react';
import { AppState, Training } from '../../../types';
import { FIELDS, FieldKind, areaOf, fieldOf, fieldSetup, fieldSvg, setupSteps } from '../../../lib/fieldSetup';
import { kitBag } from '../../../lib/kitBag';
import { teamSettings, withTeamSettings } from '../../../lib/teamSettings';
import { nextTraining } from '../../../lib/coachPlan';
import { localDateISO } from '../../../lib/trainingQuick';
import { planLink } from '../../../services/publicPlan';

interface FieldSetupModalProps {
  state: AppState;
  training: Training;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
  /** Opens "🔗 Plano para o adjunto" (to create the link when there is none). */
  onOpenPlanShare?: () => void;
  onClose: () => void;
}

const WEEKDAYS = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];

/**
 * Treinos → 📐 Montar o campo: the pitch of the day with each exercise's space, and the steps for whoever arrives
 * first. The same drawing goes in the assistant's link (for the next training).
 */
export const FieldSetupModal: React.FC<FieldSetupModalProps> = ({
  state,
  training,
  onUpdateState,
  onShowToast,
  onOpenPlanShare,
  onClose
}) => {
  const settings = teamSettings(state);
  const field = fieldOf(training, settings.trainingFields);
  const library = state.exerciseLibrary || [];
  const blocks = training.sessionPlan?.blocks || [];
  const setup = fieldSetup(blocks, library, field);
  const [tab, setTab] = useState<'campo' | 'passos'>('campo');
  const [unit, setUnit] = useState<'passos' | 'm'>('passos');
  const [done, setDone] = useState<number[]>([]);
  const steps = setupSteps(setup, unit);
  const kit = kitBag(blocks, library);
  const weekday = new Date(`${training.date.slice(0, 10)}T12:00:00`).getDay();

  // Blocks whose size is not known yet: asked here once (kept in the exercise, or in the block)
  const unknown = blocks.filter((b, i) => {
    const ex = b.exerciseId ? library.find((e) => e.id === b.exerciseId) : undefined;
    const first = blocks.findIndex((o) => (o.exerciseId || o.id) === (b.exerciseId || b.id)) === i;
    return first && (b.durationMinutes || 0) > 0 && !areaOf(b, ex, field);
  });
  const [sizes, setSizes] = useState<Record<string, { w: string; l: string }>>({});

  const updateTraining = (changes: Partial<Training>) =>
    onUpdateState({ trainings: (state.trainings || []).map((t) => (t.id === training.id ? { ...t, ...changes } : t)) });

  const chooseField = (kind: FieldKind) => {
    const teams = withTeamSettings(state, {
      trainingFields: { ...settings.trainingFields, [String(weekday)]: kind }
    });
    onUpdateState({
      trainings: (state.trainings || []).map((t) => (t.id === training.id ? { ...t, field: kind } : t)),
      ...(teams ? { teams } : {})
    });
  };

  const saveSize = (blockId: string) => {
    const b = blocks.find((x) => x.id === blockId);
    const s = sizes[blockId];
    const w = Math.round(Number(s?.w));
    const l = Math.round(Number(s?.l));
    if (!b || !(w >= 3 && w <= 70 && l >= 3 && l <= 70)) {
      onShowToast('Escreva a largura e o comprimento em passos (entre 3 e 70).');
      return;
    }
    if (b.exerciseId && library.some((e) => e.id === b.exerciseId)) {
      onUpdateState({ exerciseLibrary: library.map((e) => (e.id === b.exerciseId ? { ...e, area: { w, l } } : e)) });
    } else {
      updateTraining({
        sessionPlan: {
          ...(training.sessionPlan || { blocks: [] }),
          blocks: blocks.map((x) => (x.id === blockId ? { ...x, area: { w, l } } : x))
        }
      });
    }
    onShowToast('Medidas guardadas ✓');
  };

  const team = (state.teams || []).find((t) => t.id === state.activeTeamId);
  const isNext = nextTraining(state.trainings || [], localDateISO())?.id === training.id;
  const sendToAssistant = async () => {
    if (!team?.planToken) {
      onShowToast('Primeiro crie o link do adjunto.');
      onOpenPlanShare?.();
      return;
    }
    const day = training.date.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
    const text = `📐 Campo para o treino de ${day}${training.time ? ` (${training.time})` : ''}: desenho e passo a passo para montar. Se chegares primeiro, vai montando 👍\n${planLink(team.planToken)}#campo`;
    try {
      if (navigator.share) await navigator.share({ text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } catch {
      /* the coach closed the share sheet */
    }
  };

  return (
    <div
      className="ui-overlay fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Montar o campo"
        className="ui-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">📐 Montar o campo</h3>
            <p className="text-[11px] text-slate-400">
              Treino de {training.date.slice(0, 10).split('-').reverse().join('/')}
              {training.time ? ` · ${training.time}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar montar o campo" className="text-slate-400 text-lg">
            ✕
          </button>
        </div>

        <div role="radiogroup" aria-label="Espaço do treino" className="grid grid-cols-2 gap-1.5">
          {(Object.keys(FIELDS) as FieldKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={field === k}
              onClick={() => chooseField(k)}
              className={`ui-btn py-2 text-[11px] ${field === k ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
            >
              {k === 'f7' ? '⚽ Campo de 7' : '½ Meio campo de 7'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 -mt-1">Fica guardado para as {WEEKDAYS[weekday]}.</p>

        {unknown.length > 0 && (
          <section aria-label="Medidas em falta" className="rounded-2xl bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-200">
              Falta saber o tamanho {unknown.length === 1 ? 'deste exercício' : 'destes exercícios'} (em passos). Só é
              preciso uma vez.
            </p>
            {unknown.map((b) => (
              <div key={b.id} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">{b.title || 'Bloco'}</span>
                <input
                  inputMode="numeric"
                  aria-label={`Largura de ${b.title || 'Bloco'}`}
                  placeholder="larg."
                  className="ui-input w-14 !py-1 text-center text-sm"
                  value={sizes[b.id]?.w || ''}
                  onChange={(e) => setSizes({ ...sizes, [b.id]: { w: e.target.value, l: sizes[b.id]?.l || '' } })}
                />
                <span className="text-slate-400">×</span>
                <input
                  inputMode="numeric"
                  aria-label={`Comprimento de ${b.title || 'Bloco'}`}
                  placeholder="comp."
                  className="ui-input w-14 !py-1 text-center text-sm"
                  value={sizes[b.id]?.l || ''}
                  onChange={(e) => setSizes({ ...sizes, [b.id]: { w: sizes[b.id]?.w || '', l: e.target.value } })}
                />
                <button
                  type="button"
                  onClick={() => saveSize(b.id)}
                  aria-label={`Guardar medidas de ${b.title || 'Bloco'}`}
                  className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-[11px]"
                >
                  OK
                </button>
              </div>
            ))}
          </section>
        )}

        {setup.zones.length === 0 ? (
          <p className="ui-inset p-4 text-center text-xs text-slate-400">
            {blocks.length
              ? 'Escreva as medidas dos exercícios acima e o campo aparece desenhado.'
              : 'Este treino ainda não tem plano. Junte exercícios ao plano e volte aqui.'}
          </p>
        ) : (
          <>
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1">
              {(['campo', 'passos'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg py-1.5 text-xs font-bold ${tab === t ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}
                >
                  {t === 'campo' ? 'Campo' : 'Passo a passo'}
                </button>
              ))}
            </div>

            {tab === 'campo' ? (
              <section aria-label="Campo desenhado" className="space-y-2">
                {/* The drawing is built by the app from numbers and escaped text */}
                <div
                  className="overflow-hidden rounded-xl"
                  dangerouslySetInnerHTML={{ __html: fieldSvg(setup, unit) }}
                />
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                  {setup.zones.map((z) => (
                    <li key={z.letter} className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                      <b>{z.letter}</b> {z.title} · {z.from}–{z.to}&apos;
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section aria-label="Passo a passo" className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    {done.length} de {steps.length} feitos
                  </span>
                  <span>1 passo largo ≈ 1 metro · começa na 🚩</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${steps.length ? (done.length / steps.length) * 100 : 0}%` }}
                  />
                </div>
                <ol>
                  {steps.map((s, i) => {
                    const on = done.includes(i);
                    return (
                      <li key={i} className="border-t border-slate-800 first:border-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => setDone(on ? done.filter((x) => x !== i) : [...done, i])}
                          className="flex w-full items-start gap-2.5 py-2.5 text-left"
                        >
                          <span
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black text-slate-950"
                            style={{ background: s.color }}
                          >
                            {s.zone}
                          </span>
                          <span
                            className={`flex-1 text-[13px] leading-snug ${on ? 'text-slate-500 line-through' : 'text-white'}`}
                          >
                            {s.text}
                            <span className="mt-0.5 block text-[11px] text-slate-400">{s.sub}</span>
                          </span>
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-black ${
                              on ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600'
                            }`}
                          >
                            {on ? '✓' : ''}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {setup.crowded.length > 0 && (
              <p role="alert" className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">
                Não cabe ao mesmo tempo no {FIELDS[field].label.toLowerCase()}: {setup.crowded.join(', ')}. Reduza as
                medidas ou mude a ordem do plano.
              </p>
            )}
            {kit.length > 0 && (
              <p className="text-[11px] text-slate-300">
                <b className="text-slate-400">LEVAR:</b> {kit.map((k) => k.label).join(' · ')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnit(unit === 'passos' ? 'm' : 'passos')}
                className="ui-btn ui-btn-secondary py-2.5 text-xs"
              >
                🔁 {unit === 'passos' ? 'Ver em metros' : 'Ver em passos'}
              </button>
              <button type="button" onClick={sendToAssistant} className="ui-btn ui-btn-primary py-2.5 text-xs">
                📲 Mandar ao adjunto
              </button>
            </div>
            {!isNext && (
              <p className="text-[10px] text-slate-500">
                O link do adjunto mostra sempre o próximo treino: este campo aparece lá quando este for o próximo.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
