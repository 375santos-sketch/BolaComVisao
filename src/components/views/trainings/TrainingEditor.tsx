import { SessionPhasesBar } from './SessionPhasesBar';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { AppState, Exercise, ExerciseCategory, Player, SessionBlock, Training } from '../../../types';
import { t } from '../../../i18n/dict';
import { uid } from '../../../lib/utils';
import { Header } from '../../Header';
import { BatchTrainingSection } from './BatchTrainingSection';
import { getPDFDocumentById, PDFDocumentItem } from '../../../lib/pdfLibraryDB';
import { VariantSuggestion } from './VariantSuggestion';
import { fieldOf } from '../../../lib/fieldSetup';
import { TrainingTemplates } from './TrainingTemplates';
import { exerciseUsage, usageLabel } from '../../../lib/trainingTemplates';
import { TrainingFormData, TRAINING_TYPES } from './types';
import { teamSettings } from '../../../lib/teamSettings';
import { datePT, dayLabel, longDatePT, timePT } from '../../../lib/planningSummary';
import { SectionNav } from '../../ui/SectionNav';
import { DateTimePT } from '../../ui/DateTimePT';
import { KitBagCard } from './KitBagCard';
import { HeatBreaksCard } from './HeatBreaksCard';

const FieldSetupModal = lazy(() => import('./FieldSetupModal').then((m) => ({ default: m.FieldSetupModal })));

/** The editor in four parts, with a bar on top that jumps to each. */
const SECTIONS = [
  { id: 'dados', label: 'Dados' },
  { id: 'plano', label: 'Fases e exercícios', short: 'Fases' },
  { id: 'campo', label: 'Campo e material', short: 'Campo' },
  { id: 'presencas', label: 'Presenças' }
];

