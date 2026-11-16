import React, { useState } from 'react';
import { VjPause, VjRun, VjSession } from '../../types';
import { Sheet } from '../ui/Sheet';
import { embedUrl, useYouTubeFrame } from '../../lib/youtubeFrame';
import { PAUSE_TOLERANCE, clock, groupGotIt, nextPause, pauseDue, pausesOf } from '../../lib/vjPauses';
import { uid } from '../../lib/utils';
import { localDateISO } from '../../lib/trainingQuick';

/**
 * VJ2 — Conduzir no treino: the session's videos one after the other; each stops at its pauses with the question,
 * the team talks and answers (the group's answer, never names), the coach shows the explanations and carries on.
 * «Ir à próxima pergunta» works without the video (no network, or the video does not load). Ends with a summary.
 */
export const ConductSession: React.FC<{
  session: VjSession;
  /** Saves the group's answers (absent: read-only, nothing saved). */
  onFinish?: (run: VjRun) => void;
  onClose: () => void;
  /** VJ5: the team's athletes, to tick who was in the session (for the competencies of each one). */
  athletes?: Array<{ id: string; name: string }>;
  /** Who comes ticked: the athletes at today's training. */
  defaultPresent?: string[];
  /** VJ6: watched at home by the family (the answers stay on that phone; nothing is saved). */
  home?: boolean;
}> = ({ session, onFinish, onClose, athletes = [], defaultPresent = [], home = false }) => {
  const [present, setPresent] = useState<string[]>(defaultPresent);
  const [itemIndex, setItemIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<VjPause | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(session.items.length === 0);
  const item = session.items[itemIndex];

  const stopAt = (p: VjPause) => {
    setCurrent(p);
    setChosen([]);
    setRevealed(false);
  };
  const goNextItem = () => {
    if (itemIndex + 1 < session.items.length) {
      setItemIndex(itemIndex + 1);
      setCurrent(null);
    } else setFinished(true);
  };

  const { frameRef, listen, ready, time, seek, pause } = useYouTubeFrame((t, ended, controls) => {
    if (!item || current || finished) return;
    const due = t >= 0 ? pauseDue(item, t, done) : null;
    if (due) {
      controls.pause();
      stopAt(due);
    } else if (ended) goNextItem();
  });

  const carryOn = () => {
    if (!current) return;
    const nextDone = new Set(done).add(current.id);
    setDone(nextDone);
    setAnswers({ ...answers, [current.id]: chosen });
    const at = current.at;
    setCurrent(null);
    if (item && !nextPause(item, nextDone) && time >= at - PAUSE_TOLERANCE && !ready) goNextItem();
    else seek(at + PAUSE_TOLERANCE);
  };

  const all = session.items.flatMap((i) => pausesOf(i));

  if (finished) {
    return (
      <Sheet title="Resumo da sessão" onClose={onClose} size="lg">
        <div className="space-y-2">
          <p className="text-sm font-bold text-ui-text">{session.title}</p>
          {all.length === 0 && <p className="text-xs text-ui-muted">Esta sessão não tem perguntas.</p>}
          <ul className="space-y-1.5" aria-label="Respostas do grupo">
            {all.map((p) => {
              const a = answers[p.id];
              const got = a ? groupGotIt(p, a) : null;
              const labels = (p.options || []).filter((o) => a?.includes(o.id)).map((o) => o.text);
              return (
                <li key={p.id} className="ui-card p-2 text-xs">
                  <b className="text-ui-text">{p.question}</b>
                  <span className="block text-[11px] text-ui-muted">
                    {!a
                      ? 'não respondida'
                      : p.kind === 'aberta'
                        ? home
                          ? 'conversada em casa'
                          : 'conversada em grupo'
                        : `${home ? 'Resposta' : 'Grupo'}: ${labels.join(' + ') || '—'} · ${got ? '✓ certo' : '✗ ainda não'}`}
                  </span>
                </li>
              );
            })}
          </ul>
          {onFinish && athletes.length > 0 && Object.keys(answers).length > 0 && (
            <fieldset className="ui-card p-2" aria-label="Quem esteve na sessão?">
              <legend className="px-1 text-xs font-bold text-ui-text">Quem esteve na sessão?</legend>
              <p className="text-[11px] text-ui-muted">
                Vem marcado com as presenças do treino de hoje. Pode corrigir. Conta para as competências de cada
                atleta.
              </p>
              {athletes.map((a) => (
                <label key={a.id} className="flex items-center gap-2 border-b border-ui-line py-1 text-xs text-ui-text">
                  <input
                    type="checkbox"
                    checked={present.includes(a.id)}
                    onChange={(e) =>
                      setPresent((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)))
                    }
                  />
                  {a.name}
                </label>
              ))}
            </fieldset>
          )}
          <button
            type="button"
            onClick={() => {
              if (onFinish && Object.keys(answers).length)
                onFinish({
                  id: uid(),
                  date: localDateISO(),
                  answers,
                  ...(athletes.length ? { presentIds: present.filter((id) => athletes.some((a) => a.id === id)) } : {})
                });
              onClose();
            }}
            className="ui-btn ui-btn-primary w-full text-sm"
          >
            {onFinish && Object.keys(answers).length ? 'Guardar e terminar' : 'Terminar'}
          </button>
          <p className="text-[11px] text-ui-muted">
            {home
              ? 'As respostas ficam só neste telemóvel: o clube não recebe nada.'
              : 'Fica guardada a resposta do grupo e quem esteve, nunca uma resposta de cada criança.'}
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={home ? 'Ver em casa' : 'Conduzir no treino'} onClose={onClose} size="lg">
      <div className="space-y-2">
        <p className="text-[11px] text-ui-muted">
          {session.title} · vídeo {itemIndex + 1} de {session.items.length}
        </p>
        <div className="relative aspect-video overflow-hidden rounded-ui border border-ui-line bg-black">
          <iframe
            key={item.id}
            ref={frameRef}
            title={`Vídeo ${itemIndex + 1}`}
            src={embedUrl(item.youtubeId)}
            onLoad={listen}
            allow="autoplay; encrypted-media; picture-in-picture"
            className="h-full w-full"
          />
          {current && (
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
              ⏸ {clock(current.at)}
            </span>
          )}
        </div>

        {current ? (
          <section aria-label="Pergunta" className="space-y-1.5">
            <p className="text-sm font-bold text-ui-text">{current.question}</p>
            {current.kind === 'escolha' ? (
              (current.options || []).map((o, i) => {
                const on = chosen.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChosen(on ? chosen.filter((x) => x !== o.id) : [...chosen, o.id])}
                    className={`block w-full rounded-ui border px-3 py-2 text-left text-xs ${
                      on ? 'border-ui-brand bg-ui-brand/10' : 'border-ui-line'
                    }`}
                  >
                    <span className="text-ui-text">
                      {String.fromCharCode(65 + i)} · {o.text}
                    </span>
                    {revealed && (
                      <span className={`mt-0.5 block text-[11px] ${o.correct ? 'text-ui-success' : 'text-ui-muted'}`}>
                        {o.correct ? '✓ ' : '✗ '}
                        {o.explanation || (o.correct ? 'Boa opção.' : '')}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-[11px] text-ui-muted">
                Pergunta aberta: a equipa conversa.
                {revealed && current.explanation ? ` 💡 ${current.explanation}` : ''}
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setRevealed(true)} className="ui-btn ui-btn-soft text-xs">
                Mostrar explicação
              </button>
              <button type="button" onClick={carryOn} className="ui-btn ui-btn-primary text-xs">
                Continuar ▶
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                const p = item ? nextPause(item, done) : null;
                if (p) {
                  pause();
                  stopAt(p);
                } else goNextItem();
              }}
              className="ui-btn ui-btn-soft text-xs"
            >
              Ir à próxima pergunta
            </button>
            <button type="button" onClick={goNextItem} className="ui-btn ui-btn-soft text-xs">
              {itemIndex + 1 < session.items.length ? 'Vídeo seguinte' : 'Terminar'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
};
