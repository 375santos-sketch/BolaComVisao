import React, { useState } from 'react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { AppState, Exercise, ExerciseCategory, Player, SessionBlock, Training } from '../../../types';
import { t } from '../../../i18n/dict';
import { uid } from '../../../lib/utils';
import { Header } from '../../Header';
import { BatchTrainingSection } from './BatchTrainingSection';
import { getPDFDocumentById, PDFDocumentItem } from '../../../lib/pdfLibraryDB';
import { PDFViewerModal } from './PDFViewerModal';
import { TrainingTemplates } from './TrainingTemplates';
import { exerciseUsage, usageLabel } from '../../../lib/trainingTemplates';
import { TrainingFormData, TRAINING_TYPES } from './types';
import { teamSettings } from '../../../lib/teamSettings';

interface TrainingEditorProps {
  trainingForm: TrainingFormData;
  setTrainingForm: React.Dispatch<React.SetStateAction<TrainingFormData | null>>;
  state: AppState;
  onUpdateState: (updates: Partial<AppState>) => void;
  onNavigate: (tab: any, targetId?: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  onShowToast: (msg: string) => void;
  creationMode: 'single' | 'batch';
  setCreationMode: (mode: 'single' | 'batch') => void;
  eligiblePlayers: Player[];
  onSaveTraining: (forceStatus?: boolean) => void;
  onBatchGenerated: (newTrainings: Training[]) => void;
}

export const TrainingEditor: React.FC<TrainingEditorProps> = ({
  trainingForm,
  setTrainingForm,
  state,
  onUpdateState,
  onNavigate,
  onOpenSettings,
  onOpenNotifications,
  onOpenSync,
  onShowToast,
  creationMode,
  setCreationMode,
  eligiblePlayers,
  onSaveTraining,
  onBatchGenerated
}) => {
  const [viewerDoc, setViewerDoc] = useState<PDFDocumentItem | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const library = state.exerciseLibrary || [];
  const exerciseOf = (id?: string) => (id ? library.find((e) => e.id === id) : undefined);
  const usage = exerciseUsage(state.trainings);

  // Exercises from the library become blocks of the session (name, duration, type and objective copied)
  const handleAddFromLibrary = (ex: Exercise) => {
    const block: SessionBlock = {
      id: uid(),
      exerciseId: ex.id,
      title: ex.name,
      category: ex.category,
      durationMinutes: ex.durationMinutes || 10,
      notes: ex.objective || ''
    };
    setTrainingForm({ ...trainingForm, sessionBlocks: [...trainingForm.sessionBlocks, block] });
    setShowLibrary(false);
  };

  // A block written by hand can be kept in the library for the next sessions
  const handleSaveBlockToLibrary = (block: SessionBlock) => {
    if (!block.title.trim()) {
      onShowToast('Dê um nome ao exercício antes de o guardar na biblioteca.');
      return;
    }
    const ex: Exercise = {
      id: uid(),
      name: block.title.trim(),
      category: block.category || 'tecnica',
      durationMinutes: block.durationMinutes || 10,
      objective: block.notes || '',
      createdAt: new Date().toISOString()
    };
    onUpdateState({ exerciseLibrary: [...library, ex] });
    handleUpdateBlock(block.id, { exerciseId: ex.id });
    onShowToast('Exercício guardado na biblioteca ✓ (pode juntar-lhe o desenho em Treinos → Exercícios)');
  };

  const isEdit = !!trainingForm.id;
  const plannedMinutes = (trainingForm.sessionBlocks || []).reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  const totalDuration = trainingForm.durationMinutes || 90;
  const isOvertime = plannedMinutes > totalDuration;

  const handleToggleAbsence = (pId: string) => {
    const isAbs = trainingForm.absences.includes(pId);
    const newAbs = isAbs ? trainingForm.absences.filter((x) => x !== pId) : [...trainingForm.absences, pId];
    setTrainingForm({ ...trainingForm, absences: newAbs });
  };

  const handleAddCustomBlock = () => {
    const newBlock: SessionBlock = { id: uid(), title: '', durationMinutes: 10 };
    setTrainingForm({ ...trainingForm, sessionBlocks: [...trainingForm.sessionBlocks, newBlock] });
  };

  const handleOpenBlockPDF = async (pdfId: string) => {
    try {
      const doc = await getPDFDocumentById(pdfId);
      if (doc) {
        setViewerDoc(doc);
      } else {
        onShowToast('Documento PDF não encontrado na biblioteca local.');
      }
    } catch {
      onShowToast('Erro ao abrir documento PDF.');
    }
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<SessionBlock>) => {
    setTrainingForm({
      ...trainingForm,
      sessionBlocks: trainingForm.sessionBlocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    });
  };

  const handleRemoveBlock = (blockId: string) => {
    setTrainingForm({ ...trainingForm, sessionBlocks: trainingForm.sessionBlocks.filter((b) => b.id !== blockId) });
  };

  const handleMoveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= trainingForm.sessionBlocks.length) return;
    const blocks = [...trainingForm.sessionBlocks];
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    setTrainingForm({ ...trainingForm, sessionBlocks: blocks });
  };

  return (
    <>
      <div className="pb-44 max-w-4xl mx-auto text-left relative">
        <Header
          title={isEdit ? '✏️ Editar Treino' : t(state.lang, 'tr_new')}
          lang={state.lang}
          onGoHome={() => onNavigate('home')}
          onOpenSettings={onOpenSettings}
          onOpenDatabase={() => onNavigate('teams')}
          onOpenNotifications={onOpenNotifications}
          onOpenSync={onOpenSync}
          unreadNotificationsCount={(state.notifications || []).filter((n) => !n.read).length}
          syncInfo={state.syncInfo}
          clubInfo={{ clubName: state.myClubName, category: state.category, season: state.season }}
        />

        {/* Top Sticky Quick Action Bar for Mobile & Desktop */}
        <div className="ui-inset sticky top-0 z-30 p-3 mb-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{isEdit ? '✏️' : creationMode === 'batch' ? '📅' : '⚽'}</span>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-['Chakra_Petch'] font-black uppercase text-white tracking-wider truncate leading-tight flex items-center gap-2">
                <span>
                  {isEdit
                    ? trainingForm.trainingNumber
                      ? `Editar Treino Nº ${trainingForm.trainingNumber}`
                      : 'Editar Treino'
                    : creationMode === 'batch'
                      ? 'Adicionar Vários Treinos (Período)'
                      : trainingForm.trainingNumber
                        ? `Novo Treino (Treino Nº ${trainingForm.trainingNumber})`
                        : 'Novo Treino'}
                </span>
                {trainingForm.trainingNumber && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-bold">
                    Nº {trainingForm.trainingNumber}
                  </span>
                )}
              </h2>
              <span className="text-[10px] font-mono block truncate text-cyan-300">
                {creationMode === 'batch' && !isEdit
                  ? 'Geração automática por período e horários'
                  : trainingForm.completed
                    ? '🟢 Concluído (Estatísticas)'
                    : '🟡 Agendado / Planeado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setTrainingForm(null)}
              className="ui-btn ui-btn-secondary px-2.5 py-2 min-h-[38px] text-xs"
              title="Cancelar"
            >
              ✕
            </button>

            {!isEdit && creationMode === 'batch' ? null : (
              <button
                type="button"
                onClick={() => onSaveTraining(trainingForm.completed)}
                className="px-3.5 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all hover:brightness-110"
              >
                <span>💾</span>
                <span>Guardar</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher when creating new training */}
        {!isEdit && (
          <div className="ui-card p-2 mb-3.5">
            <div className="ui-inset grid grid-cols-2 gap-1.5 p-1">
              <button
                type="button"
                onClick={() => setCreationMode('single')}
                className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  creationMode === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚽</span>
                <span>Treino Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('batch')}
                className={`py-2 px-3 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  creationMode === 'batch'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📅</span>
                <span>Vários Treinos (Período)</span>
              </button>
            </div>
          </div>
        )}

        {creationMode === 'batch' && !isEdit ? (
          <BatchTrainingSection
            isModal={false}
            existingTrainings={state.trainings || []}
            onGenerate={onBatchGenerated}
            onCancel={() => setTrainingForm(null)}
            trainingSchedule={teamSettings(state)}
          />
        ) : (
          <>
            <TrainingTemplates
              state={state}
              trainingForm={trainingForm}
              setTrainingForm={setTrainingForm}
              onUpdateState={onUpdateState}
              onShowToast={onShowToast}
            />

            {/* Status Selection Pill */}
            <div className="ui-card p-4 mb-3.5">
              <label className="block text-xs font-['Chakra_Petch'] font-bold text-cyan-400 uppercase tracking-wider mb-2">
                🚦 Estado do Treino
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTrainingForm({ ...trainingForm, completed: false })}
                  className={`p-3 rounded-xl border font-['Chakra_Petch'] font-bold text-xs uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                    !trainingForm.completed
                      ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <span>🟡</span>
                    <span>Agendado / Planeado</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80 lowercase">
                    (Em aberto • não entra nas estatísticas)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrainingForm({ ...trainingForm, completed: true })}
                  className={`p-3 rounded-xl border font-['Chakra_Petch'] font-bold text-xs uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                    trainingForm.completed
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <span>🟢</span>
                    <span>Concluído / Fechado</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80 lowercase">
                    (Realizado • entra nas estatísticas)
                  </span>
                </button>
              </div>
            </div>

            {/* Core Date & Details Card */}
            <div className="card space-y-3.5 mb-3.5">
              {trainingForm.trainingNumber && (
                <div className="ui-inset flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏋️</span>
                    <div>
                      <div className="text-xs font-['Chakra_Petch'] font-black uppercase text-amber-300 tracking-wider">
                        Treino {trainingForm.trainingNumber}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {state.category || 'Equipa'} • Época {state.season || 'Atual'} (Numeração automática e
                        sequencial)
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs">
                    Nº {trainingForm.trainingNumber}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="field">
                  <label>{t(state.lang, 'sch_date')} *</label>
                  <input
                    type="date"
                    value={trainingForm.date}
                    onChange={(e) => setTrainingForm({ ...trainingForm, date: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="field">
                  <label>Hora de Início</label>
                  <input
                    type="time"
                    value={trainingForm.time}
                    onChange={(e) => setTrainingForm({ ...trainingForm, time: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="field">
                  <label>Duração (Minutos)</label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    step="5"
                    value={trainingForm.durationMinutes}
                    onChange={(e) =>
                      setTrainingForm({ ...trainingForm, durationMinutes: parseInt(e.target.value, 10) || 90 })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label>Local / Campo</label>
                  <input
                    type="text"
                    placeholder="Ex: Campo Sintético, Campo Principal, Pavilhão..."
                    value={trainingForm.location}
                    onChange={(e) => setTrainingForm({ ...trainingForm, location: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="field">
                  <label>Foco / Tipo de Treino</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {TRAINING_TYPES.map((typeOpt) => (
                      <button
                        key={typeOpt}
                        type="button"
                        onClick={() => setTrainingForm({ ...trainingForm, type: typeOpt })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                          trainingForm.type === typeOpt
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {typeOpt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field mb-0">
                <label>{t(state.lang, 'tr_notes')}</label>
                <AutoTextarea
                  placeholder="Ex: Aquecimento lúdico, circulação de bola, transições defesa-ataque e finalização..."
                  rows={3}
                  value={trainingForm.notes}
                  onChange={(e) => setTrainingForm({ ...trainingForm, notes: e.target.value })}
                />
              </div>
            </div>

            {/* 🎯 Plano de Sessão de Treino */}
            <div className="card mb-4 border border-cyan-500/30 bg-slate-900/90">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/20 flex-wrap gap-2">
                <div>
                  <div className="panel-title mb-0.5 flex items-center gap-2">
                    <span>📋 Plano da Sessão</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                      {trainingForm.sessionBlocks.length} {trainingForm.sessionBlocks.length === 1 ? 'bloco' : 'blocos'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Estrutura a sessão em blocos/exercícios com duração e foco técnico.
                  </div>
                </div>

                {/* Total Duration Indicator */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      isOvertime
                        ? 'border-red-500/50 bg-red-950/40 text-red-300'
                        : plannedMinutes === totalDuration
                          ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                          : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                    }`}
                  >
                    Planeado: {plannedMinutes} / {totalDuration} min
                  </span>
                </div>
              </div>

              {/* Session Objective */}
              <div className="field mb-4">
                <label className="flex items-center gap-1.5">
                  <span>🎯 Objetivo Principal da Sessão</span>
                  <span className="text-[10px] text-slate-400 font-normal">(opcional)</span>
                </label>
                <AutoTextarea
                  rows={2}
                  placeholder="Ex: Melhorar a pressão defensiva em bloco alto e transição rápida..."
                  value={trainingForm.sessionObjective}
                  onChange={(e) => setTrainingForm({ ...trainingForm, sessionObjective: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddCustomBlock}
                  className="ui-btn ui-btn-primary px-3 py-2 text-xs hover:brightness-110 flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>Adicionar exercício</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLibrary((v) => !v)}
                  className="ui-btn ui-btn-soft px-3 py-2 text-xs flex items-center gap-1.5"
                  aria-expanded={showLibrary}
                >
                  <span>📚</span>
                  <span>Da biblioteca ({library.length})</span>
                </button>
              </div>

              {showLibrary && (
                <div
                  aria-label="Escolher da biblioteca"
                  role="group"
                  className="ui-inset mb-3 p-2 space-y-1.5 max-h-72 overflow-y-auto"
                >
                  {library.length === 0 ? (
                    <p className="text-[11px] text-slate-400 p-2">
                      A biblioteca está vazia. Crie exercícios em Treinos → Exercícios, ou guarde aqui um bloco com
                      &quot;📚 Guardar na biblioteca&quot;.
                    </p>
                  ) : (
                    [...library]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
                      .map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => handleAddFromLibrary(ex)}
                          className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-900 text-left"
                        >
                          {ex.image ? (
                            <img src={ex.image} alt="" className="w-12 h-9 object-contain rounded bg-white shrink-0" />
                          ) : (
                            <span className="w-12 h-9 rounded bg-slate-900 flex items-center justify-center shrink-0">
                              📋
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-white truncate">{ex.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono truncate">
                              {ex.durationMinutes} min{ex.objective ? ` · ${ex.objective}` : ''}
                            </span>
                            <span className="block text-[10px] text-cyan-300/80 truncate">
                              {usageLabel(usage.get(ex.id))}
                            </span>
                          </span>
                          <span className="text-cyan-300 text-xs font-bold shrink-0">+ Juntar</span>
                        </button>
                      ))
                  )}
                </div>
              )}

              {/* Blocks List */}
              {trainingForm.sessionBlocks.length === 0 ? (
                <div className="ui-inset py-6 text-center p-4 space-y-2">
                  <div className="text-2xl">📋</div>
                  <div className="text-xs font-mono text-slate-400">
                    Nenhum bloco ou exercício adicionado a esta sessão.
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Adicione os exercícios do treino, com a duração de cada um.
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trainingForm.sessionBlocks.map((block, idx) => (
                    <div key={block.id} className="ui-inset p-3 space-y-2.5 transition-all">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Index & Title */}
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Nome do bloco / exercício (Ex: Rondo 4v2)"
                            value={block.title}
                            onChange={(e) => handleUpdateBlock(block.id, { title: e.target.value })}
                            className="ui-input flex-1 text-xs"
                          />
                        </div>

                        {/* Duration & Category & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Duration */}
                          <div className="ui-card flex items-center gap-1 px-2 py-1">
                            <span className="text-[10px] text-slate-400 font-mono">⏱️</span>
                            <input
                              type="number"
                              min="1"
                              max="180"
                              step="1"
                              value={block.durationMinutes || 10}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, {
                                  durationMinutes: parseInt(e.target.value, 10) || 0
                                })
                              }
                              className="w-12 bg-transparent text-cyan-300 font-mono font-bold text-xs text-center focus:outline-none"
                            />
                            <span className="text-[10px] font-mono text-slate-400">min</span>
                          </div>

                          {/* Category selector */}
                          <select
                            value={block.category || ''}
                            onChange={(e) =>
                              handleUpdateBlock(block.id, {
                                category: (e.target.value as ExerciseCategory) || undefined
                              })
                            }
                            className="ui-input text-[11px]"
                          >
                            <option value="">Sem categoria</option>
                            <option value="aquecimento">🔥 Aquecimento</option>
                            <option value="tecnica">⚽ Técnica</option>
                            <option value="tatica">⚡ Tática</option>
                            <option value="fisico">🏃 Físico</option>
                            <option value="jogo">🥅 Jogo</option>
                          </select>

                          {/* Move Up/Down */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(idx, -1)}
                              disabled={idx === 0}
                              className="ui-btn ui-btn-secondary p-1 text-xs"
                              title="Mover para cima"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(idx, 1)}
                              disabled={idx === trainingForm.sessionBlocks.length - 1}
                              className="ui-btn ui-btn-secondary p-1 text-xs"
                              title="Mover para baixo"
                            >
                              ▼
                            </button>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveBlock(block.id)}
                            className="ui-btn ui-btn-secondary p-1.5 text-xs"
                            title="Remover Bloco"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Drawing from the library, or keep this block in the library */}
                      {exerciseOf(block.exerciseId)?.image ? (
                        <img
                          src={exerciseOf(block.exerciseId)!.image}
                          alt={`Desenho: ${block.title}`}
                          className="w-full max-h-48 object-contain rounded-xl bg-white"
                        />
                      ) : null}
                      {!exerciseOf(block.exerciseId) && (
                        <button
                          type="button"
                          onClick={() => handleSaveBlockToLibrary(block)}
                          className="text-[11px] text-cyan-300 font-bold"
                        >
                          📚 Guardar na biblioteca
                        </button>
                      )}

                      {/* PDF Attachment Badge */}
                      {block.pdfId && (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs">
                          <div className="flex items-center gap-2 text-cyan-300 font-mono overflow-hidden">
                            <span>📄</span>
                            <span className="truncate">
                              Ficha PDF: <strong>{block.pdfFileName || block.pdfTitle}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenBlockPDF(block.pdfId!)}
                            className="ui-btn ui-btn-primary px-2.5 py-1 text-[11px] shrink-0"
                          >
                            👁️ Ver PDF
                          </button>
                        </div>
                      )}

                      {/* Notes / Instructions */}
                      <AutoTextarea
                        rows={3}
                        placeholder="Instruções específicas para este bloco, regras de espaço, rotações..."
                        value={block.notes || ''}
                        onChange={(e) => handleUpdateBlock(block.id, { notes: e.target.value })}
                        className="ui-input w-full text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance & Absences Selection Card */}
            <div className="card mb-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
                <div>
                  <div className="panel-title mb-0.5">{t(state.lang, 'tr_abs')} & Presenças</div>
                  <div className="text-xs text-muted">{t(state.lang, 'tr_abs_desc')}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-400 font-bold">
                    {eligiblePlayers.length - trainingForm.absences.length} presentes
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-red-400 font-bold">{trainingForm.absences.length} faltas</span>
                </div>
              </div>

              {eligiblePlayers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {eligiblePlayers.map((p) => {
                    const isAbsent = trainingForm.absences.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleAbsence(p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                          isAbsent
                            ? 'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            : 'bg-slate-950/80 border-cyan-500/30 text-white hover:border-cyan-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                              isAbsent
                                ? 'bg-red-900 text-red-200'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {p.number !== null ? p.number : '—'}
                          </span>
                          <span className="text-xs font-['Chakra_Petch'] font-bold truncate">{p.name}</span>
                        </div>

                        <span className="text-xs shrink-0 font-bold">{isAbsent ? '❌ Falta' : '🟢 Pres.'}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">{t(state.lang, 'pl_none')}</div>
              )}
            </div>

            {/* ALWAYS VISIBLE STICKY ACTION BAR ON MOBILE & DESKTOP */}
            <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:bottom-4 z-30 mt-6 p-3 sm:p-4 rounded-2xl bg-slate-950/95 border-2 border-cyan-500/50 shadow-[0_4px_30px_rgba(0,0,0,0.9)] backdrop-blur-md mb-6">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-['Chakra_Petch'] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[48px]"
                  onClick={() => onSaveTraining(true)}
                >
                  <span>✅</span>
                  <span>Guardar & Concluir (Nas Estatísticas)</span>
                </button>

                <button
                  type="button"
                  className="ui-btn ui-btn-soft-warning py-3 px-4 text-xs flex items-center justify-center gap-2 min-h-[48px]"
                  onClick={() => onSaveTraining(false)}
                >
                  <span>📅</span>
                  <span>Guardar como Agendado</span>
                </button>

                <button
                  type="button"
                  className="ui-btn ui-btn-secondary py-3 px-5 text-xs min-h-[48px]"
                  onClick={() => setTrainingForm(null)}
                >
                  {t(state.lang, 'cancel')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewerDoc && <PDFViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} />}
    </>
  );
};
