import React, { useMemo, useState } from 'react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { Exercise, ExerciseCategory, Training } from '../../../types';
import { materialTextOf, parseMaterialText } from '../../../lib/kitBag';
import { TYPE_SUGGESTIONS, categoryFromType, typeOf } from '../../../lib/exerciseType';
import { exerciseUsage, usageLabel } from '../../../lib/trainingTemplates';
import { compressImageFile, compressImageSource, cropImageSource } from '../../../lib/imageCompress';
import { readPrintData } from '../../../lib/readPrint';
import { cleanPrintExercise } from '../../../lib/printExercise';
import { EXERCISE_SPACES, ExerciseIdeaRequest } from '../../../lib/exerciseIdea';
import { createExerciseIdea } from '../../../services/exerciseIdea';
import { uid } from '../../../lib/utils';
import { LEVELS, LevelMark, levelHistory, levelTrend } from '../../../lib/exerciseLevel';

/** 🎚️ How the exercise went the last times (😓 → 👌 → 😴) and what it means. */
const LevelHistory: React.FC<{ marks: LevelMark[] }> = ({ marks }) => {
  if (!marks.length) return null;
  const trend = levelTrend(marks);
  return (
    <div aria-label="Como correu" className="mt-1">
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-ui-text">
        {marks.slice(-4).map((m, i) => (
          <React.Fragment key={`${m.date}-${i}`}>
            {i > 0 && <span className="text-ui-muted">→</span>}
            <span className="whitespace-nowrap rounded-md border border-ui-line-strong bg-ui-surface px-1.5 py-0.5">
              {LEVELS[m.level].emoji} {m.date.slice(8, 10)}/{m.date.slice(5, 7)}
            </span>
          </React.Fragment>
        ))}
      </div>
      {trend && (
        <div
          className={`mt-0.5 text-[10px] ${
            trend.tone === 'up' ? 'text-ui-success' : trend.tone === 'down' ? 'text-ui-danger' : 'text-ui-muted'
          }`}
        >
          {trend.text}
        </div>
      )}
    </div>
  );
};

const EXERCISE_CATEGORIES: { id: ExerciseCategory; label: string }[] = [
  { id: 'aquecimento', label: '🔥 Aquecimento' },
  { id: 'tecnica', label: '⚽ Técnica' },
  { id: 'tatica', label: '⚡ Tática' },
  { id: 'fisico', label: '🏃 Físico' },
  { id: 'jogo', label: '🥅 Jogo' },
  { id: 'bolas_paradas', label: '🎯 Bolas paradas' },
  { id: 'calma', label: '🧘 Retorno à calma' }
];

