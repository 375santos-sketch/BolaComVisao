import React, { useMemo, useState } from 'react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { Exercise, ExerciseCategory, Training } from '../../../types';
import { exerciseUsage, usageLabel } from '../../../lib/trainingTemplates';
import { compressImageFile } from '../../../lib/imageCompress';
import { uid } from '../../../lib/utils';

const EXERCISE_CATEGORIES: { id: ExerciseCategory; label: string }[] = [
  { id: 'aquecimento', label: '🔥 Aquecimento' },
  { id: 'tecnica', label: '⚽ Técnica' },
  { id: 'tatica', label: '⚡ Tática' },
  { id: 'fisico', label: '🏃 Físico' },
  { id: 'jogo', label: '🥅 Jogo' },
  { id: 'bolas_paradas', label: '🎯 Bolas paradas' }
];
const categoryLabel = (c?: ExerciseCategory) => EXERCISE_CATEGORIES.find((x) => x.id === c)?.label || '';

interface ExerciseLibraryProps {
  exercises: Exercise[];
  /** The team's trainings, to show how often and when each exercise was used. */
  trainings?: Training[];
  onSave: (exercises: Exercise[]) => void;
  onShowToast: (msg: string) => void;
}

const input = 'ui-input text-xs';

const blank = (): Exercise => ({
  id: uid(),
  name: '',
  category: 'tecnica',
  durationMinutes: 15,
  createdAt: new Date().toISOString()
});

