import React, { useState } from 'react';
import { Exercise, Training } from '../../../types';
import { kitBag, kitBagText } from '../../../lib/kitBag';

interface KitBagCardProps {
  training: Training;
  library: Exercise[];
  onShowToast: (msg: string) => void;
}

/** 🎒 Levar para o treino: the material the plan's exercises need, to tick off while packing and send to the assistant. */
export const KitBagCard: React.FC<KitBagCardProps> = ({ training, library, onShowToast }) => {
  const [packed, setPacked] = useState<string[]>([]);
  const items = kitBag(training.sessionPlan?.blocks, library);
  if (items.length === 0) return null;
  const text = kitBagText(items, training.date, training.time);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast('Lista copiada ✓');
    } catch {
      onShowToast('Não foi possível copiar.');
    }
  };

  return (
    <section
      aria-label="Levar para o treino"
      className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-slate-900 p-3"
    >
      <h4 className="text-sm font-bold text-amber-300">🎒 Levar para o treino</h4>
      <ul className="mt-1">
        {items.map((i) => {
          const on = packed.includes(i.id);
          return (
            <li key={i.id} className="border-t border-slate-800/80 first:border-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => setPacked(on ? packed.filter((x) => x !== i.id) : [...packed, i.id])}
                className="flex w-full items-center gap-2.5 py-2 text-left text-sm"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[11px] font-black ${
                    on ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className={`flex-1 font-semibold ${on ? 'text-slate-500 line-through' : 'text-white'}`}>
                  {i.label}
                </span>
                <span aria-hidden="true">{i.emoji}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[11px] text-slate-400">
        Conta o exercício que pede mais de cada coisa, porque o material passa de um exercício para o seguinte.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="ui-btn ui-btn-secondary py-2 text-xs">
          📋 Copiar
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn ui-btn-secondary py-2 text-xs flex items-center justify-center"
        >
          💬 Enviar por WhatsApp
        </a>
      </div>
    </section>
  );
};
