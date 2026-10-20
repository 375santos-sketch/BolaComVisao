import React from 'react';
import { AppState, Player, Training } from '../../../types';
import { generateTrainingSessionPDF } from '../../../lib/pdfUtils';

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
  onSetStatus,
  onToggleComplete,
  onQuickToggleAbsence,
  onOpenEditForm,
  onDeleteTraining,
  onShowToast
}) => {
  const isCompleted = tr.completed !== false;
  const absNames = (tr.absences || []).map(getPlayerName);
  const presCount = eligiblePlayers.length - absNames.length;

  const [y, m, d] = (tr.date || '2026-01-01').split('-');
  const formattedDate = `${d}/${m}/${y}`;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-3 sm:p-4 ${
        isCompleted
          ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-400'
          : 'bg-slate-900/90 border-amber-500/30 hover:border-amber-400'
      }`}
    >
      {/* Top Row: Training Number, Date, Status Switch, Main Info & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Training Number Badge */}
          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-cyan-500/10 border border-amber-400/50 text-amber-300 font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span>🏋️</span>
            <span>{tr.trainingNumber ? `TREINO ${tr.trainingNumber}` : 'TREINO'}</span>
          </span>

          {/* Interactive Status Switch directly on the Card */}
          <div className="inline-flex rounded-xl p-0.5 bg-slate-950 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => onSetStatus(tr.id, false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                !isCompleted
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
              title="Marcar como treino Agendado (fora das estatísticas)"
            >
              <span>🟡</span>
              <span>Agendado</span>
            </button>

            <button
              type="button"
              onClick={() => onSetStatus(tr.id, true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase transition-all flex items-center gap-1 ${
                isCompleted
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
              title="Marcar como treino Concluído (entra nas estatísticas)"
            >
              <span>🟢</span>
              <span>Concluído</span>
            </button>
          </div>

          <div className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1.5">
            <span>📅</span>
            <span>{formattedDate}</span>
          </div>

          {tr.time && (
            <span className="text-xs font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-md">
              ⏱️ {tr.time}h
            </span>
          )}

          {tr.type && (
            <span className="text-xs font-['Chakra_Petch'] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
              {tr.type}
            </span>
          )}
        </div>

        {/* Action Buttons: Edit, Toggle Status & Delete */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleComplete(tr.id, isCompleted)}
            className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5 ${
              !isCompleted
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300'
            }`}
            title={
              !isCompleted
                ? 'Concluir treino e contabilizar na assiduidade'
                : 'Reabrir treino como planeado'
            }
          >
            <span>{!isCompleted ? '✓ Concluir Treino' : '↩ Reabrir (Agendado)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              generateTrainingSessionPDF(tr, state);
              onShowToast('A gerar PDF do Plano de Treino... 📄');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1 shadow-sm"
            title="Exportar PDF do Plano de Treino"
          >
            <span>📄</span>
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenEditForm(tr)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-200 font-['Chakra_Petch'] font-bold text-xs uppercase transition-all flex items-center gap-1.5 shadow-sm"
            title="Editar Treino (Data, Hora, Local, Notas, Faltas)"
          >
            <span>✏️</span>
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteTraining(tr.id)}
            className="p-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 transition-colors text-xs"
            title="Eliminar Treino"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Middle Info Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-3 text-slate-400">
          {tr.location && <span>📍 {tr.location}</span>}
          <span>
            👥 <b className="text-emerald-400">{presCount}</b> presentes ·{' '}
            <b className="text-red-400">{absNames.length}</b> faltas
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="text-cyan-400 hover:text-cyan-300 text-xs font-bold underline flex items-center gap-1"
        >
          <span>{isExpanded ? 'Ocultar Presenças & Notas ▲' : 'Gerir Presenças & Ver Notas ▼'}</span>
        </button>
      </div>

      {/* Expanded Interactive Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 text-xs">
          {/* Interactive Attendance Quick Selector */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-cyan-300 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs flex items-center gap-1.5">
                <span>👥</span>
                <span>Registo Rápido de Presenças (Clica para alterar falta):</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {absNames.length === 0 ? '✓ 100% Presentes' : `${absNames.length} faltas registadas`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {eligiblePlayers.map((p) => {
                const isAbs = (tr.absences || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onQuickToggleAbsence(tr.id, p.id)}
                    className={`p-1.5 px-2 rounded-lg border text-left flex items-center justify-between gap-1.5 transition-all text-xs ${
                      isAbs
                        ? 'bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.3)] font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/50'
                    }`}
                    title={`Alternar falta/presença de ${p.name}`}
                  >
                    <span className="truncate">
                      {p.number !== null ? `#${p.number} ` : ''}
                      {p.name}
                    </span>
                    <span className="text-[10px] shrink-0">{isAbs ? '❌ Falta' : '🟢 Pres.'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Plan Blocks Drawer Section */}
          {tr.sessionPlan && (tr.sessionPlan.objective || (tr.sessionPlan.blocks && tr.sessionPlan.blocks.length > 0)) && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2 font-mono">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-cyan-300 font-bold font-['Chakra_Petch'] uppercase tracking-wider text-xs flex items-center gap-1.5">
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
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-2 text-xs"
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
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 leading-relaxed font-mono">
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