/** Treinos → Biblioteca: the coach's exercises (name, objective, drawing/photo, duration), reused in session plans. */
export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({ exercises, trainings, onSave, onShowToast }) => {
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [search, setSearch] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const [order, setOrder] = useState<'nome' | 'mais' | 'esquecidos'>('nome');
  const usage = useMemo(() => exerciseUsage(trainings), [trainings]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'pt-PT');
    const times = (e: Exercise) => usage.get(e.id)?.times || 0;
    const last = (e: Exercise) => usage.get(e.id)?.lastDate || '';
    return [...exercises]
      .filter((e) => !q || `${e.name} ${e.objective || ''}`.toLowerCase().includes(q))
      .sort((a, b) =>
        order === 'mais'
          ? times(b) - times(a) || byName(a, b)
          : order === 'esquecidos'
            ? last(a).localeCompare(last(b)) || byName(a, b)
            : byName(a, b)
      );
  }, [exercises, search, order, usage]);

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      onShowToast('Dê um nome ao exercício.');
      return;
    }
    const clean: Exercise = { ...editing, name: editing.name.trim(), objective: editing.objective?.trim() || '' };
    const exists = exercises.some((e) => e.id === clean.id);
    onSave(exists ? exercises.map((e) => (e.id === clean.id ? clean : e)) : [...exercises, clean]);
    onShowToast(exists ? 'Exercício atualizado ✓' : 'Exercício guardado na biblioteca ✓');
    setEditing(null);
  };

  const importImage = async (file?: File) => {
    if (!file || !editing) return;
    setLoadingImage(true);
    try {
      const image = await compressImageFile(file);
      setEditing((e) => (e ? { ...e, image } : e));
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível importar a imagem.');
    } finally {
      setLoadingImage(false);
    }
  };

  if (editing) {
    return (
      <section aria-label="Editar exercício" className="card space-y-3">
        <h3 className="text-sm font-black text-white font-['Chakra_Petch'] uppercase">
          {exercises.some((e) => e.id === editing.id) ? '✏️ Editar exercício' : '➕ Novo exercício'}
        </h3>
        <label className="block text-[11px] text-slate-400">
          Nome
          <input
            className={input}
            value={editing.name}
            placeholder="Ex: Rondo 4x2"
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
        </label>
        <label className="block text-[11px] text-slate-400">
          Objetivo
          <AutoTextarea
            className={input}
            rows={3}
            value={editing.objective || ''}
            placeholder="Ex: Circulação de bola sob pressão e reação à perda"
            onChange={(e) => setEditing({ ...editing, objective: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-slate-400">
            Duração (min)
            <input
              type="number"
              min={1}
              max={120}
              className={input}
              value={editing.durationMinutes}
              onChange={(e) =>
                setEditing({ ...editing, durationMinutes: Math.max(1, Math.round(Number(e.target.value) || 1)) })
              }
            />
          </label>
          <label className="block text-[11px] text-slate-400">
            Tipo
            <select
              className={input}
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value as ExerciseCategory })}
            >
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-[11px] text-slate-400">
          Descrição / regras (opcional)
          <AutoTextarea
            className={input}
            rows={5}
            value={editing.description || ''}
            placeholder="Espaço, número de jogadores, regras, variantes…"
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          />
        </label>

        <div className="space-y-2">
          <div className="text-[11px] text-slate-400">Desenho do exercício</div>
          {editing.image ? (
            <div className="space-y-2">
              <img
                src={editing.image}
                alt={`Desenho: ${editing.name || 'exercício'}`}
                className="w-full max-h-64 object-contain rounded-xl bg-white"
              />
              <button
                type="button"
                onClick={() => setEditing({ ...editing, image: undefined })}
                className="text-[11px] text-rose-300 underline"
              >
                Remover imagem
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              Importe uma foto do quadro, um desenho ou uma imagem tirada de outra app.
            </p>
          )}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-cyan-500/50 text-cyan-200 text-xs font-bold cursor-pointer">
            📷 {loadingImage ? 'A preparar a imagem…' : editing.image ? 'Trocar imagem' : 'Importar imagem'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Importar imagem do exercício"
              onChange={(e) => {
                importImage(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="flex justify-between gap-2 pt-1">
          <button type="button" onClick={() => setEditing(null)} className="ui-btn ui-btn-secondary px-4 py-2 text-xs">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={loadingImage}
            className="ui-btn ui-btn-primary px-5 py-2 text-xs"
          >
            Guardar exercício
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Biblioteca de exercícios" className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className={input}
          placeholder="🔍 Procurar exercício"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setEditing(blank())}
          className="ui-btn ui-btn-primary shrink-0 px-3 py-2 text-xs"
        >
          ➕ Novo exercício
        </button>
      </div>
      {exercises.length > 1 && (
        <div role="group" aria-label="Ordenar exercícios" className="flex flex-wrap gap-1.5 text-[11px]">
          {(
            [
              ['nome', 'Nome'],
              ['mais', 'Mais usados'],
              ['esquecidos', 'Há mais tempo sem usar']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={order === id}
              onClick={() => setOrder(id)}
              className={`ui-btn px-2.5 py-1 text-[11px] ${order === id ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <div className="card text-center text-xs text-slate-400 py-8">
          {exercises.length === 0
            ? 'Ainda sem exercícios. Crie o primeiro e use-o depois no plano de cada treino.'
            : 'Nenhum exercício com esse nome.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {list.map((e) => (
            <li key={e.id} className="card p-3 flex gap-3 items-start">
              {e.image ? (
                <img src={e.image} alt="" className="w-20 h-16 object-contain rounded-lg bg-white shrink-0" />
              ) : (
                <div className="ui-inset w-20 h-16 flex items-center justify-center text-xl shrink-0">📋</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{e.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {categoryLabel(e.category)} · {e.durationMinutes} min
                </div>
                {e.objective && <div className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{e.objective}</div>}
                <div className="text-[10px] text-cyan-300/80 mt-0.5">{usageLabel(usage.get(e.id))}</div>
                <div className="flex gap-3 mt-1.5 text-[11px]">
                  <button type="button" className="text-cyan-300 font-bold" onClick={() => setEditing(e)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-rose-300"
                    onClick={() => {
                      onSave(exercises.filter((x) => x.id !== e.id));
                      onShowToast('Exercício apagado da biblioteca');
                    }}
                  >
                    Apagar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
