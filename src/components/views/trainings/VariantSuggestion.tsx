import React, { useState } from 'react';
import { Exercise, SessionBlock, Training } from '../../../types';
import { LEVELS, applyVariants, levelHistory, variantsFor } from '../../../lib/exerciseLevel';
import { FieldKind } from '../../../lib/fieldSetup';

interface VariantSuggestionProps {
  block: SessionBlock;
  exercise: Exercise;
  trainings: Training[];
  date: string;
  field: FieldKind;
  onChange: (block: SessionBlock) => void;
}

const day = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

/** 🎚️ In the plan: how the exercise went last time and the variants to make it harder or easier. */
export const VariantSuggestion: React.FC<VariantSuggestionProps> = ({
  block,
  exercise,
  trainings,
  date,
  field,
  onChange
}) => {
  const last = levelHistory(trainings, exercise.id, date).pop();
  const variants = last ? variantsFor(last.level, block, exercise, field) : [];
  const [chosen, setChosen] = useState<string[]>(variants.slice(0, 2).map((v) => v.id));
  if (!last || block.levelChecked || variants.length === 0) return null;
  const hard = last.level === 'dificil';
  return (
    <section
      aria-label={`Sugestão para ${block.title || exercise.name}`}
      className={`rounded-xl border p-2.5 space-y-1.5 ${hard ? 'border-ui-danger/60 bg-ui-danger-soft' : 'border-ui-brand/60 bg-ui-brand-soft'}`}
    >
      <p className={`text-xs font-bold ${hard ? 'text-ui-danger' : 'text-ui-brand'}`}>
        {LEVELS[last.level].emoji} Da última vez ({day(last.date)}) foi {LEVELS[last.level].label.toLowerCase()}.
      </p>
      <p className="text-[11px] text-ui-muted">{hard ? 'Para facilitar' : 'Para dificultar'}, escolhe uma ou mais:</p>
      {variants.map((v) => (
        <label key={v.id} className="flex items-start gap-2 text-xs text-ui-text">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={chosen.includes(v.id)}
            onChange={(e) => setChosen(e.target.checked ? [...chosen, v.id] : chosen.filter((x) => x !== v.id))}
          />
          {v.label}
        </label>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange({ ...block, levelChecked: true })}
          className="ui-btn ui-btn-secondary px-3 py-1.5 text-[11px]"
        >
          Manter igual
        </button>
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() =>
            onChange(
              applyVariants(
                block,
                last.level,
                variants.filter((v) => chosen.includes(v.id))
              )
            )
          }
          className="ui-btn ui-btn-primary flex-1 py-1.5 text-[11px]"
        >
          Aplicar ao plano
        </button>
      </div>
    </section>
  );
};
