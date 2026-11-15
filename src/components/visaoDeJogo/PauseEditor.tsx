import React, { useState } from 'react';
import { VjItem, VjOption, VjPause } from '../../types';
import { clock, cleanPause, parseClock, pausesOf } from '../../lib/vjPauses';
import { uid } from '../../lib/utils';

const emptyOption = (): VjOption => ({ id: uid(), text: '', correct: false });

/**
 * VJ2 — The pauses of one video: when it stops (m:ss), the question, and for a choice question the answers (one or
 * more right, each with an explanation); an open question has what the coach wants to hear.
 */
export const PauseEditor: React.FC<{
  item: VjItem;
  index: number;
  readOnly: boolean;
  onChange: (pauses: VjPause[]) => void;
}> = ({ item, index, readOnly, onChange }) => {
  const pauses = pausesOf(item);
  const [form, setForm] = useState<VjPause | null>(null);
  const [atText, setAtText] = useState('');
  const [error, setError] = useState('');

  const open = (p?: VjPause) => {
    setError('');
    setForm(
      p
        ? { ...p, options: p.options ? p.options.map((o) => ({ ...o })) : undefined }
        : { id: uid(), at: 0, question: '', kind: 'escolha', options: [emptyOption(), emptyOption(), emptyOption()] }
    );
    setAtText(p ? clock(p.at) : '');
  };
  const setOption = (id: string, patch: Partial<VjOption>) =>
    form && setForm({ ...form, options: (form.options || []).map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  return (
    <div className="space-y-1.5" aria-label={`Pausas do vídeo ${index + 1}`}>
      {pauses.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between gap-2 rounded-lg border-l-4 border-ui-brand bg-ui-brand/5 px-2 py-1.5"
        >
          <span className="min-w-0 text-[11px]">
            <b className="text-ui-text">{clock(p.at)}</b> · «{p.question}» ·{' '}
            {p.kind === 'aberta'
              ? 'resposta aberta'
              : `${p.options?.length} opções · ${p.options?.filter((o) => o.correct).length} ${
                  p.options?.filter((o) => o.correct).length === 1 ? 'certa' : 'certas'
                }`}
          </span>
          {!readOnly && (
            <span className="flex shrink-0 gap-1">
              <button type="button" onClick={() => open(p)} className="text-[11px] text-ui-brand">
                Editar
              </button>
              <button
                type="button"
                aria-label={`Apagar a pausa de ${clock(p.at)}`}
                onClick={() => onChange(pauses.filter((x) => x.id !== p.id))}
                className="px-1 text-[11px] text-ui-muted hover:text-ui-danger"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      ))}

      {!readOnly && !form && (
        <button type="button" onClick={() => open()} className="ui-btn ui-btn-soft w-full text-[11px]">
          + Parar aqui (pausa com pergunta)
        </button>
      )}

      {!readOnly && form && (
        <form
          aria-label="Pausa com pergunta"
          className="space-y-1.5 rounded-ui border border-ui-line p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const at = parseClock(atText);
            if (at === null) return setError('Escreva o momento como m:ss (ex.: 0:42).');
            const clean = cleanPause({ ...form, at });
            if (!clean)
              return setError(
                form.kind === 'escolha'
                  ? 'Escreva a pergunta, pelo menos 2 respostas e marque pelo menos uma certa.'
                  : 'Escreva a pergunta.'
              );
            onChange([...pauses.filter((x) => x.id !== clean.id), clean]);
            setForm(null);
          }}
        >
          <div className="grid grid-cols-[5rem_1fr] gap-1.5">
            <input
              value={atText}
              onChange={(e) => setAtText(e.target.value)}
              aria-label="Momento da pausa"
              placeholder="0:42"
              inputMode="numeric"
              className="ui-input text-xs"
            />
            <select
              value={form.kind}
              aria-label="Tipo de pergunta"
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as VjPause['kind'],
                  options: e.target.value === 'escolha' ? form.options || [emptyOption(), emptyOption()] : form.options
                })
              }
              className="ui-input text-xs"
            >
              <option value="escolha">Escolha (uma ou mais certas)</option>
              <option value="aberta">Resposta aberta</option>
            </select>
          </div>
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            maxLength={200}
            aria-label="Pergunta"
            placeholder="Ex.: Onde deve o médio receber?"
            className="ui-input w-full text-xs"
          />
          {form.kind === 'escolha' ? (
            <>
              {(form.options || []).map((o, i) => (
                <div key={o.id} className="space-y-1 rounded-lg border border-ui-line p-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={o.correct}
                      onChange={(e) => setOption(o.id, { correct: e.target.checked })}
                      aria-label={`Resposta ${String.fromCharCode(65 + i)} certa`}
                    />
                    <input
                      value={o.text}
                      onChange={(e) => setOption(o.id, { text: e.target.value })}
                      maxLength={120}
                      aria-label={`Resposta ${String.fromCharCode(65 + i)}`}
                      placeholder={`Resposta ${String.fromCharCode(65 + i)}`}
                      className="ui-input min-w-0 flex-1 text-xs"
                    />
                  </div>
                  <input
                    value={o.explanation || ''}
                    onChange={(e) => setOption(o.id, { explanation: e.target.value })}
                    maxLength={300}
                    aria-label={`Explicação da resposta ${String.fromCharCode(65 + i)}`}
                    placeholder="Explicação (porquê)"
                    className="ui-input w-full text-[11px]"
                  />
                </div>
              ))}
              {(form.options || []).length < 5 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, options: [...(form.options || []), emptyOption()] })}
                  className="text-[11px] text-ui-brand"
                >
                  + Resposta
                </button>
              )}
            </>
          ) : (
            <input
              value={form.explanation || ''}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              maxLength={400}
              aria-label="O que quero ouvir"
              placeholder="O que quero ouvir (mostrado no fim da conversa)"
              className="ui-input w-full text-xs"
            />
          )}
          {error && <p className="text-[11px] text-ui-danger">{error}</p>}
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => setForm(null)} className="ui-btn ui-btn-soft text-xs">
              Cancelar
            </button>
            <button type="submit" className="ui-btn ui-btn-primary text-xs">
              Guardar a pausa
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
