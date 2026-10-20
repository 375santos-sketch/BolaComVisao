import React, { useState } from 'react';
import { Exercise, ExerciseCategory } from '../types';
import { uid } from '../lib/utils';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSaveLibrary: (exercises: Exercise[]) => void;
  onShowToast: (msg: string) => void;
  pickerMode?: boolean;
  onPick?: (exercise: Exercise) => void;
}

const CATEGORIES: { key: ExerciseCategory; label: string; icon: string; color: string }[] = [
  { key: 'aquecimento', label: 'Aquecimento', icon: '🔥', color: 'border-orange-500/50 bg-orange-950/30 text-orange-300' },
  { key: 'tecnica', label: 'Técnica', icon: '⚽', color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300' },
  { key: 'tatica', label: 'Tática', icon: '⚡', color: 'border-blue-500/50 bg-blue-950/30 text-blue-300' },
  { key: 'jogo', label: 'Jogo', icon: '🥅', color: 'border-purple-500/50 bg-purple-950/30 text-purple-300' },
  { key: 'bolas_paradas', label: 'Bolas Paradas', icon: '🛡️', color: 'border-amber-500/50 bg-amber-950/30 text-amber-300' },
  { key: 'fisico', label: 'Físico', icon: '🏃', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' }
];

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  exercises,
  onSaveLibrary,
  onShowToast,
  pickerMode = false,
  onPick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [editingExercise, setEditingExercise] = useState<Partial<Exercise> | null>(null);

  if (!isOpen) return null;

  const filtered = exercises.filter((ex) => {
    const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleSaveExercise = () => {
    if (!editingExercise || !editingExercise.name?.trim()) {
      onShowToast('❌ O nome do exercício é obrigatório.');
      return;
    }

    const name = editingExercise.name.trim();
    const duration = editingExercise.durationMinutes || 15;
    const category: ExerciseCategory = editingExercise.category || 'tecnica';
    const description = editingExercise.description?.trim() || '';
    const tags = editingExercise.tags || [];

    let updatedList: Exercise[];
    if (editingExercise.id) {
      // Edit existing
      updatedList = exercises.map((ex) =>
        ex.id === editingExercise.id
          ? {
              ...ex,
              name,
              category,
              durationMinutes: duration,
              description: description || undefined,
              tags: tags.length > 0 ? tags : undefined
            }
          : ex
      );
      onShowToast(`Exercício "${name}" atualizado! ✏️`);
    } else {
      // Create new
      const newEx: Exercise = {
        id: uid(),
        name,
        category,
        durationMinutes: duration,
        description: description || undefined,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: new Date().toISOString()
      };
      updatedList = [newEx, ...exercises];
      onShowToast(`Exercício "${name}" adicionado à biblioteca! 📚`);
    }

    onSaveLibrary(updatedList);
    setEditingExercise(null);
  };

  const handleDeleteExercise = (id: string, name: string) => {
    if (!window.confirm(`Tens a certeza que queres eliminar o exercício "${name}" da biblioteca?`)) {
      return;
    }
    const updated = exercises.filter((ex) => ex.id !== id);
    onSaveLibrary(updated);
    onShowToast(`Exercício "${name}" eliminado. 🗑️`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,210,255,0.2)] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-cyan-500/20 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-xl shrink-0">
              📚
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <span>{pickerMode ? 'Escolher da Biblioteca de Exercícios' : 'Biblioteca de Exercícios'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono">
                  {exercises.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {pickerMode
                  ? 'Clica num exercício para adicionar como bloco à sessão de treino.'
                  : 'Cria, edita e reutiliza os teus exercícios favoritos nos planos de treino.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editingExercise && !pickerMode && (
              <button
                type="button"
                onClick={() =>
                  setEditingExercise({
                    name: '',
                    category: 'tecnica',
                    durationMinutes: 15,
                    description: ''
                  })
                }
                className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
              >
                <span>➕</span>
                <span>Novo Exercício</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all font-bold text-sm"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {editingExercise ? (
            /* Exercise Form (Create / Edit) */
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-bold text-cyan-300 font-['Chakra_Petch'] uppercase tracking-wider">
                  {editingExercise.id ? '✏️ Editar Exercício' : '➕ Novo Exercício'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="field sm:col-span-2">
                  <label>Nome do Exercício *</label>
                  <input
                    type="text"
                    placeholder="Ex: Rondo 4v2 com Transição Rápida"
                    value={editingExercise.name || ''}
                    onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label>Duração Prevista (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    step="1"
                    value={editingExercise.durationMinutes || 15}
                    onChange={(e) =>
                      setEditingExercise({
                        ...editingExercise,
                        durationMinutes: parseInt(e.target.value, 10) || 15
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="field">
                <label>Categoria / Foco</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = (editingExercise.category || 'tecnica') === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setEditingExercise({ ...editingExercise, category: cat.key })}
                        className={`p-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? `${cat.color} border-current shadow-[0_0_10px_rgba(0,210,255,0.2)]`
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field">
                <label>Descrição / Instruções / Regras</label>
                <textarea
                  rows={4}
                  placeholder="Descreve os objetivos, espaço (ex: 20x20m), regras de toque, pontuação e rotações..."
                  value={editingExercise.description || ''}
                  onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveExercise}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all active:scale-95"
                >
                  Guardar na Biblioteca 💾
                </button>
              </div>
            </div>
          ) : (
            /* Exercise List & Filters */
            <>
              {/* Search and Category Filters */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Pesquisar exercício por nome ou descrição..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {pickerMode && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingExercise({
                          name: '',
                          category: 'tecnica',
                          durationMinutes: 15,
                          description: ''
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 text-xs font-mono font-bold transition-all shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <span>➕</span>
                      <span>Criar Novo</span>
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Todos ({exercises.length})
                  </button>

                  {CATEGORIES.map((cat) => {
                    const count = exercises.filter((ex) => ex.category === cat.key).length;
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                          isSelected
                            ? `${cat.color} border-current shadow-sm`
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cards Grid */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6 space-y-3">
                  <div className="text-4xl">📚</div>
                  <div className="text-sm font-bold font-['Chakra_Petch'] text-cyan-300 uppercase">
                    {exercises.length === 0 ? 'Biblioteca vazia' : 'Nenhum exercício encontrado'}
                  </div>
                  <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                    {exercises.length === 0
                      ? 'Adiciona os teus primeiros exercícios à biblioteca para planeares os treinos mais rapidamente.'
                      : 'Experimenta ajustar a pesquisa ou o filtro de categoria.'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingExercise({
                        name: '',
                        category: 'tecnica',
                        durationMinutes: 15,
                        description: ''
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all inline-flex items-center gap-1.5 shadow-md"
                  >
                    <span>➕</span>
                    <span>Criar Primeiro Exercício</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map((ex) => {
                    const catInfo = CATEGORIES.find((c) => c.key === ex.category) || CATEGORIES[0];
                    return (
                      <div
                        key={ex.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          pickerMode
                            ? 'bg-slate-950/70 border-cyan-500/20 hover:border-cyan-400 hover:bg-slate-950 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.15)]'
                            : 'bg-slate-950/70 border-slate-800/80 hover:border-cyan-500/40'
                        }`}
                        onClick={pickerMode && onPick ? () => onPick(ex) : undefined}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 ${catInfo.color}`}
                              >
                                <span>{catInfo.icon}</span>
                                <span>{catInfo.label}</span>
                              </span>
                              <span className="text-[11px] font-mono text-cyan-300 font-bold flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                <span>⏱️</span>
                                <span>{ex.durationMinutes} min</span>
                              </span>
                            </div>

                            {!pickerMode && (
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setEditingExercise(ex)}
                                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-400 text-xs transition-colors"
                                  title="Editar Exercício"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExercise(ex.id, ex.name)}
                                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-red-400 hover:border-red-500 text-xs transition-colors"
                                  title="Eliminar Exercício"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] leading-snug">{ex.name}</h3>

                          {ex.description && (
                            <p className="text-xs text-slate-300/80 font-mono leading-relaxed line-clamp-3">
                              {ex.description}
                            </p>
                          )}
                        </div>

                        {pickerMode && (
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                            <span>Adicionar à Sessão</span>
                            <span>➔</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