// The PDF reader is heavy: it loads only when a PDF is opened
const PDFViewerModal = lazy(() => import('./PDFViewerModal').then((m) => ({ default: m.PDFViewerModal })));

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
  const single = isEdit || creationMode === 'single';
  const [section, setSection] = useState('dados');
  const [showField, setShowField] = useState(false);
  const saved = isEdit ? (state.trainings || []).find((x) => x.id === trainingForm.id) : undefined;
  // What the form would save, for the cards that read a training (material, heat breaks)
  const draft: Training = {
    id: trainingForm.id || 'novo',
    date: trainingForm.date,
    time: trainingForm.time,
    location: trainingForm.location,
    notes: trainingForm.notes,
    absences: trainingForm.absences,
    durationMinutes: totalDuration,
    sessionPlan: {
      objective: trainingForm.sessionObjective,
      totalDurationMinutes: totalDuration,
      blocks: trainingForm.sessionBlocks
    }
  };
  // The section in view is the last one whose top has gone under the bar
  useEffect(() => {
    if (!single) return;
    const onScroll = () => {
      let current = SECTIONS[0].id;
      SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(`sessao-${id}`);
        if (el && el.getBoundingClientRect().top < 170) current = id;
      });
      setSection(current);
    };
    // The page may scroll inside the app's container, not the window: listen to any scroll
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [single]);
  const jump = (id: string) => {
    setSection(id);
    document.getElementById(`sessao-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      <div className="pb-44 max-w-4xl xl:max-w-6xl 2xl:max-w-none mx-auto text-left relative">
        <Header
          title="Treinos"
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

        {/* Top bar: what is being edited, its state and Guardar; the sections under it */}
        <div className="sticky top-0 z-30 -mx-2.5 mb-3 border-b border-ui-line bg-ui-bg/95 px-2.5 pt-2 backdrop-blur sm:mx-0 sm:rounded-b-ui sm:px-1">
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setTrainingForm(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-sm text-ui-muted hover:bg-ui-surface-2 hover:text-ui-text"
              title="Cancelar"
              aria-label="Fechar o editor sem guardar"
            >
              ✕
            </button>
            <div className="min-w-0 flex-1">
              <p className="ui-kicker">
                {isEdit ? 'Editar treino' : creationMode === 'batch' ? 'Vários treinos' : 'Novo treino'}
                {trainingForm.trainingNumber && single ? ` · Nº ${trainingForm.trainingNumber}` : ''}
              </p>
              <h2 className="truncate text-ui-lead font-extrabold text-ui-text">
                {creationMode === 'batch' && !isEdit
                  ? 'Gerar por período e horários'
                  : trainingForm.sessionObjective.trim() || 'Sessão sem objetivo'}
              </h2>
            </div>
            {single && (
              <span
                className={`ui-badge hidden sm:inline-flex ${trainingForm.completed ? 'ui-badge-success' : 'ui-badge-warning'}`}
              >
                {trainingForm.completed ? 'Concluído' : 'Agendado'}
              </span>
            )}
            {single && (
              <button
                type="button"
                onClick={() => onSaveTraining(trainingForm.completed)}
                className="ui-btn ui-btn-primary shrink-0 px-4 py-2"
              >
                Guardar
              </button>
            )}
          </div>
          {single && (
            <SectionNav
              label="Partes do treino"
              sections={SECTIONS}
              active={section}
              onJump={jump}
              fill
              className="-mx-1"
            />
          )}
        </div>

        {/* Mode Switcher when creating new training */}
        {!isEdit && (
          <div className="ui-card p-2 mb-3.5">
            <div className="ui-inset grid grid-cols-2 gap-1.5 p-1">
              <button
                type="button"
                onClick={() => setCreationMode('single')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  creationMode === 'single'
                    ? 'bg-ui-warning text-ui-brand-ink shadow-md font-black'
                    : 'text-ui-muted hover:text-ui-text'
                }`}
              >
                <span>⚽</span>
                <span>Treino Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('batch')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  creationMode === 'batch'
                    ? 'bg-gradient-to-r from-ui-brand to-ui-brand text-ui-brand-ink font-black shadow-[0_0_15px_rgba(0,210,255,0.4)]'
                    : 'text-ui-muted hover:text-ui-text'
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
            {/* Computer: the session's data and attendance on the left; phases, exercises and pitch on the right. On a wide
                screen, three columns: the session, the plan in the middle, the pitch and attendance on the right */}
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] xl:items-start xl:gap-x-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
              {/* The session at a glance: when, where and the time of each part */}
              <section
                aria-label="Resumo da sessão"
                className="ui-card mb-3.5 space-y-3 p-4 xl:col-start-1 xl:row-start-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-ui-body font-extrabold text-ui-text">
                    {trainingForm.date ? `${dayLabel(trainingForm.date)} (${datePT(trainingForm.date)})` : 'Sem data'}
                    {timePT(trainingForm.time) ? ` · ${timePT(trainingForm.time)}` : ''}
                    <span className="font-normal text-ui-muted"> · {trainingForm.location || 'Local por definir'}</span>
                  </p>
                  <span
                    className={`ui-badge ${
                      isOvertime
                        ? 'ui-badge-danger'
                        : plannedMinutes === totalDuration
                          ? 'ui-badge-success'
                          : 'ui-badge-brand'
                    }`}
                  >
                    Planeado {plannedMinutes} de {totalDuration} min
                  </span>
                </div>
                {trainingForm.sessionBlocks.length ? (
                  <SessionPhasesBar blocks={trainingForm.sessionBlocks} lengthMinutes={totalDuration} />
                ) : (
                  <p className="text-ui-caption text-ui-muted">
                    Junta exercícios em “Fases e exercícios” para ver o tempo de cada parte.
                  </p>
                )}
              </section>

              <section
                id="sessao-dados"
                aria-label="Dados do treino"
                className="scroll-mt-36 xl:col-start-1 xl:row-start-2"
              >
                {/* State: scheduled (planned) or done (counts in the statistics and as minutes realized) */}
                <div className="ui-card mb-3.5 p-4">
                  <p className="ui-kicker mb-2">Estado do treino</p>
                  <div role="radiogroup" aria-label="Estado do treino" className="ui-inset grid grid-cols-2 gap-1 p-1">
                    {(
                      [
                        [false, 'Agendado', 'planeado · não conta como feito'],
                        [true, 'Concluído', 'realizado · entra nas estatísticas']
                      ] as const
                    ).map(([done, label, hint]) => (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={trainingForm.completed === done}
                        onClick={() => setTrainingForm({ ...trainingForm, completed: done })}
                        className={`rounded-ui-sm px-2 py-2 text-center transition-colors ${
                          trainingForm.completed === done
                            ? done
                              ? 'bg-ui-success-soft text-ui-success'
                              : 'bg-ui-warning-soft text-ui-warning'
                            : 'text-ui-muted hover:text-ui-text'
                        }`}
                      >
                        <span className="block text-ui-body font-bold">{label}</span>
                        <span className="block text-[11px] opacity-80">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Core Date & Details Card */}
                <div className="card space-y-3.5 mb-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="field">
                      <label>{t(state.lang, 'sch_date')} *</label>
                      <DateTimePT
                        type="date"
                        label="Data do treino"
                        value={trainingForm.date}
                        onChange={(date) => setTrainingForm({ ...trainingForm, date })}
                      />
                      <p className="mt-1 text-ui-caption text-ui-muted">
                        {longDatePT(trainingForm.date).split(',')[0] || 'dd/mm/aaaa'}
                      </p>
                    </div>

                    <div className="field">
                      <label>Hora de Início</label>
                      <DateTimePT
                        type="time"
                        label="Hora de início"
                        value={trainingForm.time}
                        onChange={(time) => setTrainingForm({ ...trainingForm, time })}
                      />
                      <p className="mt-1 text-ui-caption text-ui-muted">24 horas</p>
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
                                ? 'bg-ui-brand text-ui-brand-ink border-ui-brand font-bold shadow-sm'
                                : 'bg-ui-inset text-ui-text border-ui-line hover:border-ui-line-strong'
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
              </section>

              <section
                id="sessao-plano"
                aria-label="Fases e exercícios"
                className="scroll-mt-36 xl:col-start-2 xl:row-span-2 xl:row-start-1 2xl:row-span-3"
              >
                <TrainingTemplates
                  state={state}
                  trainingForm={trainingForm}
                  setTrainingForm={setTrainingForm}
                  onUpdateState={onUpdateState}
                  onShowToast={onShowToast}
                />

                {/* 🎯 Plano de Sessão de Treino */}
                <div className="card mb-4 border border-ui-brand/30 bg-ui-surface/90">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-ui-brand/20 flex-wrap gap-2">
                    <div>
                      <div className="panel-title mb-0.5 flex items-center gap-2">
                        <span>Plano da sessão</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ui-brand/20 text-ui-brand border border-ui-brand/40 font-mono">
                          {trainingForm.sessionBlocks.length}{' '}
                          {trainingForm.sessionBlocks.length === 1 ? 'bloco' : 'blocos'}
                        </span>
                      </div>
                      <div className="text-xs text-ui-muted font-mono">
                        Estrutura a sessão em blocos/exercícios com duração e foco técnico.
                      </div>
                    </div>

                    {/* Total Duration Indicator */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-bold ${
                          isOvertime
                            ? 'border-ui-danger/50 bg-ui-danger-soft text-ui-danger'
                            : plannedMinutes === totalDuration
                              ? 'border-ui-success/50 bg-ui-success-soft text-ui-success'
                              : 'border-ui-brand/40 bg-ui-brand-soft text-ui-brand'
                        }`}
                      >
                        Planeado: {plannedMinutes} / {totalDuration} min
                      </span>
                    </div>
                  </div>

                  {/* Session Objective */}
                  <div className="field mb-4">
                    <label className="flex items-center gap-1.5">
                      <span>Objetivo principal da sessão</span>
                      <span className="text-[10px] text-ui-muted font-normal">(opcional)</span>
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
                      <span>Adicionar exercício</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLibrary((v) => !v)}
                      className="ui-btn ui-btn-soft px-3 py-2 text-xs flex items-center gap-1.5"
                      aria-expanded={showLibrary}
                    >
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
                        <p className="text-[11px] text-ui-muted p-2">
                          A biblioteca está vazia. Crie exercícios em Treinos → Exercícios, ou guarde aqui um bloco com
                          &quot;Guardar na biblioteca&quot;.
                        </p>
                      ) : (
                        [...library]
                          // ⭐ Favourites first
                          .sort(
                            (a, b) =>
                              Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
                              a.name.localeCompare(b.name, 'pt-PT')
                          )
                          .map((ex) => (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => handleAddFromLibrary(ex)}
                              className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-ui-surface text-left"
                            >
                              {ex.image ? (
                                <img
                                  src={ex.image}
                                  alt=""
                                  className="w-12 h-9 object-contain rounded bg-[#ffffff] shrink-0"
                                />
                              ) : (
                                <span className="w-12 h-9 rounded bg-ui-surface flex items-center justify-center shrink-0">
                                  ·
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-bold text-ui-text truncate">
                                  {ex.favorite ? '⭐ ' : ''}
                                  {ex.name}
                                </span>
                                <span className="block text-[10px] text-ui-muted font-mono truncate">
                                  {ex.durationMinutes} min{ex.objective ? ` · ${ex.objective}` : ''}
                                </span>
                                <span className="block text-[10px] text-ui-brand/80 truncate">
                                  {usageLabel(usage.get(ex.id))}
                                </span>
                              </span>
                              <span className="text-ui-brand text-xs font-bold shrink-0">+ Juntar</span>
                            </button>
                          ))
                      )}
                    </div>
                  )}

                  {/* Blocks List */}
                  {trainingForm.sessionBlocks.length === 0 ? (
                    <div className="ui-inset py-6 text-center p-4 space-y-2">
                      <div className="text-xs font-mono text-ui-muted">
                        Nenhum bloco ou exercício adicionado a esta sessão.
                      </div>
                      <div className="text-[11px] font-mono text-ui-muted">
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
                              <span className="w-6 h-6 rounded-lg bg-ui-brand-soft border border-ui-brand/40 text-ui-brand font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              {(() => {
                                const drawing = block.exerciseId
                                  ? (state.exerciseLibrary || []).find((e) => e.id === block.exerciseId)?.image
                                  : undefined;
                                return drawing ? (
                                  <img
                                    src={drawing}
                                    alt=""
                                    className="h-9 w-12 shrink-0 rounded border border-ui-line object-cover"
                                  />
                                ) : null;
                              })()}
                              <input
                                type="text"
                                placeholder="Nome do bloco / exercício (Ex: Rondo 4v2)"
                                value={block.title}
                                onChange={(e) => handleUpdateBlock(block.id, { title: e.target.value })}
                                className="ui-input flex-1 text-xs"
                              />
                            </div>

                            {/* Duration & Category & Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Duration */}
                              <div className="ui-card flex items-center gap-1 px-2 py-1">
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
                                  className="w-12 bg-transparent text-ui-brand font-mono font-bold text-xs text-center focus:outline-none"
                                />
                                <span className="text-[10px] font-mono text-ui-muted">min</span>
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
                                <option value="aquecimento">Aquecimento</option>
                                <option value="tecnica">Técnica</option>
                                <option value="tatica">Tática</option>
                                <option value="fisico">Físico</option>
                                <option value="jogo">Jogo</option>
                                <option value="bolas_paradas">Bolas paradas</option>
                                <option value="calma">Retorno à calma</option>
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

                          {/* 🎚️ How it went last time: a variant to make it harder or easier */}
                          {exerciseOf(block.exerciseId) && (
                            <VariantSuggestion
                              block={block}
                              exercise={exerciseOf(block.exerciseId)!}
                              trainings={(state.trainings || []).filter((x) => x.id !== trainingForm.id)}
                              date={trainingForm.date}
                              field={fieldOf(
                                {
                                  date: trainingForm.date || '2026-01-01',
                                  field: (state.trainings || []).find((x) => x.id === trainingForm.id)?.field
                                },
                                teamSettings(state).trainingFields
                              )}
                              onChange={(b) => handleUpdateBlock(block.id, b)}
                            />
                          )}

                          {/* Drawing from the library, or keep this block in the library */}
                          {exerciseOf(block.exerciseId)?.image ? (
                            <img
                              src={exerciseOf(block.exerciseId)!.image}
                              alt={`Desenho: ${block.title}`}
                              className="w-full max-h-48 object-contain rounded-xl bg-[#ffffff]"
                            />
                          ) : null}
                          {!exerciseOf(block.exerciseId) && (
                            <button
                              type="button"
                              onClick={() => handleSaveBlockToLibrary(block)}
                              className="text-[11px] text-ui-brand font-bold"
                            >
                              Guardar na biblioteca
                            </button>
                          )}

                          {/* PDF Attachment Badge */}
                          {block.pdfId && (
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-ui-brand-soft border border-ui-brand/30 text-xs">
                              <div className="flex items-center gap-2 text-ui-brand font-mono overflow-hidden">
                                <span className="truncate">
                                  Ficha PDF: <strong>{block.pdfFileName || block.pdfTitle}</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenBlockPDF(block.pdfId!)}
                                className="ui-btn ui-btn-primary px-2.5 py-1 text-[11px] shrink-0"
                              >
                                Ver PDF
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
              </section>

              <section
                id="sessao-campo"
                aria-label="Campo e material"
                className="scroll-mt-36 mb-4 space-y-3 xl:col-start-2 xl:row-start-3 2xl:col-start-3 2xl:row-start-1"
              >
                <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="ui-kicker">Campo</p>
                    <p className="text-ui-caption text-ui-muted">
                      {isEdit
                        ? 'Onde fica cada exercício no campo, para partilhar com o adjunto.'
                        : 'Guarda o treino para montar o campo.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!saved}
                    onClick={() => setShowField(true)}
                    className="ui-btn ui-btn-soft px-3 py-2"
                  >
                    Montar o campo
                  </button>
                </div>
                <KitBagCard training={draft} library={library} onShowToast={onShowToast} />
                {trainingForm.date && (
                  <HeatBreaksCard
                    training={draft}
                    places={[trainingForm.location || '', teamSettings(state).clubTown || '']}
                  />
                )}
                {!trainingForm.sessionBlocks.length && (
                  <p className="ui-inset p-3 text-ui-caption text-ui-muted">
                    A lista do saco aparece quando houver exercícios da biblioteca com material.
                  </p>
                )}
              </section>

              <section
                id="sessao-presencas"
                aria-label="Presenças"
                className="scroll-mt-36 xl:col-start-1 xl:row-start-3 2xl:col-start-3 2xl:row-start-2"
              >
                {/* Attendance & Absences Selection Card */}
                <div className="card mb-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-ui-brand/20">
                    <div>
                      <div className="panel-title mb-0.5">{t(state.lang, 'tr_abs')} & Presenças</div>
                      <div className="text-xs text-muted">{t(state.lang, 'tr_abs_desc')}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="text-ui-success font-bold">
                        {eligiblePlayers.length - trainingForm.absences.length} presentes
                      </span>
                      <span className="text-ui-muted mx-1">/</span>
                      <span className="text-ui-danger font-bold">{trainingForm.absences.length} faltas</span>
                    </div>
                  </div>

                  {eligiblePlayers.length > 0 ? (
                    <div className="@container">
                      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-4">
                        {eligiblePlayers.map((p) => {
                          const isAbsent = trainingForm.absences.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleToggleAbsence(p.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                                isAbsent
                                  ? 'bg-ui-danger-soft border-ui-danger text-ui-danger shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                  : 'bg-ui-inset/80 border-ui-brand/30 text-ui-text hover:border-ui-brand'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-md font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                    isAbsent
                                      ? 'bg-ui-danger-soft text-ui-danger'
                                      : 'bg-ui-brand-soft text-ui-brand border border-ui-brand/40'
                                  }`}
                                >
                                  {p.number !== null ? p.number : '—'}
                                </span>
                                <span className="text-xs font-bold truncate">{p.name}</span>
                              </div>

                              <span className="text-xs shrink-0 font-bold">{isAbsent ? '❌ Falta' : '🟢 Pres.'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="empty">{t(state.lang, 'pl_none')}</div>
                  )}
                </div>
              </section>
            </div>

            {/* The end of the session: save as done or keep it scheduled (Guardar is also always on top) */}
            <div className="ui-card mb-6 mt-2 flex flex-col gap-2 p-3 sm:flex-row">
              <button type="button" className="ui-btn ui-btn-primary flex-1 py-3" onClick={() => onSaveTraining(true)}>
                Guardar e concluir
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary flex-1 py-3"
                onClick={() => onSaveTraining(false)}
              >
                Guardar como agendado
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-ghost px-5 py-3 text-ui-muted"
                onClick={() => setTrainingForm(null)}
              >
                {t(state.lang, 'cancel')}
              </button>
            </div>
          </>
        )}
      </div>

      {showField && saved && (
        <Suspense fallback={null}>
          <FieldSetupModal
            state={state}
            training={saved}
            onUpdateState={onUpdateState}
            onShowToast={onShowToast}
            onClose={() => setShowField(false)}
          />
        </Suspense>
      )}

      {/* PDF Viewer Modal */}
      {viewerDoc && (
        <Suspense fallback={null}>
          <PDFViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} />
        </Suspense>
      )}
    </>
  );
};