interface ExerciseLibraryProps {
  exercises: Exercise[];
  /** The team's trainings, to show how often and when each exercise was used. */
  trainings?: Training[];
  onSave: (exercises: Exercise[]) => void;
  onShowToast: (msg: string) => void;
  /** The team's age group ("Sub-11"), for exercises proposed by the AI. */
  ageGroup?: string;
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
export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  exercises,
  trainings,
  onSave,
  onShowToast,
  ageGroup
}) => {
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [search, setSearch] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  // 📷 A partir de uma foto: the photo (to use it whole) and its drawing cut out, until the coach saves
  const [fromPhoto, setFromPhoto] = useState<{ photo: string; drawing?: string } | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  // ✨ Exercise proposed by the AI for a goal
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [idea, setIdea] = useState<ExerciseIdeaRequest>({
    goal: '',
    players: 10,
    minutes: 15,
    space: '½ campo',
    category: 'tatica'
  });
  const [creating, setCreating] = useState(false);
  const [fromIdea, setFromIdea] = useState<ExerciseIdeaRequest | null>(null);

  const [order, setOrder] = useState<'nome' | 'mais' | 'esquecidos'>('nome');
  // ⭐ Favourites and the category (type group) of the exercises shown
  const [group, setGroup] = useState<'todas' | 'favoritos' | ExerciseCategory>('todas');
  const usage = useMemo(() => exerciseUsage(trainings), [trainings]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'pt-PT');
    const times = (e: Exercise) => usage.get(e.id)?.times || 0;
    const last = (e: Exercise) => usage.get(e.id)?.lastDate || '';
    return [...exercises]
      .filter(
        (e) =>
          !q ||
          `${e.name} ${e.objective || ''} ${e.typeText || ''} ${e.description || ''} ${e.materialText || ''}`
            .toLowerCase()
            .includes(q)
      )
      .filter((e) => (group === 'todas' ? true : group === 'favoritos' ? e.favorite : e.category === group))
      .sort(
        (a, b) =>
          // Favourites first, then the chosen order
          Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
          (order === 'mais'
            ? times(b) - times(a) || byName(a, b)
            : order === 'esquecidos'
              ? last(a).localeCompare(last(b)) || byName(a, b)
              : byName(a, b))
      );
  }, [exercises, search, order, usage, group]);
  const groups = EXERCISE_CATEGORIES.filter((c) => exercises.some((e) => e.category === c.id));
  const toggleFavorite = (e: Exercise) => {
    onSave(exercises.map((x) => (x.id === e.id ? { ...x, favorite: !x.favorite } : x)));
    onShowToast(e.favorite ? 'Retirado dos favoritos' : 'Nos favoritos ⭐');
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      onShowToast('Dê um nome ao exercício.');
      return;
    }
    const clean: Exercise = { ...editing, name: editing.name.trim(), objective: editing.objective?.trim() || '' };
    for (const key of ['variations', 'typeText', 'materialText'] as const) {
      const v = clean[key]?.trim();
      if (v) clean[key] = v;
      else delete clean[key];
    }
    if (clean.materialText !== undefined) clean.material = parseMaterialText(clean.materialText).material;
    if (!clean.material) delete clean.material;
    // The old "explicar às crianças" text is no longer used
    delete (clean as Exercise & { kidsText?: string }).kidsText;
    const exists = exercises.some((e) => e.id === clean.id);
    onSave(exists ? exercises.map((e) => (e.id === clean.id ? clean : e)) : [...exercises, clean]);
    onShowToast(exists ? 'Exercício atualizado ✓' : 'Exercício guardado na biblioteca ✓');
    setEditing(null);
    setFromPhoto(null);
    setFromIdea(null);
  };

  /** Reads an exercise from a photo and opens it in the form, to check and save. */
  const readPhoto = async (file?: File) => {
    if (!file) return;
    setReadingPhoto(true);
    try {
      const photo = await compressImageFile(file, 1600, 600_000);
      const read = cleanPrintExercise(await readPrintData(photo, 'exercicio'));
      if (!read) throw new Error('Não encontrei um exercício nesta foto.');
      const whole = await compressImageSource(photo);
      const drawing = read.drawing ? await cropImageSource(photo, read.drawing).catch(() => undefined) : undefined;
      setFromPhoto({ photo: whole, drawing });
      setFromIdea(null);
      setEditing({
        ...blank(),
        name: read.name,
        category: read.category,
        durationMinutes: read.durationMinutes || 15,
        objective: read.objective || '',
        description: read.description || '',
        ...(read.material ? { material: read.material } : {}),
        image: drawing || whole
      });
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível ler a foto.');
    } finally {
      setReadingPhoto(false);
    }
  };

  /** Asks the AI for an exercise (another one, when `again`) and opens it in the form to check and save. */
  const createIdea = async (again = false) => {
    const request: ExerciseIdeaRequest = {
      ...(again && fromIdea ? fromIdea : idea),
      ...(ageGroup ? { ageGroup } : {}),
      avoid: again && fromIdea && editing ? [...(fromIdea.avoid || []), editing.name].filter(Boolean) : []
    };
    if (request.goal.trim().length < 3) {
      onShowToast('Escreva o que quer trabalhar.');
      return;
    }
    setCreating(true);
    try {
      const read = await createExerciseIdea(request);
      setFromPhoto(null);
      setFromIdea(request);
      setEditing({
        ...(again && editing ? { ...blank(), id: editing.id } : blank()),
        name: read.name,
        category: read.category,
        durationMinutes: read.durationMinutes || request.minutes,
        objective: read.objective || '',
        description: read.description || '',
        ...(read.material ? { material: read.material } : {})
      });
    } catch (err) {
      onShowToast((err as Error).message || 'Não foi possível criar o exercício.');
    } finally {
      setCreating(false);
    }
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
        <h3 className="text-sm font-black text-ui-text font-['Chakra_Petch'] uppercase">
          {exercises.some((e) => e.id === editing.id) ? '✏️ Editar exercício' : '➕ Novo exercício'}
        </h3>
        {fromPhoto && (
          <p role="note" className="rounded-xl bg-ui-success/10 px-3 py-2 text-[11px] text-ui-success">
            Lido da foto. Confirme o nome, o texto e o desenho antes de guardar.
          </p>
        )}
        {fromIdea && (
          <div role="note" className="flex items-center justify-between gap-2 rounded-xl bg-ui-brand/10 px-3 py-2">
            <span className="text-[11px] text-ui-brand">
              ✨ Proposto pela IA para "{fromIdea.goal}". Reveja antes de guardar.
            </span>
            <button
              type="button"
              disabled={creating}
              onClick={() => createIdea(true)}
              className="ui-btn ui-btn-secondary shrink-0 px-2.5 py-1.5 text-[11px]"
            >
              {creating ? 'A criar…' : '🔄 Outra proposta'}
            </button>
          </div>
        )}
        <label className="block text-[11px] text-ui-muted">
          Nome
          <input
            className={input}
            value={editing.name}
            placeholder="Ex: Rondo 4x2"
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Objetivo
          <AutoTextarea
            className={input}
            rows={3}
            value={editing.objective || ''}
            placeholder="Ex: Circulação de bola sob pressão e reação à perda"
            onChange={(e) => setEditing({ ...editing, objective: e.target.value })}
          />
        </label>
        <label className="block text-[11px] text-ui-muted">
          Variantes
          <AutoTextarea
            className={input}
            rows={2}
            value={editing.variations || ''}
            placeholder="Ex: Mais difícil: só 2 toques. Mais fácil: um joker para quem tem a bola."
            onChange={(e) => setEditing({ ...editing, variations: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] text-ui-muted">
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
          <label className="block text-[11px] text-ui-muted">
            Tipo
            <input
              className={input}
              list="tipos-de-exercicio"
              value={typeOf(editing)}
              placeholder="Ex: Rondo"
              onChange={(e) =>
                setEditing({
                  ...editing,
                  typeText: e.target.value,
                  category: categoryFromType(e.target.value, editing.category)
                })
              }
            />
            <datalist id="tipos-de-exercicio">
              {TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="block text-[11px] text-ui-muted">
          Descrição / regras (opcional)
          <AutoTextarea
            className={input}
            rows={5}
            value={editing.description || ''}
            placeholder="Espaço, número de jogadores, regras…"
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          />
        </label>

        <label className="block text-[11px] text-ui-muted">
          🎒 Material
          <AutoTextarea
            className={input}
            rows={2}
            value={materialTextOf(editing)}
            placeholder="Ex: 16 cones, 2 balizas pequenas, 10 coletes, 6 bolas"
            onChange={(e) =>
              setEditing({
                ...editing,
                materialText: e.target.value,
                material: parseMaterialText(e.target.value).material
              })
            }
          />
        </label>

        <div className="space-y-2">
          <div className="text-[11px] text-ui-muted">Desenho do exercício</div>
          {editing.image ? (
            <div className="space-y-2">
              <img
                src={editing.image}
                alt={`Desenho: ${editing.name || 'exercício'}`}
                className="w-full max-h-64 object-contain rounded-xl bg-[#ffffff]"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, image: undefined })}
                  className="text-[11px] text-ui-danger underline"
                >
                  Remover imagem
                </button>
                {fromPhoto?.drawing && editing.image === fromPhoto.drawing && (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, image: fromPhoto.photo })}
                    className="text-[11px] text-ui-brand underline"
                  >
                    Usar a foto inteira
                  </button>
                )}
                {fromPhoto?.drawing && editing.image === fromPhoto.photo && (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, image: fromPhoto.drawing })}
                    className="text-[11px] text-ui-brand underline"
                  >
                    Usar só o desenho
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-ui-muted">
              Importe uma foto do quadro, um desenho ou uma imagem tirada de outra app.
            </p>
          )}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ui-brand/50 text-ui-brand text-xs font-bold cursor-pointer">
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
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFromPhoto(null);
            }}
            className="ui-btn ui-btn-secondary px-4 py-2 text-xs"
          >
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
          onClick={() => {
            setFromPhoto(null);
            setFromIdea(null);
            setEditing(blank());
          }}
          className="ui-btn ui-btn-primary shrink-0 px-3 py-2 text-xs"
        >
          ➕ Novo exercício
        </button>
      </div>
      <label
        className={`ui-btn ui-btn-secondary w-full py-2.5 text-xs cursor-pointer flex items-center justify-center gap-1.5 ${readingPhoto ? 'opacity-60 pointer-events-none' : ''}`}
      >
        📷 {readingPhoto ? 'A ler a foto…' : 'Exercício a partir de uma foto'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Foto do exercício"
          onChange={(e) => {
            readPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <button
        type="button"
        aria-expanded={ideaOpen}
        onClick={() => setIdeaOpen(!ideaOpen)}
        className="ui-btn ui-btn-secondary w-full py-2.5 text-xs"
      >
        ✨ Criar exercício com IA
      </button>
      {ideaOpen && (
        <section aria-label="Criar exercício com IA" className="ui-inset space-y-2 p-3">
          <label className="block text-[11px] text-ui-muted">
            O que quer trabalhar?
            <AutoTextarea
              className={input}
              rows={2}
              value={idea.goal}
              placeholder="Ex: terceiro homem na saída de bola, com pressão"
              onChange={(e) => setIdea({ ...idea, goal: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-ui-muted">
              Jogadores
              <input
                type="number"
                min={2}
                max={30}
                className={input}
                value={idea.players}
                onChange={(e) => setIdea({ ...idea, players: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="block text-[11px] text-ui-muted">
              Minutos
              <input
                type="number"
                min={5}
                max={60}
                className={input}
                value={idea.minutes}
                onChange={(e) => setIdea({ ...idea, minutes: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="block text-[11px] text-ui-muted">
              Espaço
              <select
                className={input}
                value={idea.space}
                onChange={(e) => setIdea({ ...idea, space: e.target.value })}
              >
                {EXERCISE_SPACES.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-ui-muted">
              Tipo
              <select
                className={input}
                value={idea.category}
                onChange={(e) => setIdea({ ...idea, category: e.target.value as ExerciseCategory })}
              >
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={() => createIdea()}
            className="ui-btn ui-btn-primary w-full py-2.5 text-sm"
          >
            {creating ? 'A criar o exercício…' : '✨ Criar exercício'}
          </button>
          <p className="text-[10px] text-ui-muted">
            A IA propõe; o exercício só fica na biblioteca depois de o rever e guardar.
          </p>
        </section>
      )}
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
      {exercises.length > 0 && (
        <div role="group" aria-label="Filtrar exercícios" className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ['todas', 'Todos'],
              ['favoritos', '⭐ Favoritos'],
              ...groups.map((c) => [c.id, c.label] as const)
            ] as Array<readonly [typeof group, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={group === id}
              onClick={() => setGroup(id)}
              className={`ui-btn shrink-0 px-2.5 py-1 text-[11px] ${group === id ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <div className="card text-center text-xs text-ui-muted py-8">
          {exercises.length === 0
            ? 'Ainda sem exercícios. Crie o primeiro e use-o depois no plano de cada treino.'
            : group === 'favoritos'
              ? 'Ainda sem favoritos: toque na ⭐ de um exercício.'
              : 'Nenhum exercício com esse nome.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {list.map((e) => (
            <li key={e.id} className="card p-3 flex gap-3 items-start">
              {e.image ? (
                <img src={e.image} alt="" className="w-20 h-16 object-contain rounded-lg bg-[#ffffff] shrink-0" />
              ) : (
                <div className="ui-inset w-20 h-16 flex items-center justify-center text-xl shrink-0">📋</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1 text-xs font-bold text-ui-text truncate">{e.name}</div>
                  <button
                    type="button"
                    aria-label={`Favorito: ${e.name}`}
                    aria-pressed={Boolean(e.favorite)}
                    onClick={() => toggleFavorite(e)}
                    className={`-mt-1 shrink-0 px-1 text-base leading-none ${e.favorite ? 'text-ui-warning' : 'text-ui-muted hover:text-ui-muted'}`}
                  >
                    {e.favorite ? '★' : '☆'}
                  </button>
                </div>
                <div className="text-[10px] text-ui-muted font-mono">
                  {typeOf(e)} · {e.durationMinutes} min
                  {e.playersCount ? ` · 👥 ${e.playersCount}` : ''}
                </div>
                {e.objective && <div className="text-[11px] text-ui-text line-clamp-2 mt-0.5">{e.objective}</div>}
                {materialTextOf(e) && <div className="text-[11px] text-ui-muted mt-0.5">🎒 {materialTextOf(e)}</div>}
                <div className="text-[10px] text-ui-brand/80 mt-0.5">{usageLabel(usage.get(e.id))}</div>
                <LevelHistory marks={levelHistory(trainings, e.id)} />
                <div className="flex gap-3 mt-1.5 text-[11px]">
                  <button type="button" className="text-ui-brand font-bold" onClick={() => setEditing(e)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-ui-danger"
                    onClick={() => {
                      if (!window.confirm(`Apagar "${e.name}" da biblioteca?`)) return;
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
