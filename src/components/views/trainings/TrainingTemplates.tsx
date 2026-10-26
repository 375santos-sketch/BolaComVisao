import React, { useState } from 'react';
import { AppState } from '../../../types';
import { formFromTemplate, teamTemplates, templateFromForm, withTeamTemplates } from '../../../lib/trainingTemplates';
import { TrainingFormData } from './types';

interface TrainingTemplatesProps {
  state: AppState;
  trainingForm: TrainingFormData;
  setTrainingForm: React.Dispatch<React.SetStateAction<TrainingFormData | null>>;
  onUpdateState: (updates: Partial<AppState>) => void;
  onShowToast: (msg: string) => void;
}

/** Treino → Modelos: start the training from a saved model, or keep this one as a model. */
export const TrainingTemplates: React.FC<TrainingTemplatesProps> = ({
  state,
  trainingForm,
  setTrainingForm,
  onUpdateState,
  onShowToast
}) => {
  const templates = teamTemplates(state);
  const [chosen, setChosen] = useState('');
  const [naming, setNaming] = useState<string | null>(null);

  const save = (list: typeof templates) => {
    const teams = withTeamTemplates(state, list);
    if (!teams) {
      onShowToast('Escolha primeiro uma equipa.');
      return false;
    }
    onUpdateState({ teams });
    return true;
  };

  const use = () => {
    const tpl = templates.find((t) => t.id === chosen);
    if (!tpl) return;
    setTrainingForm({ ...trainingForm, ...formFromTemplate(tpl) });
    onShowToast(`📋 Modelo "${tpl.name}" aplicado: confirme a data e guarde.`);
  };

  const keep = () => {
    const name = (naming || '').trim();
    if (!name) {
      onShowToast('Dê um nome ao modelo.');
      return;
    }
    const others = templates.filter((t) => t.name.toLowerCase() !== name.toLowerCase());
    if (save([...others, templateFromForm(name, trainingForm)])) {
      setNaming(null);
      onShowToast(others.length < templates.length ? `Modelo "${name}" atualizado ✓` : `Modelo "${name}" guardado ✓`);
    }
  };

  const remove = () => {
    const tpl = templates.find((t) => t.id === chosen);
    if (!tpl || !window.confirm(`Apagar o modelo "${tpl.name}"?`)) return;
    if (save(templates.filter((t) => t.id !== tpl.id))) {
      setChosen('');
      onShowToast('Modelo apagado.');
    }
  };

  return (
    <section aria-label="Modelos de treino" className="ui-inset p-3 mb-4 space-y-2">
      <div className="text-xs font-bold text-white">📋 Modelos de treino</div>
      {templates.length > 0 ? (
        <div className="flex gap-2">
          <select
            aria-label="Modelo"
            className="ui-input flex-1 text-xs"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Escolher modelo…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.blocks.length} {t.blocks.length === 1 ? 'bloco' : 'blocos'})
              </option>
            ))}
          </select>
          <button type="button" onClick={use} disabled={!chosen} className="ui-btn ui-btn-primary px-3 text-xs">
            Usar
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={!chosen}
            aria-label="Apagar modelo"
            className="ui-btn ui-btn-soft-danger px-2.5 text-xs"
          >
            🗑️
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          Ainda sem modelos. Prepare um treino e guarde-o como modelo para o reutilizar nas próximas semanas.
        </p>
      )}
      {naming === null ? (
        <button type="button" onClick={() => setNaming('')} className="ui-btn ui-btn-soft w-full py-2 text-xs">
          💾 Guardar este treino como modelo
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            aria-label="Nome do modelo"
            className="ui-input flex-1 text-xs"
            value={naming}
            autoFocus
            placeholder="Ex: Terça – técnica e finalização"
            onChange={(e) => setNaming(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && keep()}
          />
          <button type="button" onClick={keep} className="ui-btn ui-btn-primary px-3 text-xs">
            Guardar
          </button>
          <button type="button" onClick={() => setNaming(null)} className="ui-btn ui-btn-ghost px-2 text-xs">
            ✕
          </button>
        </div>
      )}
    </section>
  );
};
