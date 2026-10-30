import React from 'react';
import { AbsenceReason, AppState, Player, Training } from '../../../types';
import { generateTrainingSessionPDF } from '../../../lib/pdfUtils';
import { AttendanceGrid } from './AttendanceGrid';
import { KitBagCard } from './KitBagCard';
import { HeatBreaksCard } from './HeatBreaksCard';
import { teamSettings } from '../../../lib/teamSettings';

interface TrainingCardProps {
  training: Training;
  state: AppState;
  eligiblePlayers: Player[];
  getPlayerName: (id: string) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSetStatus: (trainingId: string, completed: boolean) => void;
  onToggleComplete: (trainingId: string, currentCompleted: boolean) => void;
  onQuickToggleAbsence: (trainingId: string, playerId: string) => void;
  onSetAbsenceReason: (trainingId: string, playerId: string, reason: AbsenceReason | undefined) => void;
  onRepeatTraining: (trainingId: string) => void;
  onDuplicateTraining: (training: Training) => void;
  onOpenEditForm: (training: Training) => void;
  onDeleteTraining: (trainingId: string) => void;
  onShowToast: (msg: string) => void;
}

export const TrainingCard: React.FC<TrainingCardProps> = ({
  training: tr,
  state,
  eligiblePlayers,
  getPlayerName,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onQuickToggleAbsence,
  onSetAbsenceReason,
  onRepeatTraining,
  onDuplicateTraining,
  onOpenEditForm,
  onDeleteTraining,
  onShowToast
}) => {
  const isCompleted = tr.completed !== false;
  const absNames = (tr.absences || []).map(getPlayerName);
  const presCount = eligiblePlayers.length - absNames.length;

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const date = tr.date || '2026-01-01';
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00`).getDay()];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tag: [string, string] =
    date === today
      ? ['Hoje', 'bg-emerald-500/15 text-emerald-300']
      : isCompleted
        ? ['Feito', 'bg-slate-500/15 text-slate-300']
        : ['Por fazer', 'bg-amber-500/15 text-amber-300'];
  const details = [
    tr.time,
    tr.location,
    isCompleted ? `${presCount} presentes · ${absNames.length} ${absNames.length === 1 ? 'falta' : 'faltas'}` : ''
  ].filter(Boolean);

  return (
    <div className={`ui-card overflow-hidden ${isExpanded ? 'border-cyan-500/50' : ''}`}>
      {/* The row: tap to open the actions, attendance and plan */}
      <button
        type="button"
        data-training-row
        aria-expanded={isExpanded}
        onClick={onToggleExpand}
        className="w-full p-2.5 flex items-center gap-3 text-left"
      >
        <span className={`w-1 self-stretch rounded-full ${isCompleted ? 'bg-slate-600' : 'bg-amber-400'}`} />
        <span className="ui-inset w-11 shrink-0 py-1 text-center rounded-xl">
          <span className="block text-base font-bold leading-tight text-white">{date.slice(8, 10)}</span>
          <span className="block text-[10px] font-semibold uppercase text-slate-400">{weekday}</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-slate-100 truncate">
            {tr.trainingNumber ? `Treino ${tr.trainingNumber}` : 'Treino'}
            {tr.type ? ` · ${tr.type}` : ''}
          </span>
          <span className="block text-xs text-slate-400 truncate">{details.join(' · ')}</span>
        </span>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${tag[1]}`}>{tag[0]}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onToggleComplete(tr.id, isCompleted)}
            className={`ui-btn ${isCompleted ? 'ui-btn-secondary' : 'ui-btn-success'} px-3 py-1.5 text-xs`}
            title={!isCompleted ? 'Concluir treino e contabilizar na assiduidade' : 'Reabrir treino como planeado'}
          >
            {!isCompleted ? '✓ Concluir Treino' : '↩ Reabrir (Agendado)'}
          </button>
          <button
            type="button"
            onClick={() => {
              generateTrainingSessionPDF(tr, state);
              onShowToast('A gerar PDF do Plano de Treino... 📄');
            }}
            className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
            title="Exportar PDF do Plano de Treino"
          >
            📄 PDF
          </button>
          <button
            type="button"
            onClick={() => onRepeatTraining(tr.id)}
            className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
            title="Repetir este treino na semana seguinte"
          >
            🔁 Repetir
          </button>
          <button
            type="button"
            onClick={() => onDuplicateTraining(tr)}
            className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
            title="Duplicar: abre uma cópia deste treino para mudar a data e o que for preciso"
          >
            📑 Duplicar
          </button>
          <button
            type="button"
            onClick={() => onOpenEditForm(tr)}
            className="ui-btn ui-btn-secondary px-2.5 py-1.5 text-xs"
            title="Editar Treino (Data, Hora, Local, Notas, Faltas)"
          >
            ✏️ Editar
          </button>
          <button
            type="button"
            onClick={() => onDeleteTraining(tr.id)}
            className="ui-btn ui-btn-soft-danger px-2.5 py-1.5 text-xs"
            title="Eliminar Treino"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Expanded Interactive Drawer */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          {/* Interactive Attendance Quick Selector */}
          <div className="ui-inset p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                <span>👥</span>
                <span>Presenças (toca em quem faltou):</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {absNames.length === 0 ? '✓ 100% Presentes' : `${absNames.length} faltas registadas`}
              </span>
            </div>

            <AttendanceGrid
              players={eligiblePlayers}
              absences={tr.absences || []}
              reasons={tr.absenceReasons}
              onToggle={(playerId) => onQuickToggleAbsence(tr.id, playerId)}
              onReason={(playerId, reason) => onSetAbsenceReason(tr.id, playerId, reason)}
            />
          </div>

          <HeatBreaksCard training={tr} places={[tr.location || '', teamSettings(state).clubTown || '']} />

          <KitBagCard training={tr} library={state.exerciseLibrary || []} onShowToast={onShowToast} />

          {/* Session Plan Blocks Drawer Section */}
          {tr.sessionPlan &&
            (tr.sessionPlan.objective || (tr.sessionPlan.blocks && tr.sessionPlan.blocks.length > 0)) && (
              <div className="ui-inset p-3 space-y-2 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-cyan-300 font-bold text-xs flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Plano da Sessão ({tr.sessionPlan.blocks?.length || 0} blocos):</span>
                  </span>
                  {tr.sessionPlan.blocks && (
                    <span className="text-[10px] text-slate-400">
                      {tr.sessionPlan.blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0)} min planeados
                    </span>
                  )}
                </div>

                {tr.sessionPlan.objective && (
                  <div className="text-xs text-amber-200/90 italic pb-1">
                    🎯 <b>Objetivo:</b> {tr.sessionPlan.objective}
                  </div>
                )}

                {tr.sessionPlan.blocks && tr.sessionPlan.blocks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {tr.sessionPlan.blocks.map((block, bIdx) => (
                      <div
                        key={block.id || bIdx}
                        className="ui-card p-2 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="w-4 h-4 rounded bg-cyan-950 text-cyan-300 font-bold text-[10px] flex items-center justify-center">
                              {bIdx + 1}
                            </span>
                            <span className="font-bold text-white font-['Chakra_Petch']">{block.title}</span>
                            {block.category && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 uppercase">
                                {block.category}
                              </span>
                            )}
                          </div>
                          {block.notes && (
                            <p className="text-[11px] text-slate-400 pl-5.5 leading-snug">{block.notes}</p>
                          )}
                        </div>
                        <span className="text-cyan-400 font-bold shrink-0 text-[11px]">
                          ⏱️ {block.durationMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {tr.notes ? (
            <div className="ui-inset p-3 text-slate-300 leading-relaxed font-mono">
              <span className="text-cyan-400 font-bold block mb-1">📝 Observações Gerais:</span>
              {tr.notes}
            </div>
          ) : (
            !tr.sessionPlan && (
              <div className="text-slate-500 italic font-mono text-[11px]">
                Sem notas registadas. Clica em <b>"Editar"</b> acima para adicionar exercícios e objetivos da sessão.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
